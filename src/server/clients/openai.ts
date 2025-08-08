import "server-only";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in env");
}

let _client: OpenAI | null = null;

export function openai() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export const MODELS = {
  summarizer: process.env.OPENAI_SUMMARY_MODEL ?? "o4-mini",
  transcription: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
};
