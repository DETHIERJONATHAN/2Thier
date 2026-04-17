// 🎯 DEVIS1MINUTE - Routes Marketplace
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { prisma } from '../lib/prisma';
import rateLimit from 'express-rate-limit';
import { logger } from '../lib/logger';

const router = Router();

// 🔒 RATE LIMITING
const marketplaceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute
  message: { success: false, message: 'Trop de requêtes marketplace' }
});

router.use(authMiddleware);
router.use(marketplaceRateLimit);

// 📊 GET /api/marketplace/leads - Leads marketplace disponibles
router.get('/leads', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { 
      status = 'AVAILABLE',
      minPrice,
      maxPrice,
      targetSectors,
      targetRegions,
      limit = 50,
      offset = 0
    } = req.query;

    // Construction du filtre WHERE avec le nouveau schéma
    const where: unknown = {
      status: status as string
    };

    if (minPrice) {
      where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    }
    if (maxPrice) {
      where.price = { ...where.price, lte: parseFloat(maxPrice as string) };
    }
    if (targetSectors) {
      where.targetSectors = { hasSome: [targetSectors as string] };
    }
    if (targetRegions) {
      where.targetRegions = { hasSome: [targetRegions as string] };
    }

    const leads = await prisma.leadMarketplace.findMany({
      where,
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            aiScore: true,
            createdAt: true,
            organizationId: true
          }
        },
        purchases: {
          select: {
            price: true,
            createdAt: true,
            partnerOrganizationId: true
          }
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Total pour pagination
    const total = await prisma.leadMarketplace.count({ where });

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < total
        }
      }
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur récupération leads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des leads marketplace',
      details: error.message
    });
  }
});

// 💰 POST /api/marketplace/purchase/:leadId - Acheter un lead
router.post('/purchase/:leadId', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.userId || req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID ou User ID manquant' 
      });
    }

    // Transaction pour achat sécurisé
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vérifier que le lead est disponible
      const leadMarketplace = await tx.leadMarketplace.findUnique({
        where: { leadId },
        include: { lead: true }
      });

      if (!leadMarketplace || leadMarketplace.status !== 'AVAILABLE') {
        throw new Error('Lead non disponible');
      }

      // 2. Vérifier les crédits de l'organisation acheteuse (si le système de crédits est implémenté)
      // Stub — credits system not yet implemented

      // 3. Créer la transaction d'achat
      const purchase = await tx.leadPurchase.create({
        data: {
          marketplaceId: leadMarketplace.id,
          partnerOrganizationId: organizationId,
          price: leadMarketplace.price,
          isExclusive: false,
          status: 'purchased'
        }
      });

      // 4. Mettre à jour le compteur de partenaires
      await tx.leadMarketplace.update({
        where: { id: leadMarketplace.id },
        data: {
          currentPartners: { increment: 1 }
        }
      });

      // 5. Si le maximum de partenaires est atteint, marquer comme vendu
      if (leadMarketplace.currentPartners + 1 >= leadMarketplace.maxPartners) {
        await tx.leadMarketplace.update({
          where: { id: leadMarketplace.id },
          data: { status: 'PURCHASED' }
        });
      }

      return { leadMarketplace, purchase };
    });

    res.json({
      success: true,
      data: result.purchase,
      message: 'Lead acheté avec succès'
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur achat lead:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de l\'achat du lead',
      details: error.message
    });
  }
});

// 📊 GET /api/marketplace/stats - Statistiques marketplace
router.get('/stats', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    // Statistiques parallèles avec le nouveau schéma
    const [
      availableLeads,
      soldLeads,
      totalPurchases,
      myPublishedLeads
    ] = await Promise.all([
      prisma.leadMarketplace.count({
        where: { status: 'AVAILABLE' }
      }),
      prisma.leadMarketplace.count({
        where: { status: 'PURCHASED' }
      }),
      // Pour les achats, nous devons passer par PartnerOrganization si elle existe
      prisma.leadPurchase.count({
        where: { 
          partner: {
            organizationId: organizationId
          }
        }
      }).catch(() => 0), // En cas d'erreur (pas de PartnerOrganization), retourne 0
      prisma.leadMarketplace.count({
        where: {
          lead: {
            organizationId: organizationId
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        marketplace: {
          availableLeads,
          soldLeads
        },
        organization: {
          totalPurchases,
          myPublishedLeads,
          currentCredits: 0 // Stub — credits system not yet implemented
        }
      }
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      details: error.message
    });
  }
});

// 🎯 POST /api/marketplace/publish/:leadId - Publier un lead sur marketplace
router.post('/publish/:leadId', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = req.params;
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { 
      price,
      exclusivePrice,
      maxPartners = 3,
      targetSectors = [],
      targetRegions = [],
      expiresAt
    } = req.body;

    // Validation
    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Prix requis et positif' 
      });
    }

    // Vérifier que le lead appartient à l'organisation
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId
      }
    });

    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead non trouvé' 
      });
    }

    // Créer ou mettre à jour l'entrée marketplace
    const leadMarketplace = await prisma.leadMarketplace.upsert({
      where: { leadId },
      update: {
        price: parseFloat(price),
        exclusivePrice: exclusivePrice ? parseFloat(exclusivePrice) : null,
        maxPartners: parseInt(maxPartners),
        targetSectors,
        targetRegions,
        status: 'AVAILABLE',
        publishedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      create: {
        leadId,
        price: parseFloat(price),
        exclusivePrice: exclusivePrice ? parseFloat(exclusivePrice) : null,
        maxPartners: parseInt(maxPartners),
        targetSectors,
        targetRegions,
        status: 'AVAILABLE',
        publishedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: leadMarketplace,
      message: 'Lead publié sur marketplace avec succès'
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur publication lead:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la publication du lead',
      details: error.message
    });
  }
});

// 🔍 GET /api/marketplace/saved-searches - Recherches sauvegardées
router.get('/saved-searches', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    // Pour l'instant, retourner un tableau vide
    // Stub — saved searches not yet implemented; returns empty
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur recherches sauvegardées:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des recherches sauvegardées',
      details: error.message
    });
  }
});

// 💾 POST /api/marketplace/saved-searches - Sauvegarder une recherche
router.post('/saved-searches', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom et filtres requis' 
      });
    }

    // Stub — saved searches not yet implemented
    res.json({
      success: true,
      data: {
        id: 'temp-' + Date.now(),
        name,
        filters,
        createdAt: new Date()
      },
      message: 'Recherche sauvegardée avec succès'
    });

  } catch (error) {
    logger.error('❌ [MARKETPLACE] Erreur sauvegarde recherche:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la sauvegarde de la recherche',
      details: error.message
    });
  }
});

export default router;
