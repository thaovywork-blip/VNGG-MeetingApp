import { expect, test } from "vitest";
import { buildClaudePrompt, buildRecheckPrompt, GEMINI_AUDIO_PROMPT } from "../prompts";

test("claude prompt embeds raw text, language, JSON schema and the steps", () => {
  const p = buildClaudePrompt("RAW CONTENT", "en");
  expect(p).toContain("RAW CONTENT");
  expect(p).toContain("en");
  expect(p).toContain('"tasks"');
  expect(p).toContain('"note"');
  expect(p).toContain('"title"');
  expect(p.toLowerCase()).toContain("title");
  expect(p.toLowerCase()).toContain("normalize the language");
});
test("claude prompt instructs a concise-but-complete summary as tight bullet points", () => {
  const p = buildClaudePrompt("x", "en");
  expect(p.toLowerCase()).toContain("action items");
  expect(p.toLowerCase()).toContain("concise");
  expect(p.toLowerCase()).toContain("complete");
  expect(p.toLowerCase()).toContain("bullet");
});
test("claude prompt instructs the model not to assign PIC or classify decided/proposed", () => {
  const p = buildClaudePrompt("x", "en");
  expect(p.toLowerCase()).toContain("do not assign a person-in-charge (pic)");
  expect(p).not.toContain('"pic"');
});
test("recheck prompt tells the model to keep pic unchanged and echo it back", () => {
  const p = buildRecheckPrompt("original", '{"tasks":[]}', "en");
  expect(p).toContain("original");
  expect(p).toContain('"pic"');
  expect(p.toLowerCase()).toContain("keep each task's \"pic\" value unchanged");
});
test("recheck prompt schema includes title and instructs the model to keep or refine it", () => {
  const p = buildRecheckPrompt("original", '{"tasks":[]}', "en");
  expect(p).toContain('"title"');
  expect(p.toLowerCase()).toContain("title");
});
test("recheck prompt still requires a concise-but-complete summary as tight bullet points", () => {
  const p = buildRecheckPrompt("original", '{"tasks":[]}', "en");
  expect(p.toLowerCase()).toContain("concise");
  expect(p.toLowerCase()).toContain("complete");
  expect(p.toLowerCase()).toContain("bullet");
});
test("gemini audio prompt asks for a transcript", () => {
  expect(GEMINI_AUDIO_PROMPT.toLowerCase()).toContain("transcript");
});
