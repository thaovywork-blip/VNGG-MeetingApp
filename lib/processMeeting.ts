import { buildRawText } from "./buildRawText";
import { buildClaudePrompt, type SessionType } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface ProcessDeps {
  transcribe: (f: { mimeType: string; base64: string }) => Promise<string>;
  callModel: (prompt: string) => Promise<string>;
  /** One-shot: Gemini reads the media AND writes the minutes JSON in a single call. */
  generateFromMedia?: (args: { media: { label: string; mimeType: string; base64: string }[]; prompt: string }) => Promise<string>;
}
export interface ProcessRequest {
  text: string; participants: string; context: string; language: string;
  media: { label: string; mimeType: string; base64: string }[];
  sessionType?: SessionType;
}
export interface ProcessOutput {
  result: MeetingResult;
  rawText: string;
}

// Audio one-shot compresses harder than the old transcript→Greenode flow, so push
// for full coverage (without becoming verbose): capture every point, stay concise per point.
const AUDIO_THOROUGHNESS =
  "\n\nIMPORTANT — the source is an audio recording: be THOROUGH and COMPLETE. Capture EVERY distinct topic, decision, action item, question, number, date, name, and commitment that is actually mentioned in the recording. Do NOT drop or merge points just to be short — prefer full coverage. Keep each individual point concise, but add AS MANY topic rows / bullet lines as the discussion actually contains.";

// Ask the audio one-shot to ALSO return a verbatim transcript, so the "Add info"
// panel can show the full original text of the recording for the user to verify/edit.
const AUDIO_TRANSCRIPT_INSTRUCTION =
  '\n\nADDITIONALLY, add ONE more top-level field to the JSON: "transcript" — a faithful, near-verbatim transcript (or the full extracted text) of the attached recording / file(s), in their ORIGINAL spoken language, preserving speaker turns when audible. The final JSON object MUST be exactly: {"title": string, "summary": string, "language": string, "tasks": [...], "transcript": string}.';

// Pull the extra "transcript" field out of the raw model JSON (best-effort).
function extractTranscript(raw: string): string {
  try {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonStr = fence ? fence[1] : start !== -1 && end > start ? raw.slice(start, end + 1) : "";
    if (!jsonStr) return "";
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    return typeof o.transcript === "string" ? o.transcript : "";
  } catch { return ""; }
}

async function generateAndParse(call: () => Promise<string>): Promise<{ result: MeetingResult; raw: string }> {
  const first = await call();
  try { return { result: parseResult(first), raw: first }; } catch { /* retry once */ }
  const second = await call();
  try { return { result: parseResult(second), raw: second }; } catch { throw new Error("INVALID_RESULT"); }
}

export async function processMeeting(req: ProcessRequest, deps: ProcessDeps): Promise<ProcessOutput> {
  const sessionType = req.sessionType ?? "Meeting";
  const hasAudio = req.media.some((m) => m.mimeType.startsWith("audio/"));

  // Audio path: skip the separate transcript step and the second model call —
  // Gemini listens to the recording (plus any typed notes / images / PDFs) and
  // writes the minutes JSON directly, PLUS a verbatim transcript in the same call.
  if (hasAudio && deps.generateFromMedia) {
    const typed = buildRawText({ text: req.text, participants: req.participants, context: req.context, media: [] });
    const promptSource = [
      typed,
      "The full source material is the attached recording(s)/file(s). Listen to and read them, and treat their content as the notes.",
    ].filter((s) => s.trim()).join("\n\n");
    const prompt = buildClaudePrompt(promptSource, req.language, sessionType) + AUDIO_THOROUGHNESS + AUDIO_TRANSCRIPT_INSTRUCTION;
    const media = req.media;
    const { result, raw } = await generateAndParse(() => deps.generateFromMedia!({ media, prompt }));

    // Store the transcript (when returned) as the editable source so "Add info" shows
    // the full original text; fall back to a placeholder if the model omitted it.
    const transcript = extractTranscript(raw).trim();
    const rawText = transcript
      ? [typed, `## Transcript (from recording / file)\n${transcript}`].filter((s) => s.trim()).join("\n\n")
      : buildRawText({
          text: req.text, participants: req.participants, context: req.context,
          media: req.media.map((m) => ({ label: m.label, text: "(processed directly by AI — transcript not stored)" })),
        });
    return { result, rawText };
  }

  // Default path: transcribe each file, then have the model write the minutes.
  const transcripts = await Promise.all(
    req.media.map(async (m) => ({ label: m.label, text: await deps.transcribe(m) })));
  const raw = buildRawText({ text: req.text, participants: req.participants, context: req.context, media: transcripts });
  const prompt = buildClaudePrompt(raw, req.language, sessionType);
  const { result } = await generateAndParse(() => deps.callModel(prompt));
  return { result, rawText: raw };
}
