# Meeting Minutes Mini-App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js app that turns meeting notes/images/audio into meeting minutes plus an editable action-plan table.

**Architecture:** Next.js (App Router) frontend + server-side API routes that hold the API keys. Gemini (Google AI Studio) converts images/audio to text; Greenode/Claude writes minutes and classifies tasks. Pure logic lives in `lib/` and is unit-tested with mocked AI calls; routes orchestrate; the UI is a single page.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Tailwind CSS, Vitest (unit tests), `@google/genai` (Gemini), `fetch` (Greenode, OpenAI-compatible), Sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-09-10-meeting-minutes-app-design.md`

## Global Constraints

- Runs locally only: `npm run dev` on `localhost:3000`. No deploy in v1.
- API keys ONLY on the server (API routes). Never import a key into a client component. Keys live in `.env.local`; `.env.local` stays in `.gitignore`.
- Env var names (exact): `GEMINI_API_KEY`, `GREENODE_API_KEY`, `GREENODE_BASE_URL`, `GREENODE_MODEL`.
- Default output language: Vietnamese (`vi`).
- Test data only — never real recordings/CVs/names in tests or manual checks.
- Result JSON schema is fixed (see Task 4). Task `type` is exactly `"chot"` or `"de_xuat"`.
- Git: work on branch `feature/meeting-minutes-app`. One commit per completed task step group. Never commit to `main` directly.
- TDD: write the failing test first for every `lib/` and route task.

---

## File Structure

```
app/
  layout.tsx                 # root layout, Sonner <Toaster/>
  page.tsx                   # single-page UI (client component)
  api/process/route.ts       # inputs -> gemini -> greenode -> validated JSON
  api/recheck/route.ts       # raw text + current table -> corrected JSON
lib/
  types.ts                   # MeetingResult, Task, ProcessInput types
  prompts.ts                 # buildClaudePrompt, GEMINI_IMAGE_PROMPT, GEMINI_AUDIO_PROMPT
  buildRawText.ts            # combine inputs into one raw-text string with source markers
  parseResult.ts             # extract + validate JSON from model output
  greenode.ts                # callGreenode(prompt) -> string  (OpenAI-compatible)
  gemini.ts                  # transcribeMedia(file) -> string
  csv.ts                     # tasksToCsv(result) -> string
components/
  InputPanel.tsx             # text box + file upload + participants
  ResultView.tsx             # summary + editable task table
  TaskTable.tsx              # the editable table
  ProgressState.tsx          # step-by-step loading indicator
lib/__tests__/               # Vitest unit tests
.env.example                 # names only, no real keys
vitest.config.ts
```

---

## Task 1: Scaffold project + test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `app/layout.tsx`, `app/page.tsx`, `lib/__tests__/smoke.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: a runnable Next.js app and a working `npm test`.

- [ ] **Step 1: Scaffold Next.js app in the repo root**

Run (in the repo root, answer prompts: TypeScript yes, Tailwind yes, App Router yes, `src/` no, import alias `@/*`):
```bash
npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm
```
If the directory is not empty, scaffold in a temp dir and copy `app/`, `package.json`, config files over, keeping existing `README.md`, `.claude/`, `docs/`.

- [ ] **Step 2: Add test + AI deps**

```bash
npm install @google/genai sonner
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Ensure secrets are ignored + add env example**

Confirm `.gitignore` contains `.env*` (create_next_app adds it). Create `.env.example`:
```
GEMINI_API_KEY=
GREENODE_API_KEY=
GREENODE_BASE_URL=
GREENODE_MODEL=
```

- [ ] **Step 5: Smoke test**

Create `lib/__tests__/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("harness works", () => { expect(1 + 1).toBe(2); });
```
Run: `npm test` — Expected: PASS. Then `npm run dev` and confirm `localhost:3000` loads.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "chore: scaffold Next.js app + vitest harness"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`, `lib/__tests__/types.test.ts`

**Interfaces:**
- Produces: `TaskType = "chot" | "de_xuat"`; `Task = { id: string; task: string; pic: string; type: TaskType; deadline: string; reference: string }`; `MeetingResult = { summary: string; language: string; tasks: Task[] }`; `ProcessInput = { text: string; participants: string; context: string; language: string }`.

