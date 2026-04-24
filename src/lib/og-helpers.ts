import fs from "fs";
import path from "path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export function logoDataUri(filePath: string | null, url: string | null): string | null {
  if (filePath) {
    const full = path.join(process.cwd(), "public", "uploads", filePath);
    if (fs.existsSync(full)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || "image/png";
      const b64 = fs.readFileSync(full).toString("base64");
      return `data:${mime};base64,${b64}`;
    }
  }
  if (url && /^https?:\/\//i.test(url)) return url;
  return null;
}

export function readableTextColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 3 && h.length !== 6) return "#0f172a";
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
}
