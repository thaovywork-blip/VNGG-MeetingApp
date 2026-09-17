"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import InputPanel, { type InputValue, type OutputLanguage, type SessionType } from "@/components/InputPanel";
import PrintDocument from "@/components/PrintDocument";
import ProgressState, { type ProgressPhase } from "@/components/ProgressState";
import ResultView from "@/components/ResultView";
import SavedMeetings from "@/components/SavedMeetings";
import { tasksToCsv } from "@/lib/csv";
import type { Folder, MeetingSummary } from "@/lib/meetingStore";
import type { MeetingResult, Task } from "@/lib/types";

type View = "input" | "result" | "saved";

const EMPTY_INPUT: InputValue = { text: "", participants: "", files: [] };

interface Media {
  label: string;
  mimeType: string;
  base64: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

// InputPanel already rejects unsupported/oversized files before they reach here (both via
// the file picker and drag-and-drop), so this is a defensive re-classification rather than
// the primary guard: only recognized image/audio/PDF files are ever sent to Gemini as media.
async function filesToMedia(files: File[]): Promise<Media[]> {
  let imageCount = 0;
  let audioCount = 0;
  let pdfCount = 0;
  const media: Media[] = [];
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isAudio && !isPdf) continue;
    const base64 = await fileToBase64(file);
    const label = isImage ? `Image ${++imageCount}` : isAudio ? `Audio ${++audioCount}` : `PDF ${++pdfCount}`;
    media.push({ label, mimeType: file.type, base64 });
  }
  return media;
}

// Backend error codes (see lib/processMeeting.ts, lib/recheckMeeting.ts, lib/gemini.ts,
// lib/greenode.ts) mapped to friendly English messages for the toast + inline banner.
const ERROR_MESSAGES: Record<string, string> = {
  GEMINI_ERROR: "Couldn't read the uploaded image/audio. Please check the file and try again.",
  GREENODE_ERROR: "Couldn't connect to the AI for processing. Please try again in a few minutes.",
  INVALID_RESULT: "The AI returned an invalid result. Please try again.",
  FILE_READ_ERROR: "Couldn't read one of the selected files. Please try again.",
};

function friendlyMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? "Something went wrong. Please check your connection and try again.";
}

function errorCodeFrom(e: unknown): string {
  return e instanceof Error ? e.message : "UNKNOWN";
}

// The "NOTELY" wordmark — glossy pink 3D "balloon" lettering: a rounded chunky face
// (Baloo 2) with a pink gradient fill and a soft drop shadow for a shiny, inflated look.
// The letter "O" is swapped for an inline gold-heart SVG (metallic vertical gradient +
// highlight), sized and aligned to sit inline with the surrounding letters.
function Wordmark() {
  return (
    <span className="notely-wordmark" aria-label="NOTELY">
      <span aria-hidden="true">N</span>
      <svg
        className="notely-heart"
        aria-hidden="true"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="notely-heart-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7E08C" />
            <stop offset="50%" stopColor="#E3B84E" />
            <stop offset="100%" stopColor="#C9971F" />
          </linearGradient>
          <linearGradient id="notely-heart-highlight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M16 28.5c-.35 0-.7-.1-1-.3C9.5 24.3 3 19 3 12.6 3 7.9 6.7 4.5 11 4.5c2.1 0 4.1 1 5.5 2.7 1.4-1.7 3.4-2.7 5.5-2.7 4.3 0 8 3.4 8 8.1 0 6.4-6.5 11.7-12 15.6-.3.2-.65.3-1 .3Z"
          fill="url(#notely-heart-gold)"
        />
        <path
          d="M9.5 8.8c1.6-1.4 4.4-1.5 5.8.6.5.7-.4 1.5-1 .9-1.1-1.3-2.9-1.4-4-.4-.6.5-1.4-.5-.8-1.1Z"
          fill="url(#notely-heart-highlight)"
        />
      </svg>
      <span aria-hidden="true">TELY</span>
    </span>
  );
}

// Small decorative gold heart used for the scattered accents around the wordmark.
function MiniHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true" className={className}>
      <path
        d="M12 20.5C12 20.5 1.8 13.2 1.8 6.9A5.2 5.2 0 0 1 12 5.4A5.2 5.2 0 0 1 22.2 6.9C22.2 13.2 12 20.5 12 20.5Z"
        fill="#E4B24A"
      />
      <ellipse cx="8" cy="7.5" rx="2.5" ry="1.6" fill="#FBEBB0" opacity="0.75" />
    </svg>
  );
}

