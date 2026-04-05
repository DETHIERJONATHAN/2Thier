import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// GET /api/notifications
router.get('/', (_req, res) => {
  // Logique de placeholder - retourner un tableau vide pour l'instant
  res.status(200).json([]);
});

// POST /api/notifications
router.post('/', (req, res) => {
  // Logique de placeholder
  res.status(201).json({ id: 1, ...req.body });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  // Logique de placeholder
  res.status(200).json({ id: req.params.id, read: true });
});

export default router;
