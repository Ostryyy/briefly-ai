import { spawn } from "child_process";
import path from "path";
import os from "os";

export function downloadAudioFromYoutube(url: string, outputFileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(os.tmpdir(), "briefly-ai");
    const outputPath = path.join(outputDir, `${outputFileName}.m4a`);

    const ytDlp = spawn("yt-dlp", [
      "-f", "bestaudio",
      "--extract-audio",
      "--audio-format", "m4a",
      "--audio-quality", "5",
      "-o", outputPath,
      url
    ]);

    ytDlp.stderr.on("data", (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

    ytDlp.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}
