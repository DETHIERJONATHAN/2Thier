/**
 * API Routes pour la gestion des services des sites web
 * CRUD complet + réorganisation
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

/**
 * GET /api/website-services/:websiteId
 * Liste tous les services d'un site
 */
router.get('/website-services/:websiteId', async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.params;

    const services = await prisma.webSiteService.findMany({
      where: {
        websiteId: parseInt(websiteId)
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-services
 * Crée un nouveau service
 */
router.post('/website-services', async (req: Request, res: Response) => {
  try {
    const { websiteId, key, icon, title, description, features, ctaText, ctaUrl, isActive } = req.body;

    if (!websiteId || !key || !title) {
      return res.status(400).json({ error: 'websiteId, key, and title are required' });
    }

    // Obtenir le prochain displayOrder
    const maxOrder = await prisma.webSiteService.aggregate({
      where: { websiteId: parseInt(websiteId) },
      _max: { displayOrder: true }
    });

    const service = await prisma.webSiteService.create({
      data: {
        websiteId: parseInt(websiteId),
        key,
        icon: icon || 'CheckCircleOutlined',
        title,
        description: description || '',
        features: features || [],
        ctaText: ctaText || 'En savoir plus',
        ctaUrl: ctaUrl || '',
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1
      }
    });

    res.json(service);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/website-services/:id
 * Modifie un service existant
 */
router.put('/website-services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { key, icon, title, description, features, ctaText, ctaUrl, isActive } = req.body;

    const service = await prisma.webSiteService.update({
      where: { id: parseInt(id) },
      data: {
        ...(key && { key }),
        ...(icon && { icon }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(features && { features }),
        ...(ctaText !== undefined && { ctaText }),
        ...(ctaUrl !== undefined && { ctaUrl }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/website-services/:id
 * Supprime un service
 */
router.delete('/website-services/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.webSiteService.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-services/reorder
 * Réorganise les services (drag & drop)
 */
router.post('/website-services/reorder', async (req: Request, res: Response) => {
  try {
    const { services } = req.body; // Array de { id, displayOrder }

    if (!Array.isArray(services)) {
      return res.status(400).json({ error: 'services array is required' });
    }

    // Mettre à jour l'ordre de chaque service
    await Promise.all(
      services.map((service: { id: number; displayOrder: number }) =>
        prisma.webSiteService.update({
          where: { id: service.id },
          data: { displayOrder: service.displayOrder }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
