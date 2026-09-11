import { expect, test } from "vitest";
import { parseResult } from "../parseResult";

const good = '{"summary":"tóm tắt","language":"vi","tasks":[{"task":"Gửi JD","pic":"An","deadline":"T6","note":"gấp"}]}';

test("parses plain JSON", () => {
  const r = parseResult(good);
  expect(r.tasks[0].task).toBe("Gửi JD");
  expect(r.tasks[0].id).toBeTruthy();
});
test("parses JSON wrapped in prose and code fences", () => {
  const r = parseResult("Đây là kết quả:\n```json\n" + good + "\n```\nHết.");
  expect(r.summary).toBe("tóm tắt");
});
test("throws on garbage", () => {
  expect(() => parseResult("xin chào không có json")).toThrow("INVALID_RESULT");
});
test("parses a task that omits pic/deadline/note and fills them with empty strings", () => {
  const partial = '{"summary":"s","language":"vi","tasks":[{"task":"Gửi JD"}]}';
  const r = parseResult(partial);
  expect(r.tasks[0].task).toBe("Gửi JD");
  expect(r.tasks[0].pic).toBe("");
  expect(r.tasks[0].deadline).toBe("");
  expect(r.tasks[0].note).toBe("");
  expect(r.tasks[0].id).toBeTruthy();
});
