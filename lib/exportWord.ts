import { formatDateLong } from "./formatDate";
import { parseSummaryBlocks } from "./parseSummary";
import type { MeetingResult } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CELL_STYLE = "border:1px solid #ccc;padding:4px 8px;text-align:left;vertical-align:top;";

function tableHtml(headers: string[], rows: string[][]): string {
  const thead = `<tr>${headers.map((h) => `<th style="${CELL_STYLE}background:#f3f3f3;">${escapeHtml(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((row) => `<tr>${row.map((cell) => `<td style="${CELL_STYLE}">${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0;">${thead}${tbody}</table>`;
}

// Renders the markdown-style summary (see parseSummary.ts) as Word-friendly HTML:
// headings become <h3>, bullets an <ul>, and a markdown table a real bordered <table>.
function summaryToHtml(summary: string): string {
  const parts: string[] = [];
  for (const block of parseSummaryBlocks(summary)) {
    if (block.type === "heading") {
      parts.push(`<h3>${escapeHtml(block.text)}</h3>`);
    } else if (block.type === "bullets") {
      parts.push(`<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    } else if (block.type === "table") {
      parts.push(tableHtml(block.headers, block.rows));
    } else {
      parts.push(`<p>${escapeHtml(block.text)}</p>`);
    }
  }
  return parts.join("\n");
}

// Builds a Word-openable HTML document (MHTML-free ".doc") for the current meeting
// result and triggers a browser download. Word opens HTML files saved with a .doc
// extension directly, so no extra dependency is needed.
export function downloadWord(result: MeetingResult, date?: string): void {
  const actionRows = result.tasks.map((t, i) => [String(i + 1), t.task, t.pic, t.deadline, t.note]);

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(result.title || "Meeting minutes")}</title>
</head>
<body style="font-family:Calibri,Arial,sans-serif;">
<h1>${escapeHtml(result.title || "Untitled meeting")}</h1>
<p>${escapeHtml(formatDateLong(date))}</p>
<h2>Minutes</h2>
${summaryToHtml(result.summary ?? "")}
<h2>Action items</h2>
${tableHtml(["No.", "Task", "PIC", "Deadline", "Note"], actionRows)}
</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting-minutes.doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
