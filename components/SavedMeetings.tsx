"use client";

import { useState } from "react";
import { formatDateLong, formatDateTimeLong } from "@/lib/formatDate";
import type { Folder, MeetingSummary } from "@/lib/meetingStore";

const ALL_FILTER = "__all__";
const UNCATEGORIZED_FILTER = "__uncategorized__";

interface SavedMeetingsProps {
  meetings: MeetingSummary[];
  folders: Folder[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveMeeting: (id: string, folderId: string | null) => void;
}

export default function SavedMeetings({
  meetings,
  folders,
  loading,
  onOpen,
  onDelete,
  onBack,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveMeeting,
}: SavedMeetingsProps) {
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState(ALL_FILTER);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const bySearch = trimmedQuery ? meetings.filter((m) => m.searchText.includes(trimmedQuery)) : meetings;
  const filtered =
    folderFilter === ALL_FILTER
      ? bySearch
      : folderFilter === UNCATEGORIZED_FILTER
        ? bySearch.filter((m) => m.folderId === null)
        : bySearch.filter((m) => m.folderId === folderFilter);

  function folderName(folderId: string | null): string {
    if (folderId === null) return "Uncategorized";
    return folders.find((f) => f.id === folderId)?.name ?? "Uncategorized";
  }

  function handleCreateFolder() {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setNewFolderName("");
  }

  function startRename(folder: Folder) {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) onRenameFolder(renamingId, trimmed);
    setRenamingId(null);
    setRenameValue("");
  }

  function handleDeleteFolder(folder: Folder) {
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"? Meetings inside it will NOT be deleted — they'll become Uncategorized.`,
    );
    if (!confirmed) return;
    if (folderFilter === folder.id) setFolderFilter(ALL_FILTER);
    onDeleteFolder(folder.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)]">Saved meetings</h2>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          New meeting
        </button>
      </div>

      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved meetings…"
          aria-label="Search saved meetings"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Folders</p>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All"
            active={folderFilter === ALL_FILTER}
            onClick={() => setFolderFilter(ALL_FILTER)}
          />
          <FilterChip
            label="Uncategorized"
            active={folderFilter === UNCATEGORIZED_FILTER}
            onClick={() => setFolderFilter(UNCATEGORIZED_FILTER)}
          />
          {folders.map((folder) =>
            renamingId === folder.id ? (
              <input
                key={folder.id}
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    setRenamingId(null);
                  }
                }}
                className="rounded-full border border-[var(--accent)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
              />
            ) : (
              <div key={folder.id} className="group flex items-center gap-1">
                <FilterChip
                  label={folder.name}
                  active={folderFilter === folder.id}
                  onClick={() => setFolderFilter(folder.id)}
                />
                <button
                  type="button"
                  onClick={() => startRename(folder)}
                  aria-label={`Rename "${folder.name}"`}
                  title="Rename"
                  className="rounded-md p-1 text-[var(--text-muted)]/60 opacity-0 transition-opacity hover:text-[var(--text)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] group-hover:opacity-100"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFolder(folder)}
                  aria-label={`Delete folder "${folder.name}"`}
                  title="Delete folder (meetings stay, become Uncategorized)"
                  className="rounded-md p-1 text-[var(--text-muted)]/60 opacity-0 transition-opacity hover:text-[#DC2626] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] group-hover:opacity-100"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482 41.03 41.03 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ),
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateFolder();
              }
            }}
            placeholder="New folder name"
            aria-label="New folder name"
            className="w-48 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--accent-hover)] transition-colors hover:bg-[var(--accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            New folder
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No saved meetings yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No meetings match your filters.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]">
                <button
                  type="button"
                  onClick={() => onOpen(m.id)}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  <span className="truncate text-sm font-medium text-[var(--text)]">
                    {m.title || "Untitled meeting"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDateLong(m.date)} · saved {formatDateTimeLong(m.savedAt)} · {folderName(m.folderId)}
                  </span>
                </button>
                <label className="shrink-0 text-xs text-[var(--text-muted)]">
                  <span className="sr-only">Move &quot;{m.title || "Untitled meeting"}&quot; to folder</span>
                  <select
                    value={m.folderId ?? ""}
                    onChange={(e) => onMoveMeeting(m.id, e.target.value === "" ? null : e.target.value)}
                    aria-label={`Move "${m.title || "Untitled meeting"}" to folder`}
                    title="Move to folder"
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--ring)]"
                  >
                    <option value="">Uncategorized</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => onDelete(m.id)}
                  aria-label={`Delete "${m.title || "Untitled meeting"}"`}
                  title="Delete"
                  className="shrink-0 rounded-md p-1.5 text-[var(--text-muted)]/60 opacity-70 transition-colors hover:text-[#DC2626] hover:opacity-100 focus-visible:opacity-100 focus-visible:text-[#DC2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] group-hover:opacity-100"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482 41.03 41.03 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}
