/**
 * #30 Optimistic Locking Utility
 * 
 * Prevents race conditions on concurrent updates by checking `updatedAt`
 * before applying changes. If the record was modified since the client
 * last read it, the update is rejected with a 409 Conflict.
 * 
 * Usage in a route:
 * ```typescript
 * import { optimisticUpdate } from '../lib/optimistic-lock';
 * 
 * const result = await optimisticUpdate(db.user, {
 *   where: { id: userId },
 *   data: { firstName: 'New' },
 *   expectedUpdatedAt: req.body.updatedAt, // from client
 * });
 * if (!result.success) return res.status(409).json({ message: result.message });
 * ```
 */

interface OptimisticUpdateOptions<T> {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
  expectedUpdatedAt: string | Date;
  include?: Record<string, unknown>;
}

interface OptimisticResult<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function optimisticUpdate<T>(
  model: { findUnique: (args: any) => Promise<any>; update: (args: any) => Promise<T> },
  options: OptimisticUpdateOptions<T>
): Promise<OptimisticResult<T>> {
  const { where, data, expectedUpdatedAt, include } = options;

  // Read current version
  const current = await model.findUnique({ where, select: { updatedAt: true } });
  if (!current) {
    return { success: false, message: 'Enregistrement introuvable' };
  }

  // Compare timestamps
  const expected = new Date(expectedUpdatedAt).getTime();
  const actual = new Date(current.updatedAt).getTime();

  if (expected !== actual) {
    return {
      success: false,
      message: 'Cet enregistrement a été modifié par un autre utilisateur. Rechargez et réessayez.',
    };
  }

  // Proceed with update
  const updated = await model.update({ where, data, ...(include ? { include } : {}) });
  return { success: true, data: updated as T };
}
