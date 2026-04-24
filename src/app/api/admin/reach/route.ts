import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import {
  aggregateReach,
  listReachEntries,
  createReachEntry,
  validatePlatform,
  validateEntryDate,
} from "@/lib/reach";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  return NextResponse.json({
    summary: aggregateReach(),
    entries: listReachEntries(),
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const body = await req.json();
  const platform = validatePlatform(body.platform);
  if (!platform) {
    return NextResponse.json({ error: "Geçersiz platform." }, { status: 400 });
  }
  const entry_date = validateEntryDate(body.entry_date);
  if (!entry_date) {
    return NextResponse.json({ error: "Geçersiz tarih (YYYY-MM-DD)." }, { status: 400 });
  }
  const count = Number(body.count);
  if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
    return NextResponse.json({ error: "Geçersiz sayı." }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const entry = createReachEntry({ platform, count, note, entry_date });
  return NextResponse.json({ entry });
}
