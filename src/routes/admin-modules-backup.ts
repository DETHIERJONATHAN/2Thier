import { Router, Request, Response, type RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { PrismaClient } from '@prisma/client';
import { requireRole } from '../middlewares/requireRole';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware as unknown as RequestHandler, impersonationMiddleware as unknown as RequestHandler);

// 🎯 GET - SYSTÈME CATEGORY COMPLET avec toutes les fonctionnalités multi-tenant
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    const user = req.user as { id?: string; email?: string; role?: string; organizationId?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';
    
    console.log('[ADMIN-MODULES-V2] 🔄 GET - Nouveau système Category complet');
    console.log('[ADMIN-MODULES-V2] 👤 User:', user?.email, 'Role:', user?.role, 'Org:', organizationId);

    // 🏢 RÉCUPÉRER LES CATÉGORIES avec sécurité multi-facteur
    const whereCategories = {
      AND: [
        { active: true },
        // Catégories globales OU spécifiques à l'organisation
        {
          OR: [
            { organizationId: null }, // Catégories globales
            ...(organizationId ? [{ organizationId: organizationId }] : [])
          ]
        },
        // Vérification superAdminOnly
        ...(isSuperAdmin ? [] : [{ superAdminOnly: false }])
      ]
    };

    const categories = await prisma.category.findMany({
      where: whereCategories,
      include: {
        Organization: true,
        OrganizationCategoryStatus: organizationId ? {
          where: { organizationId: organizationId }
        } : true,
        modules: {
          where: {
            active: true,
            // Modules pour cette organisation ou modules globaux pour superAdmin
            OR: [
              ...(organizationId ? [{ organizationId: organizationId }] : []),
              ...(isSuperAdmin ? [{ organizationId: null }] : [])
            ]
          },
          include: {
            Category: true,
            Organization: true,
            OrganizationModuleStatus: organizationId ? {
              where: { organizationId: organizationId }
            } : true,
            Permission: {
              include: {
                Role: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    console.log(`[ADMIN-MODULES-V2] 📊 ${categories.length} catégories trouvées`);

    // 🔐 FILTRAGE SÉCURITÉ MULTIFACTEUR + Enrichissement
    const processedCategories = categories
      .filter(category => {
        // Vérifier le statut de la catégorie pour cette organisation
        const orgStatus = category.OrganizationCategoryStatus.find(s => s.organizationId === organizationId);
        const isCategoryActiveForOrg = !orgStatus || orgStatus.active;
        
        return isCategoryActiveForOrg;
      })
      .map(category => {
        // Enrichir avec les statuts et permissions
        const orgStatus = category.OrganizationCategoryStatus.find(s => s.organizationId === organizationId);
        
        // Filtrer et enrichir les modules
        const enrichedModules = category.modules
          .filter(module => {
            const moduleOrgStatus = module.OrganizationModuleStatus.find(s => s.organizationId === organizationId);
            return !moduleOrgStatus || moduleOrgStatus.active;
          })
          .map(module => {
            const moduleOrgStatus = module.OrganizationModuleStatus.find(s => s.organizationId === organizationId);
            
            return {
              ...module,
              // Statuts enrichis
              isActiveInOrg: !moduleOrgStatus || moduleOrgStatus.active,
              hasOrgSpecificConfig: module.OrganizationModuleStatus.length > 0,
              
              // Permissions enrichies  
              permissions: module.Permission.map(perm => ({
                ...perm,
                roleName: perm.Role?.name,
                roleLabel: perm.Role?.label
              })),
              
              // Métadonnées
              categoryName: module.Category?.name,
              organizationName: module.Organization?.name
            };
          });

        return {
          // Informations de base de la catégorie
          id: category.id,
          name: category.name,
          description: category.description,
          icon: category.icon,
          iconColor: category.iconColor,
          order: category.order,
          active: category.active,
          
          // Sécurité
          organizationId: category.organizationId,
          superAdminOnly: category.superAdminOnly,
          allowedRoles: category.allowedRoles,
          requiredPermissions: category.requiredPermissions,
          
          // Statut pour l'organisation actuelle
          isActiveInOrg: !orgStatus || orgStatus.active,
          hasOrgSpecificConfig: category.OrganizationCategoryStatus.length > 0,
          orgCustomPermissions: orgStatus?.customPermissions,
          orgCustomAllowedRoles: orgStatus?.customAllowedRoles,
          
          // Modules
          modules: enrichedModules,
          
          // Métadonnées
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          organizationName: category.Organization?.name
        };
      });

    // 📊 STATISTIQUES
    const totalModules = processedCategories.reduce((acc, cat) => acc + cat.modules.length, 0);
    const activeModules = processedCategories.reduce((acc, cat) => 
      acc + cat.modules.filter(m => m.isActiveInOrg).length, 0);

    console.log('[ADMIN-MODULES-V2] ✅ Données enrichies:', {
      categories: processedCategories.length,
      totalModules,
      activeModules
    });

    res.json({
      success: true,
      data: {
        sections: processedCategories, // Garder le nom "sections" pour compatibilité
        categories: processedCategories, // Nouveau nom
        totalModules,
        totalCategories: processedCategories.length,
        activeModules,
        metadata: {
          organizationId,
          isSuperAdmin,
          userRole: user?.role
        }
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur GET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des catégories et modules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🆕 POST - CRÉER UNE NOUVELLE CATÉGORIE (avec sécurité complète)
router.post('/categories', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      icon = 'AppstoreOutlined',
      iconColor = '#1890ff',
      order = 1,
      organizationId,
      superAdminOnly = false,
      allowedRoles,
      requiredPermissions
    } = req.body;

    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] 🆕 POST Category:', { name, organizationId, superAdminOnly });

    // Validation
    if (!name) {
      res.status(400).json({ success: false, error: 'Le nom de la catégorie est requis' });
      return;
    }

    // Seuls les super admins peuvent créer des catégories globales ou superAdminOnly
    if (!isSuperAdmin && (!organizationId || superAdminOnly)) {
      res.status(403).json({ success: false, error: 'Seuls les super administrateurs peuvent créer des catégories globales' });
      return;
    }

    // Vérifier l'unicité
    const existing = await prisma.category.findFirst({
      where: {
        name,
        organizationId: organizationId || null
      }
    });

    if (existing) {
      res.status(400).json({ success: false, error: `Une catégorie "${name}" existe déjà pour cette organisation` });
      return;
    }

    // Générer un ID unique
    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer la catégorie
    const newCategory = await prisma.category.create({
      data: {
        id: categoryId,
        name,
        description,
        icon,
        iconColor,
        order,
        organizationId: organizationId || null,
        superAdminOnly,
        allowedRoles: allowedRoles ? JSON.parse(JSON.stringify(allowedRoles)) : null,
        requiredPermissions: requiredPermissions ? JSON.parse(JSON.stringify(requiredPermissions)) : null
      },
      include: {
        Organization: true
      }
    });

    console.log('[ADMIN-MODULES-V2] ✅ Catégorie créée:', newCategory.id);

    res.json({
      success: true,
      data: newCategory,
      message: `Catégorie "${name}" créée avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur POST Category:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de la catégorie' });
  }
});

// 🆕 PUT - MODIFIER UNE CATÉGORIE
router.put('/categories/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] ✏️ PUT Category:', { id, updateData });

    // Récupérer la catégorie existante
    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
      return;
    }

    // Vérifications de sécurité
    if (!isSuperAdmin && (existingCategory.superAdminOnly || updateData.superAdminOnly)) {
      res.status(403).json({ success: false, error: 'Seuls les super administrateurs peuvent modifier les catégories réservées' });
      return;
    }

    // Nettoyer les données
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Traiter les JSON
    if (updateData.allowedRoles) {
      updateData.allowedRoles = JSON.parse(JSON.stringify(updateData.allowedRoles));
    }
    if (updateData.requiredPermissions) {
      updateData.requiredPermissions = JSON.parse(JSON.stringify(updateData.requiredPermissions));
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        Organization: true,
        modules: true
      }
    });

    console.log('[ADMIN-MODULES-V2] ✅ Catégorie modifiée:', updatedCategory.name);

    res.json({
      success: true,
      data: updatedCategory,
      message: `Catégorie "${updatedCategory.name}" modifiée avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur PUT Category:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la modification de la catégorie' });
  }
});

// 🆕 DELETE - SUPPRIMER UNE CATÉGORIE
router.delete('/categories/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { moveModulesTo } = req.query as { moveModulesTo?: string };
    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] 🗑️ DELETE Category:', { id, moveModulesTo });

    // Récupérer la catégorie avec ses modules
    const category = await prisma.category.findUnique({
      where: { id },
      include: { modules: true }
    });

    if (!category) {
      res.status(404).json({ success: false, error: 'Catégorie non trouvée' });
      return;
    }

    // Vérifications de sécurité
    if (!isSuperAdmin && category.superAdminOnly) {
      res.status(403).json({ success: false, error: 'Seuls les super administrateurs peuvent supprimer les catégories réservées' });
      return;
    }

    // Gérer les modules de la catégorie
    if (category.modules.length > 0) {
      if (moveModulesTo) {
        // Déplacer vers une autre catégorie
        await prisma.module.updateMany({
          where: { categoryId: id },
          data: { categoryId: moveModulesTo }
        });
        console.log(`[ADMIN-MODULES-V2] 📦 ${category.modules.length} modules déplacés vers ${moveModulesTo}`);
      } else {
        // Créer une catégorie "Non classé" si nécessaire
        let unclassifiedCategory = await prisma.category.findFirst({
          where: { name: 'Non classé', organizationId: category.organizationId }
        });

        if (!unclassifiedCategory) {
          unclassifiedCategory = await prisma.category.create({
            data: {
              id: `cat_unclassified_${Date.now()}`,
              name: 'Non classé',
              description: 'Catégorie pour les modules sans classification',
              icon: 'QuestionOutlined',
              iconColor: '#999999',
              order: 999,
              organizationId: category.organizationId
            }
          });
        }

        // Déplacer les modules
        await prisma.module.updateMany({
          where: { categoryId: id },
          data: { categoryId: unclassifiedCategory.id }
        });
        console.log(`[ADMIN-MODULES-V2] 📦 ${category.modules.length} modules déplacés vers "Non classé"`);
      }
    }

    // Supprimer la catégorie (cascade sur OrganizationCategoryStatus)
    await prisma.category.delete({ where: { id } });

    console.log('[ADMIN-MODULES-V2] ✅ Catégorie supprimée:', category.name);

    res.json({
      success: true,
      message: `Catégorie "${category.name}" supprimée avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur DELETE Category:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la catégorie' });
  }
});

// 🆕 POST - GÉRER LE STATUT D'UNE CATÉGORIE POUR UNE ORGANISATION
router.post('/categories/:categoryId/organization/:orgId/status', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, orgId } = req.params;
    const { active, customPermissions, customAllowedRoles } = req.body;

    console.log('[ADMIN-MODULES-V2] 🔄 POST Category Status:', { categoryId, orgId, active });

    const statusId = `${orgId}_${categoryId}_${Date.now()}`;

    const status = await prisma.organizationCategoryStatus.upsert({
      where: {
        organizationId_categoryId: {
          organizationId: orgId,
          categoryId: categoryId
        }
      },
      update: { 
        active,
        customPermissions: customPermissions ? JSON.parse(JSON.stringify(customPermissions)) : undefined,
        customAllowedRoles: customAllowedRoles ? JSON.parse(JSON.stringify(customAllowedRoles)) : undefined,
        updatedAt: new Date()
      },
      create: {
        id: statusId,
        organizationId: orgId,
        categoryId: categoryId,
        active,
        customPermissions: customPermissions ? JSON.parse(JSON.stringify(customPermissions)) : null,
        customAllowedRoles: customAllowedRoles ? JSON.parse(JSON.stringify(customAllowedRoles)) : null
      }
    });

    res.json({
      success: true,
      data: status,
      message: `Statut de catégorie ${active ? 'activé' : 'désactivé'} pour l'organisation`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur POST Category Status:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la modification du statut de catégorie' });
  }
});

// 🆕 POST - CRÉER UN NOUVEAU MODULE (avec Category)
router.post('/modules', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      path,
      icon = 'AppstoreOutlined',
      categoryId,
      organizationId,
      order = 1,
      superAdminOnly = false,
      active = true
    } = req.body;

    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] 🆕 POST Module:', { name, categoryId, organizationId });

    // Validation
    if (!name || !path || !categoryId) {
      res.status(400).json({ success: false, error: 'Nom, chemin et catégorie sont requis' });
      return;
    }

    // Vérifier que la catégorie existe
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(400).json({ success: false, error: 'Catégorie non trouvée' });
      return;
    }

    // Vérifications de sécurité
    if (!isSuperAdmin && (superAdminOnly || (!organizationId && category.organizationId !== null))) {
      res.status(403).json({ success: false, error: 'Permissions insuffisantes' });
      return;
    }

    // Générer un ID unique
    const moduleId = `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newModule = await prisma.module.create({
      data: {
        id: moduleId,
        name,
        description,
        path,
        icon,
        categoryId,
        organizationId: organizationId || null,
        order,
        superAdminOnly,
        active,
        // Garder les anciens champs pour compatibilité
        section: category.name,
        sectionIcon: category.icon,
        sectionColor: category.iconColor
      },
      include: {
        Category: true,
        Organization: true
      }
    });

    console.log('[ADMIN-MODULES-V2] ✅ Module créé:', newModule.id);

    res.json({
      success: true,
      data: newModule,
      message: `Module "${name}" créé avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur POST Module:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création du module' });
  }
});

// 🆕 PUT - MODIFIER UN MODULE
router.put('/modules/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] ✏️ PUT Module:', { id, updateData });

    const existingModule = await prisma.module.findUnique({ 
      where: { id },
      include: { Category: true }
    });
    
    if (!existingModule) {
      res.status(404).json({ success: false, error: 'Module non trouvé' });
      return;
    }

    // Vérifications de sécurité
    if (!isSuperAdmin && existingModule.superAdminOnly) {
      res.status(403).json({ success: false, error: 'Seuls les super administrateurs peuvent modifier les modules réservés' });
      return;
    }

    // Si on change de catégorie, mettre à jour les anciens champs
    if (updateData.categoryId && updateData.categoryId !== existingModule.categoryId) {
      const newCategory = await prisma.category.findUnique({ where: { id: updateData.categoryId } });
      if (newCategory) {
        updateData.section = newCategory.name;
        updateData.sectionIcon = newCategory.icon;
        updateData.sectionColor = newCategory.iconColor;
      }
    }

    // Nettoyer les données
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedModule = await prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        Category: true,
        Organization: true
      }
    });

    console.log('[ADMIN-MODULES-V2] ✅ Module modifié:', updatedModule.name);

    res.json({
      success: true,
      data: updatedModule,
      message: `Module "${updatedModule.name}" modifié avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur PUT Module:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la modification du module' });
  }
});

// 🆕 DELETE - SUPPRIMER UN MODULE
router.delete('/modules/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as { role?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';

    console.log('[ADMIN-MODULES-V2] 🗑️ DELETE Module:', { id });

    const module = await prisma.module.findUnique({ where: { id } });
    if (!module) {
      res.status(404).json({ success: false, error: 'Module non trouvé' });
      return;
    }

    // Vérifications de sécurité
    if (!isSuperAdmin && module.superAdminOnly) {
      res.status(403).json({ success: false, error: 'Seuls les super administrateurs peuvent supprimer les modules réservés' });
      return;
    }

    // Supprimer le module (cascade sur permissions et statuts)
    await prisma.module.delete({ where: { id } });

    console.log('[ADMIN-MODULES-V2] ✅ Module supprimé:', module.name);

    res.json({
      success: true,
      message: `Module "${module.name}" supprimé avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur DELETE Module:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression du module' });
  }
});

