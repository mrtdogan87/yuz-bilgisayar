import fs from "fs";
import path from "path";

const PRIMARY_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");

const LEGACY_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export function uploadsDir(): string {
  if (!fs.existsSync(PRIMARY_DIR)) {
    fs.mkdirSync(PRIMARY_DIR, { recursive: true });
  }
  return PRIMARY_DIR;
}

export function uploadPath(name: string): string {
  return path.join(uploadsDir(), name);
}

export function resolveUpload(name: string): { fullPath: string; mime: string } | null {
  const safe = name.replace(/[\\/]+/g, "");
  if (!safe || safe !== name) return null;
  const candidates = [
    path.join(uploadsDir(), safe),
    path.join(LEGACY_DIR, safe),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      return { fullPath: candidate, mime: MIME_BY_EXT[ext] ?? "application/octet-stream" };
    }
  }
  return null;
}

export function deleteUpload(name: string): void {
  if (!name) return;
  const safe = name.replace(/[\\/]+/g, "");
  if (!safe) return;
  for (const dir of [uploadsDir(), LEGACY_DIR]) {
    const full = path.join(dir, safe);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch {
        // ignore: legacy dir may be read-only
      }
    }
  }
}

export function uploadUrl(name: string): string {
  return `/api/uploads/${encodeURIComponent(name)}`;
}
