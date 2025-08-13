import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middlewares/requirePermission';
import { requireRole } from '../middlewares/requireRole';
import { v4 as uuidv4 } from 'uuid';
import { adaptBlockStructure } from '../helpers/adaptBlockStructure';

const prisma = new PrismaClient();
const router = Router();

router.use(authMiddleware as any, impersonationMiddleware as any);

// GET toutes les sections pour un bloc spécifique (anciennement moduleId)
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

// PUT mise à jour d'une section
router.put('/:id', requirePermission('update', 'section') as any, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, active } = req.body;

  const dataToUpdate: { name?: string; active?: boolean } = {};
  if (name !== undefined) {
    dataToUpdate.name = name;
  }
  if (active !== undefined) {
    dataToUpdate.active = active;
  }

  try {
    const section = await prisma.section.update({ 
      where: { id }, 
      data: dataToUpdate
    });
    res.json(section);
  } catch (e) {
    console.error(`[API] Erreur mise à jour section ${id}:`, e);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la section', details: e });
  }
});

// DELETE suppression d'une section
router.delete('/:id', requirePermission('delete', 'section') as any, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await prisma.section.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error(`[API] Erreur suppression section ${id}:`, e);
    res.status(500).json({ error: 'Erreur lors de la suppression de la section' });
  }
});

// POST ajout d'un champ à une section
router.post('/:sectionId/fields', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { sectionId } = req.params;
  const { label, type, required, width, order, options, advancedConfig } = req.body;
  try {
    // 1. Trouver la section pour obtenir le blockId
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section || !section.blockId) {
      res.status(404).json({ error: "Section ou block parent non trouvé" });
      return;
    }
    const blockId = section.blockId;

    const fieldData: any = {
      id: uuidv4(),
      label,
      type,
      required: required ?? false,
      width,
      order: order ?? 0,
      sectionId,
      advancedConfig,
    };

    if (options && Array.isArray(options)) {
      fieldData.FieldOption = {
        create: options.map((opt: { label: string, value: string }) => ({
          id: uuidv4(),
          label: opt.label,
          value: opt.value,
        })),
      };
    }

    await prisma.field.create({
      data: fieldData
    });

    // Renvoyer le block complet mis à jour pour le frontend
    const updatedBlockWithRelations = await prisma.block.findUnique({
        where: { id: blockId },
        include: {
            Section: { // Correction: le nom de la relation est 'Section'
                orderBy: { order: 'asc' },
                include: {
                    Field: { // Correction: le nom de la relation est 'Field'
                        orderBy: { order: 'asc' },
                        include: {
                            FieldOption: {
                                orderBy: { order: 'asc' }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!updatedBlockWithRelations) {
        res.status(404).json({ error: "Le block parent n'a pas pu être retrouvé après l'ajout du champ." });
        return;
    }

    // Adapter la structure pour le client
    const adaptedBlock = adaptBlockStructure(updatedBlockWithRelations);

    res.json(adaptedBlock);

  } catch (e) {
    console.error(`[API] Erreur ajout champ section ${sectionId}:`, e);
    res.status(500).json({ error: "Erreur lors de l'ajout du champ", details: e });
  }
});

export default router;
