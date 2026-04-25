import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { isAuthenticated } from "@/lib/auth";
import { computeLayout } from "@/lib/layout";
import { now } from "@/lib/utils";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const {
    campaignTitle, campaignSubtitle, gridCols, gridRows,
    reachTarget, brandColor, borderColor, gridColor, fontFamily,
    reachText, shareText, instagramText, posterTitle,
    headerLeftText, headerRightText, footerText,
  } = body;

  // Warn if grid shrinks and layouts overflow
  if (gridCols !== undefined || gridRows !== undefined) {
    const current = db.prepare("SELECT grid_cols, grid_rows FROM settings WHERE id = 1").get() as { grid_cols: number; grid_rows: number };
    const newCols = gridCols ?? current.grid_cols;
    const newRows = gridRows ?? current.grid_rows;
    if (newCols < current.grid_cols || newRows < current.grid_rows) {
      const donors = db.prepare("SELECT * FROM donors").all() as Donor[];
      const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];
      const result = computeLayout(donors, layouts, newCols, newRows);
      if (result.errors.length > 0) {
        return NextResponse.json({
          error: "Grid küçültülürse mevcut yerleşimler bozulacak. Önce yerleşimleri düzenleyin.",
          layoutErrors: result.errors,
        }, { status: 400 });
      }
    }
  }

  db.prepare(`
    UPDATE settings SET
      campaign_title = COALESCE(?, campaign_title),
      campaign_subtitle = COALESCE(?, campaign_subtitle),
      grid_cols = COALESCE(?, grid_cols),
      grid_rows = COALESCE(?, grid_rows),
      reach_target = COALESCE(?, reach_target),
      brand_color = COALESCE(?, brand_color),
      border_color = COALESCE(?, border_color),
      grid_color = COALESCE(?, grid_color),
      font_family = COALESCE(?, font_family),
      reach_text = COALESCE(?, reach_text),
      share_text = COALESCE(?, share_text),
      instagram_text = COALESCE(?, instagram_text),
      poster_title = COALESCE(?, poster_title),
      header_left_text = COALESCE(?, header_left_text),
      header_right_text = COALESCE(?, header_right_text),
      footer_text = COALESCE(?, footer_text),
      updated_at = ?
    WHERE id = 1
  `).run(
    campaignTitle ?? null,
    campaignSubtitle ?? null,
    gridCols ?? null,
    gridRows ?? null,
    reachTarget ?? null,
    brandColor ?? null,
    borderColor ?? null,
    gridColor ?? null,
    fontFamily ?? null,
    reachText ?? null,
    shareText ?? null,
    instagramText ?? null,
    posterTitle ?? null,
    headerLeftText ?? null,
    headerRightText ?? null,
    footerText ?? null,
    now()
  );

  return NextResponse.json(db.prepare("SELECT * FROM settings WHERE id = 1").get());
}
