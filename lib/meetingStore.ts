import { mkdir, readdir, readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import type { Task } from "./types";

export interface MeetingRecord {
  id: string;
  savedAt: string; // ISO timestamp, set on each save
  date: string; // ISO timestamp of when the meeting was generated (for display)
  title: string;
  summary: string;
  language: string;
  tasks: Task[];
  rawText: string; // to support Re-check after reopening
}

export type MeetingSummary = Pick<MeetingRecord, "id" | "title" | "date" | "savedAt"> & {
  // Lowercased title + summary + task/note text, for client-side search filtering.
  searchText: string;
};

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidMeetingId(id: string): boolean {
  return ID_PATTERN.test(id);
}

// Overridable so tests can point the store at a temp directory instead of the
// real `data/meetings` folder. Not meant to be set in normal app usage.
function storeDir(): string {
  return process.env.MEETINGS_DIR || path.join(process.cwd(), "data", "meetings");
}

function fileFor(id: string): string {
  return path.join(storeDir(), `${id}.json`);
}

async function ensureDir(): Promise<void> {
  await mkdir(storeDir(), { recursive: true });
}

export async function saveMeeting(
  rec: Omit<MeetingRecord, "savedAt" | "id"> & { id?: string },
): Promise<MeetingRecord> {
  const id = rec.id ?? crypto.randomUUID();
  if (!isValidMeetingId(id)) throw new Error("INVALID_ID");
  await ensureDir();
  const record: MeetingRecord = {
    id,
    savedAt: new Date().toISOString(),
    date: rec.date,
    title: rec.title,
    summary: rec.summary,
    language: rec.language,
    tasks: rec.tasks,
    rawText: rec.rawText,
  };
  await writeFile(fileFor(id), JSON.stringify(record, null, 2), "utf-8");
  return record;
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  await ensureDir();
  // storeDir() resolves at runtime (and can be overridden via MEETINGS_DIR in tests), so its
  // return value isn't statically analyzable — without this hint, Turbopack would trace and
  // bundle the entire project as a precaution. The directory is always `data/meetings` in
  // normal app usage, so opting out of that tracing is safe.
  const files = await readdir(/* turbopackIgnore: true */ storeDir());
  const records: MeetingSummary[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -".json".length);
    if (!isValidMeetingId(id)) continue;
    try {
      const raw = await readFile(fileFor(id), "utf-8");
      const rec = JSON.parse(raw) as MeetingRecord;
      const searchText = [
        rec.title,
        rec.summary,
        ...(rec.tasks ?? []).map((t) => `${t.task} ${t.note || ""}`),
      ]
        .join(" ")
        .toLowerCase();
      records.push({ id: rec.id, title: rec.title, date: rec.date, savedAt: rec.savedAt, searchText });
    } catch {
      // Skip unreadable/corrupt files rather than failing the whole listing.
    }
  }
  records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return records;
}

export async function getMeeting(id: string): Promise<MeetingRecord | null> {
  if (!isValidMeetingId(id)) return null;
  try {
    const raw = await readFile(fileFor(id), "utf-8");
    return JSON.parse(raw) as MeetingRecord;
  } catch {
    return null;
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  if (!isValidMeetingId(id)) throw new Error("INVALID_ID");
  try {
    await unlink(fileFor(id));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}
