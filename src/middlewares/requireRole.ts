import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    console.log('[requireRole] 🔍 DEBUG - User object:', {
      userId: user?.userId,
      isSuperAdmin: user?.isSuperAdmin,
      role: user?.role,
      userExists: !!user
    });

    if (!user) {
      console.log('[requireRole] ❌ Pas d\'utilisateur authentifié');
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }

    // 👑 SUPER ADMIN A ACCÈS À TOUT ! C'EST LE BOSS ! 👑
    if (user.isSuperAdmin === true || user.role === 'super_admin') {
      console.log('[requireRole] 👑 SuperAdmin détecté - Accès autorisé à tout !');
      next();
      return;
    }

    // Un super_admin en mode impersonation a tous les droits
    if (authReq.originalUser && authReq.originalUser.role === 'super_admin') {
      console.log('[requireRole] 👑 SuperAdmin en impersonation détecté - Accès autorisé !');
      next();
      return;
    }

    if (!roles.includes(user.role as string)) {
      console.log(`[requireRole] ❌ Accès refusé - Rôle ${user.role} non autorisé pour ${roles.join(', ')}`);
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    next();
  };
}
