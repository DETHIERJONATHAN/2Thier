import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const prisma = db;

// Lecture des types de champs (globaux) – accessible aux utilisateurs authentifiés
router.use(authMiddleware as unknown as (req: Request, res: Response, next: () => void) => void);

// GET /api/field-types
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.fieldType.findMany({
      orderBy: { label: 'asc' },
    });
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('[API] Erreur GET /api/field-types:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des types de champs' });
  }
});

export default router;
