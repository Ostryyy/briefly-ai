import fs from "fs";
import { env } from "@server/config/env";

export function getCookiesArgs(): string[] {
  const p = env.YTDLP_COOKIES_PATH;
  return p && fs.existsSync(p) ? ["--cookies", p] : [];
}
