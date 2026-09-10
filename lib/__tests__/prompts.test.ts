import { expect, test } from "vitest";
import { buildClaudePrompt, GEMINI_AUDIO_PROMPT } from "../prompts";

test("claude prompt embeds raw text, language, JSON schema and the 4 steps", () => {
  const p = buildClaudePrompt("NỘI DUNG THÔ", "vi");
  expect(p).toContain("NỘI DUNG THÔ");
  expect(p).toContain("vi");
  expect(p).toContain('"tasks"');
  expect(p).toContain("chot");
  expect(p).toContain("de_xuat");
  expect(p.toLowerCase()).toContain("chuẩn hoá");
});
test("gemini audio prompt asks for transcript", () => {
  expect(GEMINI_AUDIO_PROMPT.toLowerCase()).toContain("chữ");
});
