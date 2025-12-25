// 🎯 DEVIS1MINUTE - Routes Partner Portal
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { db } from '../lib/database';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = db;

// 🔒 RATE LIMITING
const partnerRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requêtes par minute
  message: { success: false, message: 'Trop de requêtes partner portal' }
});

router.use(authMiddleware);
router.use(partnerRateLimit);

// 🤝 GET /api/partner/dashboard - Dashboard partenaire
router.get('/dashboard', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    // Vérifier si l'organisation est partenaire
    const partnerOrg = await prisma.partnerOrganization.findUnique({
      where: { organizationId },
      include: {
        organization: {
          select: {
            name: true,
            credits: true
          }
        }
      }
    });

    if (!partnerOrg) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès partenaire non autorisé' 
      });
    }

    // Statistiques du mois courant
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const [
      totalLeadsGenerated,
      monthlyLeadsGenerated,
      totalRevenue,
      monthlyRevenue,
      activeCampaigns
    ] = await Promise.all([
      prisma.lead.count({
        where: { organizationId }
      }),
      prisma.lead.count({
        where: { 
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.creditTransaction.aggregate({
        where: { 
          organizationId,
          type: 'SALE'
        },
        _sum: { amount: true }
      }),
      prisma.creditTransaction.aggregate({
        where: { 
          organizationId,
          type: 'SALE',
          createdAt: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      prisma.campaign.count({
        where: { 
          organizationId,
          status: 'ACTIVE'
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        partner: partnerOrg,
        stats: {
          totalLeadsGenerated,
          monthlyLeadsGenerated,
          totalRevenue: totalRevenue._sum.amount || 0,
          monthlyRevenue: monthlyRevenue._sum.amount || 0,
          activeCampaigns,
          currentCredits: partnerOrg.organization.credits || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ [PARTNER] Erreur dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du dashboard partenaire' 
    });
  }
});

// 💰 GET /api/partner/earnings - Revenus partenaire
router.get('/earnings', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { period = '30', offset = 0, limit = 50 } = req.query;
    
    // Calcul de la période
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    const earnings = await prisma.creditTransaction.findMany({
      where: {
        organizationId,
        type: 'SALE',
        createdAt: { gte: startDate }
      },
      include: {
        relatedLead: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            marketplacePrice: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const totalEarnings = await prisma.creditTransaction.aggregate({
      where: {
        organizationId,
        type: 'SALE',
        createdAt: { gte: startDate }
      },
      _sum: { amount: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        earnings,
        summary: {
          totalAmount: totalEarnings._sum.amount || 0,
          totalTransactions: totalEarnings._count,
          period: parseInt(period as string)
        }
      }
    });

  } catch (error) {
    console.error('❌ [PARTNER] Erreur earnings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des revenus' 
    });
  }
});

// 🎯 GET /api/partner/leads - Leads générés par le partenaire
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
      status,
      marketplaceOnly = false,
      offset = 0,
      limit = 50
    } = req.query;

    const where: { [key: string]: unknown } = { organizationId };
    
    if (status) {
      where.status = status;
    }
    
    if (marketplaceOnly === 'true') {
      where.LeadMarketplace = {
        isNot: null
      };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: {
          select: {
            name: true,
            type: true
          }
        },
        LeadMarketplace: {
          select: {
            marketplacePrice: true,
            marketplaceVisible: true,
            status: true,
            soldAt: true
          }
        },
        aiRecommendations: {
          select: {
            score: true,
            recommendation: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.lead.count({ where });

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
    console.error('❌ [PARTNER] Erreur récupération leads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des leads partenaire' 
    });
  }
});

// 🏪 POST /api/partner/register - S'enregistrer comme partenaire
router.post('/register', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const {
      contactPerson,
      contactEmail,
      contactPhone,
      website,
      description,
      specialties = [],
      commissionRate = 10
    } = req.body;

    // Validation
    if (!contactPerson || !contactEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Personne de contact et email requis' 
      });
    }

    // Vérifier si déjà partenaire
    const existingPartner = await prisma.partnerOrganization.findUnique({
      where: { organizationId }
    });

    if (existingPartner) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organisation déjà enregistrée comme partenaire' 
      });
    }

    const partnerOrg = await prisma.partnerOrganization.create({
      data: {
        organizationId,
        partnerType: 'LEAD_GENERATOR',
        status: 'PENDING',
        contactPerson,
        contactEmail,
        contactPhone,
        website,
        description,
        specialties,
        commissionRate: parseFloat(commissionRate.toString())
      },
      include: {
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: partnerOrg,
      message: 'Demande de partenariat enregistrée avec succès'
    });

  } catch (error) {
    console.error('❌ [PARTNER] Erreur enregistrement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'enregistrement du partenariat' 
    });
  }
});

export default router;
