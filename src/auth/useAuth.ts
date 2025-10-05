import { useAuthContext } from './AuthContext';
import { useCallback } from 'react';

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

  return {
    ...context,
    hasFeature,
  };
}
