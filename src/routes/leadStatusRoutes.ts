import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// GET /api/settings/lead-statuses
router.get('/lead-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[LEAD-STATUSES] Récupération des statuts pour l\'organisation:', organizationId);
    
    const statuses = await prisma.leadStatus.findMany({
      where: {
        organizationId: organizationId
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log(`[LEAD-STATUSES] ${statuses.length} statuts trouvés`);
    res.json(statuses);
    
  } catch (error) {
    console.error('[LEAD-STATUSES] Erreur lors de la récupération des statuts:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des statuts',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/settings/lead-statuses
router.post('/lead-statuses', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    const { name, color, order, isDefault } = req.body;
    
    // Si isDefault est true, retirer le flag default des autres statuts
    if (isDefault) {
      await prisma.leadStatus.updateMany({
        where: {
          organizationId: organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }
    
    const newStatus = await prisma.leadStatus.create({
      data: {
        name,
        color,
        order: order || 0,
        isDefault: isDefault || false,
        organizationId
      }
    });
    
    console.log('[LEAD-STATUSES] Nouveau statut créé:', newStatus.name);
    res.status(201).json(newStatus);
    
  } catch (error) {
    console.error('[LEAD-STATUSES] Erreur lors de la création du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du statut',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
