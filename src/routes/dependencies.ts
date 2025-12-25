import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const router = Router({ mergeParams: true });

router.use(authMiddleware, impersonationMiddleware);

// Liste des dépendances d'un champ
router.get('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const fieldId = (req.params as Record<string, string | undefined>).fieldId || (req.params as Record<string, string | undefined>).id;
  if (!fieldId) {
    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
    return;
  }
  try {
    const dependencies = await prisma.fieldDependency.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' },
    });
    // On parse la séquence JSON pour chaque dépendance
    const processedDependencies = dependencies.map(dep => {
      let sequence: unknown = [];
      try {
        // Le champ Prisma est de type Json?; gérer string ou objet
        sequence = typeof dep.sequence === 'string' ? JSON.parse(dep.sequence as unknown as string) : (dep.sequence ?? []);
      } catch {
        sequence = [];
      }
      return {
        ...dep,
        sequence,
      };
    });
    res.json(processedDependencies);
  } catch (error: unknown) {
  console.error(`[API] Erreur GET /api/fields/${fieldId}/dependencies:`, error);
    res.status(500).json({ error: 'Erreur lors de la récupération des dépendances', details: (error as Error).message });
  }
});

// Lecture SÛRE (authentifié) des dépendances d'un champ, sans contrainte de rôle admin
// GET /api/fields/:id/dependencies/read
router.get('/read', async (req: Request, res: Response) => {
  const fieldId = (req.params as Record<string, string | undefined>).fieldId || (req.params as Record<string, string | undefined>).id;
  if (!fieldId) {
    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
    return;
  }
  try {
    const dependencies = await prisma.fieldDependency.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' },
    });
    const processed = dependencies.map(dep => {
      let sequence: unknown = [];
      try {
        sequence = typeof dep.sequence === 'string' ? JSON.parse(dep.sequence as unknown as string) : (dep.sequence ?? []);
      } catch {
        sequence = [];
      }
      return { ...dep, sequence };
    });
    res.json({ success: true, data: processed });
  } catch (error: unknown) {
    console.error(`[API] Erreur GET /api/fields/${fieldId}/dependencies/read:`, error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des dépendances', details: (error as Error).message });
  }
});

// Ajout d'une dépendance
router.post('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const fieldId = (req.params as Record<string, string | undefined>).fieldId || (req.params as Record<string, string | undefined>).id;
  if (!fieldId) {
    res.status(400).json({ error: "Paramètre 'fieldId' manquant dans l'URL." });
    return;
  }
  const { name, description, sequence, order, targetFieldId, operator, value, action, prefillValue } = req.body || {};
  try {
    // Récupérer la plus grande valeur d'ordre actuelle pour ce champ
    const lastDep = await prisma.fieldDependency.findFirst({
      where: { fieldId },
      orderBy: { order: 'desc' }
    });
    const newOrder = order ?? (lastDep?.order != null ? (lastDep.order + 1) : 0);

    // Déterminer dependsOnId à partir de la requête ou de la séquence
    let resolvedDependsOnId: string | undefined = targetFieldId;
    if (!resolvedDependsOnId && sequence && Array.isArray(sequence.conditions)) {
      const firstCondGroup = sequence.conditions[0];
      const firstCond = Array.isArray(firstCondGroup) ? firstCondGroup[0] : undefined;
      resolvedDependsOnId = firstCond?.targetFieldId;
    }

    if (!resolvedDependsOnId) {
      return res.status(400).json({ error: "targetFieldId requis pour créer une dépendance" });
    }

    const params: Record<string, unknown> | undefined = (action || prefillValue)
      ? { action, prefillValue }
      : undefined;

  await prisma.fieldDependency.create({
      data: {
        id: uuidv4(),
        fieldId,
        name: name || '',
        description: description || '',
        sequence: sequence ? JSON.stringify(sequence) : '[]',
        order: newOrder,
        dependsOnId: resolvedDependsOnId,
        condition: operator || '',
        value: value ?? null,
        params,
      }
    });
    // Retourner la liste complète pour correspondre au frontend (store)
    const deps = await prisma.fieldDependency.findMany({ where: { fieldId }, orderBy: { order: 'asc' } });
    const processed = deps.map(d => ({
      ...d,
      sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence as unknown as string) : (d.sequence ?? []),
    }));
    res.json(processed);
  } catch (error: unknown) {
    console.error(`[API] Erreur POST /api/fields/${fieldId}/dependencies:`, error);
    res.status(500).json({ error: 'Erreur lors de la création de la dépendance', details: (error as Error).message });
  }
});

// Réordonner les dépendances d'un champ
router.post('/reorder', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const fieldId = (req.params as Record<string, string | undefined>).fieldId || (req.params as Record<string, string | undefined>).id;
  const { dependencies } = req.body; // Attendre un tableau de dépendances avec leur nouvel ordre

  if (!Array.isArray(dependencies)) {
    res.status(400).json({ error: "Le corps de la requête doit contenir un tableau 'dependencies'." });
    return;
  }

  try {
    await prisma.$transaction(
      dependencies.map((dep: { id: string; order: number; }) =>
        prisma.fieldDependency.update({
          where: { id: dep.id },
          data: { order: dep.order },
        })
      )
    );
    res.status(200).json({ success: true });
  } catch (error: unknown) {
    console.error(`[API] Erreur POST /api/fields/${fieldId}/dependencies/reorder:`, error);
    res.status(500).json({ error: 'Erreur lors du réordonnancement', details: (error as Error).message });
  }
});

// Modifier une dépendance
router.put('/:dependencyId', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
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

    const dep = await prisma.fieldDependency.update({
      where: { id: dependencyId },
      data: dataToUpdate,
    });
    // Pour cohérence avec le store, retourner la liste complète du champ
    const deps = await prisma.fieldDependency.findMany({ where: { fieldId: dep.fieldId }, orderBy: { order: 'asc' } });
    const processed = deps.map(d => ({
      ...d,
      sequence: typeof d.sequence === 'string' ? JSON.parse(d.sequence as unknown as string) : (d.sequence ?? []),
    }));
    res.json(processed);
  } catch (error: unknown) {
    console.error(`[API] Erreur PUT /api/fields/${req.params.fieldId}/dependencies/${dependencyId}:`, error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépendance', details: (error as Error).message });
  }
});

// Correction de la signature de la route DELETE
router.delete('/:dependencyId', requireRole(['admin', 'super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { dependencyId } = req.params;
  try {
    await prisma.fieldDependency.delete({ where: { id: dependencyId } });
    res.status(200).json({ id: dependencyId, success: true });
  } catch (error: unknown) {
    console.error(`[API] Erreur DELETE /api/fields/${req.params.fieldId}/dependencies/${dependencyId}:`, error);
    const errObj = error as unknown as { code?: string };
    if (errObj.code === 'P2025') {
      res.status(404).json({ error: 'Dépendance non trouvée.' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la suppression de la dépendance', details: (error as Error).message });
    }
  }
});

export default router;
