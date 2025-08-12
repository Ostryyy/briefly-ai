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
import { SummaryLevel } from "@shared/types/job";

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
  const { jobId, level } = params;
  const jobStatus = statusStore.get(jobId);
  if (!jobStatus) return;

  const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

  const failProb =
    process.env.MOCK_FAIL_PROB != null
      ? Number(process.env.MOCK_FAIL_PROB)
      : 0.3;
  const willFail = Math.random() < Math.max(0, Math.min(1, failProb));

  const speed = Number(process.env.MOCK_SPEED ?? 1); // 1 = normal, 0.25 = 4x faster
  const clamp = (n: number, a: number, b: number) =>
    Math.max(a, Math.min(b, n));
  const msRange = (min: number, max: number) =>
    Math.floor(clamp(min + Math.random() * (max - min), min, max) * speed);

  const dlMs = msRange(4_000, 18_000);
  const trMs = msRange(8_000, 35_000);
  const sumRanges: Record<SummaryLevel, [number, number]> = {
    short: [2_000, 6_000],
    medium: [4_000, 10_000],
    detailed: [6_000, 14_000],
    extreme: [8_000, 18_000],
  };
  const [sMin, sMax] = sumRanges[level] ?? [4_000, 10_000];
  const sumMs = msRange(sMin, sMax);

  const inputBytes = Math.floor((5 + Math.random() * 35) * 1024 * 1024);
  const outputBytes = Math.floor((2 + Math.random() * 18) * 1024);

  const tStart = Date.now();
  const metrics: Metrics = { inputBytes };

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
    // --- DOWNLOAD
    jobStatus.status = "DOWNLOADING";
    jobStatus.progress = 10;
    jobStatus.message = `Economy mode: simulating download (${Math.round(
      dlMs / 1000
    )}s)…`;
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(dlMs);
    metrics.downloadMs = dlMs;
    if (failStage === "DOWNLOADING") throw new Error(FAIL_MSG.DOWNLOADING);

    // --- TRANSCRIBE
    jobStatus.status = "TRANSCRIBING";
    jobStatus.progress = 30;
    jobStatus.message = `Economy mode: simulating transcription (${Math.round(
      trMs / 1000
    )}s)…`;
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(trMs);
    metrics.transcribeMs = trMs;
    if (failStage === "TRANSCRIBING") throw new Error(FAIL_MSG.TRANSCRIBING);

    // --- SUMMARIZE
    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    jobStatus.message = `Economy mode: simulating summary (${Math.round(
      sumMs / 1000
    )}s)…`;
    await statusStore.set(jobId, jobStatus, params.userId);
    await sleep(sumMs);
    metrics.summarizeMs = sumMs;
    if (failStage === "SUMMARIZING") throw new Error(FAIL_MSG.SUMMARIZING);

    if (failStage === "BEFORE_READY") throw new Error(FAIL_MSG.BEFORE_READY);

    // --- READY
    jobStatus.status = "READY";
    jobStatus.progress = 100;
    jobStatus.message = "Completed in economy mode (no OpenAI calls).";
    jobStatus.summary =
      "⚠️ Processing disabled. This is a placeholder summary from economy mode.";
    await statusStore.set(jobId, jobStatus, params.userId);

    metrics.outputBytes = outputBytes;
    metrics.totalMs = Date.now() - tStart;
    await saveJobMetrics(jobId, metrics);
  } catch (err) {
    jobStatus.status = "FAILED";
    jobStatus.progress = 100;
    jobStatus.message =
      err instanceof Error ? err.message : "Unknown error (mock)";
    await statusStore.set(jobId, jobStatus, params.userId);

    metrics.totalMs = Date.now() - tStart;
    try {
      await saveJobMetrics(jobId, metrics);
    } catch {}
  }
}