// 🆕 POST - RÉORGANISER LES MODULES/CATÉGORIES (DRAG & DROP)
router.post('/reorder', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, items } = req.body; // type: 'categories' | 'modules'
    
    console.log('[ADMIN-MODULES-V2] 🔄 POST Reorder:', { type, itemsCount: items?.length });

    if (!Array.isArray(items) || !type) {
      res.status(400).json({ success: false, error: 'Données de réorganisation invalides' });
      return;
    }

    if (type === 'categories') {
      // Réorganiser les catégories
      const updatePromises = items.map((item, index) =>
        prisma.category.update({
          where: { id: item.id },
          data: { order: index + 1 }
        })
      );
      
      await Promise.all(updatePromises);
      console.log(`[ADMIN-MODULES-V2] ✅ ${items.length} catégories réorganisées`);
      
    } else if (type === 'modules') {
      // Réorganiser les modules + mise à jour des catégories
      const updatePromises = items.map((item, index) => {
        const updateData: { order: number; categoryId?: string } = { order: index + 1 };
        if (item.categoryId) {
          updateData.categoryId = item.categoryId;
        }
        
        return prisma.module.update({
          where: { id: item.id },
          data: updateData
        });
      });
      
      await Promise.all(updatePromises);
      console.log(`[ADMIN-MODULES-V2] ✅ ${items.length} modules réorganisés`);
    }

    res.json({
      success: true,
      message: `${type === 'categories' ? 'Catégories' : 'Modules'} réorganisés avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur POST Reorder:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la réorganisation' });
  }
});

// 🆕 POST - STATUT MODULE POUR ORGANISATION
router.post('/modules/:moduleId/organization/:orgId/status', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId, orgId } = req.params;
    const { active, customPermissions } = req.body;

    console.log('[ADMIN-MODULES-V2] 🔄 POST Module Status:', { moduleId, orgId, active });

    const statusId = `${orgId}_${moduleId}_${Date.now()}`;

    const status = await prisma.organizationModuleStatus.upsert({
      where: {
        organizationId_moduleId: {
          organizationId: orgId,
          moduleId: moduleId
        }
      },
      update: { 
        active,
        customPermissions: customPermissions ? JSON.parse(JSON.stringify(customPermissions)) : undefined,
        updatedAt: new Date()
      },
      create: {
        id: statusId,
        organizationId: orgId,
        moduleId: moduleId,
        active,
        customPermissions: customPermissions ? JSON.parse(JSON.stringify(customPermissions)) : null
      }
    });

    res.json({
      success: true,
      data: status,
      message: `Module ${active ? 'activé' : 'désactivé'} pour l'organisation`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur POST Module Status:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la modification du statut de module' });
  }
});