function applyTaskEdit(task: Task, field: keyof Task, value: string): Task {
  switch (field) {
    case "task":
    case "pic":
    case "deadline":
    case "note":
      return { ...task, [field]: value };
    default:
      return task;
  }
}

export default function Home() {
  const [input, setInput] = useState<InputValue>(EMPTY_INPUT);
  const [outputLang, setOutputLang] = useState<OutputLanguage>("English");
  const [meetingType, setMeetingType] = useState<SessionType>("Meeting");
  const [phase, setPhase] = useState<ProgressPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [view, setView] = useState<View>("input");
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMeetings, setSavedMeetings] = useState<MeetingSummary[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [saveFolderId, setSaveFolderId] = useState<string | null>(null);

  // Loaded once up front (not just when opening the Saved view) so the folder picker next
  // to the Save button already has choices right after a fresh meeting is generated.
  useEffect(() => {
    void loadFolders();
  }, []);

  async function handleSubmit() {
    setError(null);
    setPhase(input.files.length > 0 ? "reading" : "writing");
    try {
      const media = await filesToMedia(input.files);
      setPhase("writing");
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.text,
          participants: input.participants,
          context: "",
          language: outputLang,
          meetingType,
          media,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setResult({ title: data.title ?? "", summary: data.summary, language: data.language, tasks: data.tasks });
      setRawText(typeof data.rawText === "string" ? data.rawText : "");
      setCurrentMeetingId(null);
      setCurrentDate(new Date().toISOString());
      setSaveFolderId(null);
      setView("result");
      setPhase(null);
      toast.success("Meeting minutes generated.");
    } catch (e) {
      const message = friendlyMessage(errorCodeFrom(e));
      setPhase(null);
      setError(message);
      toast.error(message);
      // Input (text/participants/files) is left untouched so the user can retry.
    }
  }

  function handleEdit(id: string, field: keyof Task, value: string) {
    setResult((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? applyTaskEdit(t, field, value) : t)) }
        : prev,
    );
  }

  function handleTitleEdit(value: string) {
    setResult((prev) => (prev ? { ...prev, title: value } : prev));
  }

  function handleDeleteTask(id: string) {
    setResult((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev));
  }

  function handleAddTask() {
    setResult((prev) => {
      if (!prev) return prev;
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
      const newTask: Task = { id, task: "", pic: "", deadline: "", note: "" };
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  }

  async function handleRecheck() {
    if (!result || rawText === null) return;
    setRechecking(true);
    try {
      const res = await fetch("/api/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, current: result, language: result.language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setResult({ title: data.title ?? "", summary: data.summary, language: data.language, tasks: data.tasks });
      toast.success("Minutes updated after re-check.");
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    } finally {
      setRechecking(false);
    }
  }

  async function handleTranslate(target: string) {
    if (!result) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: result, language: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setResult({ title: data.title ?? "", summary: data.summary, language: data.language, tasks: data.tasks });
      toast.success(`Translated to ${target}.`);
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    } finally {
      setTranslating(false);
    }
  }

  function handleExportCsv() {
    if (!result) return;
    const csv = tasksToCsv(result, currentDate ?? undefined);
    // Leading BOM keeps special characters readable when the CSV is opened in Excel.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meeting-minutes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    window.print();
  }

  function handleReset() {
    setInput(EMPTY_INPUT);
    setResult(null);
    setRawText(null);
    setError(null);
    setPhase(null);
    setCurrentMeetingId(null);
    setCurrentDate(null);
    setSaveFolderId(null);
    setView("input");
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentMeetingId ?? undefined,
          date: currentDate ?? new Date().toISOString(),
          title: result.title,
          summary: result.summary,
          language: result.language,
          tasks: result.tasks,
          rawText: rawText ?? "",
          folderId: saveFolderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setCurrentMeetingId(data.id);
      toast.success("Saved");
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    } finally {
      setSaving(false);
    }
  }

  async function loadSavedMeetings() {
    setSavedLoading(true);
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setSavedMeetings(data);
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    } finally {
      setSavedLoading(false);
    }
  }

  async function loadFolders() {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setFolders(data);
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  function handleShowSaved() {
    setView("saved");
    void loadSavedMeetings();
    void loadFolders();
  }

  async function handleOpenSaved(id: string) {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setResult({ title: data.title ?? "", summary: data.summary, language: data.language, tasks: data.tasks });
      setRawText(typeof data.rawText === "string" ? data.rawText : "");
      setCurrentMeetingId(data.id);
      setCurrentDate(data.date ?? null);
      setSaveFolderId(data.folderId ?? null);
      setError(null);
      setView("result");
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  async function handleDeleteSaved(id: string) {
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      toast.success("Deleted");
      await loadSavedMeetings();
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  async function handleCreateFolder(name: string): Promise<Folder | undefined> {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      toast.success("Folder created");
      await loadFolders();
      return data as Folder;
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
      return undefined;
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      toast.success("Folder renamed");
      await loadFolders();
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      toast.success("Folder deleted");
      await Promise.all([loadFolders(), loadSavedMeetings()]);
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  async function handleMoveMeeting(id: string, folderId: string | null) {
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      toast.success("Moved");
      await loadSavedMeetings();
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    }
  }

  const busy = phase !== null;

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">
      {result && (
        <div className="print-only">
          <PrintDocument result={result} date={currentDate ?? undefined} />
        </div>
      )}
      <main className="relative z-10 mx-auto flex w-full flex-1 flex-col gap-8">
        <header className="relative mx-auto flex w-full max-w-[56rem] flex-col items-center gap-2">
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -translate-x-[168px] rotate-[-15deg]">
            <MiniHeart className="notely-heart-deco h-4 w-4" />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[14px] translate-x-[150px] rotate-[15deg]">
            <MiniHeart className="notely-heart-deco h-5 w-5 [animation-delay:600ms]" />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[38px] -translate-x-[205px] rotate-[10deg]">
            <MiniHeart className="notely-heart-deco h-3.5 w-3.5 [animation-delay:1100ms]" />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[42px] translate-x-[188px] rotate-[-10deg]">
            <MiniHeart className="notely-heart-deco h-4 w-4 [animation-delay:300ms]" />
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 -top-[10px] -translate-x-[6px] rotate-[8deg]">
            <MiniHeart className="notely-heart-deco h-3 w-3 [animation-delay:900ms]" />
          </span>
          <h1 className="relative z-10">
            <Wordmark />
          </h1>
          <p className="notely-tagline relative z-10">Meeting notes in, summary and tasks out.</p>
        </header>

        <nav className="mx-auto flex w-fit items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1 shadow-[0_1px_3px_rgba(231,95,161,0.12)]">
          <button
            type="button"
            onClick={handleReset}
            aria-current={view !== "saved" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              view !== "saved"
                ? "bg-[var(--accent)] text-white shadow-[0_3px_10px_rgba(231,95,161,0.35)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span aria-hidden="true">✏️</span> New meeting
          </button>
          <button
            type="button"
            onClick={handleShowSaved}
            aria-current={view === "saved" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              view === "saved"
                ? "bg-[var(--accent)] text-white shadow-[0_3px_10px_rgba(231,95,161,0.35)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            <span aria-hidden="true">💾</span> Saved meetings
          </button>
        </nav>

        {phase ? (
          <ProgressState phase={phase} hasMedia={input.files.length > 0} />
        ) : view === "saved" ? (
          <SavedMeetings
            meetings={savedMeetings}
            folders={folders}
            loading={savedLoading}
            onOpen={handleOpenSaved}
            onDelete={handleDeleteSaved}
            onBack={handleReset}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveMeeting={handleMoveMeeting}
          />
        ) : view === "result" && result ? (
          <ResultView
            result={result}
            date={currentDate ?? undefined}
            onEdit={handleEdit}
            onTitleEdit={handleTitleEdit}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            onRecheck={handleRecheck}
            onTranslate={handleTranslate}
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            onReset={handleReset}
            onSave={handleSave}
            rechecking={rechecking}
            translating={translating}
            saving={saving}
            saved={currentMeetingId !== null}
            folders={folders}
            saveFolderId={saveFolderId}
            onSaveFolderChange={setSaveFolderId}
            onCreateFolder={handleCreateFolder}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-4">
            <InputPanel
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              busy={busy}
              language={outputLang}
              onLanguageChange={setOutputLang}
              sessionType={meetingType}
              onSessionTypeChange={setMeetingType}
            />
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-[#FEF2F2] px-4 py-3 text-sm text-red-700">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-4 w-4 shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