- [ ] **Step 1: Write the failing test**
```ts
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/types.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**
```ts
export type TaskType = "chot" | "de_xuat";
export interface Task { id: string; task: string; pic: string; type: TaskType; deadline: string; reference: string; }
export interface MeetingResult { summary: string; language: string; tasks: Task[]; }
export interface ProcessInput { text: string; participants: string; context: string; language: string; }

export function isMeetingResult(x: unknown): x is MeetingResult {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.summary !== "string" || typeof o.language !== "string" || !Array.isArray(o.tasks)) return false;
  return o.tasks.every((t) => {
    const tt = t as Record<string, unknown>;
    return typeof tt.task === "string" && (tt.type === "chot" || tt.type === "de_xuat")
      && typeof tt.pic === "string" && typeof tt.deadline === "string" && typeof tt.reference === "string";
  });
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/types.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/types.ts lib/__tests__/types.test.ts && git commit -m "feat: shared result types + guard"
```

---

## Task 3: `buildRawText` — combine inputs into one raw-text block

**Files:**
- Create: `lib/buildRawText.ts`, `lib/__tests__/buildRawText.test.ts`

**Interfaces:**
- Consumes: `ProcessInput`-like `{ text, participants, context }` plus `media: { label: string; text: string }[]` (transcripts produced by Gemini).
- Produces: `buildRawText(input: { text: string; participants: string; context: string; media: {label:string;text:string}[] }): string` — one string with clearly labelled sections so Claude can cite sources.

- [ ] **Step 1: Write the failing test**
```ts
import { expect, test } from "vitest";
import { buildRawText } from "../buildRawText";