// 🔍 GET - RECHERCHE GLOBALE
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, organizationId } = req.query as { query?: string; organizationId?: string };
    
    if (!query || query.length < 2) {
      res.json({ success: true, data: { categories: [], modules: [] } });
      return;
    }

    console.log('[ADMIN-MODULES-V2] 🔍 Search:', { query, organizationId });

    // Recherche dans les catégories
    const categories = await prisma.category.findMany({
      where: {
        AND: [
          { active: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          },
          ...(organizationId ? [{
            OR: [
              { organizationId: null },
              { organizationId: organizationId }
            ]
          }] : [])
        ]
      },
      include: { Organization: true }
    });

    // Recherche dans les modules
    const modules = await prisma.module.findMany({
      where: {
        AND: [
          { active: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { path: { contains: query, mode: 'insensitive' } }
            ]
          },
          ...(organizationId ? [{
            OR: [
              { organizationId: null },
              { organizationId: organizationId }
            ]
          }] : [])
        ]
      },
      include: { 
        Category: true,
        Organization: true 
      }
    });

    res.json({
      success: true,
      data: {
        categories,
        modules,
        totalResults: categories.length + modules.length
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur Search:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la recherche' });
  }
});

export default router;

// POST - Créer un nouveau module (100% dynamique)
router.post('/', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      key,
      label,
      feature,
      icon,
      route,
      description,
      page,
      section,
      sectionIcon,
      sectionColor,
      order,
      orderInSection,
      active = true,
      parameters,
      organizationId
    } = req.body;

    console.log('[ADMIN-MODULES] POST - Création nouveau module:', { key, label, section });

    // Validation des champs obligatoires
    if (!key || !label || !feature) {
      res.status(400).json({
        success: false,
        error: 'Les champs key, label et feature sont obligatoires'
      });
      return;
    }

    // Vérifier l'unicité de key et feature
    const existing = await prisma.module.findFirst({
      where: {
        OR: [
          { key },
          { feature }
        ]
      }
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: `Un module avec cette clé (${existing.key}) ou cette feature (${existing.feature}) existe déjà`
      });
      return;
    }

    // Créer le module
    const newModule = await prisma.module.create({
      data: {
        id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique  
        key,
        label,
        feature,
        icon,
        route,
        description,
        page,
        section,
        sectionIcon,
        sectionColor,
        order,
        orderInSection,
        active,
        parameters,
        organizationId
      },
      include: {
        Organization: true,
        OrganizationModuleStatus: true
      }
    });

    console.log(`[ADMIN-MODULES] Module créé: ${newModule.key}`);
    
    res.json({
      success: true,
      data: newModule,
      message: `Module ${newModule.label} créé avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur POST:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du module',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT - Modifier un module existant (100% dynamique)
router.put('/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('[ADMIN-MODULES] PUT - Modification module:', { id, updateData });

    // Retirer les champs non modifiables
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Si on modifie key ou feature, vérifier l'unicité
    if (updateData.key || updateData.feature) {
      const existing = await prisma.module.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateData.key ? { key: updateData.key } : {},
                updateData.feature ? { feature: updateData.feature } : {}
              ]
            }
          ]
        }
      });

      if (existing) {
        res.status(400).json({
          success: false,
          error: `Un autre module avec cette clé ou feature existe déjà`
        });
        return;
      }
    }

    const updatedModule = await prisma.module.update({
      where: { id },
      data: updateData,
      include: {
        Organization: true,
        OrganizationModuleStatus: true
      }
    });

    console.log(`[ADMIN-MODULES] Module mis à jour: ${updatedModule.key}`);
    
    res.json({
      success: true,
      data: updatedModule,
      message: `Module ${updatedModule.label} mis à jour avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur PUT:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du module',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE - Supprimer un module
router.delete('/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('[ADMIN-MODULES] DELETE - Suppression module:', { id });

    // Récupérer le module avant suppression pour le log
    const module = await prisma.module.findUnique({ where: { id } });
    
    if (!module) {
      res.status(404).json({
        success: false,
        error: 'Module non trouvé'
      });
      return;
    }

    // Supprimer le module (cascade sur OrganizationModuleStatus et Permission)
    await prisma.module.delete({ where: { id } });

    console.log(`[ADMIN-MODULES] Module supprimé: ${module.key}`);
    
    res.json({
      success: true,
      message: `Module ${module.label} supprimé avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur DELETE:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du module',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST - Gérer le statut d'un module pour une organisation
router.post('/:moduleId/organization/:orgId/status', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId, orgId } = req.params;
    const { active } = req.body;
    
    console.log('[ADMIN-MODULES] POST Status - Modification statut module:', { moduleId, orgId, active });

    // Créer ou mettre à jour le statut
    const status = await prisma.organizationModuleStatus.upsert({
      where: {
        organizationId_moduleId: {
          organizationId: orgId,
          moduleId: moduleId
        }
      },
      update: { 
        active,
        updatedAt: new Date()
      },
      create: {
        id: `${orgId}_${moduleId}_${Date.now()}`,
        organizationId: orgId,
        moduleId: moduleId,
        active,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: status,
      message: `Statut du module ${active ? 'activé' : 'désactivé'} pour l'organisation`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur POST Status:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du statut',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET - Récupérer les métadonnées pour l'interface (icônes disponibles, etc.)
router.get('/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ADMIN-MODULES] GET Metadata - Récupération depuis la base de données');

    // Récupérer les icônes depuis la base de données
    const iconsData = await prisma.icon.findMany({
      where: { active: true },
      select: { name: true, category: true, description: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    const availableIcons = iconsData.map(icon => icon.name);

    // Couleurs prédéfinies
    const availableColors = [
      '#f5222d', '#fa8c16', '#1890ff', '#52c41a', '#faad14', '#722ed1', 
      '#13c2c2', '#eb2f96', '#666666', '#000000'
    ];

    // Sections existantes
    const existingSections = await prisma.module.findMany({
      select: { section: true, sectionIcon: true, sectionColor: true },
      where: { section: { not: null } },
      distinct: ['section']
    });

    console.log(`[ADMIN-MODULES] ${availableIcons.length} icônes récupérées depuis la base de données`);

    res.json({
      success: true,
      data: {
        availableIcons,
        availableColors,
        existingSections: existingSections.filter(s => s.section)
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur GET Metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des métadonnées'
    });
  }
});

// POST - Créer une nouvelle section
router.post('/sections', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionName, sectionIcon, sectionColor, sectionOrder, organizationId } = req.body;
    
    console.log('[ADMIN-MODULES] POST Section - Création nouvelle section:', {
      sectionName,
      sectionIcon,
      sectionColor,
      sectionOrder,
      organizationId
    });

    // Validation des données
    if (!sectionName || !sectionIcon) {
      res.status(400).json({
        success: false,
        error: 'Le nom de la section et l\'icône sont requis'
      });
      return;
    }

    // Vérifier si une section avec ce nom existe déjà
    const existingSection = await prisma.module.findFirst({
      where: {
        section: sectionName,
        organizationId: organizationId || null
      }
    });

    if (existingSection) {
      res.status(400).json({
        success: false,
        error: `Une section "${sectionName}" existe déjà`
      });
      return;
    }

    // Créer un module "placeholder" pour la section
    // Cela permet de définir la section sans avoir à créer un vrai module
    const placeholderModule = await prisma.module.create({
      data: {
        id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique
        key: `section-placeholder-${sectionName.toLowerCase().replace(/\s+/g, '-')}`,
        label: `Section ${sectionName}`,
        feature: 'section',
        section: sectionName,
        sectionIcon: sectionIcon,
        sectionColor: sectionColor || '#1890ff',
        order: (sectionOrder || 1) * 100, // Multiplier pour laisser de la place aux modules
        active: false, // Placeholder non actif
        page: null,
        route: null,
        description: `Section créée automatiquement : ${sectionName}`,
        organizationId: organizationId || null
      }
    });

    console.log('[ADMIN-MODULES] ✅ Section créée avec placeholder:', placeholderModule.id);

    res.json({
      success: true,
      data: {
        message: `Section "${sectionName}" créée avec succès`,
        sectionName,
        placeholderId: placeholderModule.id
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur POST Section:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la section'
    });
  }
});

// PUT - Déplacer un module vers une autre section
router.put('/:moduleId', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { moduleId } = req.params;
    const { section, sectionIcon, sectionColor, organizationId } = req.body;
    
    console.log('[ADMIN-MODULES] PUT Module - Déplacement vers section:', {
      moduleId,
      targetSection: section,
      organizationId
    });

    // Validation
    if (!section) {
      res.status(400).json({
        success: false,
        error: 'Le nom de la section cible est requis'
      });
      return;
    }

    // Récupérer l'icône par défaut depuis la BDD
    const defaultIcon = await prisma.icon.findFirst({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    const fallbackIcon = defaultIcon?.name || 'AppstoreOutlined';

    // Mettre à jour le module
    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data: {
        section,
        sectionIcon: sectionIcon || fallbackIcon, // ✅ DYNAMIQUE depuis BDD
        sectionColor: sectionColor || '#666666'
      }
    });

    console.log('[ADMIN-MODULES] ✅ Module déplacé:', updatedModule.key, '->', section);

    res.json({
      success: true,
      data: {
        message: `Module "${updatedModule.label}" déplacé vers "${section}"`,
        module: updatedModule
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur PUT Module:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du déplacement du module'
    });
  }
});

// PUT - Réordonner l'ordre des sections
router.put('/sections/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sections } = req.body as { sections: { sectionName: string; order: number }[] };
    
    console.log('[ADMIN-MODULES] Réordonnancement sections:', sections);
    
    if (!sections || !Array.isArray(sections)) {
      res.status(400).json({
        success: false,
        error: 'Liste des sections requise'
      });
      return;
    }

    // Mettre à jour l'ordre des modules selon l'ordre des sections
    const updatePromises = sections.map(async (section, sectionIndex) => {
      const baseOrder = (sectionIndex + 1) * 10; // 10, 20, 30, 40...
      
      // Récupérer tous les modules de cette section
      const modulesInSection = await prisma.module.findMany({
        where: { section: section.sectionName },
        orderBy: { order: 'asc' }
      });
      
      // Recalculer les ordres au sein de la section
      const moduleUpdates = modulesInSection.map((module, moduleIndex) => 
        prisma.module.update({
          where: { id: module.id },
          data: { order: baseOrder + moduleIndex + 1 } // 11, 12, 13... puis 21, 22, 23...
        })
      );
      
      return Promise.all(moduleUpdates);
    });

    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Ordre des sections sauvegardé'
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur réordonnancement sections:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde de l\'ordre'
    });
  }
});

