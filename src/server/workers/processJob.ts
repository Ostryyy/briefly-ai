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

import { time, type Metrics } from "@server/workers/metrics";
import { fileSize } from "@server/workers/fileSize";
import { saveJobMetrics } from "@server/db/jobsRepo";

const MOCK_MODE = process.env.MOCK_MODE === "true";

export async function processJob(params: ProcessJobParams) {
  if (MOCK_MODE) {
    await simulateProcessJob(params);
    return;
  }

  const { jobId, source, level } = params;
  const jobStatus = statusStore.get(jobId);
  if (!jobStatus) return;

  let audioPath: string | undefined;
  const metrics: Metrics = {};
  const tStart = Date.now();

  try {
    if (source === "youtube") {
      const { url } = params;
      jobStatus.status = "DOWNLOADING";
      jobStatus.progress = 10;
      await statusStore.set(jobId, jobStatus, params.userId);

      await ensureTempDirExists();
      audioPath = await time("downloadMs", metrics, async () => {
        return await downloadAudioFromYoutube(url, jobId);
      });
    } else if (source === "upload") {
      audioPath = params.audioPath;
    } else {
      throw new Error(`Unsupported source: ${source}`);
    }

    metrics.inputBytes = audioPath ? await fileSize(audioPath) : undefined;

    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    await statusStore.set(jobId, jobStatus, params.userId);

    const transcript = await time("transcribeMs", metrics, async () => {
      return await transcribeAudio(audioPath!);
    });

    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    await statusStore.set(jobId, jobStatus, params.userId);

    const summary = await time("summarizeMs", metrics, async () => {
      return await generateSummary(transcript, level);
    });

    const summaryBytes =
      typeof summary === "string"
        ? Buffer.byteLength(summary, "utf8")
        : Buffer.byteLength(JSON.stringify(summary), "utf8");
    metrics.outputBytes = summaryBytes;

    if (audioPath) {
      await removeTempFile(audioPath).catch(() => {});
    }

    jobStatus.status = "READY";
    jobStatus.progress = 100;
    jobStatus.message = "Job completed!";
    jobStatus.summary = summary as string;
    await statusStore.set(jobId, jobStatus, params.userId);

    metrics.totalMs = Date.now() - tStart;
    await saveJobMetrics(jobId, metrics);
  } catch (err) {
    try {
      if (audioPath) await removeTempFile(audioPath);
    } catch {}

    metrics.totalMs = Date.now() - tStart;
    try {
      await saveJobMetrics(jobId, metrics);
    } catch {}

    const js = statusStore.get(params.jobId);
    if (!js) return;
    js.status = "FAILED";
    js.progress = 100;
    js.message = err instanceof Error ? err.message : "Unknown error";
    await statusStore.set(params.jobId, js, params.userId);
  }
}

async function simulateProcessJob(params: ProcessJobParams) {
  const { jobId } = params;
  const jobStatus = statusStore.get(jobId);
  if (!jobStatus) return;

  const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

  const willFail = process.env.MOCK_FAIL_PROB
    ? Math.random() < Number(process.env.MOCK_FAIL_PROB)
    : Math.random() < 0.5;

  type Stage = "DOWNLOADING" | "TRANSCRIBING" | "SUMMARIZING" | "BEFORE_READY";
  const stages: Stage[] = [
    "DOWNLOADING",
    "TRANSCRIBING",
    "SUMMARIZING",
    "BEFORE_READY",
  ];
  const failStage: Stage | null = willFail
    ? stages[Math.floor(Math.random() * stages.length)]
    : null;

  const FAIL_MSG: Record<Stage, string> = {
    DOWNLOADING:
      "Economy mode: simulated failure at download stage (network timeout).",
    TRANSCRIBING:
      "Economy mode: simulated failure at transcription stage (decoder error).",
    SUMMARIZING:
      "Economy mode: simulated failure at summarization stage (rate-limited).",
    BEFORE_READY:
      "Economy mode: simulated failure while finalizing results (write error).",
  };

  try {
    jobStatus.status = "DOWNLOADING";
    jobStatus.progress = 10;
    jobStatus.message = "Economy mode: simulating download…";
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(15_000);
    if (failStage === "DOWNLOADING") throw new Error(FAIL_MSG.DOWNLOADING);

    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    jobStatus.message = "Economy mode: simulating transcription…";
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(25_000);
    if (failStage === "TRANSCRIBING") throw new Error(FAIL_MSG.TRANSCRIBING);

    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    jobStatus.message = "Economy mode: simulating summary…";
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(20_000);
    if (failStage === "SUMMARIZING") throw new Error(FAIL_MSG.SUMMARIZING);

    if (failStage === "BEFORE_READY") throw new Error(FAIL_MSG.BEFORE_READY);

    jobStatus.status = "READY";
    jobStatus.progress = 100;
    jobStatus.message = "Completed in economy mode (no OpenAI calls).";
    jobStatus.summary =
      "⚠️ Processing disabled. This is a placeholder summary from economy mode.";
    await statusStore.set(jobId, jobStatus, params.userId);
  } catch (err) {
    jobStatus.status = "FAILED";
    jobStatus.progress = 100;
    jobStatus.message =
      err instanceof Error ? err.message : "Unknown error (mock)";
    await statusStore.set(jobId, jobStatus, params.userId);
  }
}
