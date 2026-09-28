// Shared "en-US" long-form date formatter used by ResultView (the meeting's
// generated-on date) and SavedMeetings (each row's date + saved-at timestamp).
export function formatDateLong(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// ISO string -> "yyyy-MM-dd" for an <input type="date">, using local date parts.
export function toDateInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "yyyy-MM-dd" from a date input -> ISO string, anchored at local noon so the
// displayed day doesn't shift across timezones.
export function fromDateInputValue(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).toISOString();
}

export function formatDateTimeLong(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
