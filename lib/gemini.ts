import { GoogleGenAI } from "@google/genai";
import { GEMINI_IMAGE_PROMPT, GEMINI_AUDIO_PROMPT } from "./prompts";

export async function transcribeMedia(file: { mimeType: string; base64: string }): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = file.mimeType.startsWith("image/") ? GEMINI_IMAGE_PROMPT : GEMINI_AUDIO_PROMPT;
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: file.mimeType, data: file.base64 } },
        { text: prompt },
      ]}],
    });
    return res.text ?? "";
  } catch { throw new Error("GEMINI_ERROR"); }
}
