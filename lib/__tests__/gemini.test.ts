import { expect, test, vi } from "vitest";

const uploadMock = vi.fn(async () => ({ name: "files/abc", uri: "https://x/files/abc", mimeType: "audio/mp3", state: "ACTIVE" }));
const getMock = vi.fn(async () => ({ name: "files/abc", uri: "https://x/files/abc", mimeType: "audio/mp3", state: "ACTIVE" }));
const deleteMock = vi.fn(async () => ({}));
const generateContentMock = vi.fn(async () => ({ text: "NỘI DUNG" }));

vi.mock("@google/genai", () => ({
  createPartFromUri: (uri: string, mimeType: string) => ({ fileData: { fileUri: uri, mimeType } }),
  GoogleGenAI: vi.fn().mockImplementation(function () {
    return {
      files: { upload: uploadMock, get: getMock, delete: deleteMock },
      models: { generateContent: generateContentMock },
    };
  }),
}));

import { transcribeMedia } from "../gemini";

test("uploads audio via the File API and returns transcribed text", async () => {
  process.env.GEMINI_API_KEY = "k";
  const out = await transcribeMedia({ mimeType: "audio/mp3", base64: "AAAA" });
  expect(out).toBe("NỘI DUNG");
  expect(uploadMock).toHaveBeenCalled();
  // The generated request must reference the uploaded file by URI, not inline bytes.
  const calls = generateContentMock.mock.calls as unknown as { contents: { parts: { fileData?: { fileUri: string } }[] }[] }[][];
  const parts = calls.at(-1)![0].contents[0].parts;
  expect(parts.some((p) => p.fileData?.fileUri === "https://x/files/abc")).toBe(true);
});

test("returns transcribed text for PDF", async () => {
  process.env.GEMINI_API_KEY = "k";
  const out = await transcribeMedia({ mimeType: "application/pdf", base64: "AAAA" });
  expect(out).toBe("NỘI DUNG");
});

test("waits for a PROCESSING file to become ACTIVE before generating", async () => {
  process.env.GEMINI_API_KEY = "k";
  uploadMock.mockResolvedValueOnce({ name: "files/p", uri: "https://x/files/p", mimeType: "audio/mp3", state: "PROCESSING" });
  getMock.mockResolvedValueOnce({ name: "files/p", uri: "https://x/files/p", mimeType: "audio/mp3", state: "ACTIVE" });
  const out = await transcribeMedia({ mimeType: "audio/mp3", base64: "AAAA" });
  expect(out).toBe("NỘI DUNG");
  expect(getMock).toHaveBeenCalled();
});
