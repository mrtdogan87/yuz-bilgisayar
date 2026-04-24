import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/schema";
import { computeLayout } from "@/lib/layout";
import { logoDataUri, readableTextColor } from "@/lib/og-helpers";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC").all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];

  const seed = req.nextUrl.searchParams.get("seed") || undefined;
  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows, seed);
  const totalComputers = result.placed.reduce((sum, p) => sum + p.donor.computer_count, 0);
  const capacity = settings.grid_cols * settings.grid_rows;
  const pct = Math.round((totalComputers / capacity) * 100);

  const CELL = 56;
  const COLS = settings.grid_cols;
  const ROWS = settings.grid_rows;

  const occupiedMap = new Map<string, boolean>();
  const drawnIds = new Set<string>();
  const cells: { x: number; y: number; w: number; h: number; name: string; color: string; logo: string | null; textColor: string }[] = [];

  for (const p of result.placed) {
    for (let dr = 0; dr < p.height; dr++) {
      for (let dc = 0; dc < p.width; dc++) {
        occupiedMap.set(`${p.row + dr},${p.col + dc}`, true);
      }
    }
  }

  for (const p of result.placed) {
    if (!drawnIds.has(p.donor.id)) {
      drawnIds.add(p.donor.id);
      const colors = ["#FFC857", "#FFFFFF", "#F97316", "#FDE68A", "#FCA5A5", "#E879F9", "#FBBF24"];
      const color = p.donor.bg_color || colors[cells.length % colors.length];
      const logo = logoDataUri(p.donor.logo_file_path, p.donor.logo_url);
      cells.push({
        x: p.col * CELL, y: p.row * CELL, w: p.width * CELL, h: p.height * CELL,
        name: p.donor.name, color, logo, textColor: readableTextColor(color),
      });
    }
  }

  const emptyCells: { x: number; y: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!occupiedMap.has(`${r},${c}`)) emptyCells.push({ x: c * CELL, y: r * CELL });
    }
  }

  const gridW = COLS * CELL;
  const gridH = ROWS * CELL;

  const titleParts = settings.campaign_title.split("=");

  return new ImageResponse(
    (
      <div style={{
        width: 1080, height: 1920,
        background: settings.brand_color,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-around",
        padding: "80px 40px", fontFamily: "sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div style={{ color: "white", fontSize: 52, fontWeight: 900, textAlign: "center", letterSpacing: "-2px", display: "flex" }}>
              {titleParts[0]?.trim() ?? settings.campaign_title}
            </div>
            {titleParts[1] && (
              <div style={{ color: "#38BDF8", fontSize: 52, fontWeight: 900, textAlign: "center", display: "flex" }}>
                = {titleParts[1].trim()}
              </div>
            )}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 26, textAlign: "center", display: "flex" }}>
            {settings.campaign_subtitle}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "row", gap: "32px", alignItems: "center" }}>
          {[
            { value: String(totalComputers), label: "Bilgisayar" },
            { value: String(result.placed.length), label: "Destekçi" },
            { value: `%${pct}`, label: "Doluluk" },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 36px",
            }}>
              <div style={{ color: "white", fontSize: 52, fontWeight: 900, display: "flex" }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 20, display: "flex" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ position: "relative", width: gridW, height: gridH, display: "flex" }}>
          {emptyCells.map((cell, i) => (
            <div key={i} style={{
              position: "absolute", left: cell.x, top: cell.y,
              width: CELL - 3, height: CELL - 3,
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 4, display: "flex",
            }} />
          ))}
          {cells.map((cell, i) => (
            <div key={i} style={{
              position: "absolute", left: cell.x + 2, top: cell.y + 2,
              width: cell.w - 5, height: cell.h - 5,
              background: cell.color, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              padding: 6,
            }}>
              {cell.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cell.logo} alt="" style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }} />
              ) : cell.h >= CELL * 2 ? (
                <div style={{ color: cell.textColor, fontSize: 14, fontWeight: 700, textAlign: "center", padding: "4px", display: "flex" }}>{cell.name}</div>
              ) : (
                <div style={{ display: "flex" }} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 24, textAlign: "center", display: "flex" }}>
          Sen de bu duvarda yer al
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
