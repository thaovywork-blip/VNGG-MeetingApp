"use client";

import { useState } from "react";
import { toast } from "sonner";
import InputPanel, { type InputValue } from "@/components/InputPanel";
import ProgressState, { type ProgressPhase } from "@/components/ProgressState";
import ResultView from "@/components/ResultView";
import { tasksToCsv } from "@/lib/csv";
import type { MeetingResult, Task } from "@/lib/types";

const LANGUAGE = "vi";
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
    const label = isImage ? `Ảnh ${++imageCount}` : `Ghi âm ${++audioCount}`;
    media.push({ label, mimeType: file.type, base64 });
  }
  return media;
}

// Backend error codes (see lib/processMeeting.ts, lib/recheckMeeting.ts, lib/gemini.ts,
// lib/greenode.ts) mapped to friendly Vietnamese messages for the toast + inline banner.
const ERROR_MESSAGES: Record<string, string> = {
  GEMINI_ERROR: "Không đọc được ảnh/ghi âm đã tải lên. Vui lòng kiểm tra file và thử lại.",
  GREENODE_ERROR: "Không kết nối được với AI để xử lý. Vui lòng thử lại sau ít phút.",
  INVALID_RESULT: "AI trả về kết quả không hợp lệ. Vui lòng thử lại.",
  FILE_READ_ERROR: "Không đọc được một trong các file đã chọn. Vui lòng thử lại.",
};

function friendlyMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? "Đã có lỗi xảy ra. Vui lòng kiểm tra kết nối và thử lại.";
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
      setResult({ summary: data.summary, language: data.language, tasks: data.tasks });
      setRawText(typeof data.rawText === "string" ? data.rawText : "");
      setPhase(null);
      toast.success("Đã tạo biên bản cuộc họp.");
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
      setResult({ summary: data.summary, language: data.language, tasks: data.tasks });
      toast.success("Đã cập nhật biên bản sau khi kiểm tra lại.");
    } catch (e) {
      toast.error(friendlyMessage(errorCodeFrom(e)));
    } finally {
      setRechecking(false);
    }
  }

  function handleExportCsv() {
    if (!result) return;
    const csv = tasksToCsv(result);
    // Leading BOM keeps Vietnamese diacritics readable when the CSV is opened in Excel.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bien-ban-hop.csv";
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
  }

  const busy = phase !== null;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-12 dark:bg-black sm:px-8">
      <main className="mx-auto flex w-full flex-1 flex-col">
        {phase ? (
          <ProgressState phase={phase} hasMedia={input.files.length > 0} />
        ) : result ? (
          <ResultView
            result={result}
            onEdit={handleEdit}
            onRecheck={handleRecheck}
            onExportCsv={handleExportCsv}
            onReset={handleReset}
            rechecking={rechecking}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <InputPanel value={input} onChange={setInput} onSubmit={handleSubmit} busy={busy} />
            {error && (
              <div className="mx-auto w-full max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
