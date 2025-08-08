import "server-only";
import { createReadStream } from "fs";
import { openai, MODELS } from "@server/clients/openai";

export async function transcribeAudio(filePath: string): Promise<string> {
  const client = openai();

  try {
    const res = await client.audio.transcriptions.create({
      model: MODELS.transcription ?? "whisper-1",
      file: createReadStream(filePath),
    });

    const text = (res.text ?? "").trim();
    if (!text) {
      throw new Error("Empty transcription");
    }
    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Transcription error: ${message}`);
  }
}
