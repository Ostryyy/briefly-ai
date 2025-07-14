import { NextRequest, NextResponse } from "next/server";
import { statusStore } from "@/app/lib/statusStore";
import { downloadAudioFromYoutube } from "@/app/lib/ytDlp";
import { transcribeAudio } from "@/app/lib/whisperClient";
import { generateSummary } from "@/app/lib/summarizer";
import { JobStatus, SummaryLevel } from "@/app/types/JobStatus";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, level } = body;

  if (!url || !level) {
    return NextResponse.json({ error: "URL and level are required" }, { status: 400 });
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

    const transcript = await transcribeAudio(jobId, audioPath);

    const summary = await generateSummary(jobId, transcript, level as SummaryLevel);

    return NextResponse.json({ jobId, summary });
  } catch (err: any) {
    console.error(err);
    jobStatus.status = "FAILED";
    jobStatus.message = err.message;
    statusStore.set(jobId, jobStatus);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
