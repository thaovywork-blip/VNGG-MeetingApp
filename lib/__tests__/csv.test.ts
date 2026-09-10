import { expect, test } from "vitest";
import { tasksToCsv } from "../csv";
test("emits header and a quoted row with mapped type", () => {
  const csv = tasksToCsv({ summary: "", language: "vi", tasks: [
    { id: "1", task: 'Gửi "JD"', pic: "An", type: "de_xuat", deadline: "T6", reference: "r" }]});
  const lines = csv.trim().split("\n");
  expect(lines[0]).toBe("Task,PIC,Loại,Deadline,Reference");
  expect(lines[1]).toContain('"Gửi ""JD"""');
  expect(lines[1]).toContain("Đề xuất");
});
