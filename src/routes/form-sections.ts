import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 📝 SECTIONS DE FORMULAIRES - Gestion des sections Block→Section→Field
// ⚠️  Ne pas confondre avec la navigation des modules (module.category)

// GET toutes les sections pour un bloc spécifique
router.get('/:blockId', async (req: Request, res: Response): Promise<void> => {
  const { blockId } = req.params;
  try {
    console.log(`[API] GET /api/form-sections/${blockId} - Récupération sections de formulaire`);
    
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

    console.log(`[API] ${adaptedSections.length} sections de formulaire trouvées pour bloc ${blockId}`);
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
    
    console.log(`[API] POST /api/form-sections - Création section: ${name} pour bloc ${blockId}`);

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

    console.log(`[API] ✅ Section de formulaire créée: ${section.id}`);
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
    
    console.log(`[API] PUT /api/form-sections/${sectionId} - Modification section`);

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

    console.log(`[API] ✅ Section de formulaire modifiée: ${section.id}`);
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
    
    console.log(`[API] DELETE /api/form-sections/${sectionId} - Suppression section`);

    await prisma.section.delete({
      where: { id: sectionId }
    });

    console.log(`[API] ✅ Section de formulaire supprimée: ${sectionId}`);
    res.json({ success: true, message: 'Section de formulaire supprimée' });
    
  } catch (error) {
    console.error(`[API] Erreur suppression section ${req.params.sectionId}:`, error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la section de formulaire' });
  }
});

export default router;
