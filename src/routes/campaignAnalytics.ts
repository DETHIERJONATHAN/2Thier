// 🎯 DEVIS1MINUTE - Routes Campaign Analytics
import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// 🔒 RATE LIMITING
const campaignAnalyticsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requêtes par minute
  message: { success: false, message: 'Trop de requêtes campaign analytics' }
});

router.use(authMiddleware);
router.use(campaignAnalyticsRateLimit);

// 📊 GET /api/campaign-analytics/dashboard - Dashboard analytics général
router.get('/dashboard', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { period = '30' } = req.query;
    
    // Calcul de la période
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    // Métriques globales en parallèle
    const [
      totalLeads,
      periodLeads,
      activeCampaigns,
      totalRevenue,
      averageAiScore,
      conversionFunnel
    ] = await Promise.all([
      // Total des leads
      prisma.lead.count({
        where: { organizationId }
      }),
      
      // Leads de la période
      prisma.lead.count({
        where: { 
          organizationId,
          createdAt: { gte: startDate }
        }
      }),
      
      // Campagnes actives
      prisma.campaign.count({
        where: { 
          organizationId,
          status: 'ACTIVE'
        }
      }),
      
      // Revenus totaux
      prisma.creditTransaction.aggregate({
        where: { 
          organizationId,
          type: 'SALE'
        },
        _sum: { amount: true }
      }),
      
      // Score IA moyen
      prisma.lead.aggregate({
        where: { 
          organizationId,
          aiScore: { not: null }
        },
        _avg: { aiScore: true }
      }),
      
      // Funnel de conversion
      prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true
      })
    ]);

    // Évolution journalière des leads sur la période
    const dailyLeads = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM "Lead" 
      WHERE organization_id = ${organizationId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top 5 des campagnes par performance
    const topCampaigns = await prisma.campaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        type: true,
        _count: {
          select: { leads: true }
        }
      },
      orderBy: {
        leads: { _count: 'desc' }
      },
      take: 5
    });

    // Répartition par source de leads
    const leadsSources = await prisma.lead.groupBy({
      by: ['source'],
      where: { 
        organizationId,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        period: parseInt(period as string),
        metrics: {
          totalLeads,
          periodLeads,
          activeCampaigns,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageAiScore: Math.round((averageAiScore._avg.aiScore || 0) * 100) / 100
        },
        conversionFunnel: conversionFunnel.map(item => ({
          status: item.status,
          count: item._count
        })),
        dailyLeads,
        topCampaigns: topCampaigns.map(campaign => ({
          ...campaign,
          leadsCount: campaign._count.leads
        })),
        leadsSources: leadsSources.map(source => ({
          source: source.source,
          count: source._count
        }))
      }
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-ANALYTICS] Erreur dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération du dashboard analytics' 
    });
  }
});

// 📈 GET /api/campaign-analytics/campaign/:id - Analytics d'une campagne spécifique
router.get('/campaign/:id', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { period = '30' } = req.query;
    
    // Calcul de la période
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    // Vérifier que la campagne appartient à l'organisation
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        _count: {
          select: {
            leads: true,
            publicForms: true,
            landingPages: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ 
        success: false, 
        message: 'Campagne non trouvée' 
      });
    }

    // Métriques de la campagne en parallèle
    const [
      periodLeads,
      leadsRevenue,
      averageAiScore,
      statusBreakdown,
      sourceBreakdown,
      regionBreakdown
    ] = await Promise.all([
      // Leads de la période
      prisma.lead.count({
        where: { 
          campaignId: id,
          createdAt: { gte: startDate }
        }
      }),
      
      // Revenus générés par les leads de cette campagne
      prisma.leadMarketplace.aggregate({
        where: { 
          campaignId: id,
          status: 'SOLD'
        },
        _sum: { marketplacePrice: true }
      }),
      
      // Score IA moyen
      prisma.lead.aggregate({
        where: { 
          campaignId: id,
          aiScore: { not: null }
        },
        _avg: { aiScore: true }
      }),
      
      // Répartition par statut
      prisma.lead.groupBy({
        by: ['status'],
        where: { campaignId: id },
        _count: true
      }),
      
      // Répartition par source
      prisma.lead.groupBy({
        by: ['source'],
        where: { campaignId: id },
        _count: true
      }),
      
      // Répartition par région
      prisma.lead.groupBy({
        by: ['region'],
        where: { 
          campaignId: id,
          region: { not: null }
        },
        _count: true
      })
    ]);

    // Évolution quotidienne des leads pour cette campagne
    const dailyLeadsEvolution = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(ai_score) as avg_score
      FROM "Lead" 
      WHERE campaign_id = ${id}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Performance des formulaires publics liés
    const formsPerformance = await prisma.publicForm.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        title: true,
        submissionsCount: true,
        isActive: true,
        _count: {
          select: { leads: true }
        }
      }
    });

    // Performance des landing pages liées
    const landingPagesPerformance = await prisma.landingPage.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        title: true,
        slug: true,
        viewsCount: true,
        clicksCount: true,
        conversionsCount: true,
        isPublished: true
      }
    });

    res.json({
      success: true,
      data: {
        campaign: {
          ...campaign,
          totalLeads: campaign._count.leads,
          totalForms: campaign._count.publicForms,
          totalLandingPages: campaign._count.landingPages
        },
        period: parseInt(period as string),
        metrics: {
          periodLeads,
          leadsRevenue: leadsRevenue._sum.marketplacePrice || 0,
          averageAiScore: Math.round((averageAiScore._avg.aiScore || 0) * 100) / 100,
          costPerLead: campaign.budget && campaign._count.leads > 0 
            ? Math.round((campaign.budget / campaign._count.leads) * 100) / 100 
            : 0
        },
        breakdowns: {
          status: statusBreakdown.map(item => ({
            status: item.status,
            count: item._count
          })),
          source: sourceBreakdown.map(item => ({
            source: item.source,
            count: item._count
          })),
          region: regionBreakdown.map(item => ({
            region: item.region,
            count: item._count
          }))
        },
        dailyEvolution: dailyLeadsEvolution,
        formsPerformance: formsPerformance.map(form => ({
          ...form,
          conversionRate: form.submissionsCount > 0 
            ? Math.round((form._count.leads / form.submissionsCount) * 100 * 100) / 100
            : 0
        })),
        landingPagesPerformance: landingPagesPerformance.map(page => ({
          ...page,
          conversionRate: page.viewsCount > 0 
            ? Math.round((page.conversionsCount / page.viewsCount) * 100 * 100) / 100
            : 0,
          clickThroughRate: page.viewsCount > 0 
            ? Math.round((page.clicksCount / page.viewsCount) * 100 * 100) / 100
            : 0
        }))
      }
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-ANALYTICS] Erreur campagne:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des analytics de campagne' 
    });
  }
});

