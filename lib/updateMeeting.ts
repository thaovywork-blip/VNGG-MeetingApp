import { buildUpdatePrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface UpdateDeps { callModel: (p: string) => Promise<string>; }
export interface UpdateRequest { sourceText: string; current: MeetingResult; language: string; }

export async function updateMeeting(req: UpdateRequest, deps: UpdateDeps): Promise<MeetingResult> {
  const prompt = buildUpdatePrompt(req.sourceText, JSON.stringify(req.current), req.language);
  const first = await deps.callModel(prompt);
  try { return parseResult(first); } catch { /* retry once */ }
  const second = await deps.callModel(prompt);
  try { return parseResult(second); } catch { throw new Error("INVALID_RESULT"); }
}
