import { statusStore } from "@/app/lib/statusStore";
import { ensureTempDirExists, removeTempFile } from "@/app/lib/fileUtils";
import { downloadAudioFromYoutube } from "@/app/lib/ytDlp";
import { ProcessJobParams } from "@/app/types/ProcessJobParams";
import { transcribeAudio } from "../whisperClient";
import { generateSummary } from "../summarizer";

export async function processJob(params: ProcessJobParams) {
  const { jobId, source, level } = params;

  const jobStatus = statusStore.get(jobId);
  if (!jobStatus) return;

  try {
    let audioPath;

    if (source === "youtube") {
      const { url } = params;

      jobStatus.status = "DOWNLOADING";
      statusStore.set(jobId, jobStatus, params.userId);

      await ensureTempDirExists();
      audioPath = await downloadAudioFromYoutube(url, jobId);
    } else if (source === "upload") {
      const { audioPath: uploadedAudioPath } = params;
      audioPath = uploadedAudioPath;
    } else {
      throw new Error(`Unsupported source: ${source}`);
    }

    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    statusStore.set(jobId, jobStatus, params.userId);

    const transcript = await transcribeAudio(jobId, audioPath);

    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    statusStore.set(jobId, jobStatus, params.userId);

    const summary = await generateSummary(jobId, transcript, level);

    await removeTempFile(audioPath!);

    jobStatus.status = "READY";
    jobStatus.progress = 100;
    jobStatus.message = "Job completed!";
    jobStatus.summary = summary;
    statusStore.set(jobId, jobStatus, params.userId);
  } catch (err: unknown) {
    throw err;
  }
}
