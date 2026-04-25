import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH, { timeout: 5000 });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      campaign_title TEXT NOT NULL DEFAULT '100 Bilgisayar = 100 Gelecek',
      campaign_subtitle TEXT NOT NULL DEFAULT 'Bağışlanan her bilgisayar, bu duvarda bir hücreye dönüşür.',
      grid_cols INTEGER NOT NULL DEFAULT 13,
      grid_rows INTEGER NOT NULL DEFAULT 8,
      reach_target INTEGER NOT NULL DEFAULT 40000,
      brand_color TEXT NOT NULL DEFAULT '#06a7bc',
      border_color TEXT NOT NULL DEFAULT '#038091',
      grid_color TEXT NOT NULL DEFAULT '#16bfd9',
      font_family TEXT NOT NULL DEFAULT 'Inter, sans-serif',
      reach_text TEXT NOT NULL DEFAULT '',
      share_text TEXT NOT NULL DEFAULT '',
      instagram_text TEXT NOT NULL DEFAULT '',
      poster_title TEXT NOT NULL DEFAULT '',
      poster_file_url TEXT,
      poster_file_name TEXT,
      poster_mime_type TEXT,
      poster_updated_at TEXT,
      admin_password_hash TEXT NOT NULL DEFAULT '',
      header_left_text TEXT NOT NULL DEFAULT 'Manisa Celal Bayar Üniversitesi İİBF',
      header_right_text TEXT NOT NULL DEFAULT 'Bağış Duvarı',
      footer_text TEXT NOT NULL DEFAULT 'Manisa Celal Bayar Üniversitesi İktisadi ve İdari Bilimler Fakültesi',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS donors (
      id TEXT PRIMARY KEY,
      "order" INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      computer_count INTEGER NOT NULL DEFAULT 1,
      logo_url TEXT,
      logo_file_path TEXT,
      logo_aspect REAL,
      bg_color TEXT,
      website_url TEXT,
      color_class TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS layouts (
      donor_id TEXT PRIMARY KEY REFERENCES donors(id) ON DELETE CASCADE,
      row_start INTEGER NOT NULL DEFAULT 0,
      col_start INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 1,
      height INTEGER NOT NULL DEFAULT 1,
      manual_override INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS web_visits (
      visitor_hash TEXT NOT NULL,
      hour_bucket TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (visitor_hash, hour_bucket)
    );
    CREATE INDEX IF NOT EXISTS idx_web_visits_hour ON web_visits(hour_bucket);

    CREATE TABLE IF NOT EXISTS reach_entries (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      count INTEGER NOT NULL,
      note TEXT,
      entry_date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reach_entries_date ON reach_entries(entry_date);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
  `);

  const donorCols = (db.prepare("PRAGMA table_info(donors)").all() as { name: string }[]).map((r) => r.name);
  if (!donorCols.includes("logo_aspect")) db.exec("ALTER TABLE donors ADD COLUMN logo_aspect REAL");
  if (!donorCols.includes("bg_color")) db.exec("ALTER TABLE donors ADD COLUMN bg_color TEXT");

  const settingsCols = (db.prepare("PRAGMA table_info(settings)").all() as { name: string }[]).map((r) => r.name);
  if (!settingsCols.includes("header_left_text"))
    db.exec("ALTER TABLE settings ADD COLUMN header_left_text TEXT NOT NULL DEFAULT 'Manisa Celal Bayar Üniversitesi İİBF'");
  if (!settingsCols.includes("header_right_text"))
    db.exec("ALTER TABLE settings ADD COLUMN header_right_text TEXT NOT NULL DEFAULT 'Bağış Duvarı'");
  if (!settingsCols.includes("footer_text"))
    db.exec("ALTER TABLE settings ADD COLUMN footer_text TEXT NOT NULL DEFAULT 'Manisa Celal Bayar Üniversitesi İktisadi ve İdari Bilimler Fakültesi'");

  _db = db;
  return db;
}

// Lazy singleton — not initialized at module load time
export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const realDb = getDb();
    const val = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") return val.bind(realDb);
    return val;
  },
});

export type Settings = {
  id: number;
  campaign_title: string;
  campaign_subtitle: string;
  grid_cols: number;
  grid_rows: number;
  reach_target: number;
  brand_color: string;
  border_color: string;
  grid_color: string;
  font_family: string;
  reach_text: string;
  share_text: string;
  instagram_text: string;
  poster_title: string;
  poster_file_url: string | null;
  poster_file_name: string | null;
  poster_mime_type: string | null;
  poster_updated_at: string | null;
  header_left_text: string;
  header_right_text: string;
  footer_text: string;
  updated_at: string;
};

export type Donor = {
  id: string;
  order: number;
  is_active: number;
  name: string;
  computer_count: number;
  logo_url: string | null;
  logo_file_path: string | null;
  logo_aspect: number | null;
  bg_color: string | null;
  website_url: string | null;
  color_class: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Layout = {
  donor_id: string;
  row_start: number;
  col_start: number;
  width: number;
  height: number;
  manual_override: number;
  updated_at: string;
};

export type ReachEntry = {
  id: string;
  platform: string;
  count: number;
  note: string | null;
  entry_date: string;
  created_at: number;
  updated_at: number;
};

export type AdminSession = {
  id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
  user_agent: string | null;
};

export const REACH_PLATFORMS = ["instagram", "linkedin", "x", "whatsapp", "other"] as const;
export type ReachPlatform = (typeof REACH_PLATFORMS)[number];
