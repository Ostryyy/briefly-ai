import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import path from "path";

import { statusStore } from "@/app/lib/statusStore";
import {
  ensureTempDirExists,
  getTempDir,
  removeTempFile,
} from "@/app/lib/fileUtils";
import { JobStatus, SummaryLevel } from "@/app/types/JobStatus";
import { processJob } from "@/app/lib/workers/processJob";

export async function POST(req: NextRequest) {
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
  const email = formData.get("email") as string;

  const requiredFields = { file, level, email };
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

  await writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));

  const jobStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
    userEmail: email,
  };

  statusStore.set(jobId, jobStatus);

  processJob({
    jobId,
    source: "upload",
    audioPath: tempFilePath,
    level,
    email,
  }).catch(async (err: Error) => {
    await removeTempFile(tempFilePath);

    const jobStatus: JobStatus = {
      jobId,
      status: "FAILED",
      progress: 100,
      userEmail: email,
      message: err.message,
    };

    statusStore.set(jobId, jobStatus);
  });

  return NextResponse.json({ jobId });
}
