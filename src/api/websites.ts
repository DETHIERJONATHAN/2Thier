/**
 * API Routes pour la gestion des sites web
 * GET /api/websites - Liste des sites
 * GET /api/websites/:slug - Détails complets d'un site
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

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

    const websites = await db.websites.findMany({
      where: whereClause,
      include: {
        website_configs: true
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
 * GET /api/websites/id/:id
 * Récupère un site par son ID (pour l'édition dans le NoCodeBuilder)
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.get('/websites/id/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const websiteId = parseInt(id, 10);

    if (isNaN(websiteId)) {
      return res.status(400).json({ error: 'Invalid website ID' });
    }

    const website = await db.websites.findUnique({
      where: { id: websiteId },
      include: {
        website_configs: true,
        website_themes: true
      }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    res.json(website);
  } catch (error) {
    console.error('Error fetching website by ID:', error);
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
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';
    const data = req.body;

    console.log('🔍 [WEBSITES PUT] ===== DÉBUT =====');
    console.log('🔍 [WEBSITES PUT] websiteId:', websiteId);
    console.log('🔍 [WEBSITES PUT] organizationId from header:', organizationId);
    console.log('🔍 [WEBSITES PUT] isSuperAdmin:', isSuperAdmin);
    console.log('🔍 [WEBSITES PUT] All headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 [WEBSITES PUT] Body:', JSON.stringify(data, null, 2));

    if (!organizationId && !isSuperAdmin) {
      console.log('🔍 [WEBSITES PUT] ❌ Pas d\'organizationId dans les headers');
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Vérifier que le site existe et appartient à l'organisation (sauf pour Super Admin)
    const whereClause: any = { id: websiteId };
    // Super Admin peut modifier n'importe quel site, pas de filtre organizationId
    if (!isSuperAdmin) {
      whereClause.organizationId = organizationId;
    }
    
    console.log('🔍 [WEBSITES PUT] Recherche du site avec:', whereClause);
    const existingWebsite = await db.websites.findFirst({
      where: whereClause
    });

    console.log('🔍 [WEBSITES PUT] Résultat recherche:', existingWebsite ? 'TROUVÉ' : 'NON TROUVÉ');
    if (existingWebsite) {
      console.log('🔍 [WEBSITES PUT] Site trouvé:', { 
        id: existingWebsite.id, 
        organizationId: existingWebsite.organizationId,
        siteName: existingWebsite.siteName 
      });
    }

    if (!existingWebsite) {
      console.log('🔍 [WEBSITES PUT] ❌ Website not found - 404');
      return res.status(404).json({ error: 'Website not found' });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updatedAt: new Date()
    };

    // Champs de base
    if (data.siteName !== undefined) updateData.siteName = data.siteName;
    if (data.siteType !== undefined) updateData.siteType = data.siteType;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.domain !== undefined) updateData.domain = data.domain;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.maintenanceMode !== undefined) updateData.maintenanceMode = data.maintenanceMode;
    if (data.maintenanceMessage !== undefined) updateData.maintenanceMessage = data.maintenanceMessage;

    // Champs Cloud Run
    if (data.cloudRunDomain !== undefined) updateData.cloudRunDomain = data.cloudRunDomain;
    if (data.cloudRunServiceName !== undefined) updateData.cloudRunServiceName = data.cloudRunServiceName;
    if (data.cloudRunRegion !== undefined) updateData.cloudRunRegion = data.cloudRunRegion;

    console.log('📝 [WEBSITES] Données de mise à jour:', updateData);

    // Mettre à jour le site
    const updatedWebsite = await db.websites.update({
      where: { id: websiteId },
      data: updateData,
      include: {
        website_configs: true
      }
    });

    console.log('✅ [WEBSITES] Site mis à jour:', updatedWebsite.id);
    res.json(updatedWebsite);
  } catch (error) {
    console.error('Error updating website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/websites/:id
 * Supprime un site web
 * 🔒 PROTÉGÉE: Nécessite authentification
 */
router.delete('/websites/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const websiteId = parseInt(req.params.id);
    const organizationId = req.headers['x-organization-id'] as string;
    const isSuperAdmin = req.headers['x-is-super-admin'] === 'true';

    // Vérifier que le site existe et appartient à l'organisation (sauf pour Super Admin)
    const whereClause: any = { id: websiteId };
    if (!isSuperAdmin || (organizationId && organizationId !== 'all')) {
      whereClause.organizationId = organizationId;
    }
    
    const existingWebsite = await db.websites.findFirst({
      where: whereClause
    });

    if (!existingWebsite) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Supprimer le site (cascade)
    await db.websites.delete({
      where: { id: websiteId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
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

    // Créer le site
    const newWebsite = await db.websites.create({
      data: {
        organizationId,
        siteName: data.siteName,
        siteType: data.siteType || 'vitrine',
        slug: data.slug,
        domain: data.domain,
        cloudRunDomain: data.cloudRunDomain,
        cloudRunServiceName: data.cloudRunServiceName,
        cloudRunRegion: data.cloudRunRegion || 'europe-west1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        website_configs: true
      }
    });

    res.status(201).json(newWebsite);
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/websites/:idOrSlug
 * Récupère tous les détails d'un site par son ID ou son slug
 * Si c'est un nombre, on cherche par ID, sinon par slug
 */
router.get('/websites/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    // Déterminer si c'est un ID (nombre) ou un slug (string)
    const isId = /^\d+$/.test(idOrSlug);
    
    const whereClause: any = { isActive: true };
    
    if (isId) {
      whereClause.id = parseInt(idOrSlug, 10);
    } else {
      whereClause.slug = idOrSlug;
    }

    // Si pas d'organization ID dans les headers, on cherche le site publiquement
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const website = await db.websites.findFirst({
      where: whereClause,
      include: {
        website_configs: true,
        website_sections: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        website_services: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        website_projects: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        website_testimonials: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        website_blog_posts: {
          where: { isPublished: true },
          orderBy: { publishedAt: 'desc' },
          take: 10
        },
        website_media_files: {
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

    const website = await db.websites.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const services = await db.website_services.findMany({
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

    const website = await db.websites.findFirst({
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

    const projects = await db.website_projects.findMany({
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

    const website = await db.websites.findFirst({
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

    const testimonials = await db.website_testimonials.findMany({
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

    const website = await db.websites.findFirst({
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

    const blogPosts = await db.website_blog_posts.findMany({
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

    const website = await db.websites.findFirst({
      where: { slug, isActive: true },
      select: { id: true }
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const blogPost = await db.website_blog_posts.findFirst({
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

export default router;
