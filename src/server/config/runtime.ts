import { env } from "@server/config/env";

export function runtimeLimits() {
  return {
    MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB ?? env.MAX_UPLOAD_MB),
    RATE_LIMIT_PER_MIN: Number(
      process.env.RATE_LIMIT_PER_MIN ?? env.RATE_LIMIT_PER_MIN
    ),
    MAX_VIDEO_MINUTES: Number(
      process.env.MAX_VIDEO_MINUTES ?? env.MAX_VIDEO_MINUTES
    ),
  };
}

export function runtimeYtDlpPath() {
  return process.env.YTDLP_PATH ?? env.YTDLP_PATH ?? "yt-dlp";
}

export function runtimeMockMode(): boolean {
  const v = process.env.MOCK_MODE ?? String(env.MOCK_MODE);
  return String(v).toLowerCase() === "true";
}
