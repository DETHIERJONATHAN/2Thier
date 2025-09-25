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

/**
 * Fonction simple pour vérifier les permissions d'un utilisateur
 * @param user objet utilisateur avec le rôle
 * @param permission permission à vérifier
 */
export function isUserPermitted(user: any, permission: string): boolean {
  // Si pas d'utilisateur, pas de permission
  if (!user) return false;
  
  // Super admin a toutes les permissions
  if (user.role === 'super_admin') return true;
  
  // Admin a la plupart des permissions
  if (user.role === 'admin' && permission === 'manage_modules') return true;
  
  // Pour l'instant, logique simple basée sur le rôle
  // Peut être étendue plus tard avec un système plus granulaire
  return false;
}
