import { NextResponse } from "next/server";
import { deleteFolder, isValidFolderId, renameFolder } from "@/lib/meetingStore";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidFolderId(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  try {
    const body = await req.json();
    if (typeof body?.name !== "string") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const folder = await renameFolder(id, body.name);
    return NextResponse.json(folder);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "INVALID_NAME") return NextResponse.json({ error: msg }, { status: 400 });
    if (msg === "NOT_FOUND") return NextResponse.json({ error: msg }, { status: 404 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!isValidFolderId(id)) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  try {
    await deleteFolder(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "STORE_ERROR" }, { status: 500 });
  }
}
