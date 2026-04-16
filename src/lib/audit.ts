/**
 * Structured audit log for security-sensitive operations.
 *
 * Emits one JSON line per event to stdout (picked up by Cloud Run /
 * docker log drivers and shippable to BigQuery / Elastic without further
 * transformation). No PII is serialised — callers should pass IDs only.
 *
 * Add a new event type by extending `AuditAction`. Routes should wrap
 * sensitive mutations with `audit.record({...})` immediately after the
 * DB write succeeds.
 */
import { logger } from './logger';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'auth.password_change'
  | 'auth.2fa_enable'
  | 'auth.2fa_disable'
  | 'auth.2fa_verify_failed'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'permission.grant'
  | 'permission.revoke'
  | 'organization.create'
  | 'organization.update'
  | 'organization.delete'
  | 'module.create'
  | 'module.update'
  | 'module.delete'
  | 'module.toggle'
  | 'secret.rotate'
  | 'admin.impersonate'
  | 'admin.export_data';

export interface AuditEvent {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: string | null;
  organizationId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  outcome: 'success' | 'failure';
  reason?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export const audit = {
  record(event: AuditEvent): void {
    const payload = {
      kind: 'audit',
      ts: new Date().toISOString(),
      ...event
    };
    // Single-line JSON so log aggregators can parse without buffering.
    try {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(payload));
    } catch (err) {
      logger.warn('[audit] failed to serialise event', (err as Error).message);
    }
  }
};

export default audit;
