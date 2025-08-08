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

export const POST = withAuth(async (req: NextRequest, user: AuthUser) => {
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

  statusStore.set(jobId, initialStatus);

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

  return NextResponse.json({ jobId });
});
