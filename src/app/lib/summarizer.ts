import { statusStore } from "@/app/lib/statusStore";
import { SummaryLevel } from "@/app/types/JobStatus";
import { openai } from "@/app/config/openai";
import { detectLanguage } from "@/app/lib/langUtils";

export async function generateSummary(
  jobId: string,
  transcript: string,
  level: SummaryLevel
): Promise<string> {
  const jobStatus = statusStore.get(jobId);
  if (jobStatus) {
    jobStatus.status = "SUMMARIZING";
    jobStatus.progress = 70;
    statusStore.set(jobId, jobStatus);
  }

  const detectedLang = detectLanguage(transcript);

  const systemPrompt = `
You are a helpful assistant that summarizes audio transcripts for the user.
Use clear, grammatically correct language.

The summary must strictly match the level requested by the user,
while adjusting length proportionally to the total length of the transcript.

- **short**: Very brief version, ideally covering only the main idea.
  For very long content (e.g., over 30 minutes), still keep it under 5–6 sentences.
- **medium**: Short, single paragraph, summarizing key points and context.
  Should not exceed 10–12 sentences, regardless of transcript length.
- **detailed**: Well-structured multi-section summary with bullet points, numbered lists and key quotes.
  More detailed for longer transcripts, including context and examples.
- **extreme**: In-depth, almost transcript-like version, with clear sections, bullet points, timestamps (if available) and all important context. Use as much detail as necessary, no strict limit.

Always format your output as clear, structured markdown:
- Start with an H1 title for "Summary" in the same language as the transcript.
- Use "##" for main sections.
- Use bullet points or numbered lists for details.
- Add short explanatory paragraphs under each section if needed.
- Do not include any advertisements, promo codes or unrelated content.

Only use information from the provided transcript. Do not add anything invented or hallucinated.

Always detect the transcript’s main language and always answer strictly in that language.
If an ISO code is given, resolve it to the full language name.
Never translate unless explicitly asked.
Ignore subtitles credits, outro credits, YouTube watermarks, and any non-content text like “Napisy stworzone przez społeczność Amara.org”.
Never include such lines in your summary.
`;

  const userPrompt = `
Here is the transcript:

"""
${transcript}
"""

The transcript’s main language is: ${detectedLang}.
If the language is Unknown, detect it from the text itself.
Always answer strictly in ${detectedLang} (or the detected one).

Please generate a ${level} summary.
Adjust the length proportionally to the transcript’s length.
Follow the formatting instructions.
Do not add any content that is not in the transcript.
`;

  const completion = await openai.chat.completions.create({
    model: "o4-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  if (jobStatus) {
    jobStatus.status = "READY";
    jobStatus.progress = 100;
    statusStore.set(jobId, jobStatus);
  }

  return completion.choices[0].message.content || "";
}
