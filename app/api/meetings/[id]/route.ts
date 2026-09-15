import { NextResponse } from "next/server";
import { deleteMeeting, getMeeting, isValidMeetingId } from "@/lib/meetingStore";

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
