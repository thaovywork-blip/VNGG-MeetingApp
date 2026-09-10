export type TaskType = "chot" | "de_xuat";
export interface Task { id: string; task: string; pic: string; type: TaskType; deadline: string; reference: string; }
export interface MeetingResult { summary: string; language: string; tasks: Task[]; }
export interface ProcessInput { text: string; participants: string; context: string; language: string; }

export function isMeetingResult(x: unknown): x is MeetingResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.summary !== "string" || typeof o.language !== "string" || !Array.isArray(o.tasks)) return false;
  return o.tasks.every((t) => {
    const tt = t as Record<string, unknown>;
    return typeof tt.task === "string" && (tt.type === "chot" || tt.type === "de_xuat")
      && typeof tt.pic === "string" && typeof tt.deadline === "string" && typeof tt.reference === "string";
  });
}
