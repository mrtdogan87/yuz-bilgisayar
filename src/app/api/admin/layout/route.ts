import { NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { computeLayout } from "@/lib/layout";
import { now } from "@/lib/utils";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];
  return NextResponse.json(layouts);
}

// Recalculate auto layout
export async function POST() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC").all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts WHERE manual_override = 1").all() as Layout[];

  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows);

  // Save computed layouts for auto-placed donors
  const upsert = db.prepare(`
    INSERT INTO layouts (donor_id, row_start, col_start, width, height, manual_override, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT(donor_id) DO UPDATE SET
      row_start = excluded.row_start,
      col_start = excluded.col_start,
      width = excluded.width,
      height = excluded.height,
      manual_override = 0,
      updated_at = excluded.updated_at
    WHERE manual_override = 0
  `);

  const insertMany = db.transaction((placed: typeof result.placed) => {
    for (const p of placed) {
      if (!p.isManual) {
        upsert.run(p.donor.id, p.row, p.col, p.width, p.height, now());
      }
    }
  });
  insertMany(result.placed);

  return NextResponse.json({ errors: result.errors, placedCount: result.placed.length });
}
