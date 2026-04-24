import crypto from "crypto";
import { db } from "./schema";
import type { ReachEntry, Settings } from "./schema";
import { REACH_PLATFORMS } from "./schema";

export const VISITOR_COOKIE = "visitor_id";
export const VISITOR_MAX_AGE_SEC = 60 * 60 * 24 * 180; // 180 days

const VISITOR_SALT =
  process.env.VISITOR_HASH_SALT ??
  "100-bilgisayar-salt-change-me-in-production";

export function hashVisitor(visitorId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${VISITOR_SALT}:${visitorId}`)
    .digest("hex");
}

export function currentHourBucket(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}`;
}

export function recordWebVisit(visitorId: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO web_visits (visitor_hash, hour_bucket, created_at) VALUES (?, ?, ?)"
  ).run(hashVisitor(visitorId), currentHourBucket(), Date.now());
}

type Aggregated = {
  target: number;
  webCount: number;
  socialCount: number;
  totalCount: number;
  remaining: number;
  percent: number;
  sources: Record<string, number>;
};

export function aggregateReach(): Aggregated {
  const settings = db
    .prepare("SELECT reach_target FROM settings WHERE id = 1")
    .get() as Pick<Settings, "reach_target">;

  const webRow = db
    .prepare("SELECT COUNT(*) AS c FROM web_visits")
    .get() as { c: number };
  const webCount = webRow.c ?? 0;

  const socialRows = db
    .prepare(
      "SELECT platform, COALESCE(SUM(count), 0) AS total FROM reach_entries GROUP BY platform"
    )
    .all() as { platform: string; total: number }[];

  const sources: Record<string, number> = { web: webCount };
  for (const p of REACH_PLATFORMS) sources[p] = 0;
  let socialCount = 0;
  for (const row of socialRows) {
    const key = (REACH_PLATFORMS as readonly string[]).includes(row.platform)
      ? row.platform
      : "other";
    sources[key] = (sources[key] ?? 0) + row.total;
    socialCount += row.total;
  }

  const target = settings.reach_target;
  const totalCount = webCount + socialCount;
  const remaining = Math.max(target - totalCount, 0);
  const percent = target > 0 ? Math.min(Math.round((totalCount / target) * 100), 999) : 0;

  return { target, webCount, socialCount, totalCount, remaining, percent, sources };
}

export function listReachEntries(): ReachEntry[] {
  return db
    .prepare(
      "SELECT * FROM reach_entries ORDER BY entry_date DESC, created_at DESC"
    )
    .all() as ReachEntry[];
}

export function createReachEntry(params: {
  platform: string;
  count: number;
  note: string | null;
  entry_date: string;
}): ReachEntry {
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    "INSERT INTO reach_entries (id, platform, count, note, entry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, params.platform, params.count, params.note, params.entry_date, now, now);
  return db.prepare("SELECT * FROM reach_entries WHERE id = ?").get(id) as ReachEntry;
}

export function updateReachEntry(
  id: string,
  params: Partial<Pick<ReachEntry, "platform" | "count" | "note" | "entry_date">>
): ReachEntry | null {
  const existing = db
    .prepare("SELECT * FROM reach_entries WHERE id = ?")
    .get(id) as ReachEntry | undefined;
  if (!existing) return null;
  const next: ReachEntry = {
    ...existing,
    ...params,
    updated_at: Date.now(),
  };
  db.prepare(
    "UPDATE reach_entries SET platform = ?, count = ?, note = ?, entry_date = ?, updated_at = ? WHERE id = ?"
  ).run(next.platform, next.count, next.note, next.entry_date, next.updated_at, id);
  return next;
}

export function deleteReachEntry(id: string): boolean {
  const info = db.prepare("DELETE FROM reach_entries WHERE id = ?").run(id);
  return info.changes > 0;
}

export function validatePlatform(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return (REACH_PLATFORMS as readonly string[]).includes(trimmed) ? trimmed : "other";
}

export function validateEntryDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : value;
}
