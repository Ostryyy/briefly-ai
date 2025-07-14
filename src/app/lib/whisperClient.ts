import OpenAI from "openai";
import fs from "fs";
import { statusStore } from "@/app/lib/statusStore";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(jobId: string, filePath: string): Promise<string> {
  const jobStatus = statusStore.get(jobId);
  if (jobStatus) {
    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 50;
    statusStore.set(jobId, jobStatus);
  }

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-1",
    language: "pl",
  });

  return response.text;
}
