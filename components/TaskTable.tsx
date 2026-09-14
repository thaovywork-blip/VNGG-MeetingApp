"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (id: string, field: keyof Task, value: string) => void;
}

export default function TaskTable({ tasks, onEdit }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
        Không có việc cần làm nào được ghi nhận.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="w-[6%] px-4 py-2.5 text-center font-medium">STT</th>
              <th className="w-[32%] px-4 py-2.5 font-medium">Task</th>
              <th className="w-[14%] px-4 py-2.5 font-medium">PIC</th>
              <th className="w-[14%] px-4 py-2.5 font-medium">Deadline</th>
              <th className="w-[34%] px-4 py-2.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {tasks.map((t, i) => (
              <tr key={t.id} className="align-top transition-colors hover:bg-[var(--surface-2)]">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
