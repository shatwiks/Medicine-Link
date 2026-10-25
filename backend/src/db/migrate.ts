import fs from 'fs';
import path from 'path';
import { getDb, SqliteDatabase } from './connection';
import { logger } from '../utils/logger';

export function runMigrations(db: SqliteDatabase = getDb()): string[] {
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  const appliedRows = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as { version: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const applyTx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
    });
    applyTx();
    newlyApplied.push(file);
    logger.info({ migration: file }, 'Applied SQL migration');
  }

  return newlyApplied;
}

if (require.main === module) {
  const db = getDb();
  const applied = runMigrations(db);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all();
  const triggers = db
    .prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")
    .all();

  console.log('Migrations applied:', applied);
  console.log('Tables:', tables.map((t: any) => t.name));
  console.log('Indexes:', indexes.map((i: any) => i.name));
  console.log('Triggers:', triggers.map((tr: any) => tr.name));
}
