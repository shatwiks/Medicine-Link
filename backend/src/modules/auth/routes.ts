import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { getDb } from '../../db/connection';
import { authenticate } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/errors';
import { writeAuditLog } from '../audit/service';

export const authRouter = Router();

const authRateLimiter =
  env.NODE_ENV === 'test'
    ? (_req: any, _res: any, next: any) => next()
    : rateLimit({
        windowMs: 60 * 1000,
        max: 25, // Strict auth rate limit per IP per minute
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many authentication attempts. Please wait a minute.',
          },
        },
      });

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['donor', 'pharmacist', 'ngo']),
  phone: z.string().optional(),
  city: z.string().optional(),
  organisation: z
    .object({
      name: z.string().min(2),
      type: z.enum(['ngo', 'clinic', 'pharmacy']),
      license_no: z.string().min(3),
      address: z.string().optional(),
      city: z.string().optional(),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
      contact_phone: z.string().optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const patchMeSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

function issueTokens(user: {
  id: string;
  email: string;
  role: 'donor' | 'pharmacist' | 'ngo' | 'admin';
  org_id?: string | null;
}) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id || null,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL as any }
  );

  const refreshRaw = crypto.randomBytes(32).toString('hex');
  const refreshHash = crypto.createHash('sha256').update(refreshRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const db = getDb();
  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), user.id, refreshHash, expiresAt);

  return { accessToken, refreshToken: refreshRaw };
}

authRouter.post(
  '/auth/register',
  authRateLimiter,
  validateBody(registerSchema),
  (req, res, next) => {
  try {
    const db = getDb();
    const { name, email, password, role, phone, city, organisation } = req.body;

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE')
      .get(email);
    if (existing) {
      throw new AppError(409, 'DUPLICATE', 'An account with this email already exists');
    }

    if ((role === 'pharmacist' || role === 'ngo') && !organisation) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Organisation details are required for pharmacist and NGO/clinic accounts'
      );
    }

    const userId = crypto.randomUUID();
    const orgId = role === 'donor' ? null : crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    const tx = db.transaction(() => {
      if (orgId && organisation) {
        db.prepare(
          `INSERT INTO organizations (
            id, name, type, license_no, verified, address, city, lat, lng, contact_phone
          ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
        ).run(
          orgId,
          organisation.name,
          organisation.type,
          organisation.license_no,
          organisation.address || null,
          organisation.city || city || null,
          organisation.lat ?? 12.9716,
          organisation.lng ?? 77.5946,
          organisation.contact_phone || phone || null
        );
      }

      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, phone, city, org_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        userId,
        name,
        email,
        passwordHash,
        role,
        phone || null,
        city || null,
        orgId
      );

      writeAuditLog(
        {
          actorId: userId,
          actorRole: role,
          action: 'USER_REGISTERED',
          entity: 'user',
          entityId: userId,
          details: { email, role, orgId },
          requestId: req.requestId,
        },
        db
      );
    });

    tx();

    const tokens = issueTokens({ id: userId, email, role, org_id: orgId });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          name,
          email,
          role,
          phone: phone || null,
          city: city || null,
          org_id: orgId,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/auth/login',
  authRateLimiter,
  validateBody(loginSchema),
  (req, res, next) => {
  try {
    const db = getDb();
    const { email, password } = req.body;

    const user = db
      .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
      .get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      writeAuditLog(
        {
          actorId: user?.id || null,
          actorRole: user?.role || null,
          action: 'LOGIN_FAILURE',
          entity: 'user',
          entityId: user?.id || null,
          details: { email },
          requestId: req.requestId,
        },
        db
      );
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');
    }

    const tokens = issueTokens(user);
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    const org = user.org_id
      ? db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.org_id)
      : null;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          city: user.city,
          org_id: user.org_id,
          organization: org,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/refresh', (req, res, next) => {
  try {
    const rawToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!rawToken) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Missing refresh token');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const db = getDb();
    const anyRow = db
      .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
      .get(tokenHash) as any;

    if (!anyRow) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Invalid refresh token');
    }

    // Refresh Token Reuse Detection: if an already-revoked token is presented again,
    // revoke all active refresh tokens for that user and log a security audit event.
    if (anyRow.revoked_at !== null) {
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL'
      ).run(now, anyRow.user_id);

      writeAuditLog(
        {
          actorId: anyRow.user_id,
          actorRole: 'system',
          action: 'REFRESH_TOKEN_REUSE_DETECTED',
          entity: 'refresh_token',
          entityId: anyRow.id,
          details: { revokedAllSessionsForUser: anyRow.user_id },
          requestId: req.requestId,
        },
        db
      );
      throw new AppError(
        401,
        'UNAUTHENTICATED',
        'Refresh token reuse detected; all sessions revoked for security'
      );
    }

    if (anyRow.expires_at <= new Date().toISOString()) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Expired refresh token');
    }

    const row = anyRow;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as any;
    if (!user) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not found');
    }

    // Rotate refresh token
    db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      row.id
    );
    const tokens = issueTokens(user);
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/logout', authenticate, (req, res) => {
  const rawToken = req.cookies?.refresh_token || req.body?.refreshToken;
  if (rawToken) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    getDb()
      .prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ?')
      .run(new Date().toISOString(), tokenHash);
  }
  res.clearCookie('refresh_token');
  res.json({ success: true, data: { loggedOut: true } });
});

authRouter.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db
    .prepare(
      'SELECT id, name, email, role, phone, city, org_id, is_active, created_at FROM users WHERE id = ?'
    )
    .get(req.user!.id) as any;
  const organization = user?.org_id
    ? db.prepare('SELECT * FROM organizations WHERE id = ?').get(user.org_id)
    : null;

  res.json({
    success: true,
    data: {
      user,
      organization,
    },
  });
});

authRouter.patch('/me', authenticate, validateBody(patchMeSchema), (req, res) => {
  const db = getDb();
  const { name, phone, city } = req.body;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE users
     SET name = COALESCE(?, name),
         phone = COALESCE(?, phone),
         city = COALESCE(?, city),
         updated_at = ?
     WHERE id = ?`
  ).run(name ?? null, phone ?? null, city ?? null, now, req.user!.id);

  const updated = db
    .prepare(
      'SELECT id, name, email, role, phone, city, org_id, is_active, created_at, updated_at FROM users WHERE id = ?'
    )
    .get(req.user!.id);

  res.json({ success: true, data: { user: updated } });
});
