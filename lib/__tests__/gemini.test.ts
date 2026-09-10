import { expect, test, vi } from "vitest";

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return { models: { generateContent: vi.fn(async () => ({ text: "NỘI DUNG" })) } };
  }),
}));

import { transcribeMedia } from "../gemini";

test("returns transcribed text for audio", async () => {
  process.env.GEMINI_API_KEY = "k";
  const out = await transcribeMedia({ mimeType: "audio/mp3", base64: "AAAA" });
  expect(out).toBe("NỘI DUNG");
});
