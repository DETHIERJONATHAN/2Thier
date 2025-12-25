import { Router, Request, Response, type RequestHandler } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { db } from '../lib/database';
import { requireRole } from '../middlewares/requireRole';

const prisma = db;
const router = Router();

router.use(authMiddleware as unknown as RequestHandler, impersonationMiddleware as unknown as RequestHandler);

// GET - Récupérer toutes les icônes disponibles
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;
    
    console.log('[ICONS-API] GET - Récupération des icônes', { category, search });

    let whereClause: any = {
      active: true // Seulement les icônes actives
    };

    // Filtre par catégorie
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    // Recherche dans le nom, la description et les tags
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: [searchTerm] } }
      ];
    }

    const icons = await prisma.icon.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Grouper par catégorie pour faciliter l'affichage
    const groupedIcons = icons.reduce((acc, icon) => {
      if (!acc[icon.category]) {
        acc[icon.category] = [];
      }
      acc[icon.category].push(icon);
      return acc;
    }, {} as Record<string, typeof icons>);

    res.json({
      success: true,
      data: {
        icons: icons,
        groupedIcons: groupedIcons,
        totalCount: icons.length,
        categories: Object.keys(groupedIcons).sort()
      }
    });

  } catch (error: any) {
    console.error('[ICONS-API] Erreur lors de la récupération des icônes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des icônes',
      details: error.message
    });
  }
});

// GET - Récupérer les catégories d'icônes
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[ICONS-API] GET - Récupération des catégories d\'icônes');

    const categories = await prisma.icon.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { id: true },
      orderBy: { category: 'asc' }
    });

    res.json({
      success: true,
      data: categories.map(cat => ({
        name: cat.category,
        count: cat._count.id
      }))
    });

  } catch (error: any) {
    console.error('[ICONS-API] Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des catégories',
      details: error.message
    });
  }
});

// POST - Créer une nouvelle icône (Admin seulement)
router.post('/', requireRole(['super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, description, tags, active = true } = req.body;
    
    console.log('[ICONS-API] POST - Création d\'une nouvelle icône:', { name, category });

    if (!name || !category) {
      res.status(400).json({
        success: false,
        error: 'Le nom et la catégorie sont requis'
      });
      return;
    }

    const newIcon = await prisma.icon.create({
      data: {
        name,
        category,
        description,
        tags: Array.isArray(tags) ? tags : [],
        active
      }
    });

    res.json({
      success: true,
      data: newIcon,
      message: `Icône "${name}" créée avec succès`
    });

  } catch (error: any) {
    console.error('[ICONS-API] Erreur lors de la création de l\'icône:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'icône',
      details: error.message
    });
  }
});

// PUT - Modifier une icône existante (Admin seulement)
router.put('/:id', requireRole(['super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('[ICONS-API] PUT - Modification de l\'icône:', { id, updateData });

    // Supprimer les champs non modifiables
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const updatedIcon = await prisma.icon.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: updatedIcon,
      message: `Icône mise à jour avec succès`
    });

  } catch (error: any) {
    console.error('[ICONS-API] Erreur lors de la modification de l\'icône:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de l\'icône',
      details: error.message
    });
  }
});

// DELETE - Désactiver une icône (Admin seulement)
router.delete('/:id', requireRole(['super_admin']) as unknown as RequestHandler, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    console.log('[ICONS-API] DELETE - Désactivation de l\'icône:', id);

    // On désactive plutôt que de supprimer pour préserver l'intégrité
    const disabledIcon = await prisma.icon.update({
      where: { id },
      data: { active: false }
    });

    res.json({
      success: true,
      data: disabledIcon,
      message: `Icône désactivée avec succès`
    });

  } catch (error: any) {
    console.error('[ICONS-API] Erreur lors de la désactivation de l\'icône:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désactivation de l\'icône',
      details: error.message
    });
  }
});

export default router;
