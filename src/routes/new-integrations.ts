import express from 'express';
import { authenticateToken } from '../middleware/auth';
const router = express.Router();
router.use(authenticateToken);

router.get('/test', (req, res) => {
  res.json({ message: 'Integrations test route' });
});

export default router;
