import { NextResponse } from "next/server";
import { processMeeting } from "@/lib/processMeeting";
import { transcribeMedia } from "@/lib/gemini";
import { callGreenode } from "@/lib/greenode";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { result, rawText } = await processMeeting(
      { text: body.text ?? "", participants: body.participants ?? "", context: body.context ?? "",
        language: body.language ?? "vi", media: body.media ?? [],
        sessionType: body.meetingType === "Interview" || body.meetingType === "Other" ? body.meetingType : "Meeting" },
      { transcribe: transcribeMedia, callModel: callGreenode });
    return NextResponse.json({ ...result, rawText });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: msg === "INVALID_RESULT" ? 502 : 500 });
  }
}
