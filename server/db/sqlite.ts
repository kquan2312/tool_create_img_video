import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dgt_workstation.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('[SQLite] Failed to load existing database file, creating fresh DB:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

function initTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'image_gen', 'image_edit', 'video_gen'
      prompt TEXT NOT NULL,
      negative_prompt TEXT,
      reference_image TEXT,
      last_frame_image TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      aspect_ratio TEXT NOT NULL,
      resolution TEXT,
      status TEXT NOT NULL, -- 'pending', 'running', 'succeeded', 'failed', 'cancelled'
      progress INTEGER DEFAULT 0,
      output_path TEXT,
      output_url TEXT,
      thumbnail_url TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 2,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      batch_id TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS batch_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      total_items INTEGER NOT NULL,
      completed_items INTEGER DEFAULT 0,
      failed_items INTEGER DEFAULT 0,
      status TEXT NOT NULL, -- 'pending', 'running', 'paused', 'completed', 'cancelled'
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL, -- 'info', 'warn', 'error', 'success'
      message TEXT NOT NULL,
      task_id TEXT,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL, -- 'google_flow', 'veo', 'grok', 'gemini_api'
      auth_type TEXT NOT NULL, -- 'cookie_session', 'bearer_token', 'api_key'
      credentials TEXT NOT NULL, -- Masked or encrypted token / cookie string
      proxy_id TEXT,
      status TEXT NOT NULL, -- 'active', 'expired', 'relogin_needed', 'rate_limited'
      quota_remaining TEXT,
      last_checked_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      protocol TEXT NOT NULL, -- 'http', 'https', 'socks5'
      status TEXT NOT NULL, -- 'active', 'dead', 'testing'
      latency_ms INTEGER,
      last_checked_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[SQLite] Error persisting database to disk:', err);
  }
}

export interface TaskRecord {
  id: string;
  type: 'image_gen' | 'image_edit' | 'video_gen';
  prompt: string;
  negative_prompt?: string;
  reference_image?: string;
  last_frame_image?: string;
  provider: string;
  model: string;
  aspect_ratio: string;
  resolution?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  output_path?: string;
  output_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  batch_id?: string;
  metadata?: string;
}

export interface ActivityLogRecord {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  task_id?: string;
  source: string;
  created_at: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  provider: string;
  auth_type: 'cookie_session' | 'bearer_token' | 'api_key';
  credentials: string;
  proxy_id?: string;
  status: 'active' | 'expired' | 'relogin_needed' | 'rate_limited';
  quota_remaining?: string;
  last_checked_at?: string;
  notes?: string;
  created_at: string;
}

export interface ProxyRecord {
  id: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
  status: 'active' | 'dead' | 'testing';
  latency_ms?: number;
  last_checked_at?: string;
  created_at: string;
}
