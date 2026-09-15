import { expect, test } from "vitest";
import { buildClaudePrompt, buildRecheckPrompt, GEMINI_AUDIO_PROMPT } from "../prompts";

test("claude prompt embeds raw text, language, JSON schema and the steps", () => {
  const p = buildClaudePrompt("NỘI DUNG THÔ", "vi");
  expect(p).toContain("NỘI DUNG THÔ");
  expect(p).toContain("vi");
  expect(p).toContain('"tasks"');
  expect(p).toContain('"note"');
  expect(p).toContain('"title"');
  expect(p.toLowerCase()).toContain("tiêu đề");
  expect(p.toLowerCase()).toContain("chuẩn hoá");
});
test("claude prompt instructs the model not to assign PIC or classify chot/de_xuat", () => {
  const p = buildClaudePrompt("x", "vi");
  expect(p).toContain("KHÔNG gán người phụ trách (PIC)");
  expect(p).not.toContain('"pic"');
  expect(p.toLowerCase()).not.toContain("chot");
  expect(p.toLowerCase()).not.toContain("de_xuat");
});
test("recheck prompt tells the model to keep pic unchanged and echo it back", () => {
  const p = buildRecheckPrompt("gốc", '{"tasks":[]}', "vi");
  expect(p).toContain("gốc");
  expect(p).toContain('"pic"');
  expect(p).toContain("GIỮ NGUYÊN");
});
test("recheck prompt schema includes title and instructs the model to keep or refine it", () => {
  const p = buildRecheckPrompt("gốc", '{"tasks":[]}', "vi");
  expect(p).toContain('"title"');
  expect(p.toLowerCase()).toContain("title");
});
test("gemini audio prompt asks for transcript", () => {
  expect(GEMINI_AUDIO_PROMPT.toLowerCase()).toContain("chữ");
});
