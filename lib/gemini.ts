import { GoogleGenAI } from "@google/genai";
import { GEMINI_IMAGE_PROMPT, GEMINI_AUDIO_PROMPT, GEMINI_PDF_PROMPT } from "./prompts";

function promptFor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return GEMINI_IMAGE_PROMPT;
  if (mimeType === "application/pdf") return GEMINI_PDF_PROMPT;
  return GEMINI_AUDIO_PROMPT;
}

export async function transcribeMedia(file: { mimeType: string; base64: string }): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = promptFor(file.mimeType);
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: file.mimeType, data: file.base64 } },
        { text: prompt },
      ]}],
    });
    return res.text ?? "";
  } catch (err) { console.error(err); throw new Error("GEMINI_ERROR"); }
}
