import "server-only";
import { francAll } from "franc";

const WHITELIST = [
  "pol",
  "eng",
  "deu",
  "rus",
  "ukr",
  "bel",
  "ces",
  "slk",
  "slv",
  "hrv",
  "srp",
  "bos",
  "bul",
  "ron",
  "hun",
  "lit",
  "lav",
  "est",
  "nld",
  "ita",
  "spa",
  "por",
  "fra",
  "swe",
  "nor",
  "dan",
  "fin",
  "ell",
  "tur",
  "ara",
  "heb",
] as const;

const langMap: Record<string, string> = {
  pol: "Polish",
  eng: "English",
  deu: "German",
  ger: "German",
  rus: "Russian",
  ukr: "Ukrainian",
  bel: "Belarusian",
  ces: "Czech",
  slk: "Slovak",
  slv: "Slovenian",
  hrv: "Croatian",
  srp: "Serbian",
  bos: "Bosnian",
  bul: "Bulgarian",
  ron: "Romanian",
  hun: "Hungarian",
  lit: "Lithuanian",
  lav: "Latvian",
  est: "Estonian",
  nld: "Dutch",
  ita: "Italian",
  spa: "Spanish",
  por: "Portuguese",
  fra: "French",
  swe: "Swedish",
  nor: "Norwegian",
  dan: "Danish",
  fin: "Finnish",
  ell: "Greek",
  tur: "Turkish",
  ara: "Arabic",
  heb: "Hebrew",
};

function normalizeInput(text: string): string {
  let t = text.slice(0, 20000);
  t = t.replace(/https?:\/\/\S+/gi, " ");
  t = t.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ");
  t = t.replace(/\[[^\]]+\]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function heuristicGuess(text: string): string | null {
  const sample = text.slice(0, 5000);
  if (/[ąćęłńóśźż]/i.test(sample)) return "Polish";
  const hasUkr = /[іїє]/i.test(sample);
  const hasRus = /[ёъыэ]/i.test(sample);
  if (hasUkr && !hasRus) return "Ukrainian";
  if (hasRus && !hasUkr) return "Russian";
  return null;
}

export function detectLanguage(raw: string): string {
  if (!raw || raw.trim().length < 10) return "Unknown";

  const text = normalizeInput(raw);
  if (text.length < 10) return "Unknown";

  try {
    const candidates = francAll(text, { minLength: 20 });

    const allowed =
      candidates.find(([c]) =>
        (WHITELIST as readonly string[]).includes(c as string)
      ) ?? candidates[0];

    const code = allowed?.[0] ?? "und";

    if (code === "und") {
      const h = heuristicGuess(text);
      return h ?? "Unknown";
    }

    return langMap[code] || `Unknown (${code})`;
  } catch {
    const h = heuristicGuess(text);
    return h ?? "Unknown";
  }
}
