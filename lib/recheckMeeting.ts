import { buildRecheckPrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface RecheckDeps { callModel: (p: string) => Promise<string>; }
export interface RecheckRequest { rawText: string; current: MeetingResult; language: string; }

export async function recheckMeeting(req: RecheckRequest, deps: RecheckDeps): Promise<MeetingResult> {
  const prompt = buildRecheckPrompt(req.rawText, JSON.stringify(req.current), req.language);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await deps.callModel(prompt);
    try { return parseResult(out); } catch { if (attempt === 1) throw new Error("INVALID_RESULT"); }
  }
  throw new Error("INVALID_RESULT");
}
