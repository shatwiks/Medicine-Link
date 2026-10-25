import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getDb } from '../db/connection';
import { AppError } from '../utils/errors';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'donor' | 'pharmacist' | 'ngo' | 'admin';
  orgId?: string | null;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid authorization token'));
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const db = getDb();
    const userRow = db
      .prepare(
        `SELECT u.id, u.email, u.role, u.org_id, u.is_active, o.verified AS org_verified
         FROM users u
         LEFT JOIN organizations o ON o.id = u.org_id
         WHERE u.id = ?`
      )
      .get(decoded.sub) as any;

    if (!userRow || !userRow.is_active) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'User account is inactive or not found'));
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      orgId: userRow.org_id,
      orgVerified: userRow.org_verified === 1,
    };
    next();
  } catch {
    next(new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired access token'));
  }
}

export function requireRole(
  ...allowedRoles: ('donor' | 'pharmacist' | 'ngo' | 'admin')[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Role '${req.user.role}' is not permitted to perform this action`
        )
      );
    }
    next();
  };
}

export function requireVerifiedOrg(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (
    (req.user.role === 'pharmacist' || req.user.role === 'ngo') &&
    !req.user.orgVerified
  ) {
    return next(
      new AppError(
        403,
        'FORBIDDEN',
        'Your organisation is awaiting admin verification and cannot perform this action yet'
      )
    );
  }
  next();
}
