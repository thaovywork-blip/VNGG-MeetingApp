import { NextResponse } from "next/server";
import { deleteMeeting, getMeeting, isValidMeetingId, setMeetingFolder } from "@/lib/meetingStore";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidMeetingId(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  try {
    const meeting = await getMeeting(id);
    if (!meeting) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(meeting);
  } catch {
    return NextResponse.json({ error: "STORE_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidMeetingId(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  try {
    await deleteMeeting(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "STORE_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidMeetingId(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  try {
    const body = await req.json();
    if (body?.folderId !== null && typeof body?.folderId !== "string") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const meeting = await setMeetingFolder(id, body.folderId);
    return NextResponse.json(meeting);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_ID") return NextResponse.json({ error: msg }, { status: 400 });
    if (msg === "NOT_FOUND") return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