test("includes participants, context, typed text and each media block with its label", () => {
  const out = buildRawText({
    text: "Chốt kèo deadline thứ 6",
    participants: "An, Bình",
    context: "Họp tuyển dụng",
    media: [{ label: "Ảnh 1", text: "ghi chú bảng trắng" }, { label: "Ghi âm 1", text: "phần thảo luận" }],
  });
  expect(out).toContain("An, Bình");
  expect(out).toContain("Họp tuyển dụng");
  expect(out).toContain("Chốt kèo deadline thứ 6");
  expect(out).toContain("Ảnh 1");
  expect(out).toContain("ghi chú bảng trắng");
  expect(out).toContain("Ghi âm 1");
});
test("omits empty sections cleanly", () => {
  const out = buildRawText({ text: "chỉ có text", participants: "", context: "", media: [] });
  expect(out).toContain("chỉ có text");
  expect(out.toLowerCase()).not.toContain("người tham gia");
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/buildRawText.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
export interface RawInput { text: string; participants: string; context: string; media: { label: string; text: string }[]; }
export function buildRawText(input: RawInput): string {
  const parts: string[] = [];
  if (input.participants.trim()) parts.push(`## Người tham gia\n${input.participants.trim()}`);
  if (input.context.trim()) parts.push(`## Bối cảnh\n${input.context.trim()}`);
  if (input.text.trim()) parts.push(`## Ghi chú dạng chữ\n${input.text.trim()}`);
  for (const m of input.media) {
    if (m.text.trim()) parts.push(`## ${m.label}\n${m.text.trim()}`);
  }
  return parts.join("\n\n");
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/buildRawText.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/buildRawText.ts lib/__tests__/buildRawText.test.ts && git commit -m "feat: buildRawText combines inputs with source labels"
```

---

## Task 4: `parseResult` — extract + validate JSON from model output

**Files:**
- Create: `lib/parseResult.ts`, `lib/__tests__/parseResult.test.ts`

**Interfaces:**
- Consumes: raw model text (may include prose or ```json fences), `isMeetingResult` from Task 2.
- Produces: `parseResult(raw: string): MeetingResult` — throws `Error("INVALID_RESULT")` if no valid object found; fills missing `id` with an index; coerces missing optional fields to `""`.

- [ ] **Step 1: Write the failing test**
```ts
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/parseResult.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
import { isMeetingResult, type MeetingResult, type Task } from "./types";

function extractJson(raw: string): string | null {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return null;
}

export function parseResult(raw: string): MeetingResult {
  const json = extractJson(raw);
  if (!json) throw new Error("INVALID_RESULT");
  let obj: unknown;
  try { obj = JSON.parse(json); } catch { throw new Error("INVALID_RESULT"); }
  if (!isMeetingResult(obj)) throw new Error("INVALID_RESULT");
  const r = obj as MeetingResult;
  r.tasks = r.tasks.map((t, i): Task => ({
    id: t.id?.toString() || String(i + 1),
    task: t.task, pic: t.pic ?? "", type: t.type,
    deadline: t.deadline ?? "", reference: t.reference ?? "",
  }));
  return r;
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/parseResult.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/parseResult.ts lib/__tests__/parseResult.test.ts && git commit -m "feat: parseResult extracts and validates model JSON"
```

---

## Task 5: `prompts` — Claude + Gemini prompt builders

**Files:**
- Create: `lib/prompts.ts`, `lib/__tests__/prompts.test.ts`

**Interfaces:**
- Produces: `buildClaudePrompt(rawText: string, language: string): string`; const `GEMINI_IMAGE_PROMPT: string`; const `GEMINI_AUDIO_PROMPT: string`.
- `buildClaudePrompt` must instruct the 4 steps and demand a JSON-only answer matching the schema.

- [ ] **Step 1: Write the failing test**
```ts
import { expect, test } from "vitest";
import { buildClaudePrompt, GEMINI_AUDIO_PROMPT } from "../prompts";

test("claude prompt embeds raw text, language, JSON schema and the 4 steps", () => {
  const p = buildClaudePrompt("NỘI DUNG THÔ", "vi");
  expect(p).toContain("NỘI DUNG THÔ");
  expect(p).toContain("vi");
  expect(p).toContain('"tasks"');
  expect(p).toContain("chot");
  expect(p).toContain("de_xuat");
  expect(p.toLowerCase()).toContain("chuẩn hoá");
});
test("gemini audio prompt asks for transcript", () => {
  expect(GEMINI_AUDIO_PROMPT.toLowerCase()).toContain("chữ");
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/prompts.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
export const GEMINI_IMAGE_PROMPT =
  "Đọc toàn bộ chữ có trong ảnh này và ghi lại thành văn bản thuần. Chỉ trả về phần chữ, không giải thích.";
export const GEMINI_AUDIO_PROMPT =
  "Nghe đoạn ghi âm và chuyển thành chữ (transcript) đầy đủ, giữ nguyên ý. Chỉ trả về phần chữ, không giải thích.";

export function buildClaudePrompt(rawText: string, language: string): string {
  return `Bạn là trợ lý ghi biên bản họp. Dưới đây là ghi chú thô của một cuộc họp (nhiều nguồn, đã ghép lại).

Làm theo đúng 4 bước:
0. Chuẩn hoá ngôn ngữ: dịch mọi thứ về ngôn ngữ "${language}", diễn giải slang/viết tắt/Gen Z (vd "chốt kèo" = đã thống nhất).
1. Viết meeting minutes: tóm tắt ý chính cuộc họp.
2. Phân loại mỗi việc là "chot" (đã chốt) hay "de_xuat" (mới đề xuất).
3. Với mỗi việc, tách: nội dung việc (task), người phụ trách (pic), hạn (deadline). Mỗi việc kèm "reference" = trích đúng đoạn trong ghi chú thô mà việc đó dựa vào.

CHỈ trả về một object JSON hợp lệ, KHÔNG kèm chữ nào khác, theo đúng khuôn:
{"summary": string, "language": "${language}", "tasks": [{"task": string, "pic": string, "type": "chot"|"de_xuat", "deadline": string, "reference": string}]}

GHI CHÚ THÔ:
"""
${rawText}
"""`;
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/prompts.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/prompts.ts lib/__tests__/prompts.test.ts && git commit -m "feat: prompt builders for claude and gemini"
```

---

## Task 6: `greenode` — call the Greenode/Claude endpoint

**Files:**
- Create: `lib/greenode.ts`, `lib/__tests__/greenode.test.ts`

**Interfaces:**
- Produces: `callGreenode(prompt: string): Promise<string>` — POSTs an OpenAI-compatible chat completion to `${GREENODE_BASE_URL}/chat/completions` with `Authorization: Bearer ${GREENODE_API_KEY}` and `model: GREENODE_MODEL`; returns `choices[0].message.content`. Throws `Error("GREENODE_ERROR")` on non-200.
- NOTE: The exact Greenode request shape is assumed OpenAI-compatible. If the real endpoint differs, only this file changes; tests mock `fetch` so they stay valid.

- [ ] **Step 1: Write the failing test**
```ts
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/greenode.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
export async function callGreenode(prompt: string): Promise<string> {
  const base = process.env.GREENODE_BASE_URL!;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GREENODE_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GREENODE_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error("GREENODE_ERROR");
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/greenode.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/greenode.ts lib/__tests__/greenode.test.ts && git commit -m "feat: greenode client (openai-compatible)"
```

---

## Task 7: `gemini` — transcribe image/audio to text

**Files:**
- Create: `lib/gemini.ts`, `lib/__tests__/gemini.test.ts`

**Interfaces:**
- Produces: `transcribeMedia(file: { mimeType: string; base64: string }): Promise<string>` — uses `@google/genai`, picks the image or audio prompt by mimeType prefix, returns the model text. Throws `Error("GEMINI_ERROR")` on failure.
- The `@google/genai` client is created inside a small `getModel()` helper so tests can mock it.

- [ ] **Step 1: Write the failing test** (mock the SDK)
```ts
import { expect, test, vi } from "vitest";

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: vi.fn(async () => ({ text: "NỘI DUNG" })) },
  })),
}));

import { transcribeMedia } from "../gemini";

test("returns transcribed text for audio", async () => {
  process.env.GEMINI_API_KEY = "k";
  const out = await transcribeMedia({ mimeType: "audio/mp3", base64: "AAAA" });
  expect(out).toBe("NỘI DUNG");
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/gemini.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
import { GoogleGenAI } from "@google/genai";
import { GEMINI_IMAGE_PROMPT, GEMINI_AUDIO_PROMPT } from "./prompts";

export async function transcribeMedia(file: { mimeType: string; base64: string }): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const prompt = file.mimeType.startsWith("image/") ? GEMINI_IMAGE_PROMPT : GEMINI_AUDIO_PROMPT;
    const res = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: file.mimeType, data: file.base64 } },
        { text: prompt },
      ]}],
    });
    return res.text ?? "";
  } catch { throw new Error("GEMINI_ERROR"); }
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/gemini.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/gemini.ts lib/__tests__/gemini.test.ts && git commit -m "feat: gemini media transcription"
```

---

## Task 8: `/api/process` route — orchestrate the pipeline

**Files:**
- Create: `app/api/process/route.ts`, `lib/processMeeting.ts`, `lib/__tests__/processMeeting.test.ts`

**Interfaces:**
- Produces: `processMeeting(input, deps)` where `deps = { transcribe, callModel }` are injected so it is testable without network. Signature: `processMeeting(input: { text; participants; context; language; media: {label;mimeType;base64}[] }, deps): Promise<MeetingResult>`. Retries the model once if `parseResult` throws, then rethrows `Error("INVALID_RESULT")`.
- The route wraps `processMeeting` with the real `transcribeMedia` + `callGreenode`, reads JSON body, returns `MeetingResult` or `{ error }` with status 400/500.

- [ ] **Step 1: Write the failing test** (inject fakes)
```ts
import { expect, test, vi } from "vitest";
import { processMeeting } from "../processMeeting";

const good = '{"summary":"s","language":"vi","tasks":[{"task":"t","pic":"","type":"chot","deadline":"","reference":"r"}]}';

test("transcribes media, calls model, returns parsed result", async () => {
  const transcribe = vi.fn(async () => "text từ ảnh");
  const callModel = vi.fn(async () => good);
  const r = await processMeeting(
    { text: "note", participants: "", context: "", language: "vi",
      media: [{ label: "Ảnh 1", mimeType: "image/png", base64: "AA" }] },
    { transcribe, callModel });
  expect(transcribe).toHaveBeenCalledOnce();
  expect(r.tasks[0].task).toBe("t");
});
test("retries model once on invalid output then throws", async () => {
  const transcribe = vi.fn();
  const callModel = vi.fn(async () => "rác");
  await expect(processMeeting(
    { text: "n", participants: "", context: "", language: "vi", media: [] },
    { transcribe, callModel })).rejects.toThrow("INVALID_RESULT");
  expect(callModel).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/processMeeting.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement `lib/processMeeting.ts`**
```ts
import { buildRawText } from "./buildRawText";
import { buildClaudePrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface ProcessDeps {
  transcribe: (f: { mimeType: string; base64: string }) => Promise<string>;
  callModel: (prompt: string) => Promise<string>;
}
export interface ProcessRequest {
  text: string; participants: string; context: string; language: string;
  media: { label: string; mimeType: string; base64: string }[];
}

export async function processMeeting(req: ProcessRequest, deps: ProcessDeps): Promise<MeetingResult> {
  const transcripts = await Promise.all(
    req.media.map(async (m) => ({ label: m.label, text: await deps.transcribe(m) })));
  const raw = buildRawText({ text: req.text, participants: req.participants, context: req.context, media: transcripts });
  const prompt = buildClaudePrompt(raw, req.language);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await deps.callModel(prompt);
    try { return parseResult(out); } catch { if (attempt === 1) throw new Error("INVALID_RESULT"); }
  }
  throw new Error("INVALID_RESULT");
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/processMeeting.test.ts` — Expected: PASS.

- [ ] **Step 5: Write the route** `app/api/process/route.ts`
```ts
import { NextResponse } from "next/server";
import { processMeeting } from "@/lib/processMeeting";
import { transcribeMedia } from "@/lib/gemini";
import { callGreenode } from "@/lib/greenode";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processMeeting(
      { text: body.text ?? "", participants: body.participants ?? "", context: body.context ?? "",
        language: body.language ?? "vi", media: body.media ?? [] },
      { transcribe: transcribeMedia, callModel: callGreenode });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: msg === "INVALID_RESULT" ? 502 : 500 });
  }
}
```

- [ ] **Step 6: Commit**
```bash
git add app/api/process lib/processMeeting.ts lib/__tests__/processMeeting.test.ts && git commit -m "feat: /api/process orchestration + route"
```

---

## Task 9: `/api/recheck` route — re-verify a table against the raw text

**Files:**
- Create: `app/api/recheck/route.ts`, `lib/recheckMeeting.ts`, `lib/__tests__/recheckMeeting.test.ts`
- Modify: `lib/prompts.ts` (add `buildRecheckPrompt`)

**Interfaces:**
- Produces: `buildRecheckPrompt(rawText, currentResultJson, language): string`; `recheckMeeting(req, deps): Promise<MeetingResult>` mirroring Task 8 but sending the current table for correction. Reuses the same `callModel` + `parseResult` + single retry.

- [ ] **Step 1: Write the failing test**
```ts
import { expect, test, vi } from "vitest";
import { recheckMeeting } from "../recheckMeeting";
const good = '{"summary":"s2","language":"vi","tasks":[]}';
test("sends current table and returns corrected result", async () => {
  const callModel = vi.fn(async () => good);
  const r = await recheckMeeting(
    { rawText: "gốc", current: { summary: "s", language: "vi", tasks: [] }, language: "vi" },
    { callModel });
  expect(r.summary).toBe("s2");
  expect(callModel.mock.calls[0][0]).toContain("gốc");
});
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/recheckMeeting.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `buildRecheckPrompt` in `lib/prompts.ts`:
```ts
export function buildRecheckPrompt(rawText: string, currentJson: string, language: string): string {
  return `Đây là ghi chú thô gốc và bảng kết quả hiện tại (có thể có lỗi phân loại/gán sai).
