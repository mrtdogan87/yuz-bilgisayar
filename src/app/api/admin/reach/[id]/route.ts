import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  deleteReachEntry,
  updateReachEntry,
  validateEntryDate,
  validatePlatform,
} from "@/lib/reach";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json();

  const platform = body.platform != null ? validatePlatform(body.platform) : null;
  if (body.platform != null && !platform) {
    return NextResponse.json({ error: "Geçersiz platform." }, { status: 400 });
  }
  const entry_date = body.entry_date != null ? validateEntryDate(body.entry_date) : null;
  if (body.entry_date != null && !entry_date) {
    return NextResponse.json({ error: "Geçersiz tarih (YYYY-MM-DD)." }, { status: 400 });
  }
  let countVal: number | undefined;
  if (body.count != null) {
    const count = Number(body.count);
    if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
      return NextResponse.json({ error: "Geçersiz sayı." }, { status: 400 });
    }
    countVal = count;
  }
  let noteVal: string | null | undefined;
  if (body.note !== undefined) {
    noteVal =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : null;
  }

  const updated = updateReachEntry(id, {
    ...(platform ? { platform } : {}),
    ...(entry_date ? { entry_date } : {}),
    ...(countVal !== undefined ? { count: countVal } : {}),
    ...(noteVal !== undefined ? { note: noteVal } : {}),
  });
  if (!updated) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ entry: updated });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const ok = deleteReachEntry(id);
  if (!ok) {
    return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
