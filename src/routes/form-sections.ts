import { Router, Request, Response } from 'express';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

// 📝 SECTIONS DE FORMULAIRES - Gestion des sections Block→Section→Field
// ⚠️  Ne pas confondre avec la navigation des modules (module.category)

// GET toutes les sections pour un bloc spécifique
router.get('/:blockId', async (req: Request, res: Response): Promise<void> => {
  const { blockId } = req.params;
  try {
    
    const sections = await prisma.section.findMany({
      where: { blockId },
      include: {
        Field: { // Inclure les champs pour chaque section
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Le nom de la relation est 'Field' (majuscule) dans Prisma
    const adaptedSections = sections.map(section => ({
      ...section,
      fields: section.Field || [] // 'Field' est maintenant inclus et disponible
    }));

    res.json(adaptedSections);
    
  } catch (e) {
    console.error(`[API] Erreur récupération sections pour bloc ${blockId}:`, e);
    res.status(500).json({ error: 'Erreur lors de la récupération des sections', details: e });
  }
});

// POST - Créer une nouvelle section de formulaire
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, blockId, order, sectionType } = req.body;
    

    if (!name || !blockId) {
      res.status(400).json({ error: 'Name et blockId requis' });
      return;
    }

    const section = await prisma.section.create({
      data: {
        id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        blockId,
        order: order || 0,
        sectionType: sectionType || 'normal',
        active: true
      },
      include: {
        Field: true
      }
    });

    res.json({ success: true, data: section });
    
  } catch (error) {
    console.error('[API] Erreur création section:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la section de formulaire' });
  }
});

// PUT - Modifier une section de formulaire
router.put('/:sectionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;
    const { name, order, sectionType, active } = req.body;
    

    const section = await prisma.section.update({
      where: { id: sectionId },
      data: {
        ...(name && { name }),
        ...(order !== undefined && { order }),
        ...(sectionType && { sectionType }),
        ...(active !== undefined && { active })
      },
      include: {
        Field: true
      }
    });

    res.json({ success: true, data: section });
    
  } catch (error) {
    console.error(`[API] Erreur modification section ${req.params.sectionId}:`, error);
    res.status(500).json({ error: 'Erreur lors de la modification de la section de formulaire' });
  }
});

// DELETE - Supprimer une section de formulaire
router.delete('/:sectionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId } = req.params;
    

    await prisma.section.delete({
      where: { id: sectionId }
    });

    res.json({ success: true, message: 'Section de formulaire supprimée' });
    
  } catch (error) {
    console.error(`[API] Erreur suppression section ${req.params.sectionId}:`, error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la section de formulaire' });
  }
});

export default router;
