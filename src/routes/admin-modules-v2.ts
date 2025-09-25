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
        sectionColor: category.iconColor,
        label: name,
        feature: name,
        key: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        route: path
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

    // Synchroniser les champs pour compatibilité
    if (updateData.name && !updateData.label) {
      updateData.label = updateData.name;
      updateData.feature = updateData.name;
      updateData.key = updateData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    if (updateData.path && !updateData.route) {
      updateData.route = updateData.path;
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

// 🔄 GET - RÉCUPÉRER LES ICÔNES DISPONIBLES
router.get('/icons', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ADMIN-MODULES-V2] 📦 GET Icons');
    
    const icons = await prisma.icon.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: icons,
      totalIcons: icons.length
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V2] ❌ Erreur GET Icons:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des icônes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
