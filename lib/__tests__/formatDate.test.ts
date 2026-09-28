import { expect, test } from "vitest";
import { fromDateInputValue, toDateInputValue } from "../formatDate";

test("toDateInputValue formats an ISO string as yyyy-MM-dd", () => {
  expect(toDateInputValue("2026-09-23T12:00:00.000Z")).toBe("2026-09-23");
});

test("fromDateInputValue -> toDateInputValue round-trips the same calendar day", () => {
  const iso = fromDateInputValue("2026-09-23");
  expect(toDateInputValue(iso)).toBe("2026-09-23");
});

test("fromDateInputValue anchors at local noon so the day does not shift", () => {
  const d = new Date(fromDateInputValue("2026-09-23"));
  expect(d.getFullYear()).toBe(2026);
  expect(d.getMonth()).toBe(8); // September (0-indexed)
  expect(d.getDate()).toBe(23);
  expect(d.getHours()).toBe(12);
});
