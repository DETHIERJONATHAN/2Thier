import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

export function requirePermission(action: string, resource = 'global') {
  const requiredPermission = resource ? `${action}:${resource}` : action;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ success: false, message: 'Authentification requise', requiredPermission });
      return;
    }

    if (user.isSuperAdmin || user.role === 'super_admin' || user.roles?.includes('super_admin')) {
      next();
      return;
    }

    if (user.role === 'admin' || user.roles?.includes('admin')) {
      next();
      return;
    }

    console.warn('[PERMISSIONS] Accès refusé', {
      userId: user.userId,
      role: user.role,
      roles: user.roles,
      requiredPermission
    });

    res.status(403).json({ success: false, message: 'Permission refusée', requiredPermission });
  };
}
