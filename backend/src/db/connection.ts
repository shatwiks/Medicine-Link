// Native Node.js SQLite wrapper with better-sqlite3 compatible synchronous API
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

export interface SqliteStatement {
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
}

export class SqliteDatabase {
  private raw: any;
  private txDepth = 0;

  constructor(filename: string) {
    this.raw = new DatabaseSync(filename);
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this.raw.prepare(sql);
    return {
      run: (...params: any[]) => stmt.run(...params),
      get: (...params: any[]) => {
        const res = stmt.get(...params);
        return res ? { ...res } : undefined;
      },
      all: (...params: any[]) => {
        const rows = stmt.all(...params);
        return Array.isArray(rows) ? rows.map((r: any) => ({ ...r })) : [];
      },
    };
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  pragma(pragmaStr: string): void {
    this.raw.exec(`PRAGMA ${pragmaStr};`);
  }

  transaction<T>(fn: (...args: any[]) => T): (...args: any[]) => T {
    return (...args: any[]): T => {
      const savepointName = `sp_${this.txDepth++}`;
      const isOuter = this.txDepth === 1;
      try {
        if (isOuter) {
          this.raw.exec('BEGIN IMMEDIATE');
        } else {
          this.raw.exec(`SAVEPOINT ${savepointName}`);
        }
        const result = fn(...args);
        if (isOuter) {
          this.raw.exec('COMMIT');
        } else {
          this.raw.exec(`RELEASE SAVEPOINT ${savepointName}`);
        }
        return result;
      } catch (err) {
        try {
          if (isOuter) {
            this.raw.exec('ROLLBACK');
          } else {
            this.raw.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`);
          }
        } catch {
          // ignore rollback error
        }
        throw err;
      } finally {
        this.txDepth--;
      }
    };
  }

  close(): void {
    this.raw.close();
  }
}

let dbInstance: SqliteDatabase | null = null;

export function getDb(customPath?: string): SqliteDatabase {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || env.DATABASE_PATH;
  if (targetPath !== ':memory:') {
    const absDir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }
  }

  const db = new SqliteDatabase(targetPath);
  db.pragma('foreign_keys = ON');
  if (targetPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('busy_timeout = 5000');

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function setDbForTesting(db: SqliteDatabase): void {
  dbInstance = db;
}

export function withTransaction<T>(fn: (db: SqliteDatabase) => T): T {
  const db = getDb();
  const tx = db.transaction(() => fn(db));
  return tx();
}
