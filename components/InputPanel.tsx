"use client";

import { useRef, useState } from "react";

export interface InputValue {
  text: string;
  participants: string;
  context: string;
  files: File[];
}

interface InputPanelProps {
  value: InputValue;
  onChange: (value: InputValue) => void;
  onSubmit: () => void;
  busy: boolean;
}

function isTextFile(file: File): boolean {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

export default function InputPanel({ value, onChange, onSubmit, busy }: InputPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmpty =
    !value.text.trim() && !value.participants.trim() && !value.context.trim() && value.files.length === 0;
  const canSubmit = !busy && (value.text.trim().length > 0 || value.files.length > 0);

  // .txt files are folded straight into the notes textarea (they're just pasted notes
  // in file form); images/audio are kept as files for the backend to transcribe.
  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const textFiles = incoming.filter(isTextFile);
    const mediaFiles = incoming.filter((f) => !isTextFile(f));

    let appendedText = value.text;
    for (const f of textFiles) {
      const content = await f.text();
      appendedText = appendedText ? `${appendedText}\n\n${content}` : content;
    }
    onChange({ ...value, text: appendedText, files: [...value.files, ...mediaFiles] });
  }

  function removeFile(index: number) {
    onChange({ ...value, files: value.files.filter((_, i) => i !== index) });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Biên bản cuộc họp
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Dán ghi chú, tải ảnh chụp bảng hoặc file ghi âm — AI sẽ tổng hợp thành biên bản và danh sách việc
          cần làm.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragActive
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={isEmpty ? "Kéo thả file hoặc dán ghi chú vào đây…" : "Ghi chú cuộc họp…"}
          rows={8}
          className="w-full resize-y bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            + Thêm ảnh / ghi âm / file .txt
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-zinc-400">hoặc kéo thả file vào ô trên</span>
        </div>

        {value.files.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {value.files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Xoá ${f.name}`}
                  className="text-zinc-400 transition-colors hover:text-red-500"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Người tham gia</span>
          <input
            value={value.participants}
            onChange={(e) => onChange({ ...value, participants: e.target.value })}
            placeholder="An, Bình, Chi…"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Bối cảnh (tuỳ chọn)</span>
          <input
            value={value.context}
            onChange={(e) => onChange({ ...value, context: e.target.value })}
            placeholder="Họp sprint review, dự án X…"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      >
        {busy ? "Đang xử lý…" : "Tạo biên bản"}
      </button>
    </div>
  );
}
