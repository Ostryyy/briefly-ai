import { spawn } from "child_process";
import path from "path";

export async function transcodeForWhisper(
  input: string,
  outExt = "m4a",
  kbps = 48
) {
  const inExt = path.extname(input);
  const wantedExt = `.${outExt}`;

  const output =
    inExt.toLowerCase() === wantedExt.toLowerCase()
      ? input.replace(inExt, `.whisper${wantedExt}`)
      : input.replace(inExt, wantedExt);

  await new Promise<void>((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-i",
        input,

        "-vn",
        "-sn",
        "-dn",

        "-ac",
        "1",
        "-ar",
        "16000",
        "-b:a",
        `${kbps}k`,
        output,
      ],
      { stdio: "inherit" }
    );

    ff.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))
    );
  });

  return output;
}
