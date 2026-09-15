import type { MeetingResult } from "./types";
import { formatDateLong } from "./formatDate";

// Prefix values that look like spreadsheet formulas with a single quote so opening the
// CSV in Excel/Sheets never executes them (CSV formula injection).
const q = (s: string) => {
  const v = s ?? "";
  const safe = /^\s*[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Turn one line of the markdown-style summary into a readable plain cell:
// "## Topic" -> "Topic", "- point"/"* point"/"• point" -> "• point".
function summaryLineToCell(line: string): string {
  const t = line.trim();
  if (t.startsWith("## ")) return t.slice(3).trim();
  if (t.startsWith("- ") || t.startsWith("* ")) return `• ${t.slice(2).trim()}`;
  if (t.startsWith("• ")) return t;
  return t;
}

export const TASK_HEADER = "No.,Task,PIC,Deadline,Note";

// Builds a single .csv that Excel/Sheets open directly: the meeting title, date and
// minutes at the top, then the action-items table.
export function tasksToCsv(result: MeetingResult, date?: string): string {
  const lines: string[] = [];

  lines.push([q("Title"), q(result.title ?? "")].join(","));
  lines.push([q("Date"), q(formatDateLong(date))].join(","));
  lines.push("");

  lines.push(q("MINUTES"));
  for (const raw of (result.summary ?? "").split("\n")) {
    if (!raw.trim()) {
      lines.push("");
      continue;
    }
    lines.push(q(summaryLineToCell(raw)));
  }
  lines.push("");

  lines.push(q("ACTION ITEMS"));
  lines.push(TASK_HEADER);
  result.tasks.forEach((t, i) => {
    lines.push([String(i + 1), t.task, t.pic, t.deadline, t.note].map(q).join(","));
  });

  return lines.join("\n");
}
