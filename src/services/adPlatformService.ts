// Service d'intégration publicitaire - Architecture scalable
import { prisma } from '../lib/prisma';

export interface AdPlatform {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  authUrl: string;
  scopes: string[];
  fields: AdPlatformField[];
}

export interface AdPlatformField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  required: boolean;
  options?: { value: string; label: string }[];
}

export interface AdCampaignData {
  name: string;
  budget: number;
  targetingData: Record<string, unknown>;
  creativeData: Record<string, unknown>;
  startDate?: Date;
  endDate?: Date;
}

export interface AdMetricsData {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpl: number;
  qualityScore?: number;
}

// Plateformes publicitaires supportées
export const AD_PLATFORMS: Record<string, AdPlatform> = {
  google_ads: {
    id: 'google_ads',
    name: 'google_ads',
    displayName: 'Google Ads',
    icon: 'GoogleOutlined',
    // URL de callback dynamique (évite le hardcode localhost dans le bundle)
    authUrl: ((): string => {
      const env = (globalThis as any)?.process?.env || {};
      const explicit = env.GOOGLE_ADS_REDIRECT || env.GOOGLE_REDIRECT_URI;
      if (explicit) return explicit;
      // Frontend build time variables (Vite)
      const viteEnv: any = (import.meta as any)?.env || {};
      const frontendBase = viteEnv.VITE_API_BASE_URL || viteEnv.API_URL || '';
      if (frontendBase) return `${frontendBase.replace(/\/$/, '')}/api/google-auth/callback`;
      if (typeof window !== 'undefined') return `${window.location.origin}/api/google-auth/callback`;
      return '/api/google-auth/callback';
    })(),
    scopes: [
      'https://www.googleapis.com/auth/adwords'
    ],
    fields: [
      {
        key: 'account_id',
        label: 'ID du compte Google Ads',
        type: 'text',
        required: true
      },
      {
        key: 'customer_id',
        label: 'ID client',
        type: 'text',
        required: true
      }
    ]
  },
  meta_ads: {
    id: 'meta_ads',
    name: 'meta_ads',
    displayName: 'Meta Ads (Facebook/Instagram)',
    icon: 'FacebookOutlined',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: [
      'read_insights',
      'pages_show_list',
      'instagram_basic'
    ],
    fields: [
      {
        key: 'app_id',
        label: 'App ID Facebook',
        type: 'text',
        required: true
      },
      {
        key: 'business_account_id',
        label: 'ID du compte Business Manager',
        type: 'text',
        required: true
      }
    ]
  },
  linkedin_ads: {
    id: 'linkedin_ads',
    name: 'linkedin_ads',
    displayName: 'LinkedIn Ads',
    icon: 'LinkedinOutlined',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: [
      'r_ads',
      'rw_ads',
      'r_organization_social'
    ],
    fields: [
      {
        key: 'organization_id',
        label: 'ID de l\'organisation LinkedIn',
        type: 'text',
        required: true
      }
    ]
  },
  tiktok_ads: {
    id: 'tiktok_ads',
    name: 'tiktok_ads',
    displayName: 'TikTok Ads',
    icon: 'TikTokOutlined',
    authUrl: 'https://ads.tiktok.com/marketing_api/auth',
    scopes: [
      'advertiser_read',
      'campaign_read',
      'campaign_write'
    ],
    fields: [
      {
        key: 'advertiser_id',
        label: 'ID de l\'annonceur TikTok',
        type: 'text',
        required: true
      }
    ]
  }
};

export class AdPlatformService {
  /**
   * Récupère toutes les intégrations publicitaires d'une organisation
   */
  static async getIntegrations(organizationId: string) {
    return prisma.adPlatformIntegration.findMany({
      where: {
        organizationId,
        active: true
      },
      include: {
        AdCampaign: {
          include: {
            AdMetrics: {
              orderBy: {
                date: 'desc'
              },
              take: 30 // 30 derniers jours
            }
          }
        }
      }
    });
  }

  /**
   * Crée une nouvelle intégration publicitaire
   */
  static async createIntegration(
    organizationId: string,
    platform: string,
    name: string,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ) {
    return prisma.adPlatformIntegration.create({
      data: {
        organizationId,
        platform,
        name,
        config,
        credentials,
        status: 'connected'
      }
    });
  }

  /**
   * Met à jour le statut d'une intégration
   */
  static async updateIntegrationStatus(
    integrationId: string,
    status: 'connected' | 'disconnected' | 'error'
  ) {
    return prisma.adPlatformIntegration.update({
      where: { id: integrationId },
      data: {
        status,
        lastSync: new Date()
      }
    });
  }