Đọc lại ghi chú gốc, soát và sửa bảng cho đúng. CHỈ trả về JSON đúng khuôn như trước, ngôn ngữ "${language}".

GHI CHÚ GỐC:
"""
${rawText}
"""

BẢNG HIỆN TẠI:
${currentJson}`;
}
```
Then `lib/recheckMeeting.ts`:
```ts
import { buildRecheckPrompt } from "./prompts";
import { parseResult } from "./parseResult";
import type { MeetingResult } from "./types";

export interface RecheckDeps { callModel: (p: string) => Promise<string>; }
export interface RecheckRequest { rawText: string; current: MeetingResult; language: string; }

export async function recheckMeeting(req: RecheckRequest, deps: RecheckDeps): Promise<MeetingResult> {
  const prompt = buildRecheckPrompt(req.rawText, JSON.stringify(req.current), req.language);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await deps.callModel(prompt);
    try { return parseResult(out); } catch { if (attempt === 1) throw new Error("INVALID_RESULT"); }
  }
  throw new Error("INVALID_RESULT");
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/recheckMeeting.test.ts` — Expected: PASS.

- [ ] **Step 5: Write the route** `app/api/recheck/route.ts`
```ts
import { NextResponse } from "next/server";
import { recheckMeeting } from "@/lib/recheckMeeting";
import { callGreenode } from "@/lib/greenode";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recheckMeeting(
      { rawText: body.rawText ?? "", current: body.current, language: body.language ?? "vi" },
      { callModel: callGreenode });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**
```bash
git add app/api/recheck lib/recheckMeeting.ts lib/prompts.ts lib/__tests__/recheckMeeting.test.ts && git commit -m "feat: /api/recheck re-verify route"
```

---

## Task 10: `csv` helper

**Files:**
- Create: `lib/csv.ts`, `lib/__tests__/csv.test.ts`

**Interfaces:**
- Produces: `tasksToCsv(result: MeetingResult): string` — header row `Task,PIC,Loại,Deadline,Reference`; values quoted and internal quotes doubled; `type` mapped `chot→Chốt`, `de_xuat→Đề xuất`.

- [ ] **Step 1: Write the failing test**
```ts
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
```

- [ ] **Step 2: Run to verify it fails**
Run: `npm test lib/__tests__/csv.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement**
```ts
import type { MeetingResult } from "./types";
const q = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
export function tasksToCsv(result: MeetingResult): string {
  const header = "Task,PIC,Loại,Deadline,Reference";
  const rows = result.tasks.map((t) =>
    [t.task, t.pic, t.type === "chot" ? "Chốt" : "Đề xuất", t.deadline, t.reference].map(q).join(","));
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**
Run: `npm test lib/__tests__/csv.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/csv.ts lib/__tests__/csv.test.ts && git commit -m "feat: csv export helper"
```

---

## Task 11: Input panel + empty state (UI)

**Files:**
- Create: `components/InputPanel.tsx`
- Modify: `app/page.tsx`, `app/layout.tsx`

**Interfaces:**
- Consumes: nothing server-side. `InputPanel` is a controlled component: props `{ value, onChange, onSubmit, busy }` where `value = { text, participants, context, files: File[] }`.
- Produces: user input + a submit action. Files are read to base64 in the page before POSTing to `/api/process`.

Note: UI tasks are verified by running the app (`npm run dev`) and looking, not by unit tests. Apply the `emil-design-eng` skill for layout/spacing/states.

- [ ] **Step 1:** Add Sonner `<Toaster />` to `app/layout.tsx`.
- [ ] **Step 2:** Build `InputPanel.tsx`: a textarea for pasted notes, an input for participants & context, and a drag/drop + file picker (`accept="image/*,audio/*,.txt"`). Show the **empty-state hint** ("Kéo thả file hoặc dán ghi chú vào đây") when nothing is entered.
- [ ] **Step 3:** Wire `app/page.tsx` state to hold input; on submit, read each file to `{ label, mimeType, base64 }` (label = `Ảnh N`/`Ghi âm N` by mimeType), POST to `/api/process`.
- [ ] **Step 4:** Run `npm run dev`, confirm the empty state shows and files can be selected. Manually verify with **fake** data only.
- [ ] **Step 5: Commit**
```bash
git add app components/InputPanel.tsx && git commit -m "feat: input panel + empty state"
```

---

## Task 12: Progress + error states (UI)

**Files:**
- Create: `components/ProgressState.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1:** `ProgressState.tsx` shows step labels ("Đang đọc ảnh/ghi âm…", "Đang viết biên bản…") driven by a `phase` prop.
- [ ] **Step 2:** In `page.tsx`, set `phase` around the fetch; on error response, map `error` codes to friendly Vietnamese messages and show a Sonner toast; keep the entered input intact.
- [ ] **Step 3:** Run the app; simulate an error by temporarily pointing an env var wrong; confirm the message is clear and input is preserved. Restore env.
- [ ] **Step 4: Commit**
```bash
git add app components/ProgressState.tsx && git commit -m "feat: progress + error states"
```