// PUT - Réordonner les modules au sein d'une section
router.put('/modules/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionName, moduleIds } = req.body as { sectionName: string; moduleIds: string[] };
    
    console.log('[ADMIN-MODULES] Réordonnancement modules dans section:', sectionName, moduleIds);
    
    if (!sectionName || !moduleIds || !Array.isArray(moduleIds)) {
      res.status(400).json({
        success: false,
        error: 'Section et liste des modules requis'
      });
      return;
    }

    // Déterminer l'ordre de base pour cette section
    const firstModuleInSection = await prisma.module.findFirst({
      where: { section: sectionName },
      orderBy: { order: 'asc' }
    });
    
    if (!firstModuleInSection) {
      res.status(404).json({
        success: false,
        error: 'Aucun module trouvé dans cette section'
      });
      return;
    }
    
    const baseOrder = Math.floor(firstModuleInSection.order / 10) * 10;
    
    // Mettre à jour l'ordre des modules
    const updatePromises = moduleIds.map((moduleId, index) =>
      prisma.module.update({
        where: { id: moduleId },
        data: { order: baseOrder + index + 1 }
      })
    );

    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'Ordre des modules sauvegardé'
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur réordonnancement modules:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la sauvegarde de l\'ordre'
    });
  }
});

// 🆕 PUT - Mettre à jour le nom d'une catégorie
router.put('/update-category', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldCategory, newCategory } = req.body;
    
    console.log('[ADMIN-MODULES] PUT update-category:', { oldCategory, newCategory });

    if (!oldCategory || !newCategory) {
      res.status(400).json({
        success: false,
        error: 'Ancienne et nouvelle catégorie requises'
      });
      return;
    }

    // Mettre à jour tous les modules de cette catégorie
    const updated = await prisma.module.updateMany({
      where: { category: oldCategory },
      data: { category: newCategory }
    });
    
    res.json({
      success: true,
      message: `Catégorie "${oldCategory}" renommée en "${newCategory}"`,
      updatedCount: updated.count
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur update-category:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la catégorie'
    });
  }
});

