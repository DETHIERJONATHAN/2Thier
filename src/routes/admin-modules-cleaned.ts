import { Router, Request, Response, type RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware as unknown as RequestHandler, impersonationMiddleware as unknown as RequestHandler);

// GET - Récupérer TOUS les modules organisés par sections (100% dynamique depuis BDD)
// ⚠️ ANCIENNE API - Utilise system section/module classique MAIS avec support Category
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    
    console.log('[ADMIN-MODULES-V1] GET - Récupération modules par sections (système hybride)');
    
    // Récupérer l'icône par défaut depuis la BDD
    const defaultIcon = await prisma.icon.findFirst({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    const fallbackIcon = defaultIcon?.name || 'AppstoreOutlined';
    
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

    // Regrouper par sections DYNAMIQUEMENT (système hybride)
    const sectionsMap = new Map();
    
    modules.forEach(module => {
      // Priorité au nouveau système Category, fallback sur ancien système section
      const sectionName = module.Category?.name || module.section || 'Non classé';
      
      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, {
          sectionName,
          sectionIcon: module.Category?.icon || module.sectionIcon || fallbackIcon,
          sectionColor: module.Category?.iconColor || module.sectionColor || '#666666',
          sectionOrder: module.Category?.order || (module.order ? Math.floor(module.order / 10) * 10 : 999),
          modules: []
        });
      }
      
      sectionsMap.get(sectionName).modules.push({
        ...module,
        // Enrichir avec les données de statut
        isActiveInOrg: module.OrganizationModuleStatus?.[0]?.active ?? true,
        hasOrgSpecificConfig: module.OrganizationModuleStatus?.length > 0,
        categoryName: module.Category?.name // ✅ Ajout info Category
      });
    });

    // Convertir en array et trier les sections
    const sections = Array.from(sectionsMap.values()).sort(
      (a, b) => a.sectionOrder - b.sectionOrder
    );

    console.log(`[ADMIN-MODULES-V1] Sections créées: ${sections.length} (système hybride)`);
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

export default router;
