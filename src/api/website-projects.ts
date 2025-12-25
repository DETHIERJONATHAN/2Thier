/**
 * API Routes pour la gestion des projets des sites web
 * CRUD complet + réorganisation
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

/**
 * GET /api/website-projects/:websiteId
 * Liste tous les projets d'un site
 */
router.get('/website-projects/:websiteId', async (req: Request, res: Response) => {
  try {
    const { websiteId } = req.params;

    const projects = await prisma.webSiteProject.findMany({
      where: {
        websiteId: parseInt(websiteId)
      },
      orderBy: {
        displayOrder: 'asc'
      }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-projects
 * Crée un nouveau projet
 */
router.post('/website-projects', async (req: Request, res: Response) => {
  try {
    const { websiteId, title, location, details, tags, isActive, isFeatured, completedAt } = req.body;

    if (!websiteId || !title) {
      return res.status(400).json({ error: 'websiteId and title are required' });
    }

    const maxOrder = await prisma.webSiteProject.aggregate({
      where: { websiteId: parseInt(websiteId) },
      _max: { displayOrder: true }
    });

    const project = await prisma.webSiteProject.create({
      data: {
        websiteId: parseInt(websiteId),
        title,
        location: location || '',
        details: details || '',
        tags: tags || [],
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured || false,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
        completedAt: completedAt ? new Date(completedAt) : new Date()
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/website-projects/:id
 * Modifie un projet existant
 */
router.put('/website-projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, location, details, tags, isActive, isFeatured, completedAt } = req.body;

    const project = await prisma.webSiteProject.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(location !== undefined && { location }),
        ...(details !== undefined && { details }),
        ...(tags && { tags }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(completedAt && { completedAt: new Date(completedAt) })
      }
    });

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/website-projects/:id
 * Supprime un projet
 */
router.delete('/website-projects/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.webSiteProject.delete({
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/website-projects/reorder
 * Réorganise les projets (drag & drop)
 */
router.post('/website-projects/reorder', async (req: Request, res: Response) => {
  try {
    const { projects } = req.body;

    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects array is required' });
    }

    await Promise.all(
      projects.map((project: { id: number; displayOrder: number }) =>
        prisma.webSiteProject.update({
          where: { id: project.id },
          data: { displayOrder: project.displayOrder }
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