// 🆕 PUT - Toggle l'activation de tous les modules d'une catégorie
router.put('/toggle-category', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, active } = req.body;
    
    console.log('[ADMIN-MODULES] PUT toggle-category:', { category, active });

    if (!category || typeof active !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Catégorie et statut actif requis'
      });
      return;
    }

    // Mettre à jour tous les modules de cette catégorie
    const updated = await prisma.module.updateMany({
      where: { category },
      data: { active }
    });
    
    res.json({
      success: true,
      message: `${updated.count} modules de la catégorie "${category}" ${active ? 'activés' : 'désactivés'}`,
      updatedCount: updated.count
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur toggle-category:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du toggle de la catégorie'
    });
  }
});

// 🆕 DELETE - Supprimer tous les modules d'une catégorie
router.delete('/delete-category', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.body;
    
    console.log('[ADMIN-MODULES] DELETE delete-category:', { category });

    if (!category) {
      res.status(400).json({
        success: false,
        error: 'Nom de la catégorie requis'
      });
      return;
    }

    // Supprimer tous les modules de cette catégorie
    const deleted = await prisma.module.deleteMany({
      where: { category }
    });
    
    res.json({
      success: true,
      message: `${deleted.count} modules de la catégorie "${category}" supprimés`,
      deletedCount: deleted.count
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur delete-category:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la catégorie'
    });
  }
});

export default router;
