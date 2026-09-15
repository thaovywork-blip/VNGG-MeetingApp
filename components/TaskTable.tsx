"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (id: string, field: keyof Task, value: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export default function TaskTable({ tasks, onEdit, onDelete, onAdd }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
          Chưa có việc nào — bấm ＋ Thêm dòng để thêm.
        </p>
        <AddRowButton onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="w-[5%] px-4 py-2.5 text-center font-medium">STT</th>
              <th className="w-[30%] px-4 py-2.5 font-medium">Task</th>
              <th className="w-[13%] px-4 py-2.5 font-medium">PIC</th>
              <th className="w-[13%] px-4 py-2.5 font-medium">Deadline</th>
              <th className="w-[31%] px-4 py-2.5 font-medium">Note</th>
              <th className="w-[8%] px-2 py-2.5 font-medium">
                <span className="sr-only">Hành động</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tasks.map((t, i) => (
              <tr key={t.id} className="group align-top transition-colors hover:bg-[var(--surface-2)]">
                <td className="px-4 py-3 text-center text-[var(--text-muted)]">{i + 1}</td>
                <td className="px-4 py-3">
                  <EditableField value={t.task} onCommit={(v) => onEdit(t.id, "task", v)} multiline />
                </td>
                <td className="px-4 py-3">
                  <EditableField
                    value={t.pic}
                    onCommit={(v) => onEdit(t.id, "pic", v)}
                    placeholder="— nhập —"
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableField value={t.deadline} onCommit={(v) => onEdit(t.id, "deadline", v)} />
                </td>
                <td className="px-4 py-3">
                  <EditableField value={t.note} onCommit={(v) => onEdit(t.id, "note", v)} multiline />
                </td>
                <td className="px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    aria-label="Xóa dòng"
                    title="Xóa dòng"
                    className="rounded-md p-1.5 text-[var(--text-muted)]/60 opacity-70 transition-colors hover:text-[#DC2626] hover:opacity-100 focus-visible:opacity-100 focus-visible:text-[#DC2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] group-hover:opacity-100"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482 41.03 41.03 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddRowButton onAdd={onAdd} />
    </div>
  );
}

function AddRowButton({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-t border-[var(--border)] px-4 py-2.5">
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        ＋ Thêm dòng
      </button>
    </div>
  );
}

interface EditableFieldProps {
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

// Local-state input that resyncs with `value` whenever it changes *externally*
// (e.g. a recheck replaces the whole result) but not while the user is actively
// typing in it — a plain `defaultValue` wouldn't pick up that external change
// since React only applies it on mount, and a fully controlled input tied
// straight to parent state would fight the caller's per-keystroke re-renders.
function EditableField({ value, onCommit, multiline = false, placeholder }: EditableFieldProps) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  const shared =
    "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]/70 transition-colors hover:bg-[var(--surface-2)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]";

  const commit = (v: string) => {
    setFocused(false);
    onCommit(v);
  };

  if (multiline) {
    return (
      <textarea
        value={local}
        rows={2}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className={`${shared} resize-y`}
      />
    );
  }

  return (
    <input
      value={local}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      className={shared}
    />
  );
}
