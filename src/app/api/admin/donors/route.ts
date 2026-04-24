import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { newId, normalizeUrl, now } from "@/lib/utils";
import type { Donor } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC, created_at ASC").all() as Donor[];
  return NextResponse.json(donors);
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const { name, computerCount, logoUrl, websiteUrl, note, order, isActive, bgColor } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Ad zorunludur." }, { status: 400 });
  if (!computerCount || computerCount < 1) return NextResponse.json({ error: "Bilgisayar adedi pozitif olmalıdır." }, { status: 400 });

  const id = newId();
  const maxOrder = (db.prepare("SELECT MAX(\"order\") as m FROM donors").get() as { m: number | null }).m ?? 0;

  db.prepare(`
    INSERT INTO donors (id, "order", is_active, name, computer_count, logo_url, bg_color, website_url, note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    order ?? maxOrder + 1,
    isActive !== false ? 1 : 0,
    name.trim(),
    computerCount,
    logoUrl || null,
    bgColor || null,
    websiteUrl ? normalizeUrl(websiteUrl) : null,
    note || null,
    now(),
    now()
  );

  db.prepare("UPDATE settings SET updated_at = ? WHERE id = 1").run(now());

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor;
  return NextResponse.json(donor, { status: 201 });
}
