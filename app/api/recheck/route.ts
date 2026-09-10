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
