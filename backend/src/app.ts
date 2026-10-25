import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorHandler } from './middleware/error';
import { requestIdMiddleware } from './middleware/requestId';
import { adminRouter } from './modules/admin/routes';
import { authRouter } from './modules/auth/routes';
import { donationsRouter } from './modules/donations/routes';
import { needsRouter } from './modules/needs/routes';
import { pickupsRouter } from './modules/pickups/routes';
import { reviewRouter } from './modules/review/routes';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MedicineLink REST API',
    version: '1.0.0',
    description:
      'Class-project prototype API for MedicineLink (runs strictly on dummy data).',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/health': {
      get: { summary: 'Service health check', responses: { '200': { description: 'OK' } } },
    },
    '/auth/register': {
      post: { summary: 'Register user (and organisation for NGO/Pharmacist)' },
    },
    '/auth/login': {
      post: { summary: 'Log in and receive JWT access + refresh tokens' },
    },
    '/donations': {
      get: { summary: 'List donations (own for donor, all for admin)' },
      post: { summary: 'Create donation with items and run 12 eligibility rules' },
    },
    '/items/ocr': {
      post: { summary: 'Upload medicine pack photo and extract expiry & batch via OCR' },
    },
    '/review/queue': {
      get: { summary: 'Pharmacist review queue (PENDING_REVIEW, oldest first)' },
    },
    '/review/items/{id}/decision': {
      post: { summary: 'Approve (issues QR verification code + triggers matching) or Reject' },
    },
    '/needs': {
      get: { summary: 'List posted medicine needs' },
      post: { summary: 'Post a new medicine need and trigger matching' },
    },
    '/matches': {
      get: { summary: 'Ranked match suggestions with 0–100 score breakdown' },
    },
    '/matches/{id}/respond': {
      post: { summary: 'Accept (first accept wins) or decline a match suggestion' },
    },
    '/pickups': {
      get: { summary: 'List scheduled pickups' },
      post: { summary: 'Schedule a volunteer pickup for an accepted match' },
    },
    '/pickups/{id}/confirm-received': {
      post: { summary: 'NGO confirms receipt, completing item and match lifecycle' },
    },
    '/dashboard/stats': {
      get: { summary: 'Impact dashboard statistics and counts by status' },
    },
    '/admin/organizations': {
      get: { summary: 'List organisations (filter by verified=true/false)' },
    },
    '/admin/audit': {
      get: { summary: 'Read append-only audit log' },
    },
  },
};

export function createApp() {
  const app = express();

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  if (env.NODE_ENV !== 'test') {
    const generalLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again in a minute.',
        },
      },
    });
    app.use('/api', generalLimiter);
  }

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  // Mount /api/v1 routers
  app.use('/api/v1', authRouter);
  app.use('/api/v1', donationsRouter);
  app.use('/api/v1', reviewRouter);
  app.use('/api/v1', needsRouter);
  app.use('/api/v1', pickupsRouter);
  app.use('/api/v1', adminRouter);

  app.use(errorHandler);

  return app;
}
