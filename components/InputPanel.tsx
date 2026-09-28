"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

export interface InputValue {
  text: string;
  participants: string;
  files: File[];
}

export type OutputLanguage = "English" | "Vietnamese" | "Chinese";
export type SessionType = "Meeting" | "Interview" | "Other";

interface InputPanelProps {
  value: InputValue;
  onChange: (value: InputValue) => void;
  onSubmit: () => void;
  busy: boolean;
  language: OutputLanguage;
  onLanguageChange: (language: OutputLanguage) => void;
  sessionType: SessionType;
  onSessionTypeChange: (sessionType: SessionType) => void;
}

// Media is uploaded to Gemini via the File API (not inline), so we can accept
// large meeting recordings. The cap here just protects the base64 upload to our
// own API route from being unreasonably huge.
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const LANGUAGE_OPTIONS: { value: OutputLanguage; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "Chinese", label: "中文" },
];

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "Meeting", label: "Meeting" },
  { value: "Interview", label: "Interview" },
  { value: "Other", label: "Other" },
];

function isTextFile(file: File): boolean {
  return file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
}

function isSupportedMedia(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("audio/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function InputPanel({
  value,
  onChange,
  onSubmit,
  busy,
  language,
  onLanguageChange,
  sessionType,
  onSessionTypeChange,
}: InputPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmpty = !value.text.trim() && !value.participants.trim() && value.files.length === 0;
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
        toast.error(`File "${f.name}" is too large (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
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
            + Add image / audio / PDF / .txt
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,application/pdf,.pdf,.txt"
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

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text)]">Participants</span>
        <input
          value={value.participants}
          onChange={(e) => onChange({ ...value, participants: e.target.value })}
          placeholder="e.g. Alice, Bob, Carol…"
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text)]">Context type</span>
        <div
          role="group"
          aria-label="Session type"
          className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
        >
          {SESSION_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSessionTypeChange(opt.value)}
              aria-pressed={sessionType === opt.value}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                sessionType === opt.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-[var(--text)]">Output language</span>
        <div
          role="group"
          aria-label="Output language"
          className="inline-flex w-fit rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onLanguageChange(opt.value)}
              aria-pressed={language === opt.value}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                language === opt.value
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
