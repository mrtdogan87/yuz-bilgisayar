import { computeLayout } from "./layout";
import { logoDataUri, readableTextColor } from "./og-helpers";
import type { Donor, Layout, Settings } from "./schema";

export type OgInputs = {
  settings: Settings;
  donors: Donor[];
  layouts: Layout[];
  seed?: string;
};

const DEFAULT_PALETTE = ["#FFC857", "#FFFFFF", "#F97316", "#FDE68A", "#FCA5A5", "#E879F9", "#FBBF24"];

export function buildGridCells({ settings, donors, layouts, seed }: OgInputs, cell: number) {
  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows, seed);
  const totalComputers = result.placed.reduce((sum, p) => sum + p.donor.computer_count, 0);

  const occupied = new Map<string, boolean>();
  for (const p of result.placed) {
    for (let dr = 0; dr < p.height; dr++) {
      for (let dc = 0; dc < p.width; dc++) {
        occupied.set(`${p.row + dr},${p.col + dc}`, true);
      }
    }
  }

  const drawnIds = new Set<string>();
  type Cell = { x: number; y: number; w: number; h: number; name: string; color: string; logo: string | null; textColor: string };
  const cells: Cell[] = [];
  for (const p of result.placed) {
    if (drawnIds.has(p.donor.id)) continue;
    drawnIds.add(p.donor.id);
    const color = p.donor.bg_color || DEFAULT_PALETTE[cells.length % DEFAULT_PALETTE.length];
    cells.push({
      x: p.col * cell,
      y: p.row * cell,
      w: p.width * cell,
      h: p.height * cell,
      name: p.donor.name,
      color,
      logo: logoDataUri(p.donor.logo_file_path, p.donor.logo_url),
      textColor: readableTextColor(color),
    });
  }

  const emptyCells: { x: number; y: number }[] = [];
  for (let r = 0; r < settings.grid_rows; r++) {
    for (let c = 0; c < settings.grid_cols; c++) {
      if (!occupied.has(`${r},${c}`)) emptyCells.push({ x: c * cell, y: r * cell });
    }
  }

  return {
    cells,
    emptyCells,
    totalComputers,
    placedCount: result.placed.length,
    gridW: settings.grid_cols * cell,
    gridH: settings.grid_rows * cell,
  };
}

export function GridSvg({
  cells,
  emptyCells,
  gridW,
  gridH,
  cell,
  emptyBorderOpacity = 0.15,
  emptyFillOpacity = 0.08,
  cellRadius = 4,
  cellGap = 3,
  nameMinHeightMultiplier = 1.5,
  nameMaxFontSize = 12,
}: {
  cells: ReturnType<typeof buildGridCells>["cells"];
  emptyCells: { x: number; y: number }[];
  gridW: number;
  gridH: number;
  cell: number;
  emptyBorderOpacity?: number;
  emptyFillOpacity?: number;
  cellRadius?: number;
  cellGap?: number;
  nameMinHeightMultiplier?: number;
  nameMaxFontSize?: number;
}) {
  return (
    <div style={{ position: "relative", width: gridW, height: gridH, display: "flex" }}>
      {emptyCells.map((c, i) => (
        <div
          key={`e${i}`}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: cell - cellGap + 1,
            height: cell - cellGap + 1,
            background: `rgba(255,255,255,${emptyFillOpacity})`,
            border: `1px solid rgba(255,255,255,${emptyBorderOpacity})`,
            borderRadius: 3,
            display: "flex",
          }}
        />
      ))}
      {cells.map((c, i) => (
        <div
          key={`c${i}`}
          style={{
            position: "absolute",
            left: c.x + 1,
            top: c.y + 1,
            width: c.w - cellGap,
            height: c.h - cellGap,
            background: c.color,
            borderRadius: cellRadius,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: 4,
          }}
        >
          {c.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logo} alt="" style={{ maxWidth: "88%", maxHeight: "88%", objectFit: "contain" }} />
          ) : c.h >= cell * nameMinHeightMultiplier ? (
            <div
              style={{
                color: c.textColor,
                fontSize: Math.min(nameMaxFontSize, Math.floor(c.w / 4)),
                fontWeight: 700,
                textAlign: "center",
                padding: "2px 4px",
                display: "flex",
              }}
            >
              {c.name}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>
      ))}
    </div>
  );
}
