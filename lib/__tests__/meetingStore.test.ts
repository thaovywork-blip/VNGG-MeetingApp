import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { deleteMeeting, getMeeting, isValidMeetingId, listMeetings, saveMeeting } from "../meetingStore";

let tempDir: string;
let previousEnv: string | undefined;

beforeEach(async () => {
  previousEnv = process.env.MEETINGS_DIR;
  tempDir = await mkdtemp(path.join(tmpdir(), "meetingStore-test-"));
  process.env.MEETINGS_DIR = tempDir;
});

afterEach(async () => {
  process.env.MEETINGS_DIR = previousEnv;
  await rm(tempDir, { recursive: true, force: true });
});

test("id validation rejects path traversal and accepts safe ids", () => {
  expect(isValidMeetingId("../evil")).toBe(false);
  expect(isValidMeetingId("../../etc/passwd")).toBe(false);
  expect(isValidMeetingId("a/b")).toBe(false);
  expect(isValidMeetingId("abc-123_XYZ")).toBe(true);
});

test("save -> get -> list -> delete round-trip", async () => {
  const saved = await saveMeeting({
    date: "2026-09-15T00:00:00.000Z",
    title: "Sprint review",
    summary: "We reviewed the sprint.",
    language: "en",
    tasks: [{ id: "1", task: "Follow up", pic: "Alice", deadline: "Fri", note: "" }],
    rawText: "raw notes",
  });

  expect(saved.id).toBeTruthy();
  expect(saved.savedAt).toBeTruthy();
  expect(saved.title).toBe("Sprint review");

  const fetched = await getMeeting(saved.id);
  expect(fetched).not.toBeNull();
  expect(fetched?.title).toBe("Sprint review");
  expect(fetched?.tasks).toHaveLength(1);
  expect(fetched?.rawText).toBe("raw notes");

  const list = await listMeetings();
  expect(list).toHaveLength(1);
  expect(list[0].id).toBe(saved.id);
  expect(list[0].title).toBe("Sprint review");
  expect(list[0].searchText).toContain("sprint review");
  expect(list[0].searchText).toContain("we reviewed the sprint");
  expect(list[0].searchText).toContain("follow up");

  await deleteMeeting(saved.id);
  expect(await getMeeting(saved.id)).toBeNull();
  expect(await listMeetings()).toHaveLength(0);
});

test("saving with an existing id updates the same record instead of duplicating", async () => {
  const first = await saveMeeting({
    date: "2026-09-15T00:00:00.000Z",
    title: "Draft title",
    summary: "First summary",
    language: "en",
    tasks: [],
    rawText: "raw",
  });

  const updated = await saveMeeting({
    id: first.id,
    date: first.date,
    title: "Final title",
    summary: "Updated summary",
    language: "en",
    tasks: [],
    rawText: "raw",
  });

  expect(updated.id).toBe(first.id);
  const list = await listMeetings();
  expect(list).toHaveLength(1);
  expect(list[0].title).toBe("Final title");
});

test("getMeeting returns null for a nonexistent id", async () => {
  expect(await getMeeting("does-not-exist")).toBeNull();
});

test("getMeeting and deleteMeeting reject a path-traversal id without touching the filesystem", async () => {
  expect(await getMeeting("../evil")).toBeNull();
  await expect(deleteMeeting("../evil")).rejects.toThrow("INVALID_ID");
  await expect(saveMeeting({
    id: "../evil",
    date: "2026-09-15T00:00:00.000Z",
    title: "x",
    summary: "x",
    language: "en",
    tasks: [],
    rawText: "",
  })).rejects.toThrow("INVALID_ID");
});

test("listMeetings sorts by savedAt descending", async () => {
  const older = await saveMeeting({
    date: "2026-09-14T00:00:00.000Z",
    title: "Older",
    summary: "s",
    language: "en",
    tasks: [],
    rawText: "",
  });
  // Ensure a distinct savedAt ordering regardless of clock resolution.
  await new Promise((r) => setTimeout(r, 5));
  const newer = await saveMeeting({
    date: "2026-09-15T00:00:00.000Z",
    title: "Newer",
    summary: "s",
    language: "en",
    tasks: [],
    rawText: "",
  });

  const list = await listMeetings();
  expect(list.map((m) => m.id)).toEqual([newer.id, older.id]);
});
