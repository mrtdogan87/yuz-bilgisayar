import { NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import type { CallbackRequest } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const rows = db
    .prepare("SELECT * FROM callback_requests ORDER BY created_at DESC")
    .all() as CallbackRequest[];

  const pending = rows.filter((r) => !r.called_at).length;
  const called = rows.length - pending;

  return NextResponse.json({
    summary: { total: rows.length, pending, called },
    entries: rows,
  });
}
