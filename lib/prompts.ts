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
   Each heading is a line starting with "## " followed by the exact heading text above. Under each heading, write one or more bullet lines, each starting with "- ", one concise point per line, putting each point under the best-fitting heading — "## Others" is the catch-all for anything that doesn't fit the first four, and MUST include salary / compensation expectations when mentioned, plus any other details such as notice period, availability / start date, location or work arrangement, and languages. Use "\\n" line breaks between every line (heading and bullet lines alike). Include a heading only if it has at least one point (you may omit an empty one), but prefer to cover Working Experience, Functional Skill, Motivation, and Game Interest whenever the notes mention them. Each bullet is ONE short line — NO filler, NO repetition, NO long prose. It must still be complete — do not omit a key point just to stay short — but say it in as few words as possible, while covering every key point about the candidate.`;

const MEETING_SUMMARY_INSTRUCTION = `2. Write CONCISE but COMPLETE meeting minutes into "summary", following THIS professional structure and order, using the markdown-style convention below (headings start with "## ", bullets start with "- "):
   - "## Meeting Details" — bullet lines capturing the meeting metadata, in this order:
     "- Meeting Type: <a short description of the meeting's type / purpose>"
     "- Attendees: <comma-separated attendee names, with role/title if mentioned>"
     "- Prepared By: <the note-taker's name if it is stated in the notes, otherwise —>"
     "- Classification: Internal"
     Use "—" for any value that is not stated in the notes.
   - "## Objective" — ONE short paragraph (1-2 sentences) stating the goal / purpose of the meeting.
   - Then NUMBERED topic sections, GROUPED BY TOPIC: for EACH major topic, decision area, or agenda item, a heading line "## 1. <Topic Title>", "## 2. <Topic Title>", "## 3. <Topic Title>", ... numbered in order. Under each heading, write a short lead-in sentence and/or one or more "- " bullet lines capturing the discussion, decisions, options, and concrete details (numbers, dates, names) for that topic. You MAY lead a line with a plain "Label: value" (for example "Venue: Indoor (agreed) — reduces cost and weather risk."). Create AS MANY numbered sections as the meeting needs — adaptive, NO fixed count.
   - "## Other Notes" — one or more "- " bullet lines for feedback, reminders, or anything else worth recording. OMIT this heading entirely if there is nothing to note.
   Use "\\n" line breaks between every line (heading and bullet lines alike). Keep each point concise — no filler, no repetition — but COMPLETE: do not omit any key topic, decision, number, name, or date. Put the concrete follow-up ACTION ITEMS into the "tasks" list described below, NOT into the summary.`;

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

// Local "yyyy-MM-dd" for today, injected into prompts so the model can resolve
// years that were not spoken (e.g. "8 January") to the correct upcoming year
// instead of guessing based on its training cut-off.
function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DATES_RULE = (today: string) => `IMPORTANT — dates, years & deadlines:
- Today's date is ${today} (reference only — do NOT add any date that was not actually said).
- For each task, put its due date/time into "deadline" EXACTLY as stated in the source (e.g. "15 October", "12/08", "30 September 2026"). If a task has NO date mentioned at all, leave "deadline" as an empty string "" — never invent one.
- Years: when a year IS stated, copy it EXACTLY. When a year is NOT stated, keep the date as it was said WITHOUT adding a year — do NOT guess, infer, shift, or fall back to a past or previous year.
- Do NOT create a separate "Timeline" / "Milestones" / "Các mốc thời gian" section in the summary — every task deadline / milestone date belongs in the tasks list (Action Items), not as a section in the summary.`;

