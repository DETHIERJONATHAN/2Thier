import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, Field } from '@prisma/client';
// import { adaptBlockStructure } from '../adapters/blockAdapter.js'; // DIAGNOSTIC: Temporairement commenté
import { authMiddleware } from '../middlewares/auth.js';
// Import du middleware d'impersonation supprimé car non utilisé pour le moment
import { requireRole } from '../middlewares/requireRole.js';
import formulasRouter from './formulas.js';
import dependenciesRouter from './dependencies.js';
import validationsRouter from './validations.js';
import { AuthenticatedRequest } from "../types/express.js";

const router = Router();
const prisma = new PrismaClient();

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware as any);

// GET /api/fields - Récupérer tous les champs pour les validateurs
// NOTE : Cette route doit être définie AVANT les routes avec des paramètres comme /:id
// CORRECTION : Ajouter une protection de rôle pour s'assurer que l'utilisateur est authentifié.
router.get("/", requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const organizationId = req.user?.organizationId;
        const userRole = req.user?.role;

        // CORRECTION : Adapter la logique pour le super_admin
        let whereClause: any = {};

        if (userRole === 'super_admin') {
            // Le super_admin peut voir les champs de toutes les organisations.
            // Nous ne filtrons pas par organizationId.
            // Si vous voulez filtrer par une organisation sélectionnée dans l'UI,
            // il faudrait la passer en query param, mais pour l'instant, on retourne tout.
        } else {
            // Pour les autres rôles (comme 'admin'), on exige une organizationId.
            if (!organizationId) {
                return res.status(403).json({ error: "ID de l'organisation manquant pour cet utilisateur." });
            }
            whereClause.organizationId = organizationId;
        }

        const fields = await prisma.field.findMany({
            where: whereClause,
            orderBy: {
                label: 'asc'
            }
        });
        res.json(fields);
    } catch (error) {
        console.error("Erreur lors de la récupération des champs:", error);
        res.status(500).json({ error: "Erreur interne du serveur" });
    }
});

// Monter les sous-routeurs en utilisant :id pour la cohérence
router.use('/:id/formulas', formulasRouter);
router.use('/:id/dependencies', dependenciesRouter);
router.use('/:id/validations', validationsRouter);

// PUT /api/fields/:id - Mise à jour d'un champ (onglet Paramètres)
router.put('/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  const { id } = req.params;
  const { label, type, required, width, advancedConfig } = req.body;
  try {
    const field = await prisma.field.update({
      where: { id },
      data: { label, type, required, width, advancedConfig }
    });
    res.json(field);
  } catch (err: any) {
    res.status(404).json({ error: "Champ non trouvé ou erreur lors de la mise à jour", details: err.message });
  }
});

// Ajouter une option à un champ
router.post('/:fieldId/options', requireRole(['admin', 'super_admin']), async (req, res) => {
  const { fieldId } = req.params;
  const { label, order, value } = req.body;
  // Vérification backend : refuser si label ou value vide
  if (!label || !value) {
    res.status(400).json({ error: "Le label et la value de l'option sont obligatoires." });
    return;
  }
  console.log('[API] [POST /fields/:fieldId/options] Reçu pour fieldId:', fieldId, 'body:', req.body);
  try {
    // Vérifier si une option avec la même valeur existe déjà pour ce champ
    const existingOption = await prisma.fieldOption.findFirst({
      where: {
        fieldId,
        value
      }
    });
    if (existingOption) {
      console.log('[API] [POST /fields/:fieldId/options] Option déjà existante, pas de création:', existingOption);
      res.json(existingOption);
      return;
    }
    const option = await prisma.fieldOption.create({
      data: {
        id: uuidv4(),
        label,
        value,
        order,
        fieldId
      }
    });
    console.log('[API] [POST /fields/:fieldId/options] Option créée en base:', option);
    res.json(option);
  } catch (err: any) {
    console.error('[API] [POST /fields/:fieldId/options] Erreur création option:', err);
    res.status(400).json({ error: "Erreur lors de la création de l'option", details: err.message });
  }
});