---

## Task 13: Result view + editable task table (UI)

**Files:**
- Create: `components/ResultView.tsx`, `components/TaskTable.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `MeetingResult` from `/api/process`.
- Produces: on-screen summary + table with columns Task / PIC / Loại / Deadline / Reference; every cell editable inline; edits update page state (the single source of truth passed to recheck/CSV).

- [ ] **Step 1:** `TaskTable.tsx`: render rows from `tasks`; each cell is an inline-editable field (contentEditable or input) calling `onEdit(id, field, value)`. `Loại` is a select (Chốt/Đề xuất). Show `reference` as muted helper text.
- [ ] **Step 2:** `ResultView.tsx`: summary block + `<TaskTable/>`.
- [ ] **Step 3:** Wire into `page.tsx`; verify editing a cell updates state (log or React devtools). Manual check with fake data.
- [ ] **Step 4: Commit**
```bash
git add app components/ResultView.tsx components/TaskTable.tsx && git commit -m "feat: editable result table"
```

---

## Task 14: Recheck + CSV export buttons (UI)

**Files:**
- Modify: `app/page.tsx`, `components/ResultView.tsx`

- [ ] **Step 1:** Add "Kiểm tra lại với AI" button: POST `{ rawText, current, language }` to `/api/recheck`; the page must keep the last `rawText` returned/assembled (store the assembled raw text from the process response, or re-send inputs). Replace table with the corrected result; toast on done/error.
- [ ] **Step 2:** Add "Xuất CSV" button: call `tasksToCsv(result)`, create a Blob, trigger a download named `bien-ban-hop.csv`.
- [ ] **Step 3:** Run the app end-to-end with fake data; confirm recheck updates the table and CSV downloads and opens correctly.
- [ ] **Step 4: Commit**
```bash
git add app components && git commit -m "feat: recheck + csv export"
```

---

## Task 15: Design polish + end-to-end manual check

**Files:** any component files, as needed.

- [ ] **Step 1:** Apply the `emil-design-eng` skill across the page: spacing, typography, the three states, button feedback. Use `animate` for the result appearing and the progress transition; `ask-sonner` for toast styling.
- [ ] **Step 2:** Run `review-animations` and `find-animation-opportunities`; apply high-priority items only.
- [ ] **Step 3:** Full manual pass with a **fake** dataset: 1 pasted note + 1 image + 1 short audio → minutes + table → edit a cell → recheck → export CSV. Requires real `GEMINI_API_KEY` + Greenode env in `.env.local`.
- [ ] **Step 4:** Update `README.md` with setup steps (`npm install`, copy `.env.example` → `.env.local`, fill keys, `npm run dev`).
- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "polish: design pass + README setup"
```

---

## Self-Review Notes

- **Spec coverage:** inputs text/image/audio (Tasks 7, 11) · Gemini transcribe (7) · Greenode minutes+classify (5,6,8) · language normalize step 0 (5) · check/validate + retry (8) · summary + table with reference (4,13) · edit inline (13) · recheck with AI (9,14) · CSV (10,14) · 3 UI states (11,12) · keys in .env server-only (1, Global Constraints) · fake-data testing (Global Constraints, 15). Video / timestamp / deploy correctly excluded per v1 scope.
- **Types consistent:** `MeetingResult`/`Task`/`type: "chot"|"de_xuat"` used identically across Tasks 2,4,8,9,10,13.
- **No placeholders:** every code step has real code; the one genuine unknown (Greenode's exact HTTP shape) is stated as a concrete OpenAI-compatible assumption isolated to `lib/greenode.ts`, with fetch-mocked tests unaffected if it changes.
