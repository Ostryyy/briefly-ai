import "server-only";
import { spawn } from "node:child_process";

export type YtMetaOpts = {
  binaryPath?: string;
  timeoutMs?: number;
};

export function getYoutubeVideoDurationSeconds(
  url: string,
  opts: YtMetaOpts = {}
): Promise<number> {
  const ytBin = opts.binaryPath ?? process.env.YTDLP_PATH ?? "yt-dlp";
  const timeoutMs = opts.timeoutMs ?? 15 * 60 * 1000;

  return new Promise<number>((resolve, reject) => {
    const args = ["--no-playlist", "--skip-download", "-j", url];

    const child = spawn(ytBin, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdoutBuf = "";
    let stderrBuf = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {}
      reject(new Error("yt-dlp timed out while fetching metadata"));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Failed to spawn yt-dlp (${ytBin}). Is it installed and on PATH? Original error: ${err.message}`
        )
      );
    });

    child.stdout.on("data", (buf: Buffer) => {
      stdoutBuf += buf.toString();
    });

    child.stderr.on("data", (buf: Buffer) => {
      stderrBuf += buf.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        if (/HTTP Error 403|fragment .* not found/i.test(stderrBuf)) {
          reject(
            new Error(
              "yt-dlp returned HTTP 403 / fragment not found. The video may be age/region restricted or temporarily unavailable."
            )
          );
          return;
        }
        reject(
          new Error(
            `yt-dlp exited with code ${code}. Stderr:\n${
              stderrBuf || "(empty)"
            }`
          )
        );
        return;
      }

      const lines = stdoutBuf
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as { duration?: number };
          if (
            obj &&
            typeof obj.duration === "number" &&
            Number.isFinite(obj.duration)
          ) {
            resolve(obj.duration);
            return;
          }
        } catch {
          // ignore parse errors for non-JSON lines
        }
      }

      reject(
        new Error(
          "Could not determine video duration from yt-dlp metadata (possibly a livestream or missing duration field)."
        )
      );
    });
  });
}
