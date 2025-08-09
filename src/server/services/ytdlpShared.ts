import fs from "fs";

export function getCookiesArgs(): string[] {
  const p = process.env.YTDLP_COOKIES_PATH;
  return p && fs.existsSync(p) ? ["--cookies", p] : [];
}
