export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import path from "path";

import { env } from "@server/config/env";
import { statusStore } from "@server/state/statusStore";
import {
  ensureTempDirExists,
  getTempDir,
  removeTempFile,
} from "@server/services/audioUtils";
import { processJob } from "@server/workers/processJob";
import type { JobStatus, SummaryLevel } from "@shared/types/job";
import { withAuth } from "@server/middleware/withAuth";
import type { AuthUser } from "@shared/types/auth";
import { createRateLimiter, clientIp } from "@server/middleware/rateLimit";

const limiter = createRateLimiter(env.RATE_LIMIT_PER_MIN);

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  if (!limiter.allow(clientIp(req.headers))) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  const clen = req.headers.get("content-length");
  if (clen && Number(clen) > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        error: `Max ${env.MAX_UPLOAD_MB} MB`,
      },
      { status: 413 }
    );
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid Form data body" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File;
  const level = formData.get("level") as SummaryLevel;

  const requiredFields = { file, level };
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missingFields.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        error: `Max ${env.MAX_UPLOAD_MB} MB`,
      },
      { status: 413 }
    );
  }

  const jobId = uuidv4();

  await ensureTempDirExists();
  const tempDir = getTempDir();
  const tempFilePath = path.join(tempDir, `${jobId}.mp3`);

  await writeFile(tempFilePath, Buffer.from(await file!.arrayBuffer()));

  const initialStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
    userEmail: user.email,
  };

  statusStore.set(jobId, initialStatus, user.userId);

  processJob({
    jobId,
    source: "upload",
    audioPath: tempFilePath,
    level,
    email: user.email,
    userId: user.userId,
  }).catch(async (err: Error) => {
    await removeTempFile(tempFilePath).catch(() => {});

    const jobStatus: JobStatus = {
      jobId,
      status: "FAILED",
      progress: 100,
      userEmail: user.email,
      message: err.message,
    };

    await statusStore.set(jobId, jobStatus, user.userId);
  });

  return NextResponse.json({ jobId }, { status: 202 });
});