export function buildClaudePrompt(rawText: string, language: string, sessionType: SessionType = "Meeting"): string {
  const today = todayStr();
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
  const titleInstruction =
    sessionType === "Interview"
      ? `1. Write the "title" field in EXACTLY this format: "[Interview] - <job title> - <candidate's full name>" — it MUST start with the literal prefix "[Interview] - ", then the job title / position the candidate is interviewing for, then " - ", then the candidate's full name. Example: "[Interview] - Social Content Executive - Nguyen Van A". If the job title or the candidate's name is not stated in the notes, put "Unspecified" for that part.`
      : `1. Write the "title" field in EXACTLY this format: "[${sessionType}] - <main topic>" — it MUST start with the literal prefix "[${sessionType}] - ", followed by a short 3-8 word phrase naming the main topic of the ${sourceLabel}. Example: "[${sessionType}] - Q4 Marketing Budget".`;

  return `You are an assistant that writes meeting minutes. Below are the raw notes from a ${sourceLabel} (possibly merged from multiple sources).

Follow these steps exactly:
0. Normalize the language: translate everything into "${language}", and interpret any slang, abbreviations, or shorthand (e.g. informal phrasing meaning "agreed" or "confirmed").
${titleInstruction}
${summaryInstruction}
${tasksInstruction}

IMPORTANT: Do NOT assign a person-in-charge (PIC) to any task — the user will fill that in by hand. Do NOT classify tasks as "decided" or "proposed".

${DATES_RULE(today)}

Return ONLY a valid JSON object, with NO other text, in exactly this shape:
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "deadline": string, "note": string}]}

RAW NOTES:
"""
${rawText}
"""`;
}

export function buildRecheckPrompt(rawText: string, currentJson: string, language: string): string {
  const today = todayStr();
  return `Here are the original raw notes and the current result table (which may contain errors).
Re-read the original notes, then review and correct the task/deadline/note fields as needed. Do NOT invent, guess, or estimate deadlines — a task's "deadline" must be EXPLICITLY stated in the original notes; if it is not clearly stated, set "deadline" to an empty string "". Today's date is ${today} (reference only): put the date into "deadline" exactly as stated; when a date has a year, keep that year EXACTLY; when a date has no year, keep it as stated WITHOUT adding a year — do not infer, shift, or use a past year. The current table has a "pic" field that the user typed in by hand for each task — KEEP each task's "pic" value UNCHANGED, echo it back exactly as given, and do NOT add, edit, or remove any PIC yourself. The current table also has a "title" field — KEEP it as is, or refine it slightly to be more concise if needed, but do NOT leave it blank, and KEEP any leading type prefix like "[Meeting] - " or "[Interview] - " if present.
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

export function buildUpdatePrompt(sourceText: string, currentJson: string, language: string): string {
  const today = todayStr();
  return `Here are the (possibly edited) SOURCE NOTES and the CURRENT meeting minutes/action-items JSON (the user may have hand-entered "pic" values).
Update the summary and action items in "${language}" so they accurately reflect the SOURCE NOTES — add, revise, or remove items as needed to match the source.

Rules:
- KEEP the summary's existing markdown structure and format — its "## " headings, and any markdown TABLE under "## Meeting Content" using "|" pipes (keep that table shape: same headers, same "| --- |" separator, same number of columns) — while updating its content to match the SOURCE NOTES.
- KEEP the "title" AS-IS, including any leading type prefix such as "[Meeting] - ", "[Interview] - ", or "[Other] - " — only refine it if the SOURCE NOTES clearly change the topic.
- For each task that still applies, KEEP its existing "pic" value UNCHANGED — echo it back exactly as given, and do NOT add, edit, or remove any PIC yourself. New tasks get "pic" set to an empty string "".
- Do NOT duplicate tasks — if the SOURCE NOTES only confirm or elaborate an existing task, update that task's fields instead of adding a new one.
- Do NOT invent, guess, or estimate deadlines or dates. A task's "deadline" must be EXPLICITLY stated in the SOURCE NOTES; if it is not clearly stated, set "deadline" to an empty string "". Likewise, only keep or add a date in the summary when it was explicitly stated.
- Today's date is ${today} (reference only): put the date into "deadline" exactly as stated; when a date has a year, keep that year EXACTLY; when a date has no year, keep it as stated WITHOUT adding a year — do not infer, shift, or use a past year.

Return ONLY valid JSON in exactly this shape:
{"title": string, "summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "deadline": string, "note": string}]}

SOURCE NOTES:
"""
${sourceText}
"""

CURRENT RESULT:
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