// Supprimer une option d'un champ
router.delete('/field-options/:optionId', requireRole(['admin', 'super_admin']), async (req, res) => {
  const { optionId } = req.params;
  try {
    await prisma.fieldOption.delete({ where: { id: optionId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: "Erreur lors de la suppression de l'option", details: err.message });
  }
});

// Récupérer un champ avec ses options
router.get('/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const field = await prisma.field.findUnique({
      where: { id },
      include: { FieldOption: true }
    });
    if (!field) {
      res.status(404).json({ error: "Champ non trouvé" });
      return;
    }
    res.json(field);
  } catch (err: any) {
    res.status(400).json({ error: "Erreur lors de la récupération du champ", details: err.message });
  }
});

// POST /api/fields/meta-counts - Récupérer les comptes de métadonnées pour plusieurs champs
router.post('/meta-counts', requireRole(['admin', 'super_admin']), async (req, res) => {
  const { fieldIds } = req.body;

  if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
    res.status(400).json({ error: "fieldIds doit être un tableau non vide." });
    return;
  }

  try {
    const counts = await Promise.all(fieldIds.map(async (fieldId: string) => {
      const formulas = await prisma.fieldFormula.count({ where: { fieldId } });
      const validations = await prisma.fieldValidation.count({ where: { fieldId } });
      const dependencies = await prisma.fieldDependency.count({ where: { fieldId } });
      return {
        fieldId,
        counts: { formulas, validations, dependencies },
      };
    }));

    const result = counts.reduce((acc, { fieldId, counts }) => {
      acc[fieldId] = counts;
      return acc;
    }, {} as Record<string, { formulas: number; validations: number; dependencies: number }>);

    res.json(result);
  } catch (err: any) {
    console.error('[API] [POST /fields/meta-counts] Erreur:', err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des métadonnées", details: err.message });
  }
});

