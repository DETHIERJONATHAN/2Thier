import { Response, NextFunction } from 'express';
import { db } from '../lib/database';

const CHANTIERS_MODULE_ID = 'module-chantiers-87ba0db4-2eb9-4096-8bbb-2259da444c2e';

/**
 * Résout le scope d'un utilisateur pour une action sur le module chantiers.
 * Retourne { scope, technicianIds } où :
 *   - scope: 'all' | 'team' | 'own' | null
 *   - technicianIds: les IDs filtrés selon le scope (null = pas de filtre = tout)
 */
export async function resolveChantierScope(
  user: unknown,
  organizationId: string,
  action: string
): Promise<{ scope: string; technicianIds: string[] | null }> {
  // Super admin et admin → tout voir
  if (user.isSuperAdmin || user.role === 'super_admin' || user.role === 'admin') {
    return { scope: 'all', technicianIds: null };
  }

  // Trouver le rôle du user
  const userOrg = await db.userOrganization.findFirst({
    where: { userId: user.id || user.userId, organizationId },
    select: { roleId: true }
  });

  if (!userOrg?.roleId) return { scope: 'own', technicianIds: [] };

  // Trouver la permission
  const perm = await db.permission.findFirst({
    where: {
      roleId: userOrg.roleId,
      moduleId: CHANTIERS_MODULE_ID,
      action,
      allowed: true
    }
  });

  if (!perm) return { scope: 'own', technicianIds: [] };

  const scope = perm.resource || '*';
  const userId = user.id || user.userId;

  if (scope === 'all' || scope === '*') {
    return { scope: 'all', technicianIds: null };
  }

  // Trouver le technicien lié à cet utilisateur
  const myTech = await db.technician.findFirst({
    where: { userId, organizationId, isActive: true },
    select: { id: true }
  });

  if (scope === 'own') {
    return { scope: 'own', technicianIds: myTech ? [myTech.id] : [] };
  }

  if (scope === 'team') {
    if (!myTech) return { scope: 'team', technicianIds: [] };

    // Trouver toutes les équipes dont ce technicien est membre
    const myTeams = await db.teamMember.findMany({
      where: { technicianId: myTech.id },
      select: { teamId: true }
    });

    if (myTeams.length === 0) {
      // Pas dans une équipe → voit seulement lui-même
      return { scope: 'team', technicianIds: [myTech.id] };
    }

    // Tous les techniciens des mêmes équipes
    const teamMembers = await db.teamMember.findMany({
      where: { teamId: { in: myTeams.map(t => t.teamId) } },
      select: { technicianId: true }
    });

    const uniqueIds = [...new Set(teamMembers.map(m => m.technicianId))];
    return { scope: 'team', technicianIds: uniqueIds };
  }

  // Fallback
  return { scope: 'own', technicianIds: myTech ? [myTech.id] : [] };
}

/**
 * Middleware qui vérifie qu'un utilisateur a une permission spécifique sur le module chantiers.
 * Les super_admin et admin passent toujours.
 * Pour les autres, on cherche la permission dans la table Permission via leur rôle dans l'organisation.
 * Attache aussi req.chantierScope et req.chantierTechIds pour le filtrage des GET.
 */
export function requireChantierAction(...actions: string[]) {
  return async (req: unknown, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Non authentifié' });

      // Super admin et admin passent toujours
      if (user.isSuperAdmin || user.role === 'super_admin' || user.role === 'admin') {
        req.chantierScope = 'all';
        req.chantierTechIds = null;
        return next();
      }

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

      // Attacher le scope résolu pour usage dans les routes
      const resolved = await resolveChantierScope(user, organizationId, actions[0]);
      req.chantierScope = resolved.scope;
      req.chantierTechIds = resolved.technicianIds;

      next();
    } catch (error: unknown) {
      console.error('[ChantierPerm] Erreur vérification permission:', error);
      return res.status(500).json({ success: false, message: 'Erreur vérification permission' });
    }
  };
}
