import { expect, test, vi } from "vitest";
import { processMeeting } from "../processMeeting";

const good = '{"summary":"s","language":"vi","tasks":[{"task":"t","pic":"","type":"chot","deadline":"","reference":"r"}]}';

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
