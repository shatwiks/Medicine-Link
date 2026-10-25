import { createApp } from './app';
import { env } from './config/env';
import { getDb } from './db/connection';
import { runMigrations } from './db/migrate';
import { startScheduledJobs } from './jobs/jobs';
import { logger } from './utils/logger';

const db = getDb();
runMigrations(db);
startScheduledJobs();

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`MedicineLink API server listening on http://localhost:${env.PORT}`);
  console.log(`MedicineLink API server listening on http://localhost:${env.PORT}`);
  console.log(`Swagger OpenAPI Docs: http://localhost:${env.PORT}/api/docs`);
});
