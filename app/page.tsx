"use client";

import { useState } from "react";
import { toast } from "sonner";
import InputPanel, { type InputValue } from "@/components/InputPanel";
import ProgressState, { type ProgressPhase } from "@/components/ProgressState";
import ResultView from "@/components/ResultView";
import SavedMeetings from "@/components/SavedMeetings";
import { tasksToCsv } from "@/lib/csv";
import type { MeetingSummary } from "@/lib/meetingStore";
import type { MeetingResult, Task } from "@/lib/types";

type View = "input" | "result" | "saved";

const LANGUAGE = "en";
const EMPTY_INPUT: InputValue = { text: "", participants: "", context: "", files: [] };

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
// the primary guard: only recognized image/audio files are ever sent to Gemini as media.
async function filesToMedia(files: File[]): Promise<Media[]> {
  let imageCount = 0;
  let audioCount = 0;
  const media: Media[] = [];
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isAudio) continue;
    const base64 = await fileToBase64(file);
    const label = isImage ? `Image ${++imageCount}` : `Audio ${++audioCount}`;
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
  const [phase, setPhase] = useState<ProgressPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [view, setView] = useState<View>("input");
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMeetings, setSavedMeetings] = useState<MeetingSummary[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

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
          context: input.context,
          language: LANGUAGE,
          media,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "UNKNOWN");
      setResult({ title: data.title ?? "", summary: data.summary, language: data.language, tasks: data.tasks });
      setRawText(typeof data.rawText === "string" ? data.rawText : "");
      setCurrentMeetingId(null);
      setCurrentDate(new Date().toISOString());
      setView("result");
      setPhase(null);
      toast.success("Meeting minutes generated.");
    } catch (e) {
      const message = friendlyMessage(errorCodeFrom(e));
      setPhase(null);
      setError(message);
      toast.error(message);
      // Input (text/participants/context/files) is left untouched so the user can retry.
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
        body: JSON.stringify({ rawText, current: result, language: LANGUAGE }),
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

  function handleReset() {
    setInput(EMPTY_INPUT);
    setResult(null);
    setRawText(null);
    setError(null);
    setPhase(null);
    setCurrentMeetingId(null);
    setCurrentDate(null);
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

  function handleShowSaved() {
    setView("saved");
    void loadSavedMeetings();
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

  const busy = phase !== null;

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8 sm:py-14">
      <main className="mx-auto flex w-full flex-1 flex-col gap-8">
        <header className="mx-auto flex w-full max-w-[56rem] flex-col gap-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white sm:h-9 sm:w-9"
            >
              B
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-[28px]">
              Meeting Minutes
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Paste notes, or upload a board photo / voice recording — AI turns it into minutes and an action
            list.
          </p>
        </header>

        <nav className="mx-auto flex w-full max-w-[56rem] items-center gap-1 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={handleReset}
            aria-current={view !== "saved" ? "page" : undefined}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              view !== "saved" ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            New meeting
            {view !== "saved" && (
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--accent)]" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShowSaved}
            aria-current={view === "saved" ? "page" : undefined}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              view === "saved" ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Saved meetings
            {view === "saved" && (
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        </nav>

        {phase ? (
          <ProgressState phase={phase} hasMedia={input.files.length > 0} />
        ) : view === "saved" ? (
          <SavedMeetings
            meetings={savedMeetings}
            loading={savedLoading}
            onOpen={handleOpenSaved}
            onDelete={handleDeleteSaved}
            onBack={handleReset}
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
            onExportCsv={handleExportCsv}
            onReset={handleReset}
            onSave={handleSave}
            rechecking={rechecking}
            saving={saving}
            saved={currentMeetingId !== null}
          />
        ) : (
          <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-4">
            <InputPanel value={input} onChange={setInput} onSubmit={handleSubmit} busy={busy} />
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
