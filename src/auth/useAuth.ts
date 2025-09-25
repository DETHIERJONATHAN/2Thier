import { useAuthContext } from './AuthContext';
import { useCallback } from 'react';

export function useAuth() {
  const context = useAuthContext();
  
  const hasFeature = useCallback((feature: string) => {
    // SIMPLIFICATION: Si le module est dans la liste, c'est qu'on y a accès.
    // La liste `modules` est déjà filtrée par l'AuthProvider.
    return context.modules.some(m => m.feature === feature);
  }, [context.modules]);

  return {
    ...context,
    hasFeature
  };
}
