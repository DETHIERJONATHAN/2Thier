import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { db } from '../lib/database';
import { User } from '@prisma/client';

const prisma = db;
const router = Router();

// Type minimal attendu en entrée côté API
type MinimalPermissionInput = {
  moduleId?: string | null;
  action: string;
  resource: string;
  allowed: boolean;
};

router.use(authMiddleware, impersonationMiddleware);

// Helper pour obtenir l'utilisateur effectif (gère l'usurpation d'identité)
const getEffectiveUser = async (req: AuthenticatedRequest) => {
    const originalUser = req.user;
    const impersonatedUser = req.impersonatedUser;

    if (originalUser && originalUser.role === 'super_admin' && impersonatedUser) {
        const userOrg = await prisma.userOrganization.findFirst({
            where: { userId: impersonatedUser.id },
            select: { organizationId: true }
        });
        
        return {
            userId: impersonatedUser.id,
            role: (impersonatedUser as User).role,
            organizationId: req.impersonatedOrganizationId || userOrg?.organizationId,
        };
    }
    return req.user;
};


// GET /api/permissions?roleId=...&organizationId=...
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { roleId, organizationId } = req.query;
    
    if (!req.user) {
        res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
        return;
    }
    
    const effectiveUser = await getEffectiveUser(req);

    if (!effectiveUser) {
        res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
        return;
    }

    if (!roleId) {
        res.status(400).json({ success: false, message: 'Le paramètre roleId est manquant' });
        return;
    }

    try {
        const role = await prisma.role.findUnique({
            where: { id: roleId as string },
        });

        if (!role) {
            res.status(404).json({ success: false, message: "Rôle non trouvé." });
            return;
        }

        const isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';

        if (!isEffectivelySuperAdmin) {
            if (!effectiveUser.organizationId || role.organizationId !== effectiveUser.organizationId) {
                res.status(403).json({ success: false, message: "Vous n'avez pas la permission de voir les permissions de ce rôle." });
                return;
            }
        } else {
            if (organizationId && role.organizationId && role.organizationId !== (organizationId as string)) {
                 res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
                 return;
            }
        }

        const permissions = await prisma.permission.findMany({
            where: {
                roleId: roleId as string,
            },
        });
        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('[API][permissions] Erreur lors de la récupération des permissions :', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
});

// POST /api/permissions/bulk - Met à jour plusieurs permissions pour un rôle
router.post('/bulk', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { roleId, permissions, organizationId } = req.body;
  
  if (!req.user) {
    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
    return;
  }

  const effectiveUser = await getEffectiveUser(req);

  if (!effectiveUser) {
    res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
    return;
  }

  if (!roleId || !Array.isArray(permissions)) {
    res.status(400).json({ success: false, message: 'Paramètres invalides' });
    return;
  }

  try {
    const roleToUpdate = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleToUpdate) {
      res.status(404).json({ success: false, message: "Rôle non trouvé." });
      return;
    }

    const isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';

    if (!isEffectivelySuperAdmin) {
        if (!effectiveUser.organizationId || roleToUpdate.organizationId !== effectiveUser.organizationId) {
            res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier ce rôle." });
            return;
        }
    } else {
        if (organizationId && roleToUpdate.organizationId && roleToUpdate.organizationId !== organizationId) {
            res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
            return;
        }
    }

    await prisma.$transaction([
      prisma.permission.deleteMany({
        where: {
          roleId: roleId,
        }
      }),
      ...(permissions.length > 0 ? [prisma.permission.createMany({
        data: (permissions as MinimalPermissionInput[]).map((p) => ({
          id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          roleId: roleId,
          organizationId: roleToUpdate.organizationId || null,
          moduleId: p.moduleId,
          action: p.action,
          resource: p.resource,
          allowed: p.allowed,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      })] : [])
    ]);

    res.status(200).json({ success: true, message: 'Permissions mises à jour avec succès' });
  } catch (error) {
    console.error('[API][permissions/bulk] Erreur lors de la mise à jour en masse:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

// POST /api/permissions - Route racine pour la compatibilité avec le frontend
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Rediriger vers la route bulk qui fait déjà tout le travail
  const { roleId, permissions, organizationId } = req.body;
  
  if (!req.user) {
    res.status(401).json({ success: false, message: "Utilisateur non authentifié." });
    return;
  }

  const effectiveUser = await getEffectiveUser(req);

  if (!effectiveUser) {
    res.status(401).json({ success: false, message: "Utilisateur effectif non déterminé." });
    return;
  }

  if (!roleId || !Array.isArray(permissions)) {
    res.status(400).json({ success: false, message: 'Paramètres invalides' });
    return;
  }

  try {
    const roleToUpdate = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleToUpdate) {
      res.status(404).json({ success: false, message: "Rôle non trouvé." });
      return;
    }

    const isEffectivelySuperAdmin = effectiveUser.role === 'super_admin';

    if (!isEffectivelySuperAdmin) {
        if (!effectiveUser.organizationId || roleToUpdate.organizationId !== effectiveUser.organizationId) {
            res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier ce rôle." });
            return;
        }
    } else {
        if (organizationId && roleToUpdate.organizationId && roleToUpdate.organizationId !== organizationId) {
            res.status(403).json({ success: false, message: "Ce rôle n'appartient pas à l'organisation sélectionnée." });
            return;
        }
    }

    await prisma.$transaction([
      prisma.permission.deleteMany({
        where: {
          roleId: roleId,
        }
      }),
      ...(permissions.length > 0 ? [prisma.permission.createMany({
        data: (permissions as MinimalPermissionInput[]).map((p) => ({
          id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          roleId: roleId,
          organizationId: roleToUpdate.organizationId || null,
          moduleId: p.moduleId,
          action: p.action,
          resource: p.resource,
          allowed: p.allowed,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        skipDuplicates: true,
      })] : [])
    ]);

    res.status(200).json({ success: true, message: 'Permissions mises à jour avec succès' });
  } catch (error) {
    console.error('[API][permissions] Erreur lors de la mise à jour:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

export default router;
