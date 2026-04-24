import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { now } from "@/lib/utils";
import type { Donor } from "@/lib/schema";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dosya yok." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Desteklenmeyen dosya türü." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Dosya 5MB'dan büyük olamaz." }, { status: 400 });

  const aspectRaw = formData.get("aspect");
  const aspect = aspectRaw ? Number(aspectRaw) : null;
  const validAspect = aspect && Number.isFinite(aspect) && aspect > 0 ? aspect : null;

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Remove old logo file
  if (donor.logo_file_path) {
    const old = path.join(UPLOAD_DIR, donor.logo_file_path);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `logo_${id}_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buf);

  db.prepare("UPDATE donors SET logo_file_path = ?, logo_url = NULL, logo_aspect = ?, updated_at = ? WHERE id = ?").run(fileName, validAspect, now(), id);
  db.prepare("UPDATE settings SET updated_at = ? WHERE id = 1").run(now());

  return NextResponse.json({ ok: true, logoUrl: `/uploads/${fileName}` });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  if (donor.logo_file_path) {
    const filePath = path.join(UPLOAD_DIR, donor.logo_file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("UPDATE donors SET logo_file_path = NULL, logo_aspect = NULL, updated_at = ? WHERE id = ?").run(now(), id);
  }

  return NextResponse.json({ ok: true });
}
