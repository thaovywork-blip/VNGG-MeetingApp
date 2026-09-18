import { expect, test, vi } from "vitest";
import { updateMeeting } from "../updateMeeting";

const good = '{"title":"Họp nhóm","summary":"s2","language":"vi","tasks":[]}';

test("sends raw text, current result and additional material, then returns the updated result", async () => {
  const callModel = vi.fn(async (_prompt: string) => good);
  const r = await updateMeeting(
    {
      rawText: "gốc",
      current: { title: "Họp nhóm", summary: "s", language: "vi", tasks: [] },
      additionalMaterial: "thêm thông tin mới",
      language: "vi",
    },
    { callModel },
  );
  expect(r.summary).toBe("s2");
  expect(callModel.mock.calls[0][0]).toContain("gốc");
  expect(callModel.mock.calls[0][0]).toContain("thêm thông tin mới");
});

test("retries once on an invalid first response", async () => {
  const callModel = vi.fn(async (_prompt: string) => "not json").mockResolvedValueOnce("not json").mockResolvedValueOnce(good);
  const r = await updateMeeting(
    { rawText: "x", current: { title: "t", summary: "s", language: "vi", tasks: [] }, additionalMaterial: "y", language: "vi" },
    { callModel },
  );
  expect(r.summary).toBe("s2");
  expect(callModel).toHaveBeenCalledTimes(2);
});

test("throws INVALID_RESULT when both attempts fail to parse", async () => {
  const callModel = vi.fn(async (_prompt: string) => "not json");
  await expect(
    updateMeeting(
      { rawText: "x", current: { title: "t", summary: "s", language: "vi", tasks: [] }, additionalMaterial: "y", language: "vi" },
      { callModel },
    ),
  ).rejects.toThrow("INVALID_RESULT");
  expect(callModel).toHaveBeenCalledTimes(2);
});
