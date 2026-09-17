import { expect, test } from "vitest";
import { buildClaudePrompt, buildRecheckPrompt, buildTranslatePrompt, GEMINI_AUDIO_PROMPT } from "../prompts";

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
test("claude prompt instructs the summary to be grouped by topic headings and bullet points", () => {
  const p = buildClaudePrompt("x", "en");
  expect(p.toLowerCase()).toContain("grouped by topic");
  expect(p).toContain('"## "');
  expect(p).toContain('"- "');
});
test("claude prompt instructs the model not to assign PIC or classify decided/proposed", () => {
  const p = buildClaudePrompt("x", "en");
  expect(p.toLowerCase()).toContain("do not assign a person-in-charge (pic)");
  expect(p).not.toContain('"pic"');
});
test("claude prompt structures the summary for Meeting sessions with Attendees / Meeting Content / Other Notes", () => {
  const p = buildClaudePrompt("x", "en", "Meeting");
  expect(p).toContain("## Attendees");
  expect(p).toContain("## Meeting Content");
  expect(p).toContain("## Other Notes");
});
test("claude prompt structures the summary for Interview sessions with the five candidate headings", () => {
  const p = buildClaudePrompt("x", "en", "Interview");
  expect(p).toContain("## Working Experience");
  expect(p).toContain("## Functional Skill");
  expect(p).toContain("## Motivation");
  expect(p).toContain("## Game Interest");
  expect(p).toContain("## Others");
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
test("recheck prompt still requires the summary grouped by topic headings and bullet points", () => {
  const p = buildRecheckPrompt("original", '{"tasks":[]}', "en");
  expect(p.toLowerCase()).toContain("grouped by topic");
  expect(p).toContain('"## "');
  expect(p).toContain('"- "');
});
test("gemini audio prompt asks for a transcript", () => {
  expect(GEMINI_AUDIO_PROMPT.toLowerCase()).toContain("transcript");
});
test("translate prompt instructs translating into the target language", () => {
  const p = buildTranslatePrompt('{"title":"t","summary":"s","language":"English","tasks":[]}', "Vietnamese");
  expect(p.toLowerCase()).toContain("translate");
  expect(p).toContain("Vietnamese");
  expect(p).toContain('{"title":"t","summary":"s","language":"English","tasks":[]}');
});
test("translate prompt keeps pic unchanged", () => {
  const p = buildTranslatePrompt('{"tasks":[]}', "Chinese");
  expect(p.toLowerCase()).toContain("do not translate or alter");
  expect(p.toLowerCase()).toContain("echo each \"pic\" value back unchanged");
});
test("translate prompt requests the JSON schema with the target language", () => {
  const p = buildTranslatePrompt('{"tasks":[]}', "English");
  expect(p).toContain('"title"');
  expect(p).toContain('"summary"');
  expect(p).toContain('"language": "English"');
  expect(p).toContain('"tasks"');
  expect(p).toContain('"pic"');
  expect(p).toContain('"deadline"');
  expect(p).toContain('"note"');
});
