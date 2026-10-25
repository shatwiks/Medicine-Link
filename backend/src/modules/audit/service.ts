import { getDb, SqliteDatabase } from '../../db/connection';

export interface WriteAuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | string;
  requestId?: string | null;
}

export function writeAuditLog(
  input: WriteAuditInput,
  db: SqliteDatabase = getDb()
): void {
  const detailsStr =
    typeof input.details === 'string'
      ? input.details
      : input.details
      ? JSON.stringify(input.details)
      : null;

  db.prepare(
    `INSERT INTO audit_log (actor_id, actor_role, action, entity, entity_id, details, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.actorId || null,
    input.actorRole || null,
    input.action,
    input.entity,
    input.entityId || null,
    detailsStr,
    input.requestId || null
  );
}
