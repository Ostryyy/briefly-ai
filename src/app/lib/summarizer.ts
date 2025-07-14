import OpenAI from "openai";
import { statusStore } from "@/app/lib/statusStore";
import { SummaryLevel } from "@/app/types/JobStatus";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const systemPrompt = `
You are a helpful assistant that summarizes audio transcripts for the user.
Always answer in the same language as the transcript.
Use clear, grammatically correct language.
The summary level must match the user’s request: 
- short = very brief, a few sentences,
- medium = short paragraph,
- detailed = detailed points with key quotes,
- extreme = almost like detailed notes.

Do not add content that is not in the transcript.
`;


  const userPrompt = `
Here is the transcript:

"""
${transcript}
"""

Please generate a ${level} summary.
Follow the system instructions.
`;


  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
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
