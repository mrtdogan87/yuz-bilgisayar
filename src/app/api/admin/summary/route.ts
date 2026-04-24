import { NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { computeLayout, countFreeCells } from "@/lib/layout";
import { isAuthenticated } from "@/lib/auth";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC").all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];

  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows);

  const activeDonors = donors.filter((d) => d.is_active);
  const totalComputers = result.placed.reduce((sum, p) => sum + p.donor.computer_count, 0);
  const freeCells = countFreeCells(result.grid);
  const capacity = settings.grid_cols * settings.grid_rows;

  return NextResponse.json({
    totalComputers,
    activeDonorCount: activeDonors.length,
    totalDonorCount: donors.length,
    gridCapacity: capacity,
    freeCells,
    layoutErrors: result.errors,
    lastUpdated: settings.updated_at,
  });
}
