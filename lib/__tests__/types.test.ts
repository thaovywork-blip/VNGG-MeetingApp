import { expect, test } from "vitest";
import type { MeetingResult } from "../types";
import { isMeetingResult } from "../types";

test("isMeetingResult accepts a valid object", () => {
  const r: MeetingResult = { summary: "s", language: "vi", tasks: [
    { id: "1", task: "t", pic: "", deadline: "", note: "n" },
  ]};
  expect(isMeetingResult(r)).toBe(true);
});
test("isMeetingResult rejects a task without a task field", () => {
  expect(isMeetingResult({ summary: "s", language: "vi", tasks: [
    { id: "1", pic: "", deadline: "", note: "" },
  ]})).toBe(false);
});
test("isMeetingResult accepts a task with only task (pic/deadline/note/id omitted)", () => {
  expect(isMeetingResult({ summary: "s", language: "vi", tasks: [
    { task: "t" },
  ]})).toBe(true);
});
