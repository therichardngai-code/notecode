/**
 * Audit Log Repository Port
 * Interface for audit trail persistence
 */

export type AuditEntityType = 'task' | 'session' | 'message' | 'approval' | 'project' | 'agent';
export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  performedBy: string | null;
  sessionId: string | null;
  createdAt: Date;
}

export interface IAuditLogRepository {
  /** Log an entity change */
  log(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry>;

  /** Find logs by entity */
  findByEntity(entityType: AuditEntityType, entityId: string): Promise<AuditLogEntry[]>;

  /** Find logs by session context */
  findBySession(sessionId: string): Promise<AuditLogEntry[]>;

  /** Find recent logs */
  findRecent(limit?: number): Promise<AuditLogEntry[]>;
}
