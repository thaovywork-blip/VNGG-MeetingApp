import { expect, test } from "vitest";
import { parseResult } from "../parseResult";

const good = '{"summary":"tóm tắt","language":"vi","tasks":[{"task":"Gửi JD","pic":"An","type":"chot","deadline":"T6","reference":"chốt gửi JD"}]}';

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
test("parses a task that omits pic/deadline/reference and fills them with empty strings", () => {
  const partial = '{"summary":"s","language":"vi","tasks":[{"task":"Gửi JD","type":"chot"}]}';
  const r = parseResult(partial);
  expect(r.tasks[0].task).toBe("Gửi JD");
  expect(r.tasks[0].pic).toBe("");
  expect(r.tasks[0].deadline).toBe("");
  expect(r.tasks[0].reference).toBe("");
  expect(r.tasks[0].id).toBeTruthy();
});
