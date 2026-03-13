// Types et helpers pour les permissions

/** Permission simple (legacy string format) */
export type PermissionString = string; // ex: "user:create", "lead:read"

/** Permission objet complète (format backend Prisma) */
export interface PermissionObject {
  id?: string;
  roleId?: string;
  organizationId?: string | null;
  moduleId?: string | null;
  action: string;
  resource: string;
  allowed: boolean;
}

/** Le type Permission accepte les deux formats pour rétro-compatibilité */
export type Permission = PermissionString | PermissionObject;

/** Type guard : vérifie si c'est un objet Permission */
export function isPermissionObject(p: Permission): p is PermissionObject {
  return typeof p === 'object' && p !== null && 'action' in p;
}
