export type ProgressPhase = "reading" | "writing";

interface ProgressStateProps {
  phase: ProgressPhase;
  /** Whether any image/audio was submitted — when false the "reading" step is hidden. */
  hasMedia?: boolean;
}

const ALL_STEPS: { key: ProgressPhase; label: string }[] = [
  { key: "reading", label: "Đang đọc ảnh/ghi âm…" },
  { key: "writing", label: "Đang viết biên bản…" },
];

export default function ProgressState({ phase, hasMedia = true }: ProgressStateProps) {
  const steps = hasMedia ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== "reading");
  const activeIndex = steps.findIndex((s) => s.key === phase);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-24 text-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-indigo-600 dark:border-zinc-700"
        role="status"
        aria-label="Đang xử lý"
      />
      <ul className="flex flex-col gap-3 text-sm">
        {steps.map((step, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li
              key={step.key}
              className={`flex items-center gap-2 ${
                state === "active"
                  ? "font-semibold text-zinc-900 dark:text-zinc-50"
                  : state === "done"
                    ? "text-zinc-400 dark:text-zinc-600"
                    : "text-zinc-300 dark:text-zinc-700"
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
