"use client";

import { useState } from "react";
import { formatDateLong, formatDateTimeLong } from "@/lib/formatDate";
import type { MeetingSummary } from "@/lib/meetingStore";

interface SavedMeetingsProps {
  meetings: MeetingSummary[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function SavedMeetings({ meetings, loading, onOpen, onDelete, onBack }: SavedMeetingsProps) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? meetings.filter((m) => m.searchText.includes(trimmedQuery))
    : meetings;

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

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">Loading…</p>
        ) : meetings.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No saved meetings yet.</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No meetings match your search.</p>
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
                    {formatDateLong(m.date)} · saved {formatDateTimeLong(m.savedAt)}
                  </span>
                </button>
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
