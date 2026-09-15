export interface Task { id: string; task: string; pic: string; deadline: string; note: string; }
export interface MeetingResult { title: string; summary: string; language: string; tasks: Task[]; }
export interface ProcessInput { text: string; participants: string; context: string; language: string; }

export function isMeetingResult(x: unknown): x is MeetingResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.summary !== "string" || typeof o.language !== "string" || !Array.isArray(o.tasks)) return false;
  return o.tasks.every((t) => {
    const tt = t as Record<string, unknown>;
    return typeof tt.task === "string";
  });
}
