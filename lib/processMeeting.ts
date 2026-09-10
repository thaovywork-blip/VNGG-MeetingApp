import { buildRawText } from "./buildRawText";
import { buildClaudePrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface ProcessDeps {
  transcribe: (f: { mimeType: string; base64: string }) => Promise<string>;
  callModel: (prompt: string) => Promise<string>;
}
export interface ProcessRequest {
  text: string; participants: string; context: string; language: string;
  media: { label: string; mimeType: string; base64: string }[];
}
export interface ProcessOutput {
  result: MeetingResult;
  rawText: string;
}

export async function processMeeting(req: ProcessRequest, deps: ProcessDeps): Promise<ProcessOutput> {
  const transcripts = await Promise.all(
    req.media.map(async (m) => ({ label: m.label, text: await deps.transcribe(m) })));
  const raw = buildRawText({ text: req.text, participants: req.participants, context: req.context, media: transcripts });
  const prompt = buildClaudePrompt(raw, req.language);
  const first = await deps.callModel(prompt);
  try { return { result: parseResult(first), rawText: raw }; } catch { /* retry once */ }
  const second = await deps.callModel(prompt);
  try { return { result: parseResult(second), rawText: raw }; } catch { throw new Error("INVALID_RESULT"); }
}
