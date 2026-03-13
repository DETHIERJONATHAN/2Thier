import { Response, NextFunction } from 'express';
import { db } from '../lib/database';

const CHANTIERS_MODULE_ID = 'module-chantiers-87ba0db4-2eb9-4096-8bbb-2259da444c2e';

/**
 * Middleware qui vérifie qu'un utilisateur a une permission spécifique sur le module chantiers.
 * Les super_admin et admin passent toujours.
 * Pour les autres, on cherche la permission dans la table Permission via leur rôle dans l'organisation.
 */
export function requireChantierAction(...actions: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Non authentifié' });

      // Super admin et admin passent toujours
      if (user.isSuperAdmin || user.role === 'super_admin' || user.role === 'admin') return next();

      const organizationId = (req.headers['x-organization-id'] as string) || user.organizationId;
      if (!organizationId) return res.status(403).json({ success: false, message: 'Organisation requise' });

      // Trouver le rôle du user dans l'organisation
      const userOrg = await db.userOrganization.findFirst({
        where: { userId: user.id || user.userId, organizationId },
        select: { roleId: true }
      });

      if (!userOrg?.roleId) {
        return res.status(403).json({ success: false, message: 'Aucun rôle trouvé pour cet utilisateur' });
      }

      // Vérifier si le rôle a au moins une des actions demandées sur le module chantiers
      const perm = await db.permission.findFirst({
        where: {
          roleId: userOrg.roleId,
          moduleId: CHANTIERS_MODULE_ID,
          action: { in: actions },
          allowed: true
        }
      });

      if (!perm) {
        console.log(`[ChantierPerm] 🔒 Permission refusée: user=${user.id}, actions=${actions.join(',')}, role=${userOrg.roleId}`);
        return res.status(403).json({ success: false, message: `Permission refusée: action ${actions.join('/')} requise` });
      }

      next();
    } catch (error: any) {
      console.error('[ChantierPerm] Erreur vérification permission:', error);
      return res.status(500).json({ success: false, message: 'Erreur vérification permission' });
    }
  };
}
