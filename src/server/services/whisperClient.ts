import "server-only";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { openai, MODELS } from "@server/clients/openai";
import { transcodeForWhisper } from "./audioTranscode";

const MAX_BYTES = 25 * 1024 * 1024;

export async function transcribeAudio(filePath: string): Promise<string> {
  const client = openai();

  let usePath = filePath;
  const { size } = await stat(filePath);
  if (size > MAX_BYTES) {
    usePath = await transcodeForWhisper(filePath);
    const after = await stat(usePath);
    if (after.size > MAX_BYTES) {
      throw new Error(
        `Audio too large even after compression (${Math.round(
          after.size / 1024 / 1024
        )}MB > 25MB).`
      );
    }
  }

  try {
    const res = await client.audio.transcriptions.create({
      model: MODELS.transcription ?? "whisper-1",
      file: createReadStream(usePath),
    });

    const text = (res.text ?? "").trim();
    if (!text) throw new Error("Empty transcription");
    return text;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : String(err ?? "Unknown error");
    if (/Maximum content size limit|too large|413/.test(msg)) {
      throw new Error(
        "Transcription error: file exceeds 25MB limit (compressed if possible)."
      );
    }
    throw new Error(`Transcription error: ${msg}`);
  }
}
