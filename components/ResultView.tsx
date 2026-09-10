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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Biên bản cuộc họp
          </h1>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {result.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Biên bản mới
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Việc cần làm</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
            >
              {rechecking ? "Đang kiểm tra…" : "Kiểm tra lại với AI"}
            </button>
            <button
              type="button"
              onClick={onExportCsv}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
