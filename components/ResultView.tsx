"use client";

import { useEffect, useState } from "react";
import { formatDateLong } from "@/lib/formatDate";
import type { MeetingResult, Task } from "@/lib/types";
import TaskTable from "./TaskTable";

interface ResultViewProps {
  result: MeetingResult;
  date?: string;
  onEdit: (id: string, field: keyof Task, value: string) => void;
  onTitleEdit: (value: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onRecheck: () => void;
  onExportCsv: () => void;
  onReset: () => void;
  onSave: () => void;
  rechecking: boolean;
  saving: boolean;
  saved: boolean;
}

export default function ResultView({
  result,
  date,
  onEdit,
  onTitleEdit,
  onDeleteTask,
  onAddTask,
  onRecheck,
  onExportCsv,
  onReset,
  onSave,
  rechecking,
  saving,
  saved,
}: ResultViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          New minutes
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <EditableTitle value={result.title} onCommit={onTitleEdit} />
        <p className="text-xs text-[var(--text-muted)]">{formatDateLong(date)}</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-6 pl-7 pr-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:py-7 sm:pl-8 sm:pr-7">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-[var(--accent)]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Minutes</p>
        <div className="mt-3">
          <SummaryContent summary={result.summary} />
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--text)]">Action items</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-hover)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rechecking ? "Checking…" : "Re-check with AI"}
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Export
            </button>
          </div>
        </div>

        <TaskTable tasks={result.tasks} onEdit={onEdit} onDelete={onDeleteTask} onAdd={onAddTask} />
      </div>
    </div>
  );
}

type SummaryBlock =
  | { type: "heading"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "paragraph"; text: string };

const BULLET_PREFIXES = ["- ", "* ", "• "];

function parseSummaryBlocks(summary: string): SummaryBlock[] {
  const lines = summary.split("\n");
  const blocks: SummaryBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }

    const bulletPrefix = BULLET_PREFIXES.find((prefix) => line.startsWith(prefix));
    if (bulletPrefix) {
      const item = line.slice(bulletPrefix.length).trim();
      const last = blocks[blocks.length - 1];
      if (last && last.type === "bullets") {
        last.items.push(item);
      } else {
        blocks.push({ type: "bullets", items: [item] });
      }
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return blocks;
}

interface SummaryContentProps {
  summary: string;
}

// Renders the plain-string `summary` field, which the AI writes using a lightweight
// markdown-style convention ("## " topic headings, "- " bullet points). Falls back to
// the older plain-text rendering when neither marker is present, so summaries generated
// before this convention still display readably.
function SummaryContent({ summary }: SummaryContentProps) {
  const hasStructure = summary.split("\n").some((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("## ") || BULLET_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
  });

  if (!hasStructure) {
    return <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text)]">{summary}</p>;
  }

  const blocks = parseSummaryBlocks(summary);

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              key={index}
              className={`text-sm font-semibold tracking-wide text-[var(--accent-hover)] ${index > 0 ? "mt-3" : ""}`}
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "bullets") {
          return (
            <ul key={index} className="flex flex-col gap-1.5 pl-1">
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex gap-2 text-sm leading-relaxed text-[var(--text)]"
                >
                  <span aria-hidden="true" className="text-[var(--accent)]">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed text-[var(--text)]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

interface EditableTitleProps {
  value: string;
  onCommit: (value: string) => void;
}

// Same resync-while-not-focused pattern as TaskTable's EditableField: local state tracks
// keystrokes, but resyncs from `value` when it changes externally (e.g. a recheck response)
// as long as the user isn't actively editing it.
function EditableTitle({ value, onCommit }: EditableTitleProps) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  return (
    <input
      value={local}
      placeholder="Meeting title"
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        setFocused(false);
        onCommit(e.target.value);
      }}
      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 -mx-1.5 text-xl font-semibold text-[var(--text)] placeholder:font-normal placeholder:text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)] sm:text-2xl"
    />
  );
}
