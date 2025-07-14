import { NextRequest, NextResponse } from "next/server";
import { statusStore } from "@/app/lib/statusStore";
import { JobStatus } from "@/app/types/JobStatus";
import { v4 as uuidv4 } from "uuid";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const jobId = uuidv4();
  const tempDir = path.join(os.tmpdir(), "briefly-ai");
  const tempFilePath = path.join(tempDir, `${jobId}.mp3`);

  await writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));

  const jobStatus: JobStatus = {
    jobId,
    status: "PENDING",
    progress: 0,
  };

  statusStore.set(jobId, jobStatus);

  return NextResponse.json({ jobId });
}
