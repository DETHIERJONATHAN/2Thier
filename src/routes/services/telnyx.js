import { Router } from 'express';
import prisma from '../../prisma.js';

const router = Router();

// Fonction utilitaire partagée
const handleServiceToggle = async (res, userId, serviceName, isEnabled) => {
  try {
    await prisma.userService.upsert({
      where: { userId_serviceName: { userId, serviceName } },
      update: { isEnabled },
      create: { userId, serviceName, isEnabled },
    });
    res.json({ success: true, message: `Service ${serviceName} mis à jour.` });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du service ${serviceName} pour l'utilisateur ${userId}:`, error);
    res.status(500).json({ success: false, message: `Impossible de mettre à jour le service ${serviceName}.` });
  }
};

// --- Routes pour le service Telnyx ---
router.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const service = await prisma.userService.findUnique({
      where: { userId_serviceName: { userId, serviceName: 'telnyx' } },
    });
    res.json({ success: true, data: { isEnabled: service?.isEnabled ?? false } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.post('/enable/:userId', (req, res) => {
  handleServiceToggle(res, req.params.userId, 'telnyx', true);
});

router.post('/disable/:userId', (req, res) => {
  handleServiceToggle(res, req.params.userId, 'telnyx', false);
});

export default router;
