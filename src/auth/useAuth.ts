import { useAuthContext } from './AuthContext';
import { useCallback } from 'react';
import { isPermissionObject } from './permissions';

export function useAuth() {
  const context = useAuthContext();

  const hasFeature = useCallback(
    (feature: string) => {
      if (!feature) {
        return false;
      }

      // Les super-admins ont toujours accès à tous les modules.
      if (context.isSuperAdmin) {
        return true;
      }

      const target = feature.toLowerCase();

      return context.modules.some((module) => {
        const candidates = [module.feature, module.key, module.name, module.label];
        return candidates.some((candidate) => candidate?.toLowerCase?.() === target);
      });
    },
    [context.isSuperAdmin, context.modules]
  );

  /**
   * Vérifie si l'utilisateur a une permission fine sur un module.
   * @param moduleKey - La clé du module (ex: 'chantiers')
   * @param action - L'action à vérifier (ex: 'view', 'edit', 'finances')
   * @returns true si l'utilisateur a la permission
   */
  const canDo = useCallback(
    (moduleKey: string, action: string): boolean => {
      // Super admins can do everything
      if (context.isSuperAdmin) return true;

      // Find the module by key to get its ID
      const mod = context.modules.find(
        (m) => m.key?.toLowerCase() === moduleKey.toLowerCase()
      );
      if (!mod) return false;

      // Check permissions for this module + action
      return context.permissions.some((p) => {
        if (!isPermissionObject(p)) return false;
        return p.moduleId === mod.id && p.action === action && p.allowed;
      });
    },
    [context.isSuperAdmin, context.modules, context.permissions]
  );

  /**
   * Retourne le scope d'une permission action pour un module.
   * @returns Le scope ('own', 'team', 'all') ou null si pas de permission
   */
  const getScope = useCallback(
    (moduleKey: string, action: string): string | null => {
      if (context.isSuperAdmin) return 'all';

      const mod = context.modules.find(
        (m) => m.key?.toLowerCase() === moduleKey.toLowerCase()
      );
      if (!mod) return null;

      const perm = context.permissions.find((p) => {
        if (!isPermissionObject(p)) return false;
        return p.moduleId === mod.id && p.action === action && p.allowed;
      });

      if (!perm || !isPermissionObject(perm)) return null;
      return perm.resource || '*';
    },
    [context.isSuperAdmin, context.modules, context.permissions]
  );

  return {
    ...context,
    hasFeature,
    canDo,
    getScope,
  };
}
