"use client";

import { useEffect, useState } from "react";
import type { MeetingResult, Task } from "@/lib/types";
import TaskTable from "./TaskTable";

interface ResultViewProps {
  result: MeetingResult;
  onEdit: (id: string, field: keyof Task, value: string) => void;
  onTitleEdit: (value: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onRecheck: () => void;
  onExportCsv: () => void;
  onReset: () => void;
  rechecking: boolean;
}

function todayVi(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ResultView({
  result,
  onEdit,
  onTitleEdit,
  onDeleteTask,
  onAddTask,
  onRecheck,
  onExportCsv,
  onReset,
  rechecking,
}: ResultViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Biên bản mới
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <EditableTitle value={result.title} onCommit={onTitleEdit} />
        <p className="text-xs text-[var(--text-muted)]">{todayVi()}</p>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-6 pl-7 pr-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:py-7 sm:pl-8 sm:pr-7">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-[var(--accent)]" />
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Biên bản</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">{result.summary}</p>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--text)]">Việc cần làm</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-hover)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rechecking ? "Đang kiểm tra…" : "Kiểm tra lại với AI"}
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Xuất CSV
            </button>
          </div>
        </div>

        <TaskTable tasks={result.tasks} onEdit={onEdit} onDelete={onDeleteTask} onAdd={onAddTask} />
      </div>
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
      placeholder="Tiêu đề cuộc họp"
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
