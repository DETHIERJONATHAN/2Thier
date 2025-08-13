import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware as authenticateToken } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

// Rate limiting pour les services
const servicesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Augmenté pour les appels bulk légitimes
  message: {
    success: false,
    message: 'Trop de requêtes vers les services. Veuillez patienter.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Schémas de validation Zod
const serviceParamsSchema = z.object({
  serviceName: z.enum(['email', 'telnyx']),
  userId: z.string().uuid('ID utilisateur invalide')
});

// Middleware d'authentification
// @ts-expect-error Le middleware est compatible
router.use(authenticateToken);
router.use(servicesRateLimit);

// Fonction utilitaire pour activer/désactiver un service
const handleServiceToggle = async (res: express.Response, userId: string, serviceType: 'EMAIL' | 'TELNYX', isActive: boolean) => {
  try {
    const validatedUserId = z.string().uuid().parse(userId);
    
    await prisma.userService.upsert({
      where: {
        userId_serviceType: { userId: validatedUserId, serviceType }
      },
      update: { isActive },
      create: { userId: validatedUserId, serviceType, isActive, isConfigured: false },
    });
    
    res.json({ 
      success: true, 
      message: `Service ${serviceType} mis à jour.`,
      data: { userId: validatedUserId, serviceType, isActive }
    });
  } catch (error) {
    console.error(`[API/Services] Erreur lors de la mise à jour du service ${serviceType}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Paramètres invalides', errors: error.errors });
    }
    res.status(500).json({ success: false, message: `Impossible de mettre à jour le service ${serviceType}.`});
  }
};

// **ROUTE CORRIGÉE** : Récupérer TOUS les services pour un utilisateur (corrige le 404)
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
    const services = await prisma.userService.findMany({ where: { userId } });
    res.json({ success: true, data: services });
  } catch (error) {
    console.error(`[API/Services] Erreur GET /status/${req.params.userId}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'ID utilisateur invalide.' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// **NOUVELLE ROUTE OPTIMISÉE** : Récupérer les services pour plusieurs utilisateurs
router.post('/status/bulk', async (req, res) => {
  try {
    const { userIds } = z.object({ userIds: z.array(z.string().uuid()) }).parse(req.body);
    if (userIds.length === 0) {
      return res.json({ success: true, data: {} });
    }
    const services = await prisma.userService.findMany({
      where: { userId: { in: userIds } },
    });
    const servicesByUser = services.reduce((acc, service) => {
      if (!acc[service.userId]) acc[service.userId] = [];
      acc[service.userId].push(service);
      return acc;
    }, {} as Record<string, any[]>);
    res.json({ success: true, data: servicesByUser });
  } catch (error) {
    console.error('[API/Services] Erreur POST /status/bulk:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Données invalides.' });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Activer un service
router.post('/:serviceName/enable/:userId', async (req, res) => {
  const { serviceName, userId } = serviceParamsSchema.parse(req.params);
  await handleServiceToggle(res, userId, serviceName.toUpperCase() as 'EMAIL' | 'TELNYX', true);
});

// Désactiver un service
router.post('/:serviceName/disable/:userId', async (req, res) => {
  const { serviceName, userId } = serviceParamsSchema.parse(req.params);
  await handleServiceToggle(res, userId, serviceName.toUpperCase() as 'EMAIL' | 'TELNYX', false);
});

export default router;