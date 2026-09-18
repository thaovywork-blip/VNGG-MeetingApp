"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatDateLong } from "@/lib/formatDate";
import type { Folder } from "@/lib/meetingStore";
import { BULLET_PREFIXES, parseSummaryBlocks } from "@/lib/parseSummary";
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
  onUpdate: (text: string, files: File[]) => void;
  onTranslate: (language: string) => void;
  onExportExcel: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onReset: () => void;
  onSave: () => void;
  showBack?: boolean;
  onBack?: () => void;
  rechecking: boolean;
  updating: boolean;
  translating: boolean;
  saving: boolean;
  saved: boolean;
  folders: Folder[];
  saveFolderId: string | null;
  onSaveFolderChange: (folderId: string | null) => void;
  onCreateFolder?: (name: string) => Promise<Folder | void> | void;
}

const NEW_FOLDER_VALUE = "__new__";

export default function ResultView({
  result,
  date,
  onEdit,
  onTitleEdit,
  onDeleteTask,
  onAddTask,
  onRecheck,
  onUpdate,
  onTranslate,
  onExportExcel,
  onExportWord,
  onExportPdf,
  onReset,
  onSave,
  showBack,
  onBack,
  rechecking,
  updating,
  translating,
  saving,
  saved,
  folders,
  saveFolderId,
  onSaveFolderChange,
  onCreateFolder,
}: ResultViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <span aria-hidden="true">←</span> Back to saved meetings
          </button>
        ) : (
          <span />
        )}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--text-muted)]">{formatDateLong(date)}</p>
          <TranslatePicker language={result.language} onTranslate={onTranslate} translating={translating} />
        </div>
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
          <div className="flex flex-wrap items-center gap-2">
            <FolderPicker
              folders={folders}
              saveFolderId={saveFolderId}
              onSaveFolderChange={onSaveFolderChange}
              onCreateFolder={onCreateFolder}
            />
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
            <ExportMenu onExportExcel={onExportExcel} onExportWord={onExportWord} onExportPdf={onExportPdf} />
          </div>
        </div>

        <TaskTable tasks={result.tasks} onEdit={onEdit} onDelete={onDeleteTask} onAdd={onAddTask} />
      </div>

      <AddInfoPanel onUpdate={onUpdate} updating={updating} />
    </div>
  );
}

interface ExportMenuProps {
  onExportExcel: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
}

