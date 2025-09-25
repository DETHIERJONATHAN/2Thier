import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { prisma } from '../lib/prisma';

const router = Router();

// Appliquer les middlewares d'authentification
router.use(authMiddleware as unknown as (req: Request, res: Response, next: () => void) => void, impersonationMiddleware as unknown as (req: Request, res: Response, next: () => void) => void);

// 🗂️ NAVIGATION DES MODULES - Organise les modules par catégories pour l'interface
// ⚠️  Ne pas confondre avec les sections de formulaires (table Section)

// GET - Récupérer les sections de navigation basées sur la table Category avec toutes les vérifications de sécurité
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔍 [module-navigation] Route appelée - Système Category');
    console.log('🔍 [module-navigation] User:', req.user);
    console.log('🔍 [module-navigation] Prisma client status:', typeof prisma, !!prisma);
    
    const organizationId = req.query.organizationId as string;
    
    if (!organizationId) {
      console.log('❌ [module-navigation] organizationId manquant');
      res.status(400).json({ error: 'organizationId required' });
      return;
    }

    console.log('[API] GET /api/module-navigation - Système Category avec sécurité multifacteur pour org:', organizationId);

    // Vérification utilisateur et permissions
    const user = req.user as { id?: string; email?: string; role?: string; organizationId?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';
    
    console.log(`[API] Utilisateur: ${user?.email} (${user?.role}), SuperAdmin: ${isSuperAdmin}`);

    // Récupérer l'organisation de l'utilisateur
    let userOrganizationId = user?.organizationId;
    
    if (!userOrganizationId && user?.id) {
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId: user.id }
      });
      userOrganizationId = userOrg?.organizationId;
      console.log(`[API] OrganizationId récupéré via UserOrganization: ${userOrganizationId}`);
    }

    // 🏢 RÉCUPÉRER LES CATÉGORIES ACCESSIBLES POUR CETTE ORGANISATION
    // Avec vérifications multifacteurs : superAdmin, rôles, permissions, statut org
    
    const whereCategories = {
      AND: [
        // Catégories actives uniquement
        { active: true },
        
        // Catégories globales OU spécifiques à l'organisation
        {
          OR: [
            { organizationId: null }, // Catégories globales
            { organizationId: organizationId } // Catégories spécifiques à l'org
          ]
        },
        
        // Vérification superAdminOnly
        ...(isSuperAdmin ? [] : [{ superAdminOnly: false }])
      ]
    };

    const categories = await prisma.category.findMany({
      where: whereCategories,
      include: {
        // Inclure les modules associés
        Module: {
          where: {
            AND: [
              // Modules actifs uniquement
              { active: true },
              
              // Vérification superAdminOnly pour les modules
              ...(isSuperAdmin ? [] : [{ superAdminOnly: false }]),
              
              // Modules pour cette organisation ou modules globaux
              {
                OR: [
                  ...(userOrganizationId ? [{ organizationId: userOrganizationId }] : []),
                  ...(isSuperAdmin ? [{ organizationId: null }] : [])
                ]
              }
            ]
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`[API] ${categories.length} catégories trouvées`);

    // 🗂️ TRANSFORMER LES CATÉGORIES EN SECTIONS POUR LE FRONTEND
    const sections = categories.map(category => ({
      id: `section-${category.id}`,
      title: category.name,
      description: category.description || category.Module.map(m => m.label).join(', '),
      icon: category.icon,
      iconColor: category.iconColor,
      order: category.order,
      organizationId,
      modules: category.Module.map(module => ({
        ...module,
        category: category.name, // ✅ Ajouter le nom de la catégorie à chaque module
        categoryIcon: category.icon,
        categoryColor: category.iconColor
      })),
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      // Métadonnées pour debugging
      categoryId: category.id,
      superAdminOnly: category.superAdminOnly,
      allowedRoles: category.allowedRoles,
      requiredPermissions: category.requiredPermissions
    }));

    console.log('[API] Sections créées depuis les catégories:', sections.length);
    console.log('[API] Sections:', sections.map(s => `${s.title} (${s.modules.length} modules)`));
    
    res.json(sections);

  } catch (error) {
    console.error('[API] Erreur système Category:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories depuis la table Category' });
  }
});

export default router;
