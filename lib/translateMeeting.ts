import { buildTranslatePrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface TranslateDeps { callModel: (p: string) => Promise<string>; }
export interface TranslateRequest { current: MeetingResult; language: string; }

export async function translateMeeting(req: TranslateRequest, deps: TranslateDeps): Promise<MeetingResult> {
  const prompt = buildTranslatePrompt(JSON.stringify(req.current), req.language);
  const first = await deps.callModel(prompt);
  try { return parseResult(first); } catch { /* retry once */ }
  const second = await deps.callModel(prompt);
  try { return parseResult(second); } catch { throw new Error("INVALID_RESULT"); }
}
