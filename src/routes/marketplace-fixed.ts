// 🎯 DEVIS1MINUTE - Routes Marketplace (VERSION CORRIGÉE)
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

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
      offset = 0,
      availableOnly
    } = req.query;

    // Construction du filtre WHERE selon le schéma réel
    const where: Record<string, unknown> = {};

    // Filtre par statut (correspond au schéma)
    if (availableOnly === 'true' || status) {
      where.status = status as string;
    }

    // Filtres de prix
    if (minPrice) {
      where.price = { ...where.price, gte: parseFloat(minPrice as string) };
    }
    if (maxPrice) {
      where.price = { ...where.price, lte: parseFloat(maxPrice as string) };
    }

    // Filtres géographiques/secteurs (arrays dans le schéma)
    if (targetSectors) {
      where.targetSectors = { hasSome: [targetSectors as string] };
    }
    if (targetRegions) {
      where.targetRegions = { hasSome: [targetRegions as string] };
    }

    console.log('🔍 [MARKETPLACE] Requête leads avec filtres:', where);

    const leads = await prisma.leadMarketplace.findMany({
      where,
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            aiScore: true,
            createdAt: true,
            organizationId: true,
            data: true
          }
        },
        LeadPurchase: {
          select: {
            id: true,
            price: true,
            purchasedAt: true,
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

    // Transformer pour compatibilité frontend
    const transformedLeads = leads.map(marketplace => ({
      id: marketplace.id,
      leadId: marketplace.leadId,
      price: marketplace.price,
      exclusivePrice: marketplace.exclusivePrice,
      maxPartners: marketplace.maxPartners,
      currentPartners: marketplace.currentPartners,
      status: marketplace.status,
      targetSectors: marketplace.targetSectors,
      targetRegions: marketplace.targetRegions,
      minRating: marketplace.minRating,
      publishedAt: marketplace.publishedAt?.toISOString(),
      expiresAt: marketplace.expiresAt?.toISOString(),
      aiScore: marketplace.aiScore || 0,
      urgencyScore: marketplace.urgencyScore,
      qualityScore: marketplace.qualityScore,
      aiAnalysis: marketplace.aiAnalysis,
      createdAt: marketplace.createdAt.toISOString(),
      updatedAt: marketplace.updatedAt.toISOString(),
      lead: {
        id: marketplace.Lead.id,
        firstName: marketplace.Lead.firstName || '',
        lastName: marketplace.Lead.lastName || '',
        email: marketplace.Lead.email || '',
        phone: marketplace.Lead.phone || '',
        company: marketplace.Lead.company || ''
      },
      purchases: marketplace.LeadPurchase || []
    }));

    console.log(`✅ [MARKETPLACE] ${transformedLeads.length} leads trouvés`);

    res.json({
      success: true,
      data: {
        leads: transformedLeads,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + parseInt(limit as string) < total
        }
      }
    });

  } catch (error) {
    console.error('❌ [MARKETPLACE] Erreur récupération leads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des leads marketplace',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
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

    // Statistiques parallèles avec le schéma réel
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
      prisma.leadPurchase.count().catch(() => 0), // En cas d'erreur
      prisma.leadMarketplace.count({
        where: {
          Lead: {
            organizationId: organizationId
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalLeads: availableLeads + soldLeads,
        availableLeads,
        avgPrice: 0, // TODO: calculer la moyenne des prix
        newToday: 0, // TODO: compter les leads d'aujourd'hui
        marketplace: {
          availableLeads,
          soldLeads
        },
        organization: {
          totalPurchases,
          myPublishedLeads,
          currentCredits: 0 // TODO: système de crédits si nécessaire
        }
      }
    });

  } catch (error) {
    console.error('❌ [MARKETPLACE] Erreur stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
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

    // Pour l'instant, retourner un tableau vide (fonctionnalité à implémenter)
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    console.error('❌ [MARKETPLACE] Erreur recherches sauvegardées:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des recherches sauvegardées',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// 💰 POST /api/marketplace/purchase/:leadId - Acheter un lead (version simplifiée pour test)
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

    // Vérifier que le lead marketplace existe
    const leadMarketplace = await prisma.leadMarketplace.findUnique({
      where: { leadId },
      include: { Lead: true }
    });

    if (!leadMarketplace || leadMarketplace.status !== 'AVAILABLE') {
      return res.status(404).json({
        success: false,
        message: 'Lead non disponible'
      });
    }

    // Pour l'instant, on simule l'achat (à implémenter complètement plus tard)
    res.json({
      success: true,
      message: 'Fonctionnalité d\'achat en cours d\'implémentation',
      data: {
        leadId,
        price: leadMarketplace.price,
        status: 'simulation'
      }
    });

  } catch (error) {
    console.error('❌ [MARKETPLACE] Erreur achat lead:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur lors de l\'achat du lead',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
