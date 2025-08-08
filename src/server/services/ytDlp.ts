import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

type DlOpts = {
  cookiesPath?: string;
  preferIpv4?: boolean;
  concurrentFragments?: number;
  retries?: number;
};

export async function downloadAudioFromYoutube(
  url: string,
  outputFileName: string,
  opts: DlOpts = {}
): Promise<string> {
  const outputDir = path.join(os.tmpdir(), "briefly-ai");
  const outputPath = path.join(outputDir, `${outputFileName}.m4a`);

  const {
    cookiesPath = process.env.YTDLP_COOKIES_PATH,
    preferIpv4 = true,
    concurrentFragments = 4,
    retries = 10,
  } = opts;

  const baseArgs = [
    "--no-playlist",
    "-f",
    "bestaudio/best",
    "-N",
    String(concurrentFragments),
    "-R",
    String(retries),
    "--fragment-retries",
    String(retries),
    "--retry-sleep",
    "1",
    ...(preferIpv4 ? (["-4"] as const) : []),
    "--extract-audio",
    "--audio-format",
    "m4a",
    "--audio-quality",
    "5",
    "--no-continue",
    "--no-part",
    "-o",
    outputPath,
    "--add-header",
    "Referer:https://www.youtube.com/",
    "--add-header",
    "Accept-Language: en-US,en;q=0.9",
  ];

  if (cookiesPath && fs.existsSync(cookiesPath)) {
    baseArgs.push("--cookies", cookiesPath);
  }

  try {
    await runYtDlp([...baseArgs, url], "web");
    return outputPath;
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message ?? String(e)
        : typeof e === "string"
        ? e
        : (() => {
            try {
              return JSON.stringify(e);
            } catch {
              return String(e);
            }
          })();

    const probablyRestricted =
      /HTTP Error 403|Sign in to confirm|age-restricted|region/i.test(msg);

    if (probablyRestricted) {
      await runYtDlp(
        [...baseArgs, "--extractor-args", "youtube:player_client=android", url],
        "android"
      );
      return outputPath;
    }

    throw new Error(msg);
  }
}

function runYtDlp(args: string[], label: "web" | "android"): Promise<void> {
  return new Promise((resolve, reject) => {
    const ytDlp = spawn("yt-dlp", args, { windowsHide: true });

    let stderrBuf = "";
    let stdoutBuf = "";

    ytDlp.stdout.on("data", (d) => {
      stdoutBuf += d.toString();
    });
    ytDlp.stderr.on("data", (d) => {
      stderrBuf += d.toString();
    });

    ytDlp.on("close", (code) => {
      if (code === 0) return resolve();

      const err = new Error(
        `[yt-dlp:${label}] exited with code ${code}\n` +
          `args: ${JSON.stringify(args)}\n` +
          (stderrBuf ? `stderr:\n${stderrBuf}\n` : "") +
          (stdoutBuf ? `stdout:\n${stdoutBuf}\n` : "")
      );
      reject(err);
    });
  });
}
