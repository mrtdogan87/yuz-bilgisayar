import crypto from "crypto";
import { db } from "./schema";
import { NOTEBOOK_STATUSES } from "./schema";
import type { NotebookEntry, NotebookStatus } from "./schema";

export function listEntries(): NotebookEntry[] {
  return db
    .prepare(
      `SELECT * FROM notebook_entries
       ORDER BY
         CASE status
           WHEN 'pending' THEN 0
           WHEN 'in_progress' THEN 1
           WHEN 'done' THEN 2
           ELSE 3
         END,
         CASE
           WHEN next_followup_at IS NOT NULL AND next_followup_at <= ? THEN 0
           ELSE 1
         END,
         COALESCE(next_followup_at, scheduled_at, created_at) ASC`
    )
    .all(Date.now()) as NotebookEntry[];
}

export type NotebookInput = {
  name?: unknown;
  phone?: unknown;
  scheduled_at?: unknown;
  discussion_note?: unknown;
  next_followup_at?: unknown;
  status?: unknown;
};

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function asStatus(value: unknown): NotebookStatus | null {
  if (typeof value !== "string") return null;
  return (NOTEBOOK_STATUSES as readonly string[]).includes(value)
    ? (value as NotebookStatus)
    : null;
}

export function createEntry(input: NotebookInput): { entry: NotebookEntry } | { error: string } {
  const name = clean(input.name, 200);
  if (!name) return { error: "Ad zorunludur." };
  const status = asStatus(input.status) ?? "pending";

  const id = crypto.randomUUID();
  const now = Date.now();
  const phone = clean(input.phone, 60);
  const note = clean(input.discussion_note, 4000);
  const scheduled = asTimestamp(input.scheduled_at);
  const followup = asTimestamp(input.next_followup_at);

  db.prepare(
    `INSERT INTO notebook_entries
       (id, name, phone, scheduled_at, discussion_note, next_followup_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, phone, scheduled, note, followup, status, now, now);

  const entry = db.prepare("SELECT * FROM notebook_entries WHERE id = ?").get(id) as NotebookEntry;
  return { entry };
}

export function updateEntry(
  id: string,
  input: NotebookInput
): { entry: NotebookEntry } | { error: string; notFound?: boolean } {
  const existing = db
    .prepare("SELECT * FROM notebook_entries WHERE id = ?")
    .get(id) as NotebookEntry | undefined;
  if (!existing) return { error: "Kayıt bulunamadı.", notFound: true };

  const next: NotebookEntry = { ...existing };

  if (input.name !== undefined) {
    const name = clean(input.name, 200);
    if (!name) return { error: "Ad boş olamaz." };
    next.name = name;
  }
  if (input.phone !== undefined) next.phone = clean(input.phone, 60);
  if (input.discussion_note !== undefined) next.discussion_note = clean(input.discussion_note, 4000);
  if (input.scheduled_at !== undefined) next.scheduled_at = asTimestamp(input.scheduled_at);
  if (input.next_followup_at !== undefined) next.next_followup_at = asTimestamp(input.next_followup_at);
  if (input.status !== undefined) {
    const status = asStatus(input.status);
    if (!status) return { error: "Geçersiz durum." };
    next.status = status;
  }
  next.updated_at = Date.now();

  db.prepare(
    `UPDATE notebook_entries SET
       name = ?, phone = ?, scheduled_at = ?, discussion_note = ?,
       next_followup_at = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    next.name,
    next.phone,
    next.scheduled_at,
    next.discussion_note,
    next.next_followup_at,
    next.status,
    next.updated_at,
    id
  );

  return { entry: next };
}

export function deleteEntry(id: string): boolean {
  const info = db.prepare("DELETE FROM notebook_entries WHERE id = ?").run(id);
  return info.changes > 0;
}

export function summarize(entries: NotebookEntry[]) {
  const now = Date.now();
  let pending = 0;
  let inProgress = 0;
  let done = 0;
  let dueSoon = 0;
  for (const e of entries) {
    if (e.status === "pending") pending++;
    else if (e.status === "in_progress") inProgress++;
    else if (e.status === "done") done++;
    if (e.next_followup_at && e.next_followup_at <= now && e.status !== "done") dueSoon++;
  }
  return { total: entries.length, pending, inProgress, done, dueSoon };
}
