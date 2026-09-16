import { NextResponse } from "next/server";
import { listMeetings, saveMeeting } from "@/lib/meetingStore";
import type { Task } from "@/lib/types";

export async function GET() {
  try {
    const meetings = await listMeetings();
    return NextResponse.json(meetings);
  } catch {
    return NextResponse.json({ error: "STORE_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.summary !== "string" || typeof body?.language !== "string" || !Array.isArray(body?.tasks)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const record = await saveMeeting({
      id: typeof body.id === "string" ? body.id : undefined,
      date: typeof body.date === "string" ? body.date : new Date().toISOString(),
      title: typeof body.title === "string" ? body.title : "",
      summary: body.summary,
      language: body.language,
      tasks: body.tasks as Task[],
      rawText: typeof body.rawText === "string" ? body.rawText : "",
      folderId: typeof body.folderId === "string" ? body.folderId : null,
    });
    return NextResponse.json(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_ID") return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
