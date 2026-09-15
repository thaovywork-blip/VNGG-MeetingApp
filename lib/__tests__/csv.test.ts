import { expect, test } from "vitest";
import { tasksToCsv } from "../csv";
test("emits header and a quoted row with STT and note", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: 'Gửi "JD"', pic: "An", deadline: "T6", note: "gấp" }]});
  const lines = csv.trim().split("\n");
  expect(lines[0]).toBe("No.,Task,PIC,Deadline,Note");
  expect(lines[1]).toContain('"1"');
  expect(lines[1]).toContain('"Gửi ""JD"""');
  expect(lines[1]).toContain('"gấp"');
});
test("numbers rows starting at 1 in order", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: "a", pic: "", deadline: "", note: "" },
    { id: "2", task: "b", pic: "", deadline: "", note: "" },
  ]});
  const lines = csv.trim().split("\n");
  expect(lines[1].startsWith('"1"')).toBe(true);
  expect(lines[2].startsWith('"2"')).toBe(true);
});
test("neutralizes a formula-injection value with a leading single quote", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: "=SUM(A1)", pic: "An", deadline: "T6", note: "" }]});
  const lines = csv.trim().split("\n");
  expect(lines[1]).toContain('"\'=SUM(A1)"');
});
