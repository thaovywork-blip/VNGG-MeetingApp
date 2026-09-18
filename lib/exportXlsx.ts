import * as XLSX from "xlsx";
import { formatDateLong } from "./formatDate";
import { parseSummaryBlocks } from "./parseSummary";
import type { MeetingResult } from "./types";

// Flattens the markdown-style summary (see parseSummary.ts) into worksheet rows:
// headings and bullets become single-cell rows, a markdown table becomes its own
// header row + data rows (real cells, not a squashed string).
function summaryToRows(summary: string): (string | number)[][] {
  const rows: (string | number)[][] = [];
  for (const block of parseSummaryBlocks(summary)) {
    if (block.type === "heading") {
      rows.push([block.text]);
    } else if (block.type === "bullets") {
      for (const item of block.items) rows.push([`• ${item}`]);
    } else if (block.type === "table") {
      rows.push(block.headers);
      for (const row of block.rows) rows.push(row);
    } else {
      rows.push([block.text]);
    }
  }
  return rows;
}

// Builds a client-side .xlsx workbook for the current meeting result and triggers a
// browser download. One sheet: title/date, the minutes, a blank row, then the
// action-items table.
export function downloadXlsx(result: MeetingResult, date?: string): void {
  const aoa: (string | number)[][] = [];

  aoa.push(["Title", result.title ?? ""]);
  aoa.push(["Date", formatDateLong(date)]);
  aoa.push([]);

  aoa.push(["MINUTES"]);
  aoa.push(...summaryToRows(result.summary ?? ""));
  aoa.push([]);

  aoa.push(["ACTION ITEMS"]);
  aoa.push(["No.", "Task", "PIC", "Deadline", "Note"]);
  result.tasks.forEach((t, i) => {
    aoa.push([i + 1, t.task, t.pic, t.deadline, t.note]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Minutes");
  XLSX.writeFile(workbook, "meeting-minutes.xlsx");
}
