"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function isTextFile(file: File): boolean {
  return file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
}

function isSupportedMedia(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("audio/");
}

export default function InputPanel({ value, onChange, onSubmit, busy }: InputPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmpty =
    !value.text.trim() && !value.participants.trim() && !value.context.trim() && value.files.length === 0;
  const canSubmit = !busy && (value.text.trim().length > 0 || value.files.length > 0);

  // Shared by both the file picker and drag-and-drop, so every guard below applies to
  // both entry points. .txt/text files are folded straight into the notes textarea
  // (they're just pasted notes in file form); images/audio are kept as files for the
  // backend to transcribe; anything else, or anything oversized, is rejected.
  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    let appendedText = value.text;
    const mediaFiles: File[] = [];

    for (const f of incoming) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`File "${f.name}" is too large (max 20MB)`);
        continue;
      }
      if (isTextFile(f)) {
        const content = await f.text();
        appendedText = appendedText ? `${appendedText}\n\n${content}` : content;
        continue;
      }
      if (isSupportedMedia(f)) {
        mediaFiles.push(f);
        continue;
      }
      toast.error(`Unsupported file type: ${f.name}`);
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.05)] sm:p-7">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragActive ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"
        }`}
      >
        <div className="relative">
          <textarea
            value={value.text}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            placeholder={isEmpty ? "" : "Meeting notes…"}
            rows={8}
            className="min-h-[160px] w-full resize-y bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-7 w-7 text-[var(--text-muted)]"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <span className="text-sm text-[var(--text-muted)]">Drop a file or paste your notes here…</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            + Add image / audio / .txt
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
          <span className="text-xs text-[var(--text-muted)]">or drag & drop a file above</span>
        </div>

        {value.files.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {value.files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text)]"
              >
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="text-[var(--text-muted)] transition-colors hover:text-red-500"
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
          <span className="font-medium text-[var(--text)]">Participants</span>
          <input
            value={value.participants}
            onChange={(e) => onChange({ ...value, participants: e.target.value })}
            placeholder="e.g. Alice, Bob, Carol…"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--text)]">Context (optional)</span>
          <input
            value={value.context}
            onChange={(e) => onChange({ ...value, context: e.target.value })}
            placeholder="e.g. Sprint review, Project X…"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] disabled:active:scale-100"
      >
        {busy ? "Processing…" : "Generate minutes"}
      </button>
    </div>
  );
}
