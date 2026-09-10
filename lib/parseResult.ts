import { isMeetingResult, type MeetingResult, type Task } from "./types";

function extractJson(raw: string): string | null {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return null;
}

export function parseResult(raw: string): MeetingResult {
  const json = extractJson(raw);
  if (!json) throw new Error("INVALID_RESULT");
  let obj: unknown;
  try { obj = JSON.parse(json); } catch { throw new Error("INVALID_RESULT"); }
  if (!isMeetingResult(obj)) throw new Error("INVALID_RESULT");
  const r = obj as MeetingResult;
  r.tasks = r.tasks.map((t, i): Task => ({
    id: t.id?.toString() || String(i + 1),
    task: t.task, pic: t.pic ?? "", type: t.type,
    deadline: t.deadline ?? "", reference: t.reference ?? "",
  }));
  return r;
}
