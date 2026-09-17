"use client";

import { formatDateLong } from "@/lib/formatDate";
import { parseSummaryBlocks } from "@/lib/parseSummary";
import type { MeetingResult } from "@/lib/types";

interface PrintDocumentProps {
  result: MeetingResult;
  date?: string;
}

// A plain, print-friendly rendering of the meeting result, kept in the DOM (hidden on
// screen via the `.print-only` wrapper in app/page.tsx) so `window.print()` can turn it
// into a PDF. Deliberately styled with inline-safe, high-contrast classes rather than the
// app's theme tokens, so it prints identically regardless of screen theme.
export default function PrintDocument({ result, date }: PrintDocumentProps) {
  const blocks = parseSummaryBlocks(result.summary ?? "");

  return (
    <div className="print-document">
      <p className="pd-app-label">Notely Assistant</p>
      <h1 className="pd-title">{result.title || "Untitled meeting"}</h1>
      <p className="pd-date">{formatDateLong(date)}</p>

      <h2 className="pd-section-title">Minutes</h2>
      <div className="pd-minutes">
        {blocks.length === 0 ? (
          <p className="pd-paragraph">{result.summary}</p>
        ) : (
          blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h3 key={index} className="pd-heading">
                  {block.text}
                </h3>
              );
            }
            if (block.type === "bullets") {
              return (
                <ul key={index} className="pd-bullets">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="pd-bullet-item">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "table") {
              return (
                <table key={index} className="pd-table pd-minutes-table">
                  <thead>
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th key={headerIndex} className="pd-th">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="pd-td">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }
            return (
              <p key={index} className="pd-paragraph">
                {block.text}
              </p>
            );
          })
        )}
      </div>

      <h2 className="pd-section-title">Action items</h2>
      <table className="pd-table">
        <thead>
          <tr>
            <th className="pd-th pd-col-no">No.</th>
            <th className="pd-th">Task</th>
            <th className="pd-th">PIC</th>
            <th className="pd-th">Deadline</th>
            <th className="pd-th">Note</th>
          </tr>
        </thead>
        <tbody>
          {result.tasks.map((t, i) => (
            <tr key={t.id}>
              <td className="pd-td pd-col-no">{i + 1}</td>
              <td className="pd-td">{t.task}</td>
              <td className="pd-td">{t.pic}</td>
              <td className="pd-td">{t.deadline}</td>
              <td className="pd-td">{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
