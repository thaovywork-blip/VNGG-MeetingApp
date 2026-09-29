export type ProgressPhase = "reading" | "writing";

interface ProgressStateProps {
  phase?: ProgressPhase;
  /** Kept for compatibility with callers; the progress UI now shows a single line. */
  hasMedia?: boolean;
}

const LABEL = "Meeting minutes say hi…";

export default function ProgressState(_props: ProgressStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"
        role="status"
        aria-label="Processing"
      />
      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-center gap-2 font-semibold text-[var(--text)]">
          <span aria-hidden="true">→</span>
          {LABEL}
        </li>
      </ul>
    </div>
  );
}
