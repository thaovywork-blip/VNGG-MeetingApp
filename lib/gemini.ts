import { GoogleGenAI, createPartFromUri } from "@google/genai";
import { GEMINI_IMAGE_PROMPT, GEMINI_AUDIO_PROMPT, GEMINI_PDF_PROMPT } from "./prompts";

const MODEL = "gemini-3.6-flash";
type MediaFile = { mimeType: string; base64: string };
type Part = ReturnType<typeof createPartFromUri>;

function promptFor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return GEMINI_IMAGE_PROMPT;
  if (mimeType === "application/pdf") return GEMINI_PDF_PROMPT;
  return GEMINI_AUDIO_PROMPT;
}

// Upload one file through the File API and wait until it is usable, returning a
// fileData part plus the remote name (for cleanup). The File API accepts far
// larger media than inline base64 (which is capped at ~20MB per request).
async function uploadActive(ai: GoogleGenAI, file: MediaFile): Promise<{ part: Part; name?: string }> {
  const blob = new Blob([Buffer.from(file.base64, "base64")], { type: file.mimeType });
  let up = await ai.files.upload({ file: blob, config: { mimeType: file.mimeType } });
  const startedAt = Date.now();
  while (up.state === "PROCESSING") {
    if (Date.now() - startedAt > 5 * 60_000) throw new Error("GEMINI_FILE_TIMEOUT");
    await new Promise((r) => setTimeout(r, 2000));
    up = await ai.files.get({ name: up.name! });
  }
  if (up.state === "FAILED") throw new Error("GEMINI_FILE_FAILED");
  return { part: createPartFromUri(up.uri!, up.mimeType ?? file.mimeType), name: up.name ?? undefined };
}

// Best-effort cleanup so uploads don't accumulate; ignore failures.
async function deleteUploads(ai: GoogleGenAI, names: (string | undefined)[]): Promise<void> {
  await Promise.all(names.map(async (n) => {
    if (n) { try { await ai.files.delete({ name: n }); } catch { /* ignore */ } }
  }));
}

export async function transcribeMedia(file: MediaFile): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const { part, name } = await uploadActive(ai, file);
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [part, { text: promptFor(file.mimeType) }] }],
    });
    await deleteUploads(ai, [name]);
    return res.text ?? "";
  } catch (err) { console.error(err); throw new Error("GEMINI_ERROR"); }
}

// One-shot: send all media (audio/image/PDF) plus a minutes prompt to Gemini and
// get the meeting-minutes JSON back directly — no separate transcript step and no
// second model call. Used for audio to avoid emitting a long transcript.
export async function generateMinutesFromMedia(args: { media: MediaFile[]; prompt: string }): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const uploaded = await Promise.all(args.media.map((m) => uploadActive(ai, m)));
    const parts: Part[] = [...uploaded.map((u) => u.part), { text: args.prompt }];
    const res = await ai.models.generateContent({ model: MODEL, contents: [{ role: "user", parts }] });
    await deleteUploads(ai, uploaded.map((u) => u.name));
    return res.text ?? "";
  } catch (err) { console.error(err); throw new Error("GEMINI_ERROR"); }
}
