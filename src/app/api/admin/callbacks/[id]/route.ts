import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import type { CallbackRequest } from "@/lib/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const existing = db
    .prepare("SELECT * FROM callback_requests WHERE id = ?")
    .get(id) as CallbackRequest | undefined;
  if (!existing) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });

  let calledAt: number | null = existing.called_at;
  if (body.markCalled === true) calledAt = Date.now();
  else if (body.markCalled === false) calledAt = null;
  else if (typeof body.called_at === "number") calledAt = body.called_at;

  let callNote: string | null = existing.call_note;
  if (typeof body.call_note === "string") {
    callNote = body.call_note.trim().slice(0, 1000) || null;
  } else if (body.call_note === null) {
    callNote = null;
  }

  db.prepare(
    "UPDATE callback_requests SET called_at = ?, call_note = ? WHERE id = ?"
  ).run(calledAt, callNote, id);

  const updated = db.prepare("SELECT * FROM callback_requests WHERE id = ?").get(id) as CallbackRequest;
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const info = db.prepare("DELETE FROM callback_requests WHERE id = ?").run(id);
  if (info.changes === 0) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
