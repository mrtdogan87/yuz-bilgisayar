import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { db } from "@/lib/schema";
import { buildGridCells, GridSvg } from "@/lib/og-render";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare('SELECT * FROM donors ORDER BY "order" ASC').all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];
  const seed = req.nextUrl.searchParams.get("seed") || undefined;

  const CELL = 48;
  const { cells, emptyCells, gridW, gridH, totalComputers, placedCount } = buildGridCells(
    { settings, donors, layouts, seed },
    CELL
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: settings.brand_color,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 48px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              color: "white",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "-1.5px",
              textAlign: "center",
              display: "flex",
            }}
          >
            {settings.campaign_title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 24,
              textAlign: "center",
              display: "flex",
            }}
          >
            {settings.campaign_subtitle}
          </div>
        </div>

        <GridSvg
          cells={cells}
          emptyCells={emptyCells}
          gridW={gridW}
          gridH={gridH}
          cell={CELL}
          nameMaxFontSize={14}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "40px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: "18px 40px",
            alignItems: "center",
          }}
        >
          <Stat value={String(totalComputers)} label="Bilgisayar" />
          <Divider />
          <Stat value={String(placedCount)} label="Destekçi" />
          <Divider />
          <Stat value={`${Math.min(Math.round((totalComputers / 100) * 100), 100)}%`} label="Hedef" />
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "white", fontSize: 40, fontWeight: 900, display: "flex" }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, display: "flex" }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.22)", display: "flex" }} />;
}
