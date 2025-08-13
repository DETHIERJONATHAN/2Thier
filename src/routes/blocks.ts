import { Router, Request, Response } from 'express';
import { PrismaClient, Block, Section, Field, FieldOption } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { adaptBlockStructure } from '../helpers/adaptBlockStructure';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware as any, impersonationMiddleware as any);

// GET tous les blocks d'une organisation
router.get('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user; // Récupérer l'utilisateur depuis le middleware
  
  console.log('[DEBUG] User role:', user?.role);
  console.log('[DEBUG] User:', JSON.stringify(user, null, 2));
  
  // Récupérer l'organizationId depuis différentes sources possibles
  const organizationId = req.query.organizationId as string || 
                        req.headers['x-organization-id'] as string ||
                        user?.organizationId;

  console.log(`[API] GET /api/blocks pour org: ${organizationId} par user: ${user?.id || 'undefined'}`);
  console.log(`[API] Sources org ID - query: ${req.query.organizationId}, header: ${req.headers['x-organization-id']}, user: ${user?.organizationId}`);

  let whereClause: any = {};

  // Si un organizationId est fourni, on l'utilise.
  if (organizationId) {
    whereClause.organizationId = organizationId;
    console.log(`[API] Recherche de blocs pour l'organisation: ${organizationId}`);
  } else if (user?.isSuperAdmin || user?.role === 'super_admin') {
    // Si l'utilisateur est super_admin et qu'aucun ID d'orga n'est fourni,
    // on ne met pas de filtre, ce qui retournera TOUS les blocs.
    console.log('[API] SuperAdmin a demandé tous les blocs.');
  } else {
    // Si ce n'est pas un super_admin et qu'il n'y a pas d'ID d'orga, on retourne un tableau vide.
    console.log('[API] Utilisateur non-SuperAdmin sans ID d\'orga. Retour d\'un tableau vide.');
    res.json({ success: true, data: [] });
    return;
  }

  try {
    console.log(`[API] Clause WHERE pour Prisma:`, JSON.stringify(whereClause, null, 2));
    
    const blocks = await prisma.block.findMany({
      where: whereClause,
      include: {
        Section: { // Utilise le nom de la relation défini dans le schéma Prisma
          orderBy: { order: 'asc' },
          include: {
            Field: { // Utilise le nom de la relation
              orderBy: { order: 'asc' },
              include: {
                FieldOption: { // Utilise le nom de la relation
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    console.log(`[API] Prisma a trouvé ${blocks.length} blocks bruts`);
    console.log(`[API] Blocks trouvés:`, blocks.map(b => ({ id: b.id, name: b.name, organizationId: b.organizationId })));

    // Adapter la structure pour correspondre à ce que le frontend attend
    type SectionWithFields = Section & { Field: (Field & { FieldOption: FieldOption[] })[] };
    type BlockWithSections = Block & { Section: SectionWithFields[] };

    const blocksWithAdaptedStructure = (blocks as BlockWithSections[]).map(adaptBlockStructure);

    console.log(`[API] Blocks après adaptation: ${blocksWithAdaptedStructure.length}`);
    console.log(`[API] Retour final:`, blocksWithAdaptedStructure.map(b => ({ id: b.id, name: b.name })));

    res.json({ success: true, data: blocksWithAdaptedStructure });
  } catch (error: any) {
    console.error("[API] Erreur lors de la récupération des blocks:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des formulaires" });
  }
});

// POST création d'un block
router.post('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { name, organizationId } = req.body;
  if (!name || !organizationId) {
    res.status(400).json({ success: false, message: 'Nom et organisation requis.' });
    return;
  }
  const block = await prisma.block.create({ data: { id: uuidv4(), name, organizationId, createdAt: new Date(), updatedAt: new Date() } });
  res.json({ success: true, data: block });
});

// PUT mise à jour d'un block
router.put('/:id', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name } = req.body;
  const block = await prisma.block.update({ where: { id }, data: { name, updatedAt: new Date() } });
  res.json({ success: true, data: block });
});

// DELETE suppression d'un block
router.delete('/:id', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // Suppression en cascade manuelle car Prisma ne le gère pas automatiquement pour les relations complexes
    const sections = await prisma.section.findMany({ where: { blockId: id } });
    for (const section of sections) {
      await prisma.field.deleteMany({ where: { sectionId: section.id } });
    }
    await prisma.section.deleteMany({ where: { blockId: id } });
    await prisma.block.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(`[API] Erreur lors de la suppression du block ${id}:`, error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression du block." });
  }
});

// Route pour ajouter une section à un block
router.post('/:blockId/sections', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { blockId } = req.params;
  const { name, order } = req.body;

  try {
    // On ne crée pas la section si elle n'a pas de nom
    if (!name) {
      res.status(400).json({ success: false, message: "Le nom de la section est requis." });
      return;
    }

    // On crée la section
    await prisma.section.create({
      data: {
        id: uuidv4(),
        name,
        order: order || 0,
        blockId,
        // sectionType: 'normal', // Retiré car non présent dans le schéma
      },
    });

    // On récupère le block complet mis à jour avec toutes ses sections et champs
    const updatedBlockWithRelations = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        Section: { // Utilise le nom de la relation défini dans le schéma Prisma
          orderBy: { order: 'asc' },
          include: {
            Field: { // Utilise le nom de la relation
              orderBy: { order: 'asc' },
              include: {
                FieldOption: { // Utilise le nom de la relation
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      },
    });

    if (!updatedBlockWithRelations) {
      res.status(404).json({ success: false, message: "Block non trouvé après ajout de la section." });
      return;
    }

    // On adapte la structure avant de l'envoyer
    const adaptedBlock = adaptBlockStructure(updatedBlockWithRelations);

    res.status(201).json(adaptedBlock);
  } catch (error) {
    console.error("Erreur lors de l'ajout de la section:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'ajout de la section." });
  }
});

// Route pour supprimer une section d'un block
router.delete('/:blockId/sections/:sectionId', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { blockId, sectionId } = req.params;

  try {
    // On supprime d'abord les champs associés pour éviter les erreurs de contrainte de clé étrangère
    await prisma.field.deleteMany({
      where: { sectionId },
    });

    // Ensuite, on supprime la section elle-même
    await prisma.section.delete({
      where: { id: sectionId },
    });

    // On récupère le block complet mis à jour
    const updatedBlockWithRelations = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        Section: { // Utilise le nom de la relation défini dans le schéma Prisma
          orderBy: { order: 'asc' },
          include: {
            Field: { // Utilise le nom de la relation
              orderBy: { order: 'asc' },
              include: {
                FieldOption: { // Utilise le nom de la relation
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      },
    });

    if (!updatedBlockWithRelations) {
      res.status(404).json({ success: false, message: "Block non trouvé après suppression de la section." });
      return;
    }

    // On adapte la structure avant de l'envoyer
    const adaptedBlock = adaptBlockStructure(updatedBlockWithRelations);

    res.json({ success: true, data: adaptedBlock });
  } catch (error) {
    console.error("Erreur lors de la suppression de la section:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la section." });
  }
});

// Route pour réordonner les sections d'un block
router.put('/:blockId/sections/reorder', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { blockId } = req.params;
  const { sections } = req.body as { sections: { id: string; order: number }[] };

  console.log(`[API] Réordonnancement des sections pour le block ${blockId}`, sections);

  if (!sections || !Array.isArray(sections)) {
    res.status(400).json({ success: false, message: "La liste des sections est requise." });
    return;
  }

  try {
    // Vérifier que toutes les sections appartiennent bien au blockId fourni
    const sectionIds = sections.map(s => s.id);
    const sectionsInDb = await prisma.section.findMany({
      where: {
        id: { in: sectionIds },
        blockId: blockId,
      },
    });

    if (sectionsInDb.length !== sections.length) {
      res.status(400).json({ success: false, message: "Certaines sections n'appartiennent pas au bon formulaire ou n'existent pas." });
      return;
    }

    await prisma.$transaction(
      sections.map(section =>
        prisma.section.update({
          where: {
            id: section.id,
            // On s'assure aussi que la section appartient bien au bloc pour la sécurité
            blockId: blockId,
          },
          data: { order: section.order },
        })
      )
    );

    // On récupère le block complet mis à jour
    const updatedBlockWithRelations = await prisma.block.findUnique({
      where: { id: blockId },
      include: {
        Section: { // Utilise le nom de la relation défini dans le schéma Prisma
          orderBy: { order: 'asc' },
          include: {
            Field: { // Utilise le nom de la relation
              orderBy: { order: 'asc' },
              include: {
                FieldOption: { // Utilise le nom de la relation
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      },
    });

    if (!updatedBlockWithRelations) {
      res.status(404).json({ success: false, message: "Block non trouvé après le réordonnancement des sections." });
      return;
    }

    // On adapte la structure avant de l'envoyer
    const adaptedBlock = adaptBlockStructure(updatedBlockWithRelations);

    res.json({ success: true, data: adaptedBlock });
  } catch (error) {
    console.error("Erreur lors du réordonnancement des sections:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors du réordonnancement des sections." });
  }
});

export default router;
