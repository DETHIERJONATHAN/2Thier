/**
 * API Routes pour la gestion des témoignages des sites web
 * CRUD complet + réorganisation
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/website-testimonials/:websiteId
 * Liste tous les témoignages d'un site
 */
router.get('/website-testimonials/:websiteId', async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.params;

    const testimonials = await prisma.webSiteTestimonial.findMany({
      where: {
        websiteId: parseInt(websiteId)
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-testimonials
 * Crée un nouveau témoignage
 */
router.post('/website-testimonials', async (req: Request, res: Response) => {
  try {
    const { websiteId, customerName, location, service, rating, text, isActive, isFeatured, publishedAt } = req.body;

    if (!websiteId || !customerName || !text) {
      return res.status(400).json({ error: 'websiteId, customerName, and text are required' });
    }

    const maxOrder = await prisma.webSiteTestimonial.aggregate({
      where: { websiteId: parseInt(websiteId) },
      _max: { displayOrder: true }
    });

    const testimonial = await prisma.webSiteTestimonial.create({
      data: {
        websiteId: parseInt(websiteId),
        customerName,
        location: location || '',
        service: service || '',
        rating: rating || 5,
        text,
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured || false,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date()
      }
    });

    res.json(testimonial);
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/website-testimonials/:id
 * Modifie un témoignage existant
 */
router.put('/website-testimonials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, location, service, rating, text, isActive, isFeatured, publishedAt } = req.body;

    const testimonial = await prisma.webSiteTestimonial.update({
      where: { id: parseInt(id) },
      data: {
        ...(customerName && { customerName }),
        ...(location !== undefined && { location }),
        ...(service !== undefined && { service }),
        ...(rating !== undefined && { rating }),
        ...(text !== undefined && { text }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(publishedAt && { publishedAt: new Date(publishedAt) })
      }
    });

    res.json(testimonial);
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/website-testimonials/:id
 * Supprime un témoignage
 */
router.delete('/website-testimonials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.webSiteTestimonial.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-testimonials/reorder
 * Réorganise les témoignages (drag & drop)
 */
router.post('/website-testimonials/reorder', async (req: Request, res: Response) => {
  try {
    const { testimonials } = req.body;

    if (!Array.isArray(testimonials)) {
      return res.status(400).json({ error: 'testimonials array is required' });
    }

    await Promise.all(
      testimonials.map((testimonial: { id: number; displayOrder: number }) =>
        prisma.webSiteTestimonial.update({
          where: { id: testimonial.id },
          data: { displayOrder: testimonial.displayOrder }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering testimonials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
