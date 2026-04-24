import { headers } from "next/headers";
import { db } from "@/lib/schema";
import { computeLayout } from "@/lib/layout";
import { aggregateReach } from "@/lib/reach";
import type { Donor, Layout, Settings } from "@/lib/schema";
import WallClient from "./WallClient";

export const dynamic = "force-dynamic";

const COMPUTER_GOAL = 100;

async function resolvePublicUrl(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (envBase) return envBase;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata() {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const baseUrl = await resolvePublicUrl();
  return {
    title: settings.campaign_title,
    description: settings.campaign_subtitle,
    openGraph: {
      title: settings.campaign_title,
      description: settings.campaign_subtitle,
      images: [{ url: `${baseUrl}/api/og`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.campaign_title,
      description: settings.campaign_subtitle,
      images: [`${baseUrl}/api/og`],
    },
  };
}

export default async function HomePage() {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
  const donors = db.prepare("SELECT * FROM donors ORDER BY \"order\" ASC").all() as Donor[];
  const layouts = db.prepare("SELECT * FROM layouts").all() as Layout[];

  const result = computeLayout(donors, layouts, settings.grid_cols, settings.grid_rows);
  const totalComputers = result.placed.reduce((sum, p) => sum + p.donor.computer_count, 0);

  const placed = result.placed.map((p) => ({
    id: p.donor.id,
    name: p.donor.name,
    computerCount: p.donor.computer_count,
    logoUrl: p.donor.logo_file_path ? `/uploads/${p.donor.logo_file_path}` : p.donor.logo_url,
    websiteUrl: p.donor.website_url,
    bgColor: p.donor.bg_color,
    row: p.row,
    col: p.col,
    width: p.width,
    height: p.height,
  }));

  const donorList = [...result.placed]
    .sort((a, b) => b.donor.computer_count - a.donor.computer_count)
    .map((p) => ({
      id: p.donor.id,
      name: p.donor.name,
      computerCount: p.donor.computer_count,
      logoUrl: p.donor.logo_file_path ? `/uploads/${p.donor.logo_file_path}` : p.donor.logo_url,
      websiteUrl: p.donor.website_url,
      bgColor: p.donor.bg_color,
      createdAt: p.donor.created_at,
    }));

  const reach = aggregateReach();
  const publicUrl = await resolvePublicUrl();

  return (
    <WallClient
      settings={{
        campaignTitle: settings.campaign_title,
        campaignSubtitle: settings.campaign_subtitle,
        gridCols: settings.grid_cols,
        gridRows: settings.grid_rows,
        brandColor: settings.brand_color,
        borderColor: settings.border_color,
        gridColor: settings.grid_color,
        reachText: settings.reach_text,
        shareText: settings.share_text,
        instagramText: settings.instagram_text,
        posterFileUrl: settings.poster_file_url,
        posterFileName: settings.poster_file_name,
        posterMimeType: settings.poster_mime_type,
        reachTarget: settings.reach_target,
        computerGoal: COMPUTER_GOAL,
      }}
      placed={placed}
      totalComputers={totalComputers}
      donorList={donorList}
      reach={reach}
      pageUrl={publicUrl}
    />
  );
}
