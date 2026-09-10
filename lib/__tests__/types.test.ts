import { expect, test } from "vitest";
import type { MeetingResult } from "../types";
import { isMeetingResult } from "../types";

test("isMeetingResult accepts a valid object", () => {
  const r: MeetingResult = { summary: "s", language: "vi", tasks: [
    { id: "1", task: "t", pic: "", type: "chot", deadline: "", reference: "r" },
  ]};
  expect(isMeetingResult(r)).toBe(true);
});
test("isMeetingResult rejects bad type value", () => {
  expect(isMeetingResult({ summary: "s", language: "vi", tasks: [
    { id: "1", task: "t", pic: "", type: "WRONG", deadline: "", reference: "" },
  ]})).toBe(false);
});
