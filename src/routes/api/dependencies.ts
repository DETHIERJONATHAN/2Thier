import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

// PUT /api/dependencies/:dependencyId - Mettre à jour une dépendance et retourner la liste du champ
router.put('/:dependencyId', async (req: Request, res: Response) => {
  const { dependencyId } = req.params;
  const { name, description, sequence, order, targetFieldId, operator, value, action, prefillValue } = req.body || {};
  try {
    const existing = await prisma.fieldDependency.findUnique({ where: { id: dependencyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Dépendance non trouvée' });
    }

    const dataToUpdate: Record<string, unknown> = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (sequence !== undefined) dataToUpdate.sequence = JSON.stringify(sequence);
    if (order !== undefined) dataToUpdate.order = order;
    if (targetFieldId !== undefined) dataToUpdate.dependsOnId = targetFieldId;
    if (operator !== undefined) dataToUpdate.condition = operator;
    if (value !== undefined) dataToUpdate.value = value;
    if (action !== undefined || prefillValue !== undefined) dataToUpdate.params = { action, prefillValue };

    await prisma.fieldDependency.update({ where: { id: dependencyId }, data: dataToUpdate });

    const deps = await prisma.fieldDependency.findMany({
      where: { fieldId: existing.fieldId },
      orderBy: { order: 'asc' },
    });
    const processed = deps.map(d => ({
      ...d,
      sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence as unknown as string) : (d.sequence ?? []),
    }));
    return res.json(processed);
  } catch (error: unknown) {
    console.error(`[API] Erreur PUT /api/dependencies/${dependencyId}:`, error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépendance', details: (error as Error).message });
  }
});

// DELETE /api/dependencies/:dependencyId - Supprimer une dépendance et retourner la liste du champ
router.delete('/:dependencyId', async (req: Request, res: Response) => {
  const { dependencyId } = req.params;
  try {
    const existing = await prisma.fieldDependency.findUnique({ where: { id: dependencyId } });
    if (!existing) {
      return res.status(404).json({ error: 'Dépendance non trouvée' });
    }
    const fieldId = existing.fieldId;

    await prisma.fieldDependency.delete({ where: { id: dependencyId } });

    const deps = await prisma.fieldDependency.findMany({ where: { fieldId }, orderBy: { order: 'asc' } });
    const processed = deps.map(d => ({
      ...d,
      sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence as unknown as string) : (d.sequence ?? []),
    }));
    return res.status(200).json(processed);
  } catch (error: unknown) {
    console.error(`[API] Erreur DELETE /api/dependencies/${req.params.dependencyId}:`, error);
    const errObj = error as { code?: string };
    if (errObj?.code === 'P2025') {
      return res.status(404).json({ error: 'Dépendance non trouvée' });
    }
    return res.status(500).json({ error: 'Erreur lors de la suppression de la dépendance', details: (error as Error).message });
  }
});

export default router;
