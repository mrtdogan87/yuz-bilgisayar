import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { resolveUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { path: parts } = await ctx.params;
  if (!parts || parts.length !== 1) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  const name = decodeURIComponent(parts[0]);
  const resolved = resolveUpload(name);
  if (!resolved) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const buffer = fs.readFileSync(resolved.fullPath);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": resolved.mime,
      "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
    },
  });
}
