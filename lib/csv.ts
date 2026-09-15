import type { MeetingResult } from "./types";
// Prefix values that look like spreadsheet formulas with a single quote so opening the
// CSV in Excel/Sheets never executes them (CSV formula injection).
const q = (s: string) => {
  const v = s ?? "";
  const safe = /^\s*[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function tasksToCsv(result: MeetingResult): string {
  const header = "No.,Task,PIC,Deadline,Note";
  const rows = result.tasks.map((t, i) =>
    [String(i + 1), t.task, t.pic, t.deadline, t.note].map(q).join(","));
  return [header, ...rows].join("\n");
}
