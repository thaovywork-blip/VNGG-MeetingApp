export type ProgressPhase = "reading" | "writing";

interface ProgressStateProps {
  phase: ProgressPhase;
  /** Whether any image/audio was submitted — when false the "reading" step is hidden. */
  hasMedia?: boolean;
}

const ALL_STEPS: { key: ProgressPhase; label: string }[] = [
  { key: "reading", label: "Reading image / audio / PDF…" },
  { key: "writing", label: "Writing minutes…" },
];

export default function ProgressState({ phase, hasMedia = true }: ProgressStateProps) {
  const steps = hasMedia ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== "reading");
  const activeIndex = steps.findIndex((s) => s.key === phase);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-8 py-16 text-center shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]"
        role="status"
        aria-label="Processing"
      />
      <ul className="flex flex-col gap-3 text-sm">
        {steps.map((step, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2 ${
                state === "active"
                  ? "font-semibold text-[var(--text)]"
                  : state === "done"
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
              }`}
            >
              <span aria-hidden="true">{state === "done" ? "✓" : state === "active" ? "→" : "•"}</span>
              {step.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
