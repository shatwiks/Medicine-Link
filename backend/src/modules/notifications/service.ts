import crypto from 'crypto';
import { getDb, SqliteDatabase } from '../../db/connection';
import { logger } from '../../utils/logger';

export interface NotificationChannel {
  send(userId: string, type: string, message: string, entity?: string, entityId?: string): void;
}

export function createNotification(
  params: {
    userId: string;
    type: string;
    message: string;
    entity?: string;
    entityId?: string;
  },
  db: SqliteDatabase = getDb()
): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, message, entity, entity_id, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    params.userId,
    params.type,
    params.message,
    params.entity || null,
    params.entityId || null
  );

  // Stub email/SMS log channel
  logger.info(
    { notificationId: id, userId: params.userId, type: params.type },
    `[NotificationStub] ${params.message}`
  );

  return id;
}

export function notifyRoleUsers(
  role: 'donor' | 'pharmacist' | 'ngo' | 'admin',
  type: string,
  message: string,
  entity?: string,
  entityId?: string,
  db: SqliteDatabase = getDb()
): void {
  const users = db
    .prepare('SELECT id FROM users WHERE role = ? AND is_active = 1')
    .all(role) as { id: string }[];
  for (const u of users) {
    createNotification({ userId: u.id, type, message, entity, entityId }, db);
  }
}
