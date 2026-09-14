"use client";

import type { MeetingResult, Task } from "@/lib/types";
import TaskTable from "./TaskTable";

interface ResultViewProps {
  result: MeetingResult;
  onEdit: (id: string, field: keyof Task, value: string) => void;
  onRecheck: () => void;
  onExportCsv: () => void;
  onReset: () => void;
  rechecking: boolean;
}

export default function ResultView({
  result,
  onEdit,
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

        <TaskTable tasks={result.tasks} onEdit={onEdit} />
      </div>
    </div>
  );
}
