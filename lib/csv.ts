import type { MeetingResult } from "./types";
const q = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
export function tasksToCsv(result: MeetingResult): string {
  const header = "Task,PIC,Loại,Deadline,Reference";
  const rows = result.tasks.map((t) =>
    [t.task, t.pic, t.type === "chot" ? "Chốt" : "Đề xuất", t.deadline, t.reference].map(q).join(","));
  return [header, ...rows].join("\n");
}
