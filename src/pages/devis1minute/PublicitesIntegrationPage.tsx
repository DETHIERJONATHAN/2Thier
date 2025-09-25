import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Input,
  Typography,
  Space,
  message,
  Tabs,
  Alert,
  Badge,
  Divider,
  Progress,
  Statistic
} from 'antd';
import {
  GoogleOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  TwitterOutlined,
  InstagramOutlined,
  YoutubeOutlined,
  PlusOutlined,
  SettingOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface AdPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  connected: boolean;
  apiKey?: string;
  campaigns: number;
  spend: number;
  leads: number;
  status: 'active' | 'paused' | 'disconnected';
}

interface Campaign {
  id: string;
  platform: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
  budget: number;
  spent: number;
  leads: number;
  cost_per_lead: number;
  roi: number;
  created_at: string;
}

type PlatformConfigEntry = Record<string, string | undefined>;

interface PlatformConfig {
  google_ads: PlatformConfigEntry;
  meta_ads: PlatformConfigEntry;
  linkedin_ads: PlatformConfigEntry;
  [key: string]: PlatformConfigEntry;
}

interface BackendAdMetrics {
  date?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: unknown;
  ctr?: unknown;
  cvr?: unknown;
  cpc?: unknown;
  cpl?: unknown;
  qualityScore?: unknown;
}

interface BackendAdCampaign {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  budget?: unknown;
  spent?: unknown;
  leads?: number;
  costPerLead?: unknown;
  roi?: unknown;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  AdMetrics?: BackendAdMetrics[];
}

interface BackendAdIntegration {
  id: string;
  organizationId: string;
  platform: string;
  name: string;
  status: string;
  lastSync?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  config?: Record<string, unknown> | null;
  credentials?: Record<string, unknown> | null;
  AdCampaign?: BackendAdCampaign[];
}

interface EnvValue {
  defined?: boolean;
  sanitized?: boolean;
  looksQuoted?: boolean;
  length?: number;
  fingerprint?: string | null;
}

interface EnvIdInfo {
  normalized?: string | null;
  formatted?: string | null;
}

interface EnvCheckDetails {
  google?: {
    clientId?: EnvValue;
    clientSecret?: EnvValue;
    developerToken?: EnvValue;
    managerCustomerId?: EnvIdInfo;
    loginCustomerId?: EnvIdInfo;
  };
  meta?: {
    appId?: EnvValue;
    appSecret?: EnvValue;
  };
}

interface EnvCheckResponse {
  success: boolean;
  ready: boolean;
  missing: string[];
  warnings: string[];
  details?: EnvCheckDetails;
}

const decimalToNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object') {
    const candidate = value as { toNumber?: () => number; valueOf?: () => unknown };
    if (typeof candidate.toNumber === 'function') {
      try {
        return candidate.toNumber();
      } catch {
        // ignore and fallback below
      }
    }
    if (typeof candidate.valueOf === 'function') {
      const val = candidate.valueOf();
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return Number.isNaN(parsed) ? 0 : parsed;
      }
    }
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? 0 : numeric;
};

const PublicitesIntegrationPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [platforms, setPlatforms] = useState<AdPlatform[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [config, setConfig] = useState<PlatformConfig>({
    google_ads: {},
    meta_ads: {},
    linkedin_ads: {}
  });
  const [envCheck, setEnvCheck] = useState<EnvCheckResponse | null>(null);
  const [activeTab, setActiveTab] = useState('platforms');

  // Plateformes supportées (extensible)
  const platformDefinitions = useMemo<Omit<AdPlatform, 'connected' | 'campaigns' | 'spend' | 'leads' | 'status'>[]>(() => ([
    {
      id: 'google_ads',
      name: 'Google Ads',
      icon: <GoogleOutlined />,
      color: '#4285f4'
    },
    {
      id: 'meta_ads',
      name: 'Meta Ads (Facebook/Instagram)',
      icon: <FacebookOutlined />,
      color: '#1877f2'
    },
    {
      id: 'linkedin_ads',
      name: 'LinkedIn Ads',
      icon: <LinkedinOutlined />,
      color: '#0077b5'
    },
    {
      id: 'twitter_ads',
      name: 'Twitter Ads',
      icon: <TwitterOutlined />,
      color: '#1da1f2'
    },
    {
      id: 'youtube_ads',
      name: 'YouTube Ads',
      icon: <YoutubeOutlined />,
      color: '#ff0000'
    },
    {
      id: 'instagram_ads',
      name: 'Instagram Ads',
      icon: <InstagramOutlined />,
      color: '#e4405f'
    }
  ]), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [integrationsRes, envRes] = await Promise.all([
        api.get<{ success: boolean; integrations: BackendAdIntegration[] }>('/api/integrations/advertising'),
        api.get<EnvCheckResponse>('/api/integrations/advertising/env-check').catch(() => ({ data: null }))
      ]);

      const integrations: BackendAdIntegration[] = integrationsRes?.data?.integrations ?? [];
      const envCheckPayload: EnvCheckResponse | null = envRes?.data ?? null;
      setEnvCheck(envCheckPayload);

      const integrationMap = new Map<string, BackendAdIntegration>();
      integrations.forEach((integration) => {
        integrationMap.set(integration.platform, integration);
      });

      const aggregateCampaignStats = (campaignList: BackendAdCampaign[] | undefined) => {
        if (!campaignList || campaignList.length === 0) {
          return { campaignCount: 0, totalSpend: 0, totalLeads: 0 };
        }
        return campaignList.reduce(
          (acc, campaign) => {
            const spent = decimalToNumber(campaign.spent);
            const leads = typeof campaign.leads === 'number' ? campaign.leads : 0;
            return {
              campaignCount: acc.campaignCount + 1,
              totalSpend: acc.totalSpend + spent,
              totalLeads: acc.totalLeads + leads
            };
          },
          { campaignCount: 0, totalSpend: 0, totalLeads: 0 }
        );
      };

      const platformData: AdPlatform[] = platformDefinitions.map((definition) => {
        const integration = integrationMap.get(definition.id);
        const campaignsForPlatform = integration?.AdCampaign ?? [];
        const stats = aggregateCampaignStats(campaignsForPlatform);
        const status = integration?.status || 'disconnected';
        const connected = status === 'connected';

        return {
          ...definition,
          connected,
          campaigns: stats.campaignCount,
          spend: Math.round(stats.totalSpend),
          leads: stats.totalLeads,
          status: connected ? 'active' : status === 'error' ? 'disconnected' : 'disconnected'
        };
      });

      setPlatforms(platformData);

      const derivedCampaigns: Campaign[] = integrations.flatMap((integration) => {
        const campaignsForIntegration = integration.AdCampaign ?? [];
        return campaignsForIntegration.map((campaign) => {
          const latestMetrics = campaign.AdMetrics && campaign.AdMetrics.length > 0 ? campaign.AdMetrics[0] : undefined;
          const budget = decimalToNumber(campaign.budget);
          const spent = latestMetrics ? decimalToNumber(latestMetrics.spend) : decimalToNumber(campaign.spent);
          const leads = latestMetrics ? (latestMetrics.conversions ?? 0) : (campaign.leads ?? 0);
          const costPerLead = leads > 0 ? spent / leads : decimalToNumber(campaign.costPerLead);
          const roi = decimalToNumber(campaign.roi);

          return {
            id: campaign.id,
            platform: integration.platform,
            name: campaign.name,
            status: (campaign.status?.toUpperCase?.() as Campaign['status']) || 'DRAFT',
            budget,
            spent,
            leads,
            cost_per_lead: Number.isFinite(costPerLead) ? Math.round(costPerLead * 100) / 100 : 0,
            roi: Number.isFinite(roi) ? Math.round(roi * 100) / 100 : 0,
            created_at: campaign.startDate || campaign.createdAt
          };
        });
      });

      setCampaigns(derivedCampaigns);

      if (envCheckPayload?.details) {
        const google = envCheckPayload.details.google;
        const meta = envCheckPayload.details.meta;

        setConfig({
          google_ads: {
            client_id: google?.clientId?.defined ? `Présent (${google.clientId.length ?? 0} caractères)` : 'Non configuré',
            developer_token: google?.developerToken?.fingerprint
              ? `Empreinte ${google.developerToken.fingerprint}`
              : 'Non configuré',
            manager_account_id: google?.managerCustomerId?.formatted || google?.managerCustomerId?.normalized || ''
          },
          meta_ads: {
            app_id: meta?.appId?.defined ? `Présent (${meta.appId.length ?? 0} caractères)` : 'Non configuré',
            app_secret: meta?.appSecret?.fingerprint ? `Empreinte ${meta.appSecret.fingerprint}` : 'Non configuré',
            ad_account_id: ''
          },
          linkedin_ads: {}
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des intégrations publicitaires', error);
      message.error('Erreur lors du chargement des intégrations publicitaires');
    } finally {
      setLoading(false);
    }
  }, [api, platformDefinitions]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnectPlatform = async (platformId: string) => {
    try {
      setLoading(true);
      if (!['google_ads', 'meta_ads'].includes(platformId)) {
        if (platformId === 'linkedin_ads') {
          message.info('Intégration LinkedIn Ads en cours de développement');
        } else {
          message.warning(`Intégration ${platformId} en cours de développement`);
        }
        return;
      }

      const response = await api.get<{ success: boolean; authUrl?: string }>(`/api/integrations/advertising/oauth/${platformId}/url`);
      const authUrl = response?.data?.authUrl;
      if (!authUrl) {
        message.error('URL OAuth indisponible');
        return;
      }

      const popup = window.open(authUrl, `${platformId}-oauth`, 'width=560,height=720');

      const onMessage = (ev: MessageEvent) => {
        const data = ev.data as { type?: string; platform?: string } | undefined;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'ads_oauth_done' && (!data.platform || data.platform === platformId)) {
          window.removeEventListener('message', onMessage);
          try {
            popup?.close();
          } catch {
            /* ignore */
          }
          message.success(`OAuth ${platformId} terminé`);
          fetchData();
        }
      };

      window.addEventListener('message', onMessage);

      // Fallback pour rafraîchir les données lorsque l'utilisateur revient sur la fenêtre principale
      const onFocus = () => {
        fetchData();
      };
      window.addEventListener('focus', onFocus, { once: true });
      
      // Nettoyage de sécurité
      setTimeout(() => {
        window.removeEventListener('message', onMessage);
        window.removeEventListener('focus', onFocus);
      }, 30000);

    } catch (error) {
      console.error(`Erreur lors de la connexion à la plateforme ${platformId}`, error);
      message.error('Erreur lors de la connexion à la plateforme');
    } finally {
      setLoading(false);
    }
  };

  const renderPlatformCard = (platform: AdPlatform) => (
    <Col key={platform.id} xs={24} md={12} lg={8}>
      <Card
        hoverable
        style={{ height: '100%' }}
        actions={[
          platform.connected ? (
            <Button type="link" icon={<SettingOutlined />}>
              Configurer
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => handleConnectPlatform(platform.id)}
              loading={loading}
            >
              Connecter
            </Button>
          ),
          <Button type="link" icon={<BarChartOutlined />}>
            Analytics
          </Button>
        ]}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', color: platform.color, marginBottom: '15px' }}>
            {platform.icon}
          </div>
          <Title level={4}>{platform.name}</Title>
          
          <Badge 
            status={platform.connected ? 'success' : 'default'} 
            text={platform.connected ? 'Connecté' : 'Non connecté'} 
          />
          
          {platform.connected && (
            <div style={{ marginTop: '15px' }}>
              <Row gutter={[8, 8]}>
                <Col span={8}>
                  <Statistic 
                    title="Campagnes" 
                    value={platform.campaigns} 
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Dépensé" 
                    value={platform.spend} 
                    suffix="€"
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Leads" 
                    value={platform.leads} 
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </div>
          )}
        </div>
      </Card>
    </Col>
  );

  const renderCampaignRow = (campaign: Campaign) => {
    const platformMeta = platformDefinitions.find(p => p.id === campaign.platform);

    return {
      key: campaign.id,
      platform: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {platformMeta?.icon}
          <span style={{ marginLeft: '8px' }}>
            {platformMeta?.name || campaign.platform}
          </span>
        </div>
      ),
      name: campaign.name,
      status: (
        <Badge 
          status={campaign.status === 'ACTIVE' ? 'success' : 'default'} 
          text={campaign.status} 
        />
      ),
      budget: `${campaign.budget}€`,
      spent: (
        <div>
          <Progress 
            percent={Math.round((campaign.spent / Math.max(campaign.budget, 1)) * 100)} 
            size="small" 
            style={{ marginBottom: '4px' }}
          />
          <Text>{campaign.spent}€ / {campaign.budget}€</Text>
        </div>
      ),
      leads: campaign.leads,
      cost_per_lead: `${campaign.cost_per_lead}€`,
      roi: (
        <Text style={{ color: campaign.roi > 2 ? '#52c41a' : '#fa541c' }}>
          {campaign.roi}x
        </Text>
      ),
      actions: (
        <Space>
          <Button size="small" icon={<BarChartOutlined />}>Analytics</Button>
          <Button size="small" icon={campaign.status === 'ACTIVE' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}>
            {campaign.status === 'ACTIVE' ? 'Pause' : 'Play'}
          </Button>
        </Space>
      )
    };
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Title level={2}>
          <RocketOutlined /> Intégrations Publicitaires
        </Title>
        <Paragraph>
          Connectez vos plateformes publicitaires pour créer et gérer vos campagnes directement depuis le CRM.
          Architecture extensible supportant toutes les plateformes marketing.
        </Paragraph>
      </div>

      <Alert
        message="🚀 Architecture Scalable & Modulaire"
        description="Système conçu pour s'adapter à toutes les plateformes publicitaires actuelles et futures. Ajout de nouvelles intégrations sans modification du code existant."
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Plateformes" key="platforms">
          <Row gutter={[20, 20]}>
            {platforms.map(renderPlatformCard)}
          </Row>
          
          <Divider />
          
          <Card title="Ajouter une Nouvelle Plateforme" style={{ marginTop: '20px' }}>
            <Alert
              message="Architecture Extensible"
              description="Pour ajouter une nouvelle plateforme publicitaire, contactez l'équipe technique. L'intégration sera ajoutée sans impact sur les systèmes existants."
              type="success"
              showIcon
              action={
                <Button type="primary" size="small">
                  Demander Intégration
                </Button>
              }
            />
          </Card>
        </TabPane>

        <TabPane tab="Campagnes Actives" key="campaigns">
          <div style={{ marginBottom: '20px' }}>
            <Button type="primary" icon={<PlusOutlined />} size="large">
              Nouvelle Campagne
            </Button>
          </div>

          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Plateforme</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nom</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Statut</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Budget</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Dépensé</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Leads</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Coût/Lead</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>ROI</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const row = renderCampaignRow(campaign);
                    return (
                      <tr key={row.key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>{row.platform}</td>
                        <td style={{ padding: '12px' }}>{row.name}</td>
                        <td style={{ padding: '12px' }}>{row.status}</td>
                        <td style={{ padding: '12px' }}>{row.budget}</td>
                        <td style={{ padding: '12px' }}>{row.spent}</td>
                        <td style={{ padding: '12px' }}>{row.leads}</td>
                        <td style={{ padding: '12px' }}>{row.cost_per_lead}</td>
                        <td style={{ padding: '12px' }}>{row.roi}</td>
                        <td style={{ padding: '12px' }}>{row.actions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabPane>

        <TabPane tab="Configuration" key="config">
          <Row gutter={[20, 20]}>
            <Col span={24}>
              {envCheck ? (
                <Alert
                  message={envCheck.ready ? "Configuration prête" : "Configuration à compléter"}
                  description={(
                    <Space direction="vertical" size={0}>
                      {envCheck.missing.length > 0 && (
                        <span>
                          <Text strong>Variables manquantes :</Text> {envCheck.missing.join(', ')}
                        </span>
                      )}
                      {envCheck.warnings.length > 0 && (
                        <span>
                          <Text strong>Points de vigilance :</Text> {envCheck.warnings.join(', ')}
                        </span>
                      )}
                      {envCheck.missing.length === 0 && envCheck.warnings.length === 0 && (
                        <span>Toutes les variables essentielles sont présentes.</span>
                      )}
                    </Space>
                  )}
                  type={envCheck.ready ? 'success' : 'warning'}
                  showIcon
                  style={{ marginBottom: '20px' }}
                />
              ) : (
                <Alert
                  message="Variables d'environnement requises"
                  description="Configurez les clés API dans les variables d'environnement pour activer les intégrations."
                  type="info"
                  showIcon
                  style={{ marginBottom: '20px' }}
                />
              )}
            </Col>
            
            <Col xs={24} lg={12}>
              <Card title="Google Ads Configuration">
                <Form layout="vertical">
                  <Form.Item label="Client ID">
                    <Input 
                      placeholder="REACT_APP_GOOGLE_ADS_CLIENT_ID" 
                      value={config.google_ads.client_id}
                      readOnly
                    />
                  </Form.Item>
                  <Form.Item label="Developer Token">
                    <Input 
                      placeholder="REACT_APP_GOOGLE_ADS_DEVELOPER_TOKEN" 
                      value={config.google_ads.developer_token}
                      readOnly
                    />
                  </Form.Item>
                  <Form.Item label="Manager Account ID">
                    <Input 
                      placeholder="123-456-7890" 
                      value={config.google_ads.manager_account_id}
                      readOnly
                    />
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Meta Ads Configuration">
                <Form layout="vertical">
                  <Form.Item label="App ID">
                    <Input 
                      placeholder="REACT_APP_META_APP_ID" 
                      value={config.meta_ads.app_id}
                      readOnly
                    />
                  </Form.Item>
                  <Form.Item label="App Secret">
                    <Input.Password 
                      placeholder="REACT_APP_META_APP_SECRET" 
                      value={config.meta_ads.app_secret}
                      readOnly
                    />
                  </Form.Item>
                  <Form.Item label="Ad Account ID">
                    <Input 
                      placeholder="act_1234567890" 
                      value={config.meta_ads.ad_account_id}
                      readOnly
                    />
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PublicitesIntegrationPage;