// A single "Export ▾" button that reveals a small on-brand popover with the three
// export formats. Closes on outside click, on Escape, or after a selection.
function ExportMenu({ onExportExcel, onExportWord, onExportPdf }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function select(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        Export <span aria-hidden="true" className={`text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[0_8px_24px_rgba(16,24,40,0.12)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => select(onExportExcel)}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => select(onExportWord)}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Word (.doc)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => select(onExportPdf)}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

const MAX_ADD_INFO_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function isAddInfoTextFile(file: File): boolean {
  return file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
}

function isAddInfoSupportedMedia(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("audio/") ||
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

interface AddInfoPanelProps {
  onUpdate: (text: string, files: File[]) => void;
  updating: boolean;
}

// Collapsible panel that lets the user fold NEW material (extra notes and/or files) into
// the existing minutes + action items, without losing their hand edits (pic values, the
// title, etc. — the backend prompt is responsible for preserving those). Mirrors
// InputPanel's file handling: .txt/text files are read and merged straight into the
// textarea, image/audio/PDF files are kept as files for the backend to transcribe.
function AddInfoPanel({ onUpdate, updating }: AddInfoPanelProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpdate = !updating && (text.trim().length > 0 || files.length > 0);

  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    let appendedText = text;
    const mediaFiles: File[] = [];

    for (const f of incoming) {
      if (f.size > MAX_ADD_INFO_FILE_SIZE) {
        toast.error(`File "${f.name}" is too large (max 20MB)`);
        continue;
      }
      if (isAddInfoTextFile(f)) {
        const content = await f.text();
        appendedText = appendedText ? `${appendedText}\n\n${content}` : content;
        continue;
      }
      if (isAddInfoSupportedMedia(f)) {
        mediaFiles.push(f);
        continue;
      }
      toast.error(`Unsupported file type: ${f.name}`);
    }

    setText(appendedText);
    setFiles((prev) => [...prev, ...mediaFiles]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateClick() {
    onUpdate(text, files);
    setText("");
    setFiles([]);
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <span aria-hidden="true">➕</span> Add info &amp; update
        </span>
        <span aria-hidden="true" className={`text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 pb-5 pt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Paste extra notes or add more files, then update — this folds the new material into the
            existing minutes and action items while keeping your PIC assignments and other edits.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste extra notes or context…"
            rows={4}
            className="min-h-[96px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
          />

          <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-xs text-[var(--text-muted)]">
              Adding image / PDF / audio needs the Gemini key — text always works.
            </span>
          </div>

          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {files.map((f, i) => (
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

          <div>
            <button
              type="button"
              onClick={handleUpdateClick}
              disabled={!canUpdate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--border)] disabled:text-[var(--text-muted)]"
            >
              {updating ? "Updating…" : "Update minutes"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
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
    return (
      trimmed.startsWith("## ") ||
      BULLET_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ||
      (trimmed.length >= 2 && trimmed.startsWith("|") && trimmed.endsWith("|"))
    );
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
        if (block.type === "table") {
          return (
            <div
              key={index}
              className="overflow-x-auto rounded-xl border border-[var(--border)]"
            >
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface-2)]">
                    {block.headers.map((header, headerIndex) => (
                      <th
                        key={headerIndex}
                        className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-[var(--border)] last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 align-top text-[var(--text)]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const TRANSLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Vietnamese", label: "Tiếng Việt" },
  { value: "Chinese", label: "中文" },
];

// Older saved meetings may carry a language CODE ("en"/"vi"/"zh") rather than the full
// name the AI now writes ("English"/"Vietnamese"/"Chinese"). Normalize both so the select
// shows the meeting's actual current language instead of falling back to a placeholder.
function normalizeLanguage(language: string): string | null {
  const known = TRANSLATE_OPTIONS.find((o) => o.value.toLowerCase() === language.toLowerCase());
  if (known) return known.value;
  const byCode: Record<string, string> = { en: "English", vi: "Vietnamese", zh: "Chinese" };
  return byCode[language.toLowerCase()] ?? null;
}

interface TranslatePickerProps {
  language: string;
  onTranslate: (language: string) => void;
  translating: boolean;
}

// Lets the user translate the current result in place (mirrors "Re-check with AI", but
// rewrites the existing minutes into another language instead of re-deriving them from
// the raw notes). The select's current value reflects the meeting's current language.
function TranslatePicker({ language, onTranslate, translating }: TranslatePickerProps) {
  const normalized = normalizeLanguage(language);

  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className="font-medium">Translate to</span>
      <select
        value={normalized ?? ""}
        onChange={(e) => {
          if (e.target.value) onTranslate(e.target.value);
        }}
        disabled={translating}
        aria-label="Translate meeting minutes to another language"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!normalized && (
          <option value="" disabled>
            Select language
          </option>
        )}
        {TRANSLATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {translating && <span className="text-[var(--accent-hover)]">Translating…</span>}
    </label>
  );
}

interface FolderPickerProps {
  folders: Folder[];
  saveFolderId: string | null;
  onSaveFolderChange: (folderId: string | null) => void;
  onCreateFolder?: (name: string) => Promise<Folder | void> | void;
}

// A compact labeled <select> that controls which folder the meeting will be saved into.
// Choosing "+ New folder…" reveals an inline name input (rather than navigating away) so
// creating a folder and picking it stays a single, uninterrupted flow.
function FolderPicker({ folders, saveFolderId, onSaveFolderChange, onCreateFolder }: FolderPickerProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  function handleSelect(value: string) {
    if (value === NEW_FOLDER_VALUE) {
      setCreating(true);
      setNewName("");
      return;
    }
    onSaveFolderChange(value === "" ? null : value);
  }

  async function handleCreateConfirm() {
    const trimmed = newName.trim();
    if (!trimmed || !onCreateFolder) {
      setCreating(false);
      return;
    }
    const folder = await onCreateFolder(trimmed);
    setCreating(false);
    setNewName("");
    if (folder) onSaveFolderChange(folder.id);
  }

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreateConfirm();
            } else if (e.key === "Escape") {
              setCreating(false);
            }
          }}
          placeholder="New folder name"
          aria-label="New folder name"
          className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
        />
        <button
          type="button"
          onClick={() => void handleCreateConfirm()}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1.5 text-xs font-medium text-[var(--accent-hover)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setCreating(false)}
          className="rounded-md px-1.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className="font-medium">Folder</span>
      <select
        value={saveFolderId ?? ""}
        onChange={(e) => handleSelect(e.target.value)}
        aria-label="Folder to save this meeting into"
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
      >
        <option value="">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
        {onCreateFolder && <option value={NEW_FOLDER_VALUE}>+ New folder…</option>}
      </select>
    </label>
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
