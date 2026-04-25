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

  const CELL = 40;
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

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          fontFamily: "sans-serif",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ color: settings.border_color, fontSize: 36, fontWeight: 800, letterSpacing: "-1px", display: "flex" }}>
            {settings.campaign_title}
          </div>
          <div style={{ color: "#475569", fontSize: 18, display: "flex" }}>
            {settings.campaign_subtitle}
          </div>
        </div>

        <div style={{ position: "relative", width: gridW, height: gridH, display: "flex", background: settings.brand_color, borderRadius: 8 }}>
          {emptyCells.map((cell, i) => (
            <div key={i} style={{
              position: "absolute", left: cell.x, top: cell.y,
              width: CELL - 2, height: CELL - 2,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 3, display: "flex",
            }} />
          ))}
          {cells.map((cell, i) => (
            <div key={i} style={{
              position: "absolute", left: cell.x + 1, top: cell.y + 1,
              width: cell.w - 3, height: cell.h - 3,
              background: cell.color, borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              padding: 4,
            }}>
              {cell.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cell.logo} alt="" style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }} />
              ) : cell.h >= CELL * 1.5 ? (
                <div style={{ color: cell.textColor, fontSize: Math.min(12, Math.floor(cell.w / 4)), fontWeight: 700, textAlign: "center", padding: "2px 4px", display: "flex" }}>{cell.name}</div>
              ) : (
                <div style={{ display: "flex" }} />
              )}
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", flexDirection: "row", gap: "32px",
          background: settings.brand_color, borderRadius: 12, padding: "12px 32px",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "white", fontSize: 28, fontWeight: 800, display: "flex" }}>{totalComputers}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, display: "flex" }}>Bilgisayar</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.3)", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "white", fontSize: 28, fontWeight: 800, display: "flex" }}>{result.placed.length}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, display: "flex" }}>Destekçi</div>
          </div>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.3)", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: "white", fontSize: 28, fontWeight: 800, display: "flex" }}>%{pct}</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, display: "flex" }}>Doluluk</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
