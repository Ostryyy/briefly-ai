import { NextRequest, NextResponse } from "next/server";
import { statusStore } from "@/app/lib/statusStore";
import { transcribeAudio } from "@/app/lib/whisperClient";
import { generateSummary } from "@/app/lib/summarizer";
import { JobStatus, SummaryLevel } from "@/app/types/JobStatus";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import path from "path";

import {
  ensureTempDirExists,
  getTempDir,
  removeTempFile,
} from "@/app/lib/fileUtils";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const level = formData.get("level") as SummaryLevel | null;

  if (!file || !level) {
    return NextResponse.json(
      { error: "Missing file or summary level." },
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
  };

  statusStore.set(jobId, jobStatus);

  try {
    const transcript = await transcribeAudio(jobId, tempFilePath);
    const summary = await generateSummary(jobId, transcript, level);

    await removeTempFile(tempFilePath);

    return NextResponse.json({ jobId, summary });
  } catch (err: any) {
    console.error(err);
    jobStatus.status = "FAILED";
    jobStatus.message = err.message;
    statusStore.set(jobId, jobStatus);

    await removeTempFile(tempFilePath);

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
