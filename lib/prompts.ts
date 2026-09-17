export const GEMINI_IMAGE_PROMPT =
  "Read all the text visible in this image and transcribe it as plain text. Return only the text, with no explanation.";
export const GEMINI_AUDIO_PROMPT =
  "Listen to this audio recording and produce a full transcript, preserving the original meaning. Return only the text, with no explanation.";
export const GEMINI_PDF_PROMPT =
  "Read all the text and content from this PDF document and transcribe it as plain text, preserving the meaning and structure. Return only the text, with no explanation.";

export type SessionType = "Meeting" | "Interview" | "Other";

const INTERVIEW_SUMMARY_INSTRUCTION = `2. Write a CONCISE but COMPLETE candidate summary into "summary", grouping the candidate information under EXACTLY these headings, IN THIS ORDER (use this exact heading text), using this EXACT markdown-style convention:
   - "## Working Experience"
   - "## Functional Skill"
   - "## Motivation"
   - "## Game Interest"
   - "## Others"
   Each heading is a line starting with "## " followed by the exact heading text above. Under each heading, write one or more bullet lines, each starting with "- ", one concise point per line, putting each point under the best-fitting heading — "## Others" holds anything that doesn't fit the first four. Use "\\n" line breaks between every line (heading and bullet lines alike). Include a heading only if it has at least one point (you may omit an empty one), but prefer to cover Working Experience, Functional Skill, Motivation, and Game Interest whenever the notes mention them. Each bullet is ONE short line — NO filler, NO repetition, NO long prose. It must still be complete — do not omit a key point just to stay short — but say it in as few words as possible, while covering every key point about the candidate.`;

const MEETING_SUMMARY_INSTRUCTION = `2. Write a CONCISE but COMPLETE set of meeting minutes into "summary", using this EXACT markdown-style convention with these headings:
   - "## Attendees" — one or more "- " bullet lines listing the attendees (and role/title if mentioned).
   - "## Meeting Content" — the discussion GROUPED BY TOPIC, written as a GitHub-style markdown TABLE directly under the heading, in EXACTLY this shape:
     "| No. | Topic | Discussion | Owner |"
     "| --- | --- | --- | --- |"
     "| 1 | <short topic> | <concise discussion of that topic> | <owner name, or — if unknown> |"
     One row per key topic, numbered from 1. Keep each cell concise — no filler, no repetition, no long prose. Put "—" in the Owner cell when the owner isn't identifiable. Do NOT put "|" characters inside a cell.
   - "## Other Notes" — one or more "- " bullet lines for anything else worth recording (omit this heading entirely if there is nothing to note).
   Each heading is a line starting with "## " followed by the exact heading text above. Use "\\n" line breaks between every line (heading, table, and bullet lines alike). Create AS MANY rows under "## Meeting Content" as the meeting's content needs — adaptive length, NO fixed count. Keep "## Attendees" and "## Other Notes" as "- " bullet lists exactly as described. It must still be complete — do not omit a key topic or decision just to stay short — but say it in as few words as possible, while covering every key topic, decision, and action item.`;

const OTHER_SUMMARY_INSTRUCTION = `2. Write a CONCISE but COMPLETE summary into "summary", FREESTYLE according to the actual content (no fixed set of headings) but STILL GROUPED into small topics, using this EXACT markdown-style convention:
   - Each topic is a heading line starting with "## " followed by a short topic name that fits the content.
   - Under each topic, one or more bullet lines each starting with "- ", one concise point per line.
   - Use "\\n" line breaks between every line (heading and bullet lines alike). Create AS MANY topics and bullets as the content needs — adaptive length, NO fixed count.
   Each bullet is ONE short line — NO filler, NO repetition, NO long prose. It must still be complete — do not omit a key point just to stay short — but say it in as few words as possible, while covering every key point.`;

const OTHER_TASKS_INSTRUCTION =
  "3. Extract any action items or follow-ups as a list of tasks: for each one, separate out the task description (task), the deadline (deadline), and a short note if needed (note). If there are none, return an empty tasks list.";

