import { buildRecheckPrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface RecheckDeps { callModel: (p: string) => Promise<string>; }
export interface RecheckRequest { rawText: string; current: MeetingResult; language: string; }

export async function recheckMeeting(req: RecheckRequest, deps: RecheckDeps): Promise<MeetingResult> {
  const prompt = buildRecheckPrompt(req.rawText, JSON.stringify(req.current), req.language);
  const first = await deps.callModel(prompt);
  try { return parseResult(first); } catch { /* retry once */ }
  const second = await deps.callModel(prompt);
  try { return parseResult(second); } catch { throw new Error("INVALID_RESULT"); }
}
