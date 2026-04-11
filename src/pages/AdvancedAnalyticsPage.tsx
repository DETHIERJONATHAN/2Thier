import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Tabs, Typography, Progress, Alert } from 'antd';
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, TrophyOutlined, FundOutlined, ShopOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface AnalyticsData {
  // Métriques publicités
  totalAdSpend: number;
  totalLeadsFromAds: number;
  avgCostPerLead: number;
  adROI: number;
  
  // Métriques e-commerce
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  
  // Métriques CRM
  totalLeads: number;
  convertedLeads: number;
  leadConversionRate: number;
  
  // Cross-système
  customerLifetimeValue: number;
  totalCustomers: number;
}

const AdvancedAnalyticsPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Récupérer les données depuis les différentes sources
      const [adsResponse, ecommerceResponse, crmResponse] = await Promise.allSettled([
        api.get('/integrations/advertising/roi'),
        api.get('/integrations/ecommerce'),
        api.get('/leads')
      ]);

      // Compiler les données (pour l'instant avec des données factices)
      const mockData: AnalyticsData = {
        totalAdSpend: 25000,
        totalLeadsFromAds: 450,
        avgCostPerLead: 55.56,
        adROI: 285,
        totalOrders: 125,
        totalRevenue: 125000,
        avgOrderValue: 1000,
        conversionRate: 27.8,
        totalLeads: 450,
        convertedLeads: 125,
        leadConversionRate: 27.8,
        customerLifetimeValue: 3200,
        totalCustomers: 125
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="p-6">
        <Card loading />
      </div>
    );
  }

  const adMetricsColumns = [
    {
      title: 'Plateforme',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <Space>
          {platform === 'Google Ads' && <Tag color="blue">Google</Tag>}
          {platform === 'Meta Ads' && <Tag color="purple">Meta</Tag>}
          {platform === 'LinkedIn Ads' && <Tag color="cyan">LinkedIn</Tag>}
          {platform === 'TikTok Ads' && <Tag color="magenta">TikTok</Tag>}
          {platform}
        </Space>
      ),
    },
    {
      title: 'Dépenses',
      dataIndex: 'spend',
      key: 'spend',
      render: (spend: number) => `${spend.toLocaleString()}€`,
    },
    {
      title: 'Leads',
      dataIndex: 'leads',
      key: 'leads',
    },
    {
      title: 'Coût/Lead',
      dataIndex: 'costPerLead',
      key: 'costPerLead',
      render: (cost: number) => `${cost.toFixed(2)}€`,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      render: (roi: number) => (
        <Tag color={roi > 200 ? 'green' : roi > 100 ? 'orange' : 'red'}>
          {roi}%
        </Tag>
      ),
    },
  ];

  const mockAdData = [
    {
      key: '1',
      platform: 'Google Ads',
      spend: 12000,
      leads: 220,
      costPerLead: 54.55,
      roi: 310,
    },
    {
      key: '2',
      platform: 'Meta Ads',
      spend: 8500,
      leads: 145,
      costPerLead: 58.62,
      roi: 265,
    },
    {
      key: '3',
      platform: 'LinkedIn Ads',
      spend: 3500,
      leads: 65,
      costPerLead: 53.85,
      roi: 285,
    },
    {
      key: '4',
      platform: 'TikTok Ads',
      spend: 1000,
      leads: 20,
      costPerLead: 50.00,
      roi: 180,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <BarChartOutlined className="mr-2" />
          Analytics Avancés Multi-Système
        </Title>
        <Text type="secondary">
          Analyse croisée des performances CRM, Publicités et E-commerce
        </Text>
      </div>

      {/* Métriques principales */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="ROI Total Publicités"
              value={analytics.adROI}
              suffix="%"
              valueStyle={{ color: analytics.adROI > 200 ? '#3f8600' : '#cf1322' }}
              prefix={<FundOutlined />}
            />
            <div className="mt-2">
              <Progress
                percent={Math.min(analytics.adROI, 500) / 5}
                size="small"
                strokeColor={analytics.adROI > 200 ? '#52c41a' : '#ff4d4f'}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Revenus E-commerce"
              value={analytics.totalRevenue}
              suffix="€"
              valueStyle={{ color: '#3f8600' }}
              prefix={<ShopOutlined />}
            />
            <div className="mt-2">
              <Text type="secondary">
                {analytics.totalOrders} commandes
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Taux Conversion Leads"
              value={analytics.leadConversionRate}
              suffix="%"
              valueStyle={{ color: analytics.leadConversionRate > 25 ? '#3f8600' : '#faad14' }}
              prefix={<TrophyOutlined />}
            />
            <div className="mt-2">
              <Progress
                percent={analytics.leadConversionRate}
                size="small"
                strokeColor={analytics.leadConversionRate > 25 ? '#52c41a' : '#faad14'}
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Valeur Vie Client"
              value={analytics.customerLifetimeValue}
              suffix="€"
              valueStyle={{ color: '#722ed1' }}
              prefix={<LineChartOutlined />}
            />
            <div className="mt-2">
              <Text type="secondary">
                {analytics.totalCustomers} clients
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alertes et insights */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Alert
            message="🎯 Insight Marketing"
            description={`Vos campagnes Google Ads génèrent le meilleur ROI (310%). Considérez augmenter le budget de 20% pour maximiser les conversions.`}
            type="success"
            showIcon
            className="mb-4"
          />
          
          <Alert
            message="⚡ Opportunité E-commerce"
            description={`Avec un panier moyen de ${analytics.avgOrderValue.toLocaleString()}€, une stratégie d'upselling pourrait augmenter votre CA de 15-25%.`}
            type="info"
            showIcon
          />
        </Col>
      </Row>

      {/* Analyses détaillées */}
      <Tabs defaultActiveKey="advertising">
        <TabPane tab="Publicités" key="advertising">
          <Card title="Performance par Plateforme Publicitaire">
            <Table scroll={{ x: "max-content" }}               columns={adMetricsColumns}
              dataSource={mockAdData}
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{analytics.totalAdSpend.toLocaleString()}€</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>{analytics.totalLeadsFromAds}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong>{analytics.avgCostPerLead.toFixed(2)}€</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <Tag color="green">
                      <Text strong>{analytics.adROI}%</Text>
                    </Tag>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </TabPane>
        
        <TabPane tab="E-commerce" key="ecommerce">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Métriques de Ventes">
                <Space direction="vertical" className="w-full">
                  <div className="flex justify-between">
                    <Text>Commandes Totales</Text>
                    <Text strong>{analytics.totalOrders}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text>Chiffre d'Affaires</Text>
                    <Text strong>{analytics.totalRevenue.toLocaleString()}€</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text>Panier Moyen</Text>
                    <Text strong>{analytics.avgOrderValue.toLocaleString()}€</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text>Taux de Conversion</Text>
                    <Tag color="green">{analytics.conversionRate}%</Tag>
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col xs={24} md={12}>
              <Card title="Tendances">
                <div className="text-center py-8">
                  <PieChartOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                  <div className="mt-4">
                    <Text type="secondary">
                      Graphiques détaillés disponibles avec plus de données
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="Cross-Système" key="cross">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="Analyse Cross-Système : De la Publicité à la Vente">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded">
                    <Text strong className="text-blue-600">Étape 1: Acquisition (Publicités)</Text>
                    <div className="mt-2">
                      <Text>• {analytics.totalLeadsFromAds} leads générés pour {analytics.totalAdSpend.toLocaleString()}€</Text><br/>
                      <Text>• Coût moyen par lead: {analytics.avgCostPerLead.toFixed(2)}€</Text>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded">
                    <Text strong className="text-green-600">Étape 2: Conversion (CRM)</Text>
                    <div className="mt-2">
                      <Text>• {analytics.convertedLeads} leads convertis ({analytics.leadConversionRate}%)</Text><br/>
                      <Text>• Pipeline de conversion optimisé</Text>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded">
                    <Text strong className="text-purple-600">Étape 3: Monétisation (E-commerce)</Text>
                    <div className="mt-2">
                      <Text>• {analytics.totalRevenue.toLocaleString()}€ de CA généré</Text><br/>
                      <Text>• Panier moyen: {analytics.avgOrderValue.toLocaleString()}€</Text>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded border-l-4 border-yellow-500">
                    <Text strong>💡 ROI Final:</Text>
                    <div className="mt-2">
                      <Text>
                        Pour chaque euro investi en publicité, vous générez{' '}
                        <span className="font-bold text-green-600">
                          {(analytics.totalRevenue / analytics.totalAdSpend).toFixed(2)}€
                        </span>{' '}
                        de chiffre d'affaires
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
      
      <div className="mt-6 text-center">
        <Button type="primary" size="large" onClick={loadAnalytics}>
          <BarChartOutlined />
          Actualiser les Données
        </Button>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;
