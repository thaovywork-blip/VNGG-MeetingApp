import { expect, test, vi } from "vitest";
import { translateMeeting } from "../translateMeeting";

const good = '{"title":"Meeting Title","summary":"s2","language":"English","tasks":[]}';

test("sends target language and returns translated result", async () => {
  const callModel = vi.fn(async (_prompt: string) => good);
  const r = await translateMeeting(
    { current: { title: "Tiêu đề", summary: "s", language: "Vietnamese", tasks: [] }, language: "English" },
    { callModel });
  expect(r.summary).toBe("s2");
  expect(r.language).toBe("English");
  expect(callModel.mock.calls[0][0]).toContain("English");
  expect(callModel.mock.calls[0][0]).toContain("Tiêu đề");
});

test("retries once on invalid model output, then throws INVALID_RESULT", async () => {
  const callModel = vi.fn(async () => "rác");
  await expect(translateMeeting(
    { current: { title: "t", summary: "s", language: "English", tasks: [] }, language: "Chinese" },
    { callModel })).rejects.toThrow("INVALID_RESULT");
  expect(callModel).toHaveBeenCalledTimes(2);
});

test("recovers when the first call is invalid but the retry succeeds", async () => {
  const callModel = vi.fn()
    .mockResolvedValueOnce("rác")
    .mockResolvedValueOnce(good);
  const r = await translateMeeting(
    { current: { title: "t", summary: "s", language: "English", tasks: [] }, language: "English" },
    { callModel });
  expect(r.summary).toBe("s2");
  expect(callModel).toHaveBeenCalledTimes(2);
});
