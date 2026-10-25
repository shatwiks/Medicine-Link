import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { getDb } from './connection';
import { seedDatabase } from './seed';

if (require.main === module) {
  const dbPath = path.resolve(env.DATABASE_PATH);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const db = getDb();
  seedDatabase(db);
  console.log('Database reset, migrated, and seeded.');
}
