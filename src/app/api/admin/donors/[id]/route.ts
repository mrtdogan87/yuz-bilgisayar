import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { normalizeUrl, now } from "@/lib/utils";
import { deleteUpload } from "@/lib/uploads";
import type { Donor } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;
  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json(donor);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = await req.json();
  const { name, computerCount, logoUrl, websiteUrl, note, order, isActive, bgColor } = body;

  if (name !== undefined && !name.trim()) return NextResponse.json({ error: "Ad zorunludur." }, { status: 400 });
  if (computerCount !== undefined && computerCount < 1) return NextResponse.json({ error: "Bilgisayar adedi pozitif olmalıdır." }, { status: 400 });

  db.prepare(`
    UPDATE donors SET
      name = COALESCE(?, name),
      computer_count = COALESCE(?, computer_count),
      logo_url = ?,
      bg_color = ?,
      website_url = ?,
      note = ?,
      "order" = COALESCE(?, "order"),
      is_active = COALESCE(?, is_active),
      updated_at = ?
    WHERE id = ?
  `).run(
    name?.trim() ?? null,
    computerCount ?? null,
    logoUrl !== undefined ? (logoUrl || null) : donor.logo_url,
    bgColor !== undefined ? (bgColor || null) : donor.bg_color,
    websiteUrl !== undefined ? (websiteUrl ? normalizeUrl(websiteUrl) : null) : donor.website_url,
    note !== undefined ? (note || null) : donor.note,
    order ?? null,
    isActive !== undefined ? (isActive ? 1 : 0) : null,
    now(),
    id
  );

  db.prepare("UPDATE settings SET updated_at = ? WHERE id = 1").run(now());
  return NextResponse.json(db.prepare("SELECT * FROM donors WHERE id = ?").get(id));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Remove uploaded logo file if exists
  if (donor.logo_file_path) deleteUpload(donor.logo_file_path);

  db.prepare("DELETE FROM donors WHERE id = ?").run(id);
  db.prepare("UPDATE settings SET updated_at = ? WHERE id = 1").run(now());
  return NextResponse.json({ ok: true });
}
