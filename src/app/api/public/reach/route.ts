import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { recordWebVisit, VISITOR_COOKIE, VISITOR_MAX_AGE_SEC } from "@/lib/reach";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  let mintedCookie = false;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    mintedCookie = true;
  }

  try {
    recordWebVisit(visitorId);
  } catch {
    // Non-fatal: tracking failures should never break the page.
  }

  const res = NextResponse.json({ ok: true });
  if (mintedCookie) {
    const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
    res.headers.append(
      "Set-Cookie",
      `${VISITOR_COOKIE}=${visitorId}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${VISITOR_MAX_AGE_SEC}`
    );
  }
  return res;
}
