import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { now } from "@/lib/utils";
import type { Settings } from "@/lib/schema";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dosya yok." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "PDF, PNG veya JPG yükleyebilirsiniz." }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Dosya 20MB'dan büyük olamaz." }, { status: 400 });

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Remove old poster
  const settings = db.prepare("SELECT poster_file_url FROM settings WHERE id = 1").get() as Settings;
  if (settings.poster_file_url) {
    const oldName = settings.poster_file_url.split("/").pop();
    if (oldName) {
      const old = path.join(UPLOAD_DIR, oldName);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
  }

  const ext = file.name.split(".").pop() || "pdf";
  const fileName = `poster_${Date.now()}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, Buffer.from(await file.arrayBuffer()));

  db.prepare(`
    UPDATE settings SET
      poster_file_url = ?,
      poster_file_name = ?,
      poster_mime_type = ?,
      poster_updated_at = ?,
      updated_at = ?
    WHERE id = 1
  `).run(`/uploads/${fileName}`, file.name, file.type, now(), now());

  return NextResponse.json({ ok: true, url: `/uploads/${fileName}` });
}

export async function DELETE() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const settings = db.prepare("SELECT poster_file_url FROM settings WHERE id = 1").get() as Settings;
  if (settings.poster_file_url) {
    const oldName = settings.poster_file_url.split("/").pop();
    if (oldName) {
      const old = path.join(UPLOAD_DIR, oldName);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
  }

  db.prepare(`
    UPDATE settings SET
      poster_file_url = NULL,
      poster_file_name = NULL,
      poster_mime_type = NULL,
      poster_updated_at = NULL,
      updated_at = ?
    WHERE id = 1
  `).run(now());

  return NextResponse.json({ ok: true });
}