  /**
   * Crée une nouvelle campagne publicitaire
   */
  static async createCampaign(
    organizationId: string,
    platformIntegrationId: string,
    campaignData: AdCampaignData
  ) {
    return prisma.adCampaign.create({
      data: {
        organizationId,
        platformIntegrationId,
        ...campaignData
      }
    });
  }

  /**
   * Met à jour les métriques d'une campagne
   */
  static async updateCampaignMetrics(
    campaignId: string,
    date: Date,
    metrics: AdMetricsData
  ) {
    return prisma.adMetrics.upsert({
      where: {
        campaignId_date: {
          campaignId,
          date
        }
      },
      create: {
        campaignId,
        date,
        ...metrics
      },
      update: {
        ...metrics
      }
    });
  }

  /**
   * Récupère les métriques d'une campagne sur une période
   */
  static async getCampaignMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ) {
    return prisma.adMetrics.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  /**
   * Calcule le ROI global d'une organisation
   */
  static async calculateOrganizationROI(organizationId: string) {
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        organizationId
      },
      include: {
        AdMetrics: true
      }
    });

    let totalSpent = 0;
    let totalRevenue = 0;
    let totalLeads = 0;

    for (const campaign of campaigns) {
      for (const metric of campaign.AdMetrics) {
        totalSpent += Number(metric.spend);
        totalLeads += metric.conversions;
      }
    }

    // Estimation de la revenue basée sur les leads convertis
    // À adapter selon le modèle business de chaque organisation
    const avgLeadValue = 500; // Valeur moyenne d'un lead en euros
    totalRevenue = totalLeads * avgLeadValue;

    const roi = totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

    return {
      totalSpent,
      totalRevenue,
      totalLeads,
      roi,
      avgCostPerLead: totalLeads > 0 ? totalSpent / totalLeads : 0
    };
  }

  /**
   * Synchronise les données depuis les APIs externes
   */
  static async syncPlatformData(integrationId: string) {
    const integration = await prisma.adPlatformIntegration.findUnique({
      where: { id: integrationId },
      include: {
        AdCampaign: true
      }
    });

    if (!integration) {
      throw new Error('Intégration non trouvée');
    }

    try {
      // Synchronisation spécifique selon la plateforme
      switch (integration.platform) {
        case 'google_ads':
          await this.syncGoogleAds(integration);
          break;
        case 'meta_ads':
          await this.syncMetaAds(integration);
          break;
        case 'linkedin_ads':
          await this.syncLinkedInAds(integration);
          break;
        case 'tiktok_ads':
          await this.syncTikTokAds(integration);
          break;
      }

      // Enregistrement de l'événement analytique
      await prisma.analyticsEvent.create({
        data: {
          organizationId: integration.organizationId,
          eventType: 'platform_sync_completed',
          source: 'advertising',
          sourceId: integrationId,
          data: {
            platform: integration.platform,
            campaignCount: integration.AdCampaign.length
          }
        }
      });

      await this.updateIntegrationStatus(integrationId, 'connected');
    } catch (error) {
      await this.updateIntegrationStatus(integrationId, 'error');
      throw error;
    }
  }

  /**
   * Synchronisation Google Ads (à implémenter)
   */
  private static async syncGoogleAds(integration: { id: string; name: string; platform: string; organizationId: string }) {
    // TODO: Implémenter l'API Google Ads
    console.log('Synchronisation Google Ads pour:', integration.name);
  }

  /**
   * Synchronisation Meta Ads (à implémenter)
   */
  private static async syncMetaAds(integration: { id: string; name: string; platform: string; organizationId: string }) {
    // TODO: Implémenter l'API Facebook Marketing
    console.log('Synchronisation Meta Ads pour:', integration.name);
  }

  /**
   * Synchronisation LinkedIn Ads (à implémenter)
   */
  private static async syncLinkedInAds(integration: { id: string; name: string; platform: string; organizationId: string }) {
    // TODO: Implémenter l'API LinkedIn Marketing
    console.log('Synchronisation LinkedIn Ads pour:', integration.name);
  }

  /**
   * Synchronisation TikTok Ads (à implémenter)
   */
  private static async syncTikTokAds(integration: { id: string; name: string; platform: string; organizationId: string }) {
    // TODO: Implémenter l'API TikTok for Business
    console.log('Synchronisation TikTok Ads pour:', integration.name);
  }
}
