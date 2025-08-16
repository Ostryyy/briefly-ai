export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import path from "path";

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
import { runtimeLimits } from "@server/config/runtime";

const allowedLevels = new Set<SummaryLevel>([
  "short",
  "medium",
  "detailed",
  "extreme",
]);

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
  const { RATE_LIMIT_PER_MIN, MAX_UPLOAD_MB } = runtimeLimits();
  const limiter = createRateLimiter(RATE_LIMIT_PER_MIN);

  if (!limiter.allow(clientIp(req.headers))) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const ctype = req.headers.get("content-type") || "";
  if (!ctype.toLowerCase().includes("multipart/form-data")) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
        error: "Use multipart/form-data",
      },
      { status: 415 }
    );
  }

  const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
  const clen = req.headers.get("content-length");
  if (clen && Number(clen) > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        error: `Max ${MAX_UPLOAD_MB} MB`,
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

  if (!allowedLevels.has(level)) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", error: "Invalid level" },
      { status: 400 }
    );
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        code: "FILE_TOO_LARGE",
        error: `Max ${MAX_UPLOAD_MB} MB`,
      },
      { status: 413 }
    );
  }

  const jobId = uuidv4();
  await ensureTempDirExists();
  const tempDir = getTempDir();

  const mime = (file.type || "application/octet-stream").toLowerCase();
  const ext = mime.includes("wav")
    ? "wav"
    : mime.includes("mpeg") || mime.includes("mp3")
    ? "mp3"
    : mime.includes("mp4") || mime.includes("x-m4a") || mime.includes("aac")
    ? "m4a"
    : "bin";

  const tempFilePath = path.join(tempDir, `${jobId}.${ext}`);

  try {
    const ab = await file.arrayBuffer();
    await writeFile(tempFilePath, Buffer.from(ab));
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "WRITE_FAILED",
        error: "Failed to save uploaded file",
      },
      { status: 500 }
    );
  }

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
