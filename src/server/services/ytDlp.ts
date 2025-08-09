import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";
import { mkdir } from "fs/promises";

type DlOpts = {
  cookiesPath?: string;
  preferIpv4?: boolean;
  concurrentFragments?: number;
  retries?: number;
  maxSeconds?: number;
  ffmpegKbps?: number;
  ffmpegAr?: number;
  ffmpegMono?: boolean;
};

export async function downloadAudioFromYoutube(
  url: string,
  outputFileName: string,
  opts: DlOpts = {}
): Promise<string> {
  const outputDir = path.join(os.tmpdir(), "briefly-ai");
  await mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${outputFileName}.m4a`);

  const {
    cookiesPath = process.env.YTDLP_COOKIES_PATH,
    preferIpv4 = true,
    concurrentFragments = 4,
    retries = 10,
    maxSeconds,
    ffmpegKbps = 48,
    ffmpegAr = 16000,
    ffmpegMono = true,
  } = opts;

  const ppa = [
    ffmpegMono ? "-ac 1" : "",
    `-ar ${ffmpegAr}`,
    `-b:a ${ffmpegKbps}k`,
  ]
    .filter(Boolean)
    .join(" ");

  const baseArgs: string[] = [
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
    ...(preferIpv4 ? ["-4"] : []),
    "--extract-audio",
    "--audio-format",
    "m4a",
    "--postprocessor-args",
    `ffmpeg:${ppa}`,
    ...(typeof maxSeconds === "number" && maxSeconds > 0
      ? ["--download-sections", `*0-${maxSeconds}`]
      : []),

    "--no-continue",
    "--no-part",
    "-o",
    outputPath,
    "--add-header",
    "Referer:https://www.youtube.com/",
    "--add-header",
    "Accept-Language: en-US,en;q=0.9",
    "--user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  ];

  if (cookiesPath && fs.existsSync(cookiesPath)) {
    baseArgs.push("--cookies", cookiesPath);
  }

  try {
    await runYtDlp([...baseArgs, url], "web");
    return outputPath;
  } catch (e) {
    const msg = stringifyError(e);
    const probablyRestricted =
      /HTTP Error 403|Sign in to confirm|age-restricted|region|denied/i.test(
        msg
      );

    if (probablyRestricted) {
      try {
        await runYtDlp(
          [
            ...baseArgs,
            "--extractor-args",
            "youtube:player_client=android",
            url,
          ],
          "android"
        );
        return outputPath;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e2) {
        await runYtDlp(
          [
            ...baseArgs,
            "--extractor-args",
            "youtube:player_client=web_safari",
            url,
          ],
          "web_safari"
        );
        return outputPath;
      }
    }

    throw new Error(msg);
  }
}

function runYtDlp(
  args: string[],
  label: "web" | "android" | "web_safari"
): Promise<void> {
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

      reject(
        new Error(
          `[yt-dlp:${label}] exited with code ${code}\n` +
            `args: ${JSON.stringify(args)}\n` +
            (stderrBuf ? `stderr:\n${stderrBuf}\n` : "") +
            (stdoutBuf ? `stdout:\n${stdoutBuf}\n` : "")
        )
      );
    });
  });
}

function stringifyError(e: unknown): string {
  if (e instanceof Error) return e.message || String(e);
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    return String(e);
  }
}
