export const GEMINI_IMAGE_PROMPT =
  "Read all the text visible in this image and transcribe it as plain text. Return only the text, with no explanation.";
export const GEMINI_AUDIO_PROMPT =
  "Listen to this audio recording and produce a full transcript, preserving the original meaning. Return only the text, with no explanation.";

export function buildClaudePrompt(rawText: string, language: string): string {
  return `You are an assistant that writes meeting minutes. Below are the raw notes from a meeting (possibly merged from multiple sources).

Follow these steps exactly:
0. Normalize the language: translate everything into "${language}", and interpret any slang, abbreviations, or shorthand (e.g. informal phrasing meaning "agreed" or "confirmed").
1. Write a concise title (about 3-8 words) naming the main topic of the meeting, into the "title" field.
2. Write a DETAILED, well-organized set of meeting minutes into "summary": a thorough write-up (several sentences or short paragraphs / bullet-style lines, using "\\n" line breaks for structure) that captures the main topics discussed, key points and context, and decisions made. This must be comprehensive — NOT a single sentence.
3. Extract the action items as a list of tasks: for each one, separate out the task description (task), the deadline (deadline), and a short note if needed (note) — e.g. context or additional remarks.

IMPORTANT: Do NOT assign a person-in-charge (PIC) to any task — the user will fill that in by hand. Do NOT classify tasks as "decided" or "proposed".

Return ONLY a valid JSON object, with NO other text, in exactly this shape:
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "deadline": string, "note": string}]}

RAW NOTES:
"""
${rawText}
"""`;
}

export function buildRecheckPrompt(rawText: string, currentJson: string, language: string): string {
  return `Here are the original raw notes and the current result table (which may contain errors).
Re-read the original notes, then review and correct the task/deadline/note fields as needed. The current table has a "pic" field that the user typed in by hand for each task — KEEP each task's "pic" value UNCHANGED, echo it back exactly as given, and do NOT add, edit, or remove any PIC yourself. The current table also has a "title" field — KEEP it as is, or refine it slightly to be more concise if needed, but do NOT leave it blank.
Also keep/refine the detailed, well-organized "summary" (several sentences or short paragraphs / bullet-style lines, using "\\n" line breaks for structure) — it must stay comprehensive, NOT a single sentence.

Return ONLY valid JSON in exactly this shape, in language "${language}":
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

ORIGINAL NOTES:
"""
${rawText}
"""

CURRENT TABLE:
${currentJson}`;
}
