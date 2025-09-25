import { Router, Request, Response, type RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { requireRole } from '../middlewares/requireRole';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler, impersonationMiddleware as unknown as RequestHandler);

// GET - Récupérer TOUS les modules organisés par sections (100% dynamique depuis BDD)
// ⚠️ ANCIENNE API - Utilise system section/module classique MAIS avec support Category
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    const user = req.user as { id?: string; email?: string; role?: string; organizationId?: string } | undefined;
    const isSuperAdmin = user?.role === 'super_admin';
    
    console.log('[ADMIN-MODULES-V1] GET - Récupération modules par sections (système hybride)');
    console.log('[ADMIN-MODULES-V1] 👤 User:', user?.email, 'Role:', user?.role, 'IsSuperAdmin:', isSuperAdmin);
    
    // Icône par défaut
    const fallbackIcon = 'AppstoreOutlined';
    
    // Récupérer TOUS les modules avec TOUTES les colonnes, triés par ordre
    const modules = await prisma.module.findMany({
      where: organizationId ? { 
        OR: [
          { organizationId: organizationId },
          { organizationId: null } // Modules globaux
        ]
      } : undefined,
      orderBy: { order: 'asc' },
      include: {
        Organization: true,
        Category: true, // ✅ Inclure la nouvelle relation Category
        OrganizationModuleStatus: organizationId ? {
          where: { organizationId: organizationId }
        } : true,
        Permission: true
      }
    });

    // Récupérer TOUTES les catégories (même celles sans modules) avec filtrage SuperAdmin
    const allCategories = await prisma.category.findMany({
      where: {
        AND: [
          // Filtrage par organisation
          organizationId ? { 
            OR: [
              { organizationId: organizationId },
              { organizationId: null } // Catégories globales
            ]
          } : {},
          // Vérification superAdminOnly : Si pas SuperAdmin, exclure les catégories SuperAdmin Only
          ...(isSuperAdmin ? [] : [{ superAdminOnly: false }])
        ]
      },
      orderBy: { order: 'asc' }
    });

    // Créer une Map avec TOUTES les catégories d'abord
    const sectionsMap = new Map();
    
    // 1. Ajouter TOUTES les catégories (même vides)
    allCategories.forEach(category => {
      const sectionKey = `category_${category.id}`;
      sectionsMap.set(sectionKey, {
        id: category.id,
        backendCategoryId: category.id, // ✅ identifiant réel BDD
        title: category.name,
        iconName: category.icon || fallbackIcon,
        iconColor: category.iconColor || '#1890ff',
        order: category.order || 999,
        active: category.active ?? true,
        superAdminOnly: category.superAdminOnly ?? false,
        isRealCategory: true,
        modules: []
      });
    });
    
    // 2. Ensuite, assigner les modules aux catégories
    modules.forEach(module => {
      // Utiliser la VRAIE catégorie de la BDD, pas le feature
      let sectionKey, sectionName, sectionIcon, sectionColor, sectionOrder, sectionId, sectionActive, sectionSuperAdminOnly;
      
      if (module.Category) {
        // Module avec une vraie catégorie BDD
        sectionKey = `category_${module.Category.id}`;
        sectionName = module.Category.name;
        sectionIcon = module.Category.icon || fallbackIcon;
        sectionColor = module.Category.iconColor || '#1890ff';
        sectionOrder = module.Category.order || 999;
        sectionId = module.Category.id;
        sectionActive = module.Category.active ?? true;
        sectionSuperAdminOnly = module.Category.superAdminOnly ?? false;
      } else {
        // Fallback pour modules sans catégorie (utiliser feature ou "Non classé")
        const fallbackName = module.feature ? 
          module.feature.charAt(0).toUpperCase() + module.feature.slice(1) : 
          'Non classé';
        sectionKey = `feature_${fallbackName}`;
        sectionName = fallbackName;
        sectionIcon = module.icon || fallbackIcon;
        sectionColor = '#1890ff';
        sectionOrder = module.order ? Math.floor(module.order / 10) * 10 : 999;
        sectionId = fallbackName; // Pas d'ID pour les fallbacks
        sectionActive = true;
        sectionSuperAdminOnly = false;
        
        // Créer la section fallback si elle n'existe pas
        if (!sectionsMap.has(sectionKey)) {
          sectionsMap.set(sectionKey, {
            id: sectionId,
            backendCategoryId: null, // ❌ pas de catégorie BDD
            title: sectionName,
            iconName: sectionIcon,
            iconColor: sectionColor,
            order: sectionOrder,
            active: sectionActive,
            superAdminOnly: sectionSuperAdminOnly,
            isRealCategory: false,
            modules: []
          });
        }
      }
      
      // Ajouter le module à la section (elle existe déjà grâce à l'étape 1)
      if (sectionsMap.has(sectionKey)) {
        sectionsMap.get(sectionKey).modules.push({
          ...module,
          // Enrichir avec les données de statut
          isActiveForOrg: module.OrganizationModuleStatus?.[0]?.active ?? true,
          hasOrgSpecificConfig: module.OrganizationModuleStatus?.length > 0,
        });
      }
    });

    // Convertir en array et trier les sections
    const sections = Array.from(sectionsMap.values()).sort(
      (a, b) => a.order - b.order
    );

    console.log(`[ADMIN-MODULES-V1] Sections créées: ${sections.length} (système par catégories)`);
    console.log(`[ADMIN-MODULES-V1] Total modules: ${modules.length}`);
    
    res.json({
      success: true,
      data: {
        sections,
        totalModules: modules.length,
        totalSections: sections.length,
        systemType: 'hybrid', // Indicateur pour le frontend
        categorySystemAvailable: modules.some(m => m.categoryId) // ✅ Y a-t-il des modules avec categoryId ?
      }
    });

  } catch (error) {
    console.error('[ADMIN-MODULES-V1] Erreur GET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des modules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== ROUTES CATEGORIES SYSTEM =====

// GET - Récupérer toutes les categories (pour l'admin des modules)
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    
    console.log('[ADMIN-MODULES] GET /categories - Récupération des categories');
    
    const categories = await prisma.category.findMany({
      where: organizationId ? { 
        OR: [
          { organizationId: organizationId },
          { organizationId: null } // Categories globales
        ]
      } : undefined,
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            Module: true // Compter les modules dans chaque category
          }
        }
      }
    });

    console.log(`[ADMIN-MODULES] ${categories.length} categories trouvées`);
    
    res.json({
      success: true,
      data: categories,
      total: categories.length
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur GET /categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST - Créer une nouvelle category
router.post('/categories', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon, iconColor, order, organizationId } = req.body as {
      name?: string;
      description?: string;
      icon?: string;
      iconColor?: string;
      order?: number;
      organizationId?: string | null;
    };

    // Validation minimale du payload
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, error: 'Le champ "name" est requis pour créer une catégorie.' });
      return;
    }

    console.log('[ADMIN-MODULES] POST /categories - Création category:', { name, icon, organizationId });

    // Générer un UUID pour la nouvelle catégorie
    const { randomUUID } = await import('crypto');
    const categoryId = randomUUID();

    const now = new Date();
    const category = await prisma.category.create({
      data: {
        id: categoryId,
        name: name.trim(),
        description: description || null,
        icon: icon || 'AppstoreOutlined',
        iconColor: iconColor || '#1890ff',
        order: typeof order === 'number' ? order : 0,
        organizationId: organizationId || null,
        active: true,
        // Le schéma ne définit pas @updatedAt ni de default → fournir explicitement
        updatedAt: now,
      }
    });

    console.log(`[ADMIN-MODULES] Category créée: ${category.id}`);

    res.json({
      success: true,
      data: category
    });

  } catch (error: unknown) {
    // Gestion d'erreurs Prisma plus parlante
    const code = (error as { code?: string } | undefined)?.code;
    if (code === 'P2003') {
      // Contrainte FK échouée (ex: organizationId invalide)
      res.status(400).json({ success: false, error: 'organizationId invalide' });
      return;
    }
    console.error('[ADMIN-MODULES] Erreur POST /categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la création de la category',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT - Réorganiser les categories (drag & drop) - DOIT être avant /:id
router.put('/categories/reorder', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body; // [{ id, order }, ...]
    
    console.log('[ADMIN-MODULES] PUT /categories/reorder - Réorganisation categories:', updates.length);
    
    // Mettre à jour l'ordre de chaque category
    for (const update of updates) {
      await prisma.category.update({
        where: { id: update.id },
        data: { 
          order: update.order,
          updatedAt: new Date()
        }
      });
    }

    console.log(`[ADMIN-MODULES] ${updates.length} categories réorganisées`);
    
    res.json({
      success: true,
      message: `${updates.length} categories réorganisées avec succès`
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur PUT /categories/reorder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la réorganisation des categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT - Modifier une category existante
router.put('/categories/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, icon, iconColor, order, active, superAdminOnly } = req.body;
    
    console.log('[ADMIN-MODULES] PUT /categories/:id - Modification category:', { id, name, active, superAdminOnly });
    
    // Logique d'interdépendance: Si superAdminOnly est activé, automatiquement désactiver active
    const finalActive = superAdminOnly ? false : active;
    
    if (superAdminOnly && active) {
      console.log('[ADMIN-MODULES] SuperAdminOnly activé - Désactivation automatique du module pour les organisations');
    }
    
    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        iconColor,
        order,
        active: finalActive,
        superAdminOnly: superAdminOnly ?? false,
        updatedAt: new Date()
      }
    });

    console.log(`[ADMIN-MODULES] Category modifiée: ${category.id}`);
    
    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur PUT /categories/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la modification de la category',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE - Supprimer une category
router.delete('/categories/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('[ADMIN-MODULES] DELETE /categories/:id - Suppression category:', { id });
    
    // Vérifier qu'aucun module n'utilise cette category
    const moduleCount = await prisma.module.count({
      where: { categoryId: id }
    });
    
    if (moduleCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete category with ${moduleCount} modules attached`
      });
      return;
    }
    
    await prisma.category.delete({
      where: { id }
    });

    console.log(`[ADMIN-MODULES] Category supprimée: ${id}`);
    
    res.json({
      success: true,
      message: 'Category supprimée avec succès'
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur DELETE /categories/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la suppression de la category',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT - Modifier un module existant (pour les toggles)
router.put('/modules/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { active, superAdminOnly } = req.body;
    
    console.log('[ADMIN-MODULES] PUT /modules/:id - Modification module:', { id, active, superAdminOnly });
    
    // Logique d'interdépendance: Si superAdminOnly est activé, automatiquement désactiver active
    const finalActive = superAdminOnly ? false : active;
    
    if (superAdminOnly && active) {
      console.log('[ADMIN-MODULES] SuperAdminOnly activé - Désactivation automatique du module pour les organisations');
    }
    
    const module = await prisma.module.update({
      where: { id },
      data: {
        active: finalActive,
        superAdminOnly: superAdminOnly ?? false,
        updatedAt: new Date()
      }
    });

    console.log(`[ADMIN-MODULES] Module modifié: ${module.id}`);
    
    res.json({
      success: true,
      data: module
    });

  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur PUT /modules/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la modification du module',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE - Supprimer un module (alias de compatibilité)
router.delete('/modules/:id', requireRole(['admin', 'super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('[ADMIN-MODULES] DELETE /modules/:id (alias) - Suppression module:', { id });

    // Supprimer d'abord les statuts et permissions liés (meilleur effort)
    await prisma.organizationModuleStatus.deleteMany({ where: { moduleId: id } });
    await prisma.permission.deleteMany({ where: { moduleId: id } }).catch(() => {});

    await prisma.module.delete({ where: { id } });

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[ADMIN-MODULES] Erreur DELETE /modules/:id (alias):', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la suppression du module',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
