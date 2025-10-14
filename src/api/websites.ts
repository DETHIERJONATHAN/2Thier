/**
 * API Routes pour la gestion des sites web
 * GET /api/websites - Liste des sites
 * GET /api/websites/:slug - Détails complets d'un site
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ⚠️ IMPORTANT: Les routes GET sont publiques (affichage site vitrine)
// Les routes POST/PUT/PATCH/DELETE sont protégées par authenticateToken

/**
 * GET /api/websites
 * Liste tous les sites web d'une organisation
 * Query param: ?all=true pour voir tous les sites (Super Admin uniquement)
 * 🔒 PROTÉGÉE: Nécessite authentification (admin seulement)
 */
router.get('/websites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const showAll = req.query.all === 'true';

    if (!organizationId && !showAll) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const whereClause: any = {
      isActive: true
    };

    // Si pas de showAll, filtrer par organisation
    if (!showAll && organizationId) {
      whereClause.organizationId = organizationId;
    }

    const websites = await prisma.webSite.findMany({
      where: whereClause,
      include: {
        config: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(websites);
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug
 * Récupère tous les détails d'un site par son slug
 */
router.get('/websites/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    // Si pas d'organization ID dans les headers, on cherche le site publiquement
    const whereClause: any = { slug, isActive: true };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const website = await prisma.webSite.findFirst({
      where: whereClause,
      include: {
        config: {
          include: {
            logoFile: true,
            faviconFile: true,
            heroBackgroundFile: true,
            ogImageFile: true
          }
        },
        sections: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        services: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        projects: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        testimonials: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        blogPosts: {
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true
              }
            }
          }
        },
        mediaFiles: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Vérifier si le site est en maintenance
    if (website.maintenanceMode && !organizationId) {
      return res.status(503).json({
        error: 'Site en maintenance',
        message: website.maintenanceMessage || 'Le site est temporairement indisponible.'
      });
    }

    res.json(website);
  } catch (error) {
    console.error('Error fetching website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug/services
 * Récupère uniquement les services d'un site
 */
router.get('/websites/:slug/services', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const website = await prisma.webSite.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const services = await prisma.webSiteService.findMany({
      where: {
        websiteId: website.id,
        isActive: true
      },
      orderBy: { displayOrder: 'asc' }
    });

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug/projects
 * Récupère uniquement les projets/réalisations d'un site
 */
router.get('/websites/:slug/projects', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { featured } = req.query;

    const website = await prisma.webSite.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const whereClause: any = {
      websiteId: website.id,
      isActive: true
    };

    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const projects = await prisma.webSiteProject.findMany({
      where: whereClause,
      orderBy: { displayOrder: 'asc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug/testimonials
 * Récupère uniquement les témoignages d'un site
 */
router.get('/websites/:slug/testimonials', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { featured } = req.query;

    const website = await prisma.webSite.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const whereClause: any = {
      websiteId: website.id,
      isActive: true
    };

    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const testimonials = await prisma.webSiteTestimonial.findMany({
      where: whereClause,
      orderBy: { displayOrder: 'asc' }
    });

    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug/blog
 * Récupère les articles de blog d'un site
 */
router.get('/websites/:slug/blog', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { limit = '10', featured } = req.query;

    const website = await prisma.webSite.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const whereClause: any = {
      websiteId: website.id,
      isPublished: true
    };

    if (featured === 'true') {
      whereClause.isFeatured = true;
    }

    const blogPosts = await prisma.webSiteBlogPost.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json(blogPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:slug/blog/:postSlug
 * Récupère un article de blog spécifique
 */
router.get('/websites/:slug/blog/:postSlug', async (req: Request, res: Response) => {
  try {
    const { slug, postSlug } = req.params;

    const website = await prisma.webSite.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const blogPost = await prisma.webSiteBlogPost.findFirst({
      where: {
        websiteId: website.id,
        slug: postSlug,
        isPublished: true
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true
          }
        }
      }
    });

    if (!blogPost) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(blogPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/websites/:id
 * Met à jour un site web
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.put('/websites/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const websiteId = parseInt(req.params.id);
    const organizationId = req.headers['x-organization-id'] as string;
    const data = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Vérifier que le site appartient bien à l'organisation
    const existingWebsite = await prisma.webSite.findFirst({
      where: {
        id: websiteId,
        organizationId
      }
    });

    if (!existingWebsite) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Mettre à jour le site
    const updatedWebsite = await prisma.webSite.update({
      where: { id: websiteId },
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        description: data.description,
        language: data.language,
        timezone: data.timezone,
        isActive: data.isActive,
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage,
        analyticsCode: data.analyticsCode,
        customCss: data.customCss,
        customJs: data.customJs,
        seoMetadata: data.seoMetadata
      },
      include: {
        config: true
      }
    });

    res.json(updatedWebsite);
  } catch (error) {
    console.error('Error updating website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/websites
 * Crée un nouveau site web
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.post('/websites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const data = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    const newWebsite = await prisma.webSite.create({
      data: {
        name: data.name,
        slug: data.slug,
        domain: data.domain,
        description: data.description,
        language: data.language || 'fr',
        timezone: data.timezone || 'Europe/Brussels',
        organizationId,
        isActive: true,
        maintenanceMode: false
      },
      include: {
        config: true
      }
    });

    res.status(201).json(newWebsite);
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/websites/:id
 * Supprime un site web et toutes ses données associées (cascade)
 * Super Admin peut supprimer n'importe quel site
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.delete('/websites/:id', authenticateToken, async (req: Request, res: Response) => {
  console.log('🗑️ [WEBSITES] DELETE /websites/:id atteint!');
  console.log('🗑️ [WEBSITES] ID du site:', req.params.id);
  
  try {
    const websiteId = parseInt(req.params.id);
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    console.log('🗑️ [WEBSITES] User:', user?.email, 'isSuperAdmin:', user?.isSuperAdmin);
    console.log('🗑️ [WEBSITES] OrganizationId:', organizationId);

    if (!organizationId && !user?.isSuperAdmin) {
      console.log('❌ [WEBSITES] Organization ID requis et user n\'est pas Super Admin');
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Super Admin peut supprimer n'importe quel site
    const whereClause: any = { id: websiteId };
    
    // Si ce n'est pas un Super Admin, on vérifie l'organisation
    if (!user?.isSuperAdmin && organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Vérifier que le site existe
    const existingWebsite = await prisma.webSite.findFirst({
      where: whereClause
    });

    if (!existingWebsite) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Supprimer le site (cascade delete configuré dans Prisma supprimera automatiquement:
    // sections, services, projects, testimonials, blogPosts, mediaFiles, config)
    await prisma.webSite.delete({
      where: { id: websiteId }
    });

    console.log(`✅ Site web ${websiteId} (${existingWebsite.name}) supprimé par ${user?.email || 'unknown'}`);
    res.json({ 
      success: true, 
      message: `Site "${existingWebsite.name}" supprimé avec succès` 
    });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
