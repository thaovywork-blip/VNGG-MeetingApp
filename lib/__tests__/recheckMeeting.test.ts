import { expect, test, vi } from "vitest";
import { recheckMeeting } from "../recheckMeeting";
const good = '{"summary":"s2","language":"vi","tasks":[]}';
test("sends current table and returns corrected result", async () => {
  const callModel = vi.fn(async (_prompt: string) => good);
  const r = await recheckMeeting(
    { rawText: "gốc", current: { summary: "s", language: "vi", tasks: [] }, language: "vi" },
    { callModel });
  expect(r.summary).toBe("s2");
  expect(callModel.mock.calls[0][0]).toContain("gốc");
});
