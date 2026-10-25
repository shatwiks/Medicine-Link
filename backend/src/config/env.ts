import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: Number(process.env.PORT || 4000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_PATH: process.env.DATABASE_PATH || './data/medicinelink.db',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'medicinelink_access_secret_demo_only',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'medicinelink_refresh_secret_demo_only',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '1d',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB || 5),
  OCR_TIMEOUT_MS: Number(process.env.OCR_TIMEOUT_MS || 15000),
};