// DELETE /api/fields/:id - Suppression d'un champ
router.delete('/:id', requireRole(['admin', 'super_admin']), async (req, res): Promise<any> => {
    const { id } = req.params;

    try {
        const field = await prisma.field.findUnique({
            where: { id },
            include: { Section: true }
        });

        if (!field || !field.Section) {
            res.status(404).json({ error: "Champ ou section parente non trouvé" });
            return;
        }

        const blockId = field.Section.blockId;

        if (!blockId) {
            res.status(404).json({ error: "Block parent non trouvé" });
            return;
        }

        await prisma.field.delete({
            where: { id },
        });

        // Mettre à jour l'ordre des champs restants dans la section
        const remainingFields = await prisma.field.findMany({
            where: { sectionId: field.sectionId },
            orderBy: { order: 'asc' },
        });

        const updatePromises = remainingFields.map((f, index) =>
            prisma.field.update({
                where: { id: f.id },
                data: { order: index },
            })
        );

        await prisma.$transaction(updatePromises);


        const updatedBlock = await prisma.block.findUnique({
            where: { id: blockId },
            include: {
                Section: {
                    include: {
                        Field: {
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!updatedBlock) {
            res.status(404).json({ error: "Le block mis à jour n'a pas pu être récupéré." });
            return;
        }

        res.status(200).json(updatedBlock);
    } catch (error) {
        console.error("Error deleting field:", error);
        res.status(500).json({ error: "An error occurred while deleting the field" });
    }
});

// PUT /api/fields/:id/move - Déplacer un champ vers une autre section
router.put('/:id/move', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const { targetSectionId, newOrder } = req.body;

    if (targetSectionId === undefined || newOrder === undefined) {
        return res.status(400).json({ error: "Les informations de section cible et d'ordre sont requises." });
    }

    try {
        const fieldToMove = await prisma.field.findUnique({
            where: { id },
            include: { Section: true },
        });

        if (!fieldToMove || !fieldToMove.Section) {
            return res.status(404).json({ error: "Champ ou section d'origine non trouvé." });
        }
        const blockId = fieldToMove.Section.blockId;
        const sourceSectionId = fieldToMove.sectionId;

        if (sourceSectionId === targetSectionId) {
            const fieldsInSection = await prisma.field.findMany({
                where: { sectionId: targetSectionId },
                orderBy: { order: 'asc' },
            });

            const fieldIndex = fieldsInSection.findIndex(f => f.id === id);
            if (fieldIndex === -1) {
                return res.status(404).json({ error: "Le champ à déplacer n'a pas été trouvé dans la section." });
            }

            // In-place array move logic
            const reorderedFields = [...fieldsInSection];
            const [movedItem] = reorderedFields.splice(fieldIndex, 1);
            reorderedFields.splice(newOrder, 0, movedItem);

            await prisma.$transaction(
                reorderedFields.map((field: Field, index: number) =>
                    prisma.field.update({ where: { id: field.id }, data: { order: index } })
                )
            );

        } else {
            await prisma.$transaction(async (tx) => {
                await tx.field.updateMany({
                    where: { sectionId: sourceSectionId, order: { gt: fieldToMove.order } },
                    data: { order: { decrement: 1 } },
                });
                await tx.field.updateMany({
                    where: { sectionId: targetSectionId, order: { gte: newOrder } },
                    data: { order: { increment: 1 } },
                });
                await tx.field.update({
                    where: { id },
                    data: { sectionId: targetSectionId, order: newOrder },
                });
            });
        }

        const updatedBlock = await prisma.block.findUnique({
            where: { id: blockId },
            include: {
                Section: { orderBy: { order: 'asc' }, include: { Field: { orderBy: { order: 'asc' }, include: { FieldOption: { orderBy: { order: 'asc' } } } } } }
            }
        });

        if (!updatedBlock) {
            return res.status(404).json({ error: "Le block mis à jour n'a pas pu être récupéré." });
        }

        // const adaptedBlock = adaptBlockStructure(updatedBlock); // DIAGNOSTIC: Temporairement commenté
        res.json(updatedBlock); // DIAGNOSTIC: Envoyer le bloc brut pour le moment

    } catch (err: any) {
        console.error("[API] [PUT /fields/:id/move] Erreur:", err);
        res.status(500).json({ error: "Erreur lors du déplacement du champ", details: err.message });
    }
});

// PUT /api/fields/:id/reorder - Réordonner un champ dans sa section
router.put('/:id/reorder', requireRole(['admin', 'super_admin']), async (req, res): Promise<any> => {
    const { newIndex } = req.body;
    const { id } = req.params;

    try {
        const fieldToMove = await prisma.field.findUnique({
            where: { id },
        });

        if (!fieldToMove) {
            res.status(404).json({ error: "Field not found" });
            return;
        }

        const allFieldsInSection = await prisma.field.findMany({
            where: { sectionId: fieldToMove.sectionId },
            orderBy: { order: 'asc' },
        });

        const oldIndex = allFieldsInSection.findIndex(f => f.id === id);

        if (oldIndex === -1) {
            res.status(404).json({ error: "Field not found in its section" });
            return;
        }

        // In-place array move logic
        const reorderedFields = [...allFieldsInSection];
        const [movedItem] = reorderedFields.splice(oldIndex, 1);
        reorderedFields.splice(newIndex, 0, movedItem);

        const updatePromises = reorderedFields.map((field: Field, index: number) =>
            prisma.field.update({
                where: { id: field.id },
                data: { order: index },
            })
        );

        await prisma.$transaction(updatePromises);

        const updatedSection = await prisma.section.findUnique({
            where: { id: fieldToMove.sectionId },
            include: {
                Field: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        res.status(200).json(updatedSection);
    } catch (error) {
        console.error("Error reordering field:", error);
        res.status(500).json({ error: "An error occurred while reordering the field" });
    }
});

export default router;
