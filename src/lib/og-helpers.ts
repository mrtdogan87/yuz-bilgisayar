import fs from "fs";
import { resolveUpload } from "./uploads";

export function logoDataUri(filePath: string | null, url: string | null): string | null {
  if (filePath) {
    const resolved = resolveUpload(filePath);
    if (resolved) {
      const b64 = fs.readFileSync(resolved.fullPath).toString("base64");
      return `data:${resolved.mime};base64,${b64}`;
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
