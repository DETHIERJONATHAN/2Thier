import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { requireRole } from '../middlewares/requireRole';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

router.use(authMiddleware, impersonationMiddleware);

// Liste des dépendances d'un champ
router.get('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  try {
    const dependencies = await prisma.fieldDependency.findMany({
      where: { fieldId },
      orderBy: { order: 'asc' },
    });
    // On parse la séquence JSON pour chaque dépendance
    const processedDependencies = dependencies.map(dep => ({
      ...dep,
      sequence: dep.sequence ? JSON.parse(dep.sequence as string) : [],
    }));
    res.json(processedDependencies);
  } catch (error: any) {
    console.error(`[API] Erreur GET /api/fields/${fieldId}/dependencies:`, error);
    res.status(500).json({ error: 'Erreur lors de la récupération des dépendances', details: error.message });
  }
});

// Ajout d'une dépendance
router.post('/', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { fieldId } = req.params;
  const { name, description, sequence, order } = req.body;
  try {
    const lastDep = await prisma.fieldDependency.findFirst({
      where: { fieldId },
      orderBy: { order: 'desc' }
    });
    const newOrder = order ?? (lastDep ? (lastDep.order ?? 0) + 1 : 0);
    const dep = await prisma.fieldDependency.create({
      data: {
        id: uuidv4(),
        fieldId,
        name: name || '',
        description: description || '',
        sequence: sequence ? JSON.stringify(sequence) : '[]',
        order: newOrder,
        dependsOnId: '', // Valeur par défaut pour la migration, à adapter selon votre logique métier
        condition: '',   // Valeur par défaut pour la migration, à adapter selon votre logique métier
      }
    });
    const responseDep = {
      ...dep,
      sequence: dep.sequence ? JSON.parse(dep.sequence as string) : [],
    };
    res.json(responseDep);
  } catch (error: any) {
    console.error(`[API] Erreur POST /api/fields/${fieldId}/dependencies:`, error);
    res.status(500).json({ error: 'Erreur lors de la création de la dépendance', details: error.message });
  }
});

// Réordonner les dépendances d'un champ
router.post('/reorder', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { fieldId } = req.params;
  const { dependencies } = req.body; // Attendre un tableau de dépendances avec leur nouvel ordre

  if (!Array.isArray(dependencies)) {
    res.status(400).json({ error: "Le corps de la requête doit contenir un tableau 'dependencies'." });
    return;
  }

  try {
    await prisma.$transaction(
      dependencies.map((dep: { id: string; order: number; }) =>
        prisma.fieldDependency.update({
          where: { id: dep.id, fieldId: fieldId },
          data: { order: dep.order },
        })
      )
    );
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(`[API] Erreur POST /api/fields/${fieldId}/dependencies/reorder:`, error);
    res.status(500).json({ error: 'Erreur lors du réordonnancement', details: error.message });
  }
});

// Modifier une dépendance
router.put('/:dependencyId', requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  const { dependencyId } = req.params;
  const { name, description, sequence, order } = req.body;
  try {
    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (sequence !== undefined) dataToUpdate.sequence = JSON.stringify(sequence);
    if (order !== undefined) dataToUpdate.order = order;
    const dep = await prisma.fieldDependency.update({
      where: { id: dependencyId },
      data: dataToUpdate,
    });
    const responseDep = {
      ...dep,
      sequence: dep.sequence ? JSON.parse(dep.sequence as string) : [],
    };
    res.json(responseDep);
  } catch (error: any) {
    console.error(`[API] Erreur PUT /api/fields/${req.params.fieldId}/dependencies/${dependencyId}:`, error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la dépendance', details: error.message });
  }
});

// Correction de la signature de la route DELETE
router.delete('/:dependencyId', requireRole(['admin', 'super_admin']) as any, async (req: Request, res: Response): Promise<void> => {
  const { dependencyId } = req.params;
  try {
    await prisma.fieldDependency.delete({ where: { id: dependencyId } });
    res.status(200).json({ id: dependencyId, success: true });
  } catch (error: any) {
    console.error(`[API] Erreur DELETE /api/fields/${req.params.fieldId}/dependencies/${dependencyId}:`, error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Dépendance non trouvée.' });
    } else {
      res.status(500).json({ error: 'Erreur lors de la suppression de la dépendance', details: error.message });
    }
  }
});

export default router;
