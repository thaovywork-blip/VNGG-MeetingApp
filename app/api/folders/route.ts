import { NextResponse } from "next/server";
import { createFolder, listFolders } from "@/lib/meetingStore";

export async function GET() {
  try {
    const folders = await listFolders();
    return NextResponse.json(folders);
  } catch {
    return NextResponse.json({ error: "STORE_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.name !== "string") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const folder = await createFolder(body.name);
    return NextResponse.json(folder);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_NAME") return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
