export const GEMINI_IMAGE_PROMPT =
  "Read all the text visible in this image and transcribe it as plain text. Return only the text, with no explanation.";
export const GEMINI_AUDIO_PROMPT =
  "Listen to this audio recording and produce a full transcript, preserving the original meaning. Return only the text, with no explanation.";

export function buildClaudePrompt(rawText: string, language: string): string {
  return `You are an assistant that writes meeting minutes. Below are the raw notes from a meeting (possibly merged from multiple sources).

Follow these steps exactly:
0. Normalize the language: translate everything into "${language}", and interpret any slang, abbreviations, or shorthand (e.g. informal phrasing meaning "agreed" or "confirmed").
1. Write a concise title (about 3-8 words) naming the main topic of the meeting, into the "title" field.
2. Write a CONCISE but COMPLETE set of meeting minutes into "summary", GROUPED BY TOPIC using this EXACT markdown-style convention:
   - Each topic is a heading line starting with "## " followed by a short topic name (e.g. "## Recruitment Plan", "## Interview Logistics").
   - Under each topic, write one or more bullet lines, each starting with "- ", one concise point per line.
   - Use "\\n" line breaks between every line (heading and bullet lines alike).
   - Group related points under the same topic. Create AS MANY topics and bullets as the meeting's content needs — adaptive length, NO fixed count.
   - Each bullet is ONE short line — NO filler, NO repetition, NO long prose. It must still be complete — do not omit a key topic or decision just to stay short — but say it in as few words as possible, while covering every key topic, decision, and action item.
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
Also keep/refine the "summary" so it stays CONCISE but COMPLETE and GROUPED BY TOPIC using this EXACT markdown-style convention: each topic is a heading line starting with "## " followed by a short topic name, and under each topic one or more bullet lines each starting with "- ", one concise point per line, with "\\n" line breaks between every line. Let the number of topics and bullets follow the meeting's actual content (no fixed count) — but still covering every key topic, decision, and action item, with no filler or repetition.

Return ONLY valid JSON in exactly this shape, in language "${language}":
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

ORIGINAL NOTES:
"""
${rawText}
"""

CURRENT TABLE:
${currentJson}`;
}

export function buildTranslatePrompt(currentJson: string, targetLanguage: string): string {
  return `Translate ALL user-facing text of this meeting result into "${targetLanguage}", preserving the EXACT JSON schema and the summary's markdown structure ("## " topic headings and "- " bullet lines — translate the text but keep the markers and line breaks).
Translate the "title" field, the "summary" field, and each task's "task", "deadline", and "note" fields.
IMPORTANT: do NOT translate or alter each task's "pic" field (these are people's names) — echo each "pic" value back UNCHANGED.
Set the "language" field to "${targetLanguage}".

Return ONLY valid JSON in exactly this shape:
{"title": string, "summary": string, "language": "${targetLanguage}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

ORIGINAL RESULT (JSON):
${currentJson}`;
}
