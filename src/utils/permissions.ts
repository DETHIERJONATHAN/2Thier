// Helper universel pour vérifier les permissions dans le code (front ou back)
// Usage : canPermission('export', 'factures', permissionsArray)

export type Permission = {
  moduleId: string;
  action: string;
  allowed: boolean;
  resource: string;
};

/**
 * Vérifie si une permission existe dans la liste (granularité action/ressource)
 * @param action action à vérifier (ex: 'export', 'read', ...)
 * @param resource clé du module/ressource (ex: 'factures')
 * @param permissions tableau de permissions (depuis API ou context)
 */
export function canPermission(
  action: string,
  resource: string,
  permissions: Permission[]
): boolean {
  if (!permissions) return false;
  // Super admin ou wildcard
  if (permissions.some(p => p.action === '*' && p.resource === '*')) return true;
  // Permission explicite
  if (permissions.some(p => p.action === action && p.resource === resource && p.allowed)) return true;
  // Wildcards partiels
  if (permissions.some(p => p.action === action && p.resource === '*' && p.allowed)) return true;
  if (permissions.some(p => p.action === '*' && p.resource === resource && p.allowed)) return true;
  return false;
}
