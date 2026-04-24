import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { now } from "@/lib/utils";
import type { Settings, Layout } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ donorId: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { donorId } = await params;

  const body = await req.json();
  const { row, col, width, height, manualOverride } = body;

  const settings = db.prepare("SELECT grid_cols, grid_rows FROM settings WHERE id = 1").get() as Settings;

  if (manualOverride) {
    if (row < 0 || col < 0 || row + height > settings.grid_rows || col + width > settings.grid_cols) {
      return NextResponse.json({ error: "Yerleşim grid dışına taşıyor." }, { status: 400 });
    }

    // Check for collisions with other manual layouts
    const others = db.prepare("SELECT * FROM layouts WHERE donor_id != ? AND manual_override = 1").all(donorId) as Layout[];
    for (const other of others) {
      const overlap =
        row < other.row_start + other.height &&
        row + height > other.row_start &&
        col < other.col_start + other.width &&
        col + width > other.col_start;
      if (overlap) {
        return NextResponse.json({ error: "Başka bir manuel yerleşimle çakışıyor." }, { status: 400 });
      }
    }
  }

  db.prepare(`
    INSERT INTO layouts (donor_id, row_start, col_start, width, height, manual_override, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(donor_id) DO UPDATE SET
      row_start = excluded.row_start,
      col_start = excluded.col_start,
      width = excluded.width,
      height = excluded.height,
      manual_override = excluded.manual_override,
      updated_at = excluded.updated_at
  `).run(donorId, row ?? 0, col ?? 0, width ?? 1, height ?? 1, manualOverride ? 1 : 0, now());

  return NextResponse.json(db.prepare("SELECT * FROM layouts WHERE donor_id = ?").get(donorId));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ donorId: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { donorId } = await params;
  db.prepare("DELETE FROM layouts WHERE donor_id = ?").run(donorId);
  return NextResponse.json({ ok: true });
}
