import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/schema";
import type { CallbackRequest } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const name = clean(body.name, 120);
  const phoneRaw = clean(body.phone, 40);
  const note = clean(body.note, 500);

  if (!name) return NextResponse.json({ error: "Ad / şirket adı zorunludur." }, { status: 400 });
  if (!phoneRaw) return NextResponse.json({ error: "Telefon numarası zorunludur." }, { status: 400 });

  const phoneDigits = phoneRaw.replace(/[^0-9+]/g, "");
  if (phoneDigits.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Geçerli bir telefon numarası girin." }, { status: 400 });
  }

  // Light per-IP rate limit: max 5 in 10 minutes (best-effort)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  const recent = db
    .prepare("SELECT COUNT(*) AS c FROM callback_requests WHERE created_at > ? AND note LIKE ?")
    .get(tenMinAgo, `%[ip:${ip}]%`) as { c: number };
  if (recent.c >= 5) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  }

  const id = crypto.randomUUID();
  const noteWithIp = note ? `${note}\n[ip:${ip}]` : `[ip:${ip}]`;
  const created_at = Date.now();
  db.prepare(
    "INSERT INTO callback_requests (id, name, phone, note, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, phoneRaw, noteWithIp, created_at);

  const entry = db.prepare("SELECT * FROM callback_requests WHERE id = ?").get(id) as CallbackRequest;
  return NextResponse.json({ ok: true, id: entry.id });
}