// 🤖 GET /api/campaign-analytics/ai-insights - Insights IA
router.get('/ai-insights', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    // Récupérer les recommandations IA récentes
    const aiRecommendations = await prisma.aiRecommendation.findMany({
      where: {
        lead: {
          organizationId
        }
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            aiScore: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Distribution des scores IA
    const scoreDistribution = await prisma.$queryRaw`
      SELECT 
        CASE 
          WHEN ai_score >= 90 THEN 'Excellent (90-100)'
          WHEN ai_score >= 80 THEN 'Très bon (80-89)'
          WHEN ai_score >= 70 THEN 'Bon (70-79)'
          WHEN ai_score >= 60 THEN 'Moyen (60-69)'
          ELSE 'Faible (0-59)'
        END as score_range,
        COUNT(*) as count
      FROM "Lead" 
      WHERE organization_id = ${organizationId}
        AND ai_score IS NOT NULL
      GROUP BY score_range
      ORDER BY MIN(ai_score) DESC
    `;

    // Tendances des scores par campagne
    const campaignScores = await prisma.campaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        leads: {
          select: {
            aiScore: true
          },
          where: {
            aiScore: { not: null }
          }
        }
      }
    });

    const campaignScoresAnalysis = campaignScores.map(campaign => {
      const scores = campaign.leads.map(lead => lead.aiScore).filter(Boolean) as number[];
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        averageScore: scores.length > 0 
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
          : 0,
        leadsCount: scores.length,
        scoreRange: {
          min: Math.min(...scores),
          max: Math.max(...scores)
        }
      };
    }).filter(campaign => campaign.leadsCount > 0);

    res.json({
      success: true,
      data: {
        aiRecommendations,
        scoreDistribution,
        campaignScoresAnalysis,
        insights: [
          // Génération d'insights automatiques basés sur les données
          ...(aiRecommendations.length > 0 ? [{
            type: 'recommendation',
            title: 'Nouvelles recommandations IA',
            description: `${aiRecommendations.length} nouvelles recommandations disponibles`,
            actionable: true
          }] : []),
          
          ...(campaignScoresAnalysis.length > 0 ? [{
            type: 'performance',
            title: 'Meilleure campagne par score IA',
            description: `La campagne "${campaignScoresAnalysis.sort((a, b) => b.averageScore - a.averageScore)[0].campaignName}" a le meilleur score moyen (${campaignScoresAnalysis[0].averageScore})`,
            actionable: false
          }] : [])
        ]
      }
    });

  } catch (error) {
    console.error('❌ [CAMPAIGN-ANALYTICS] Erreur AI insights:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des insights IA' 
    });
  }
});

// 📊 GET /api/campaign-analytics/export - Export des données
router.get('/export', requireRole(['admin', 'super_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization ID manquant' 
      });
    }

    const { 
      format = 'json',
      campaignId,
      startDate,
      endDate
    } = req.query;

    // Construction du filtre WHERE
    const where: { [key: string]: unknown } = { organizationId };
    
    if (campaignId) {
      where.campaignId = campaignId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
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
            status: true
          }
        },
        aiRecommendations: {
          select: {
            score: true,
            recommendation: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (format === 'csv') {
      // TODO: Implémenter export CSV si nécessaire
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-export.csv"');
      res.send('CSV export à implémenter');
    } else {
      res.json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          filters: { campaignId, startDate, endDate },
          totalRecords: leads.length,
          leads
        }
      });
    }

  } catch (error) {
    console.error('❌ [CAMPAIGN-ANALYTICS] Erreur export:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'export des données' 
    });
  }
});

export default router;
