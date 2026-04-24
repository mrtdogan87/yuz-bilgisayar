import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/schema";
import { computeLayout } from "@/lib/layout";
import { aggregateReach } from "@/lib/reach";
import type { Donor, Layout, Settings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC, created_at ASC").all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];

  const seed = req.nextUrl.searchParams.get("seed") || undefined;
  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows, seed);

  const totalComputers = result.placed.reduce((sum, p) => sum + p.donor.computer_count, 0);

  const wallData = {
    settings: {
      campaignTitle: settings.campaign_title,
      campaignSubtitle: settings.campaign_subtitle,
      gridCols: settings.grid_cols,
      gridRows: settings.grid_rows,
      reachTarget: settings.reach_target,
      brandColor: settings.brand_color,
      borderColor: settings.border_color,
      gridColor: settings.grid_color,
      fontFamily: settings.font_family,
      reachText: settings.reach_text,
      shareText: settings.share_text,
      instagramText: settings.instagram_text,
      posterTitle: settings.poster_title,
      posterFileUrl: settings.poster_file_url,
      posterFileName: settings.poster_file_name,
      posterMimeType: settings.poster_mime_type,
    },
    placed: result.placed.map((p) => ({
      id: p.donor.id,
      name: p.donor.name,
      computerCount: p.donor.computer_count,
      logoUrl: p.donor.logo_file_path
        ? `/uploads/${p.donor.logo_file_path}`
        : p.donor.logo_url,
      websiteUrl: p.donor.website_url,
      bgColor: p.donor.bg_color,
      row: p.row,
      col: p.col,
      width: p.width,
      height: p.height,
    })),
    totalComputers,
    reach: aggregateReach(),
    layoutErrors: result.errors,
  };

  return NextResponse.json(wallData);
}
