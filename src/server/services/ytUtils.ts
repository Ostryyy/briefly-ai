import "server-only";
import { spawn } from "node:child_process";
import { getCookiesArgs } from "./ytdlpShared";
import { runtimeYtDlpPath } from "@server/config/runtime";

export type YtMetaOpts = {
  binaryPath?: string;
  timeoutMs?: number;
};

export function getYoutubeVideoDurationSeconds(
  url: string,
  opts: YtMetaOpts = {}
): Promise<number> {
  const ytBin = opts.binaryPath ?? runtimeYtDlpPath();
  const timeoutMs = opts.timeoutMs ?? 60_000;

  const cookies = getCookiesArgs();

  return new Promise<number>((resolve, reject) => {
    const args = ["--no-playlist", "--skip-download", "-j", ...cookies, url];
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
      reject(new Error(`Failed to spawn yt-dlp (${ytBin}): ${err.message}`));
    });

    child.stdout.on("data", (b) => (stdoutBuf += b.toString()));
    child.stderr.on("data", (b) => (stderrBuf += b.toString()));

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      const restricted =
        /HTTP Error 403|Sign in to confirm|age-?restricted|region|denied|membership|private|login/i;

      if (code !== 0 && restricted.test(stderrBuf)) {
        const alt = await runOnce(ytBin, [
          "--no-playlist",
          "--skip-download",
          "-j",
          "--extractor-args",
          "youtube:player_client=android",
          ...cookies,
          url,
        ]);
        if (alt.code === 0) {
          const d = pickDurationFromJsonLines(alt.stdout);
          return d != null
            ? resolve(d)
            : reject(new Error("Unable to parse video duration"));
        }
      }

      if (code !== 0) {
        return reject(
          new Error(
            `yt-dlp exited with code ${code}. Stderr:\n${
              stderrBuf || "(empty)"
            }`
          )
        );
      }

      const duration = pickDurationFromJsonLines(stdoutBuf);
      return duration != null
        ? resolve(duration)
        : reject(
            new Error(
              "Could not determine video duration from yt-dlp metadata."
            )
          );
    });
  });
}

function pickDurationFromJsonLines(buf: string): number | null {
  const lines = buf
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { duration?: number };
      if (typeof obj.duration === "number" && Number.isFinite(obj.duration))
        return obj.duration;
    } catch {}
  }
  return null;
}

function runOnce(cmd: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string; code: number }>(
    (res) => {
      const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let out = "",
        err = "";
      p.stdout.on("data", (d) => (out += d.toString()));
      p.stderr.on("data", (d) => (err += d.toString()));
      p.on("close", (code) =>
        res({ stdout: out.trim(), stderr: err.trim(), code: code ?? 0 })
      );
    }
  );
}
