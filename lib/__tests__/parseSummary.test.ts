import { expect, test } from "vitest";
import { parseSummaryBlocks } from "../parseSummary";

test("a '## heading' line becomes a heading block", () => {
  const blocks = parseSummaryBlocks("## Recruitment");
  expect(blocks).toEqual([{ type: "heading", text: "Recruitment" }]);
});

test("consecutive '- ' lines are grouped into one bullets block", () => {
  const blocks = parseSummaryBlocks("- Send JD before Friday\n- CV screening today");
  expect(blocks).toEqual([
    { type: "bullets", items: ["Send JD before Friday", "CV screening today"] },
  ]);
});

test("plain lines become a paragraph block", () => {
  const blocks = parseSummaryBlocks("Just a plain note about the meeting");
  expect(blocks).toEqual([{ type: "paragraph", text: "Just a plain note about the meeting" }]);
});

test("empty input returns an empty array", () => {
  expect(parseSummaryBlocks("")).toEqual([]);
});
