import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { now } from "@/lib/utils";
import { deleteUpload, uploadPath, uploadsDir, uploadUrl } from "@/lib/uploads";
import type { Donor } from "@/lib/schema";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"]);
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const MAX_SIZE = 5 * 1024 * 1024;

function logoExtension(file: File): string | null {
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) return null;
  if (!file.type || file.type === "application/octet-stream" || ALLOWED_TYPES.has(file.type)) return ext;
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dosya yok." }, { status: 400 });
  const ext = logoExtension(file);
  if (!ext) return NextResponse.json({ error: "Logo PNG, JPG, GIF, WebP veya SVG olmalıdır." }, { status: 400 });
  if (file.size <= 0) return NextResponse.json({ error: "Logo dosyası boş görünüyor." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Dosya 5MB'dan büyük olamaz." }, { status: 400 });

  const aspectRaw = formData.get("aspect");
  const aspect = aspectRaw ? Number(aspectRaw) : null;
  const validAspect = aspect && Number.isFinite(aspect) && aspect > 0 ? aspect : null;

  try {
    const dir = uploadsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (donor.logo_file_path) deleteUpload(donor.logo_file_path);

    const fileName = `logo_${id}_${Date.now()}.${ext}`;
    const filePath = uploadPath(fileName);
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buf);

    db.prepare(
      "UPDATE donors SET logo_file_path = ?, logo_url = NULL, logo_aspect = ?, updated_at = ? WHERE id = ?"
    ).run(fileName, validAspect, now(), id);
    db.prepare("UPDATE settings SET updated_at = ? WHERE id = 1").run(now());

    return NextResponse.json({ ok: true, logoUrl: uploadUrl(fileName) });
  } catch (err) {
    console.error("Logo upload failed", err);
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json(
      { error: `Logo kaydedilemedi: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await params;

  const donor = db.prepare("SELECT * FROM donors WHERE id = ?").get(id) as Donor | undefined;
  if (!donor) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  if (donor.logo_file_path) {
    deleteUpload(donor.logo_file_path);
    db.prepare(
      "UPDATE donors SET logo_file_path = NULL, logo_aspect = NULL, updated_at = ? WHERE id = ?"
    ).run(now(), id);
  }

  return NextResponse.json({ ok: true });
}
