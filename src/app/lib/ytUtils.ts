import { spawn } from "child_process";

export function getYoutubeVideoDurationSeconds(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ytDlp = spawn("yt-dlp", ["-j", url]);

    let output = "";

    ytDlp.stdout.on("data", (data) => {
      output += data.toString();
    });

    ytDlp.stderr.on("data", (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

    ytDlp.on("close", (code) => {
      if (code === 0) {
        try {
          const json = JSON.parse(output);
          resolve(json.duration);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          reject(new Error("Failed to parse yt-dlp output"));
        }
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}
