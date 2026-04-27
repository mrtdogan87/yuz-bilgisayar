import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { now } from "@/lib/utils";
import { deleteUpload, uploadPath, uploadsDir, uploadUrl } from "@/lib/uploads";
import type { Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
const MAX_SIZE = 20 * 1024 * 1024;

function posterFileNameFromUrl(url: string | null): string | null {
  if (!url) return null;
  return url.split("/").pop() ?? null;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dosya yok." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "PDF, PNG veya JPG yükleyebilirsiniz." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Dosya 20MB'dan büyük olamaz." }, { status: 400 });

  try {
    const dir = uploadsDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const settings = db.prepare("SELECT poster_file_url FROM settings WHERE id = 1").get() as Settings;
    const oldName = posterFileNameFromUrl(settings.poster_file_url);
    if (oldName) deleteUpload(oldName);

    const ext = file.name.split(".").pop() || "pdf";
    const fileName = `poster_${Date.now()}.${ext}`;
    const url = uploadUrl(fileName);
    fs.writeFileSync(uploadPath(fileName), Buffer.from(await file.arrayBuffer()));

    db.prepare(`
      UPDATE settings SET
        poster_file_url = ?,
        poster_file_name = ?,
        poster_mime_type = ?,
        poster_updated_at = ?,
        updated_at = ?
      WHERE id = 1
    `).run(url, file.name, file.type, now(), now());

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("Poster upload failed", err);
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    return NextResponse.json({ error: `Afiş kaydedilemedi: ${message}` }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const settings = db.prepare("SELECT poster_file_url FROM settings WHERE id = 1").get() as Settings;
  const oldName = posterFileNameFromUrl(settings.poster_file_url);
  if (oldName) deleteUpload(oldName);

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
