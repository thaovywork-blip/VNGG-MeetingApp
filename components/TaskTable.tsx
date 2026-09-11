"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (id: string, field: keyof Task, value: string) => void;
}

export default function TaskTable({ tasks, onEdit }: TaskTableProps) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Không có việc cần làm nào được ghi nhận.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[820px] table-fixed text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-[6%] px-4 py-2.5 font-medium">STT</th>
            <th className="w-[32%] px-4 py-2.5 font-medium">Task</th>
            <th className="w-[14%] px-4 py-2.5 font-medium">PIC</th>
            <th className="w-[14%] px-4 py-2.5 font-medium">Deadline</th>
            <th className="w-[34%] px-4 py-2.5 font-medium">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map((t, i) => (
            <tr key={t.id} className="align-top">
              <td className="px-4 py-2.5 text-zinc-400 dark:text-zinc-500">{i + 1}</td>
              <td className="px-4 py-2.5">
                <EditableField value={t.task} onCommit={(v) => onEdit(t.id, "task", v)} multiline />
              </td>
              <td className="px-4 py-2.5">
                <EditableField value={t.pic} onCommit={(v) => onEdit(t.id, "pic", v)} />
              </td>
              <td className="px-4 py-2.5">
                <EditableField value={t.deadline} onCommit={(v) => onEdit(t.id, "deadline", v)} />
              </td>
              <td className="px-4 py-2.5">
                <EditableField value={t.note} onCommit={(v) => onEdit(t.id, "note", v)} multiline />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EditableFieldProps {
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
}

// Local-state input that resyncs with `value` whenever it changes *externally*
// (e.g. a recheck replaces the whole result) but not while the user is actively
// typing in it — a plain `defaultValue` wouldn't pick up that external change
// since React only applies it on mount, and a fully controlled input tied
// straight to parent state would fight the caller's per-keystroke re-renders.
function EditableField({ value, onCommit, multiline = false }: EditableFieldProps) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(value);
  }, [value, focused]);

  const shared =
    "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none dark:focus:bg-zinc-900";

  const commit = (v: string) => {
    setFocused(false);
    onCommit(v);
  };

  if (multiline) {
    return (
      <textarea
        value={local}
        rows={2}
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
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      className={shared}
    />
  );
}
