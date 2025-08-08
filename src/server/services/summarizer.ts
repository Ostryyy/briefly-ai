import "server-only";
import { detectLanguage } from "@server/services/langUtils";
import { openai, MODELS } from "@server/clients/openai";
import type { SummaryLevel } from "@shared/types/job";

function sanitizeTranscript(raw: string): string {
  let t = raw ?? "";
  t = t.slice(0, 120_000);
  t = t.replace(/https?:\/\/\S+/gi, " ");
  t = t.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ");
  t = t.replace(/\[[^\]]+\]/g, " ");
  t = t.replace(
    /^(?:subtitles?|captions?).*(?:created|made).*(?:community|crowd)/gim,
    " "
  );
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export async function generateSummary(
  transcript: string,
  level: SummaryLevel
): Promise<string> {
  const client = openai();

  const clean = sanitizeTranscript(transcript);
  const detected = detectLanguage(clean);

  const languageInstruction =
    detected === "Unknown"
      ? `Detect the transcript's main language and answer strictly in that language.`
      : `Always answer strictly in ${detected}.`;

  const systemPrompt = `
You are a helpful assistant that summarizes audio transcripts for the user.
Use clear, grammatically correct language.

The summary must strictly match the level requested by the user,
while adjusting length proportionally to the total length of the transcript.

- short: Very brief version covering only the main idea (cap at ~5–6 sentences even for long content).
- medium: One concise paragraph, up to 8–12 sentences.
- detailed: Multi-section summary with headings, bullet points, numbered lists, and key quotes/examples.
- extreme: In-depth notes with clear sections, bullet points, and timestamps if present.

Formatting rules (return pure Markdown only, no code fences, no preamble):
- Start with an H1 title in the transcript language, e.g. "# Summary".
- Use "##" for main sections.
- Use bullet/numbered lists for details.
- Do not include ads, promo codes, watermarks, credits, or unrelated content.
- Do not invent facts; only use information present in the transcript.

Ignore subtitle credits, outro credits, watermarks, or any non-content text.
`.trim();

  const userPrompt = `
${languageInstruction}

Transcript:
"""
${clean}
"""

Generate a **${level}** summary.
Adjust length proportionally to the transcript's length.
Follow the formatting instructions strictly.
Return only Markdown starting with an H1. Do not wrap in backticks.
`.trim();

  const completion = await client.chat.completions.create({
    model: MODELS.summarizer,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const summary = completion.choices?.[0]?.message?.content?.trim() ?? "";
  if (!summary) throw new Error("Empty summary from model");
  return summary;
}
