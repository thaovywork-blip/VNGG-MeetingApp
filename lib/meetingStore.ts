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
  folderId: string | null; // null = "Uncategorized"
}

export type MeetingSummary = Pick<MeetingRecord, "id" | "title" | "date" | "savedAt" | "folderId"> & {
  // Lowercased title + summary + task/note text, for client-side search filtering.
  searchText: string;
};

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidMeetingId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function isValidFolderId(id: string): boolean {
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

// Overridable so tests can point the store at a temp directory instead of the
// real `data` folder. Not meant to be set in normal app usage.
function foldersFile(): string {
  return process.env.FOLDERS_FILE || path.join(process.cwd(), "data", "folders.json");
}

async function ensureFoldersDir(): Promise<void> {
  await mkdir(path.dirname(foldersFile()), { recursive: true });
}

export async function listFolders(): Promise<Folder[]> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ foldersFile(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Folder[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    return [];
  }
}

async function writeFolders(folders: Folder[]): Promise<void> {
  await ensureFoldersDir();
  await writeFile(foldersFile(), JSON.stringify(folders, null, 2), "utf-8");
}

export async function createFolder(name: string): Promise<Folder> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("INVALID_NAME");
  const folders = await listFolders();
  const folder: Folder = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: new Date().toISOString(),
  };
  folders.push(folder);
  await writeFolders(folders);
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  if (!isValidFolderId(id)) throw new Error("INVALID_ID");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("INVALID_NAME");
  const folders = await listFolders();
  const folder = folders.find((f) => f.id === id);
  if (!folder) throw new Error("NOT_FOUND");
  folder.name = trimmed;
  await writeFolders(folders);
  return folder;
}

export async function deleteFolder(id: string): Promise<void> {
  if (!isValidFolderId(id)) throw new Error("INVALID_ID");
  const folders = await listFolders();
  const remaining = folders.filter((f) => f.id !== id);
  await writeFolders(remaining);

  // Un-assign (but do not delete) every meeting currently in this folder.
  await ensureDir();
  const files = await readdir(/* turbopackIgnore: true */ storeDir());
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const meetingId = file.slice(0, -".json".length);
    if (!isValidMeetingId(meetingId)) continue;
    try {
      const raw = await readFile(fileFor(meetingId), "utf-8");
      const rec = JSON.parse(raw) as MeetingRecord;
      if (rec.folderId === id) {
        rec.folderId = null;
        await writeFile(fileFor(meetingId), JSON.stringify(rec, null, 2), "utf-8");
      }
    } catch {
      // Skip unreadable/corrupt files rather than failing the whole operation.
    }
  }
}

export async function setMeetingFolder(meetingId: string, folderId: string | null): Promise<MeetingRecord> {
  if (!isValidMeetingId(meetingId)) throw new Error("INVALID_ID");
  if (folderId !== null && !isValidFolderId(folderId)) throw new Error("INVALID_ID");
  let raw: string;
  try {
    raw = await readFile(fileFor(meetingId), "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new Error("NOT_FOUND");
    throw e;
  }
  const rec = JSON.parse(raw) as MeetingRecord;
  rec.folderId = folderId;
  await writeFile(fileFor(meetingId), JSON.stringify(rec, null, 2), "utf-8");
  return rec;
}

export async function saveMeeting(
  rec: Omit<MeetingRecord, "savedAt" | "id" | "folderId"> & { id?: string; folderId?: string | null },
): Promise<MeetingRecord> {
  const id = rec.id ?? crypto.randomUUID();
  if (!isValidMeetingId(id)) throw new Error("INVALID_ID");
  const folderId = rec.folderId ?? null;
  if (folderId !== null && !isValidFolderId(folderId)) throw new Error("INVALID_ID");
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
    folderId,
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
      records.push({
        id: rec.id,
        title: rec.title,
        date: rec.date,
        savedAt: rec.savedAt,
        folderId: rec.folderId ?? null,
        searchText,
      });
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
    const rec = JSON.parse(raw) as MeetingRecord;
    return { ...rec, folderId: rec.folderId ?? null };
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
