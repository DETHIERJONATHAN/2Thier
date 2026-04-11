import { Request } from 'express';

// Type pour le contexte d'authentification
export interface AuthContext {
  organizationId?: string | null;
  isSuperAdmin?: boolean;
}

// Helper pour extraire le contexte d'auth de façon robuste
export function getAuthCtx(req: Request): AuthContext {
  const user = req.user;
  return {
    organizationId: user?.organizationId || null,
    isSuperAdmin: user?.isSuperAdmin || false
  };
}
