import { Router, Request, Response, type RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware as unknown as RequestHandler, impersonationMiddleware as unknown as RequestHandler);

// ✅ REDIRECTION : /api/sections → Categories Prisma
// Ces routes permettent au hook useDynamicSections de fonctionner sans modification

// GET - Récupérer toutes les Categories (compatible avec useDynamicSections)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    
    console.log('[SECTIONS→CATEGORIES] GET - Récupération des Categories existantes depuis admin-modules');
    
    // ✅ Utiliser les Categories existantes via les routes admin-modules
    const categories = await prisma.category.findMany({
      where: organizationId ? { 
        OR: [
          { organizationId: organizationId },
          { organizationId: null } // Categories globales
        ]
      } : undefined,
      orderBy: { order: 'asc' }
    });

    // Convertir Categories → format sections pour useDynamicSections (sans modification)
    const sectionsFormat = categories.map(category => ({
      id: category.id,
      title: category.name,
      description: category.description || '',
      iconName: category.icon,
      iconColor: category.iconColor,
      order: category.order,
      active: category.active,
      organizationId: category.organizationId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    }));

    console.log(`[SECTIONS→CATEGORIES] ${sectionsFormat.length} Categories existantes converties en sections`);
    console.log(`[SECTIONS→CATEGORIES] Categories trouvées: ${sectionsFormat.map(s => s.title).join(', ')}`);
    
    res.json(sectionsFormat);
  } catch (error) {
    console.error('[SECTIONS→CATEGORIES] Erreur GET:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la récupération des sections'
    });
  }
});

// POST /bulk - Créer plusieurs Categories en une fois
router.post('/bulk', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sections } = req.body;
    
    console.log(`[SECTIONS→CATEGORIES] POST/bulk - Création de ${sections.length} Categories`);
    
    // Convertir sections → Categories pour Prisma
    const categoriesToCreate = sections.map((section: any) => ({
      name: section.title,
      description: section.description,
      icon: section.iconName,
      iconColor: section.iconColor,
      order: section.order,
      active: section.active,
      organizationId: section.organizationId,
      superAdminOnly: false
    }));

    // Créer en bulk avec Prisma
    const createdCategories = await Promise.all(
      categoriesToCreate.map(category => 
        prisma.category.create({ data: category })
      )
    );

    // Reconvertir vers format sections
    const sectionsFormat = createdCategories.map(category => ({
      id: category.id,
      title: category.name,
      description: category.description || '',
      iconName: category.icon,
      iconColor: category.iconColor,
      order: category.order,
      active: category.active,
      organizationId: category.organizationId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    }));

    console.log(`[SECTIONS→CATEGORIES] ${createdCategories.length} Categories créées avec succès`);
    
    res.json(sectionsFormat);
  } catch (error) {
    console.error('[SECTIONS→CATEGORIES] Erreur POST/bulk:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la création des sections'
    });
  }
});

// POST - Créer une nouvelle Category
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, iconName, iconColor, order, active, organizationId } = req.body;
    
    console.log(`[SECTIONS→CATEGORIES] POST - Création Category "${name}"`);
    
    const category = await prisma.category.create({
      data: {
        name,
        description: description || `Category ${name}`,
        icon: iconName || 'AppstoreOutlined',
        iconColor: iconColor || '#1890ff',
        order: order || 999,
        active: active !== false,
        organizationId,
        superAdminOnly: false
      }
    });

    // Convertir vers format section
    const sectionFormat = {
      id: category.id,
      title: category.name,
      description: category.description || '',
      iconName: category.icon,
      iconColor: category.iconColor,
      order: category.order,
      active: category.active,
      organizationId: category.organizationId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    };

    console.log(`[SECTIONS→CATEGORIES] Category "${name}" créée avec succès`);
    
    res.json({ success: true, data: sectionFormat });
  } catch (error) {
    console.error('[SECTIONS→CATEGORIES] Erreur POST:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la création de la section'
    });
  }
});

// PATCH - Mettre à jour une Category
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`[SECTIONS→CATEGORIES] PATCH - Mise à jour Category ${id}`);
    
    // Convertir les champs sections → Categories si nécessaire
    const categoryUpdateData: any = {};
    if (updateData.title) categoryUpdateData.name = updateData.title;
    if (updateData.description !== undefined) categoryUpdateData.description = updateData.description;
    if (updateData.iconName) categoryUpdateData.icon = updateData.iconName;
    if (updateData.iconColor) categoryUpdateData.iconColor = updateData.iconColor;
    if (updateData.order !== undefined) categoryUpdateData.order = updateData.order;
    if (updateData.active !== undefined) categoryUpdateData.active = updateData.active;

    const category = await prisma.category.update({
      where: { id },
      data: categoryUpdateData
    });

    // Convertir vers format section
    const sectionFormat = {
      id: category.id,
      title: category.name,
      description: category.description || '',
      iconName: category.icon,
      iconColor: category.iconColor,
      order: category.order,
      active: category.active,
      organizationId: category.organizationId,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    };

    console.log(`[SECTIONS→CATEGORIES] Category ${id} mise à jour avec succès`);
    
    res.json(sectionFormat);
  } catch (error) {
    console.error('[SECTIONS→CATEGORIES] Erreur PATCH:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la mise à jour de la section'
    });
  }
});

// DELETE - Supprimer une Category
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log(`[SECTIONS→CATEGORIES] DELETE - Suppression Category ${id}`);
    
    await prisma.category.delete({
      where: { id }
    });

    console.log(`[SECTIONS→CATEGORIES] Category ${id} supprimée avec succès`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[SECTIONS→CATEGORIES] Erreur DELETE:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur lors de la suppression de la section'
    });
  }
});

export default router;
