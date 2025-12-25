import { Router, Request, Response } from 'express';
import { Block, Section, Field, FieldOption } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { adaptBlockStructure } from '../helpers/adaptBlockStructure';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authMiddleware as unknown as (req: Request, res: Response, next: () => void) => void, impersonationMiddleware as unknown as (req: Request, res: Response, next: () => void) => void);

// Petit helper de résilience: ajoute la colonne sectionType si absente
async function ensureSectionTypeColumnExists() {
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "sectionType" TEXT NOT NULL DEFAULT \'normal\''
    );
  } catch (e) {
    // silencieux, on laissera l'erreur initiale si autre problème
    console.warn('[API] ensureSectionTypeColumnExists (blocks.ts) - avertissement:', e);
  }
}

// GET tous les blocks d'une organisation
router.get('/', 
  // Middleware anti-cache pour forcer le rechargement
  (req, res, next) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': false,
      'Last-Modified': false
    });
    
    // Désactiver aussi les headers de cache de la requête
    if (req.headers['if-none-match']) delete req.headers['if-none-match'];
    if (req.headers['if-modified-since']) delete req.headers['if-modified-since'];
    
    next();
  },
  requireRole(['admin', 'super_admin']), 
  async (req: Request, res: Response): Promise<void> => {
  const user = (req as Request & { user?: { id?: string; organizationId?: string; role?: string; isSuperAdmin?: boolean } }).user;
  
  // Récupérer l'organizationId depuis différentes sources possibles
  const organizationId = req.query.organizationId as string || 
                        req.headers['x-organization-id'] as string ||
                        user?.organizationId;

  const whereClause: Record<string, unknown> = {};

  // Si un organizationId est fourni, on l'utilise.
  if (organizationId) {
    whereClause.organizationId = organizationId;
  } else if (user?.isSuperAdmin || user?.role === 'super_admin') {
    // Si l'utilisateur est super_admin et qu'aucun ID d'orga n'est fourni,
    // on ne met pas de filtre, ce qui retournera TOUS les blocs.
  } else {
    // Si ce n'est pas un super_admin et qu'il n'y a pas d'ID d'orga, on retourne un tableau vide.
    res.json({ success: true, data: [] });
    return;
  }

  try {
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

    // Adapter la structure pour correspondre à ce que le frontend attend
    type SectionWithFields = Section & { Field: (Field & { FieldOption: FieldOption[] })[] };
    type BlockWithSections = Block & { Section: SectionWithFields[] };

    const blocksWithAdaptedStructure = (blocks as BlockWithSections[]).map(adaptBlockStructure);

    // Désactiver le cache pour s'assurer que les données fraîches sont retournées
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ success: true, data: blocksWithAdaptedStructure });
  } catch (error: unknown) {
    console.error("[API] Erreur lors de la récupération des blocks:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des formulaires" });
  }
});

// GET /api/blocks/read - Lecture SÛRE pour utilisateurs authentifiés (même organisation)
// Retourne les formulaires (blocks) de l'organisation de l'utilisateur sans exiger le rôle admin
router.get('/read', async (req: Request, res: Response): Promise<void> => {
  try {
  const user = (req as Request & { user?: { organizationId?: string } }).user;
    const organizationId = (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || user?.organizationId;

    if (!organizationId) {
      res.json({ success: true, data: [] });
      return;
    }

    const blocks = await prisma.block.findMany({
      where: { organizationId },
      include: {
        Section: {
          orderBy: { order: 'asc' },
          include: {
            Field: {
              orderBy: { order: 'asc' },
              include: { FieldOption: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    type SectionWithFields = Section & { Field: (Field & { FieldOption: FieldOption[] })[] };
    type BlockWithSections = Block & { Section: SectionWithFields[] };
    const adapted = (blocks as BlockWithSections[]).map(adaptBlockStructure);
    res.json({ success: true, data: adapted });
  } catch (error) {
    console.error('[API] Erreur GET /api/blocks/read:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des formulaires (lecture)' });
  }
});

// GET /api/blocks/:id/read - Lecture SÛRE d'un formulaire spécifique si appartient à l'organisation
router.get('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
  const user = (req as Request & { user?: { organizationId?: string } }).user;
    const organizationId = (req.query.organizationId as string) || (req.headers['x-organization-id'] as string) || user?.organizationId;

    if (!organizationId) {
      res.status(404).json({ success: false, message: 'Formulaire non trouvé' });
      return;
    }

    const block = await prisma.block.findFirst({
      where: { id, organizationId },
      include: {
        Section: {
          orderBy: { order: 'asc' },
          include: {
            Field: {
              orderBy: { order: 'asc' },
              include: { FieldOption: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!block) {
      res.status(404).json({ success: false, message: 'Formulaire non trouvé' });
      return;
    }

  const adapted = adaptBlockStructure(block as unknown as (Block & { Section: (Section & { Field: (Field & { FieldOption: FieldOption[] })[] })[] }));
    res.json({ success: true, data: adapted });
  } catch (error) {
    console.error('[API] Erreur GET /api/blocks/:id/read:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération du formulaire' });
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
router.post('/:blockId/sections', requireRole(['admin', 'super_admin']) as unknown as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
  const { blockId } = req.params;
  const { name, order, type } = req.body;

  try {
    // On ne crée pas la section si elle n'a pas de nom
    if (!name) {
      res.status(400).json({ success: false, message: "Le nom de la section est requis." });
      return;
    }

    // Si un type est fourni, s'assurer que la colonne existe
    if (typeof type !== 'undefined') {
      await ensureSectionTypeColumnExists();
    }

    // Créer la section avec une gestion robuste des écarts de schéma/client Prisma
    try {
      await prisma.section.create({
        data: {
          id: uuidv4(),
          name,
          order: order || 0,
          blockId,
          sectionType: type || 'normal',
        },
      });
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message || '');
      if (
        msg.includes('sectionType') &&
        (msg.includes('does not exist') || msg.includes("doesn't exist") || msg.includes('column') || msg.includes('relation'))
      ) {
        // Colonne manquante -> on la crée puis on retente
        await ensureSectionTypeColumnExists();
        await prisma.section.create({
          data: {
            id: uuidv4(),
            name,
            order: order || 0,
            blockId,
            sectionType: type || 'normal',
          },
        });
      } else if (msg.includes('Unknown arg') && msg.includes('sectionType')) {
        // Client Prisma pas régénéré: créer sans sectionType puis mettre à jour via SQL brut sécurisé
        const created = await prisma.section.create({
          data: {
            id: uuidv4(),
            name,
            order: order || 0,
            blockId,
          },
        });
        if (typeof type !== 'undefined') {
          await ensureSectionTypeColumnExists();
          await prisma.$executeRaw`UPDATE "Section" SET "sectionType" = ${type || 'normal'} WHERE id = ${created.id}`;
        }
      } else {
        throw err;
      }
    }

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
router.delete('/:blockId/sections/:sectionId', requireRole(['admin', 'super_admin']) as unknown as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
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

  res.json(adaptedBlock);
  } catch (error) {
    console.error("Erreur lors de la suppression de la section:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la suppression de la section." });
  }
});

// Route pour réordonner les sections d'un block
router.put('/:blockId/sections/reorder', requireRole(['admin', 'super_admin']) as unknown as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
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

  res.json(adaptedBlock);
  } catch (error) {
    console.error("Erreur lors du réordonnancement des sections:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors du réordonnancement des sections." });
  }
});

export default router;
