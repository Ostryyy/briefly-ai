import { NextRequest, NextResponse } from "next/server";
import { statusStore } from "@/app/lib/statusStore";
import { downloadAudioFromYoutube } from "@/app/lib/ytDlp";
import { JobStatus } from "@/app/types/JobStatus";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url } = body;

  if (!url) {
    return NextResponse.json({ error: "No YouTube URL provided" }, { status: 400 });
  }

  const jobId = uuidv4();
  const jobStatus: JobStatus = {
    jobId,
    status: "DOWNLOADING",
    progress: 0,
  };

  statusStore.set(jobId, jobStatus);

  try {
    const audioPath = await downloadAudioFromYoutube(url, jobId);

    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    statusStore.set(jobId, jobStatus);

    return NextResponse.json({ jobId, audioPath });
  } catch (err: any) {
    console.error(err);
    jobStatus.status = "FAILED";
    jobStatus.message = err.message;
    statusStore.set(jobId, jobStatus);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
