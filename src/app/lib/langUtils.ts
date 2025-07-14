import {franc} from "franc";

const langMap: Record<string, string> = {
  pol: "Polish",
  eng: "English",
  deu: "German",
  ger: "German",
  rus: "Russian",
  ukr: "Ukrainian",
  fra: "French",
  spa: "Spanish",
};

export function detectLanguage(text: string): string {
  const code = franc(text);
  if (code === "und") {
    return "Unknown";
  }
  return langMap[code] || `Unknown (${code})`;
}
