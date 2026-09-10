import type { MeetingResult } from "./types";
// Prefix values that look like spreadsheet formulas with a single quote so opening the
// CSV in Excel/Sheets never executes them (CSV formula injection).
const q = (s: string) => {
  const v = s ?? "";
  const safe = /^\s*[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};
export function tasksToCsv(result: MeetingResult): string {
  const header = "Task,PIC,Loại,Deadline,Reference";
  const rows = result.tasks.map((t) =>
    [t.task, t.pic, t.type === "chot" ? "Chốt" : "Đề xuất", t.deadline, t.reference].map(q).join(","));
  return [header, ...rows].join("\n");
}
