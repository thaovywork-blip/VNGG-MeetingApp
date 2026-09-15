import { expect, test } from "vitest";
import { tasksToCsv, TASK_HEADER } from "../csv";

function rowsAfterHeader(csv: string): string[] {
  const lines = csv.split("\n");
  const i = lines.indexOf(TASK_HEADER);
  return lines.slice(i + 1);
}

test("emits the action-items header and a quoted row with No. and note", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: 'Gửi "JD"', pic: "An", deadline: "T6", note: "gấp" }]});
  expect(csv).toContain(TASK_HEADER);
  const rows = rowsAfterHeader(csv);
  expect(rows[0]).toContain('"1"');
  expect(rows[0]).toContain('"Gửi ""JD"""');
  expect(rows[0]).toContain('"gấp"');
});

test("numbers rows starting at 1 in order", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: "a", pic: "", deadline: "", note: "" },
    { id: "2", task: "b", pic: "", deadline: "", note: "" },
  ]});
  const rows = rowsAfterHeader(csv);
  expect(rows[0].startsWith('"1"')).toBe(true);
  expect(rows[1].startsWith('"2"')).toBe(true);
});

test("neutralizes a formula-injection value with a leading single quote", () => {
  const csv = tasksToCsv({ title: "", summary: "", language: "vi", tasks: [
    { id: "1", task: "=SUM(A1)", pic: "An", deadline: "T6", note: "" }]});
  const rows = rowsAfterHeader(csv);
  expect(rows[0]).toContain('"\'=SUM(A1)"');
});

test("includes the title and minutes (topic headings and bullets) above the table", () => {
  const csv = tasksToCsv({
    title: "UA Hiring Sync",
    summary: "## Recruitment\n- Send JD before Friday\n- CV screening today",
    language: "en",
    tasks: [{ id: "1", task: "Send JD", pic: "", deadline: "Fri", note: "" }],
  });
  expect(csv).toContain('"Title","UA Hiring Sync"');
  expect(csv).toContain('"MINUTES"');
  // "## Recruitment" -> "Recruitment"; "- Send JD..." -> "• Send JD..."
  expect(csv).toContain('"Recruitment"');
  expect(csv).toContain('"• Send JD before Friday"');
  // minutes appear before the action-items table
  const lines = csv.split("\n");
  expect(lines.indexOf('"MINUTES"')).toBeLessThan(lines.indexOf(TASK_HEADER));
});
