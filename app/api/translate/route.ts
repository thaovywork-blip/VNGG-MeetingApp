import { NextResponse } from "next/server";
import { translateMeeting } from "@/lib/translateMeeting";
import { callGreenode } from "@/lib/greenode";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.current || typeof body.current !== "object") {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const result = await translateMeeting(
      { current: body.current, language: body.language ?? "English" },
      { callModel: callGreenode });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: msg === "INVALID_RESULT" ? 502 : 500 });
  }
}
