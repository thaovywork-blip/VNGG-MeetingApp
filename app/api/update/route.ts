import { NextResponse } from "next/server";
import { updateMeeting } from "@/lib/updateMeeting";
import { transcribeMedia } from "@/lib/gemini";
import { callGreenode } from "@/lib/greenode";

interface MediaInput {
  label: string;
  mimeType: string;
  base64: string;
}

function buildAdditionalMaterial(additionalText: string, transcripts: { label: string; text: string }[]): string {
  const parts: string[] = [];
  if (additionalText.trim()) parts.push(additionalText.trim());
  for (const t of transcripts) {
    if (t.text.trim()) parts.push(`## ${t.label}\n${t.text.trim()}`);
  }
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.current || typeof body.current !== "object") {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }
    const media: MediaInput[] = body.media ?? [];
    const transcripts = await Promise.all(
      media.map(async (m) => ({ label: m.label, text: await transcribeMedia(m) })));
    const additionalMaterial = buildAdditionalMaterial(body.additionalText ?? "", transcripts);
    const rawText = body.rawText ?? "";
    const result = await updateMeeting(
      { rawText, current: body.current, additionalMaterial, language: body.language ?? "English" },
      { callModel: callGreenode });
    return NextResponse.json({ ...result, rawText: `${rawText}\n\n${additionalMaterial}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: msg === "INVALID_RESULT" ? 502 : 500 });
  }
}
