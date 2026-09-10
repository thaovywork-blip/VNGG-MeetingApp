import { expect, test, vi, beforeEach } from "vitest";
import { callGreenode } from "../greenode";

beforeEach(() => {
  process.env.GREENODE_BASE_URL = "https://greenode.test/v1";
  process.env.GREENODE_API_KEY = "k";
  process.env.GREENODE_MODEL = "m";
});

test("returns message content on success", async () => {
  global.fetch = vi.fn(async () => new Response(
    JSON.stringify({ choices: [{ message: { content: "HELLO" } }] }), { status: 200 })) as any;
  expect(await callGreenode("hi")).toBe("HELLO");
});
test("throws on non-200", async () => {
  global.fetch = vi.fn(async () => new Response("bad", { status: 500 })) as any;
  await expect(callGreenode("hi")).rejects.toThrow("GREENODE_ERROR");
});
