import "server-only";
import { statusStore } from "@server/state/statusStore";
import {
  ensureTempDirExists,
  removeTempFile,
} from "@server/services/audioUtils";
import { downloadAudioFromYoutube } from "@server/services/ytDlp";
import { transcribeAudio } from "@server/services/whisperClient";
import { generateSummary } from "@server/services/summarizer";
import type { ProcessJobParams } from "@shared/types/processes";

export async function processJob(params: ProcessJobParams) {
  const { jobId, source, level } = params;
  const jobStatus = statusStore.get(jobId);
  if (!jobStatus) return;

  let audioPath: string | undefined;

  try {
    if (source === "youtube") {
      const { url } = params;
      jobStatus.status = "DOWNLOADING";
      await statusStore.set(jobId, jobStatus, params.userId);

      await ensureTempDirExists();
      audioPath = await downloadAudioFromYoutube(url, jobId);
    } else if (source === "upload") {
      audioPath = params.audioPath;
    } else {
      throw new Error(`Unsupported source: ${source}`);
    }

    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    await statusStore.set(jobId, jobStatus, params.userId);

    const transcript = await transcribeAudio(audioPath!);

    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    await statusStore.set(jobId, jobStatus, params.userId);

    const summary = await generateSummary(transcript, level);

    await removeTempFile(audioPath!).catch(() => {});

    jobStatus.status = "READY";
    jobStatus.progress = 100;
    jobStatus.message = "Job completed!";
    jobStatus.summary = summary;
    await statusStore.set(jobId, jobStatus, params.userId);
  } catch (err) {
    try {
      if (audioPath) await removeTempFile(audioPath);
    } catch {}
    jobStatus.status = "FAILED";
    jobStatus.progress = 100;
    jobStatus.message = err instanceof Error ? err.message : "Unknown error";
    await statusStore.set(jobId, jobStatus, params.userId);
  }
}