const INTERVIEW_TASKS_INSTRUCTION =
  "3. Extract the follow-up actions (e.g. next interview round, send assessment) as a list of tasks: for each one, separate out the task description (task), the deadline (deadline), and a short note if needed (note) — e.g. context or additional remarks.";

const MEETING_TASKS_INSTRUCTION =
  "3. Extract the concrete decisions and action items as a list of tasks: for each one, separate out the task description (task), the deadline (deadline), and a short note if needed (note) — e.g. context or additional remarks.";

export function buildClaudePrompt(rawText: string, language: string, sessionType: SessionType = "Meeting"): string {
  const sourceLabel =
    sessionType === "Interview" ? "candidate interview" : sessionType === "Other" ? "session" : "meeting";
  const summaryInstruction =
    sessionType === "Interview"
      ? INTERVIEW_SUMMARY_INSTRUCTION
      : sessionType === "Other"
        ? OTHER_SUMMARY_INSTRUCTION
        : MEETING_SUMMARY_INSTRUCTION;
  const tasksInstruction =
    sessionType === "Interview"
      ? INTERVIEW_TASKS_INSTRUCTION
      : sessionType === "Other"
        ? OTHER_TASKS_INSTRUCTION
        : MEETING_TASKS_INSTRUCTION;

  return `You are an assistant that writes meeting minutes. Below are the raw notes from a ${sourceLabel} (possibly merged from multiple sources).

Follow these steps exactly:
0. Normalize the language: translate everything into "${language}", and interpret any slang, abbreviations, or shorthand (e.g. informal phrasing meaning "agreed" or "confirmed").
1. Write the "title" field in EXACTLY this format: "[${sessionType}] - <main topic>" — it MUST start with the literal prefix "[${sessionType}] - ", followed by a short 3-8 word phrase naming the main topic of the ${sourceLabel} (for an interview, the candidate/role; for a meeting, the subject). Example: "[${sessionType}] - Q4 Marketing Budget".
${summaryInstruction}
${tasksInstruction}

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
Re-read the original notes, then review and correct the task/deadline/note fields as needed. The current table has a "pic" field that the user typed in by hand for each task — KEEP each task's "pic" value UNCHANGED, echo it back exactly as given, and do NOT add, edit, or remove any PIC yourself. The current table also has a "title" field — KEEP it as is, or refine it slightly to be more concise if needed, but do NOT leave it blank, and KEEP any leading type prefix like "[Meeting] - " or "[Interview] - " if present.
Also keep/refine the "summary" so it stays CONCISE but COMPLETE and GROUPED BY TOPIC using this EXACT markdown-style convention: each topic is a heading line starting with "## " followed by a short topic name, and under each topic one or more bullet lines each starting with "- ", one concise point per line, with "\\n" line breaks between every line. Also preserve any markdown TABLES in the summary (lines using "|" pipes and a "| --- |" separator row, such as under a "## Meeting Content" heading) — keep the table shape (same headers, same "| --- |" separator, same number of columns) and only correct the cell text as needed. Let the number of topics and bullets follow the meeting's actual content (no fixed count) — but still covering every key topic, decision, and action item, with no filler or repetition.

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
  return `Translate ALL user-facing text of this meeting result into "${targetLanguage}", preserving the EXACT JSON schema and the summary's markdown structure ("## " topic headings and "- " bullet lines — translate the text but keep the markers and line breaks). Also preserve any markdown TABLES in the summary (lines using "|" pipes and a "| --- |" separator row) — translate the cell text but keep the table shape (same headers, same "| --- |" separator, same number of columns and rows).
Translate the "title" field, the "summary" field, and each task's "task", "deadline", and "note" fields.
IMPORTANT: do NOT translate or alter each task's "pic" field (these are people's names) — echo each "pic" value back UNCHANGED.
Set the "language" field to "${targetLanguage}".

Return ONLY valid JSON in exactly this shape:
{"title": string, "summary": string, "language": "${targetLanguage}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

ORIGINAL RESULT (JSON):
${currentJson}`;
}
