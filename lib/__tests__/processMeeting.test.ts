import { expect, test, vi } from "vitest";
import { processMeeting } from "../processMeeting";

const good = '{"title":"Họp nhóm","summary":"s","language":"vi","tasks":[{"task":"t","deadline":"","note":"r"}]}';

test("transcribes media, calls model, returns parsed result", async () => {
  const transcribe = vi.fn(async () => "text từ ảnh");
  const callModel = vi.fn(async () => good);
  const r = await processMeeting(
    { text: "note", participants: "", context: "", language: "vi",
      media: [{ label: "Ảnh 1", mimeType: "image/png", base64: "AA" }] },
    { transcribe, callModel });
  expect(transcribe).toHaveBeenCalledOnce();
  expect(r.result.tasks[0].task).toBe("t");
});
test("retries model once on invalid output then throws", async () => {
  const transcribe = vi.fn();
  const callModel = vi.fn(async () => "rác");
  await expect(processMeeting(
    { text: "n", participants: "", context: "", language: "vi", media: [] },
    { transcribe, callModel })).rejects.toThrow("INVALID_RESULT");
  expect(callModel).toHaveBeenCalledTimes(2);
});
test("audio input uses one-shot generateFromMedia and skips transcribe + callModel", async () => {
  const transcribe = vi.fn();
  const callModel = vi.fn();
  const generateFromMedia = vi.fn(async () => good);
  const r = await processMeeting(
    { text: "", participants: "", context: "", language: "vi", sessionType: "Meeting",
      media: [{ label: "Audio 1", mimeType: "audio/mp4", base64: "AA" }] },
    { transcribe, callModel, generateFromMedia });
  expect(generateFromMedia).toHaveBeenCalledOnce();
  expect(transcribe).not.toHaveBeenCalled();
  expect(callModel).not.toHaveBeenCalled();
  expect(r.result.tasks[0].task).toBe("t");
  const calls = generateFromMedia.mock.calls as unknown as { media: unknown[]; prompt: string }[][];
  const arg = calls[0][0];
  expect(arg.media).toHaveLength(1);
  expect(arg.prompt).toContain("[Meeting] - "); // carries the session-type template/title rules
  expect(arg.prompt).toContain("THOROUGH"); // audio path pushes for full coverage
});
test("audio one-shot stores the returned transcript as the editable source text", async () => {
  const withTranscript = '{"title":"[Meeting] - x","summary":"s","language":"en","tasks":[],"transcript":"Alice: hello everyone. Bob: hi."}';
  const generateFromMedia = vi.fn(async () => withTranscript);
  const r = await processMeeting(
    { text: "", participants: "", context: "", language: "en",
      media: [{ label: "Audio 1", mimeType: "audio/mp4", base64: "AA" }] },
    { transcribe: vi.fn(), callModel: vi.fn(), generateFromMedia });
  expect(r.rawText).toContain("Alice: hello everyone");
  expect(r.rawText).toContain("Transcript");
  const calls = generateFromMedia.mock.calls as unknown as { prompt: string }[][];
  expect(calls[0][0].prompt).toContain('"transcript"'); // prompt requests the transcript field
});
test("audio one-shot retries once on invalid output then throws", async () => {
  const generateFromMedia = vi.fn(async () => "rác");
  await expect(processMeeting(
    { text: "", participants: "", context: "", language: "vi",
      media: [{ label: "Audio 1", mimeType: "audio/mp4", base64: "AA" }] },
    { transcribe: vi.fn(), callModel: vi.fn(), generateFromMedia })).rejects.toThrow("INVALID_RESULT");
  expect(generateFromMedia).toHaveBeenCalledTimes(2);
});
test("image/PDF without audio still uses the 2-step transcribe + callModel path", async () => {
  const transcribe = vi.fn(async () => "text từ file");
  const callModel = vi.fn(async () => good);
  const generateFromMedia = vi.fn();
  await processMeeting(
    { text: "", participants: "", context: "", language: "vi",
      media: [{ label: "PDF 1", mimeType: "application/pdf", base64: "AA" }] },
    { transcribe, callModel, generateFromMedia });
  expect(transcribe).toHaveBeenCalledOnce();
  expect(callModel).toHaveBeenCalledOnce();
  expect(generateFromMedia).not.toHaveBeenCalled();
});
