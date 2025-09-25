import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Select, 
  Typography,
  Space,
  Row,
  Col,
  Statistic,
  Button,
  DatePicker,
  Table,
  Tag,
  Progress,
  Alert,
  Tooltip,
  Divider,
  List,
  Badge,
  Empty
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  UserOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  StarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  period: string;
  leadsGenerated: number;
  leadsPublished: number;
  totalSpent: number;
  costPerLead: number;
  conversionRate: number;
  qualityScore: number;
  revenueGenerated: number;
  roi: number;
  clickThroughRate: number;
  impressions: number;
  clicks: number;
}

interface TimeSeriesData {
  date: string;
  leads: number;
  spent: number;
  conversions: number;
  revenue: number;
}

interface CategoryBreakdown {
  category: string;
  leads: number;
  spent: number;
  avgCostPerLead: number;
  conversionRate: number;
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'opportunity' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  campaignIds?: string[];
  createdAt: string;
}

interface AnalyticsData {
  overview: CampaignAnalytics;
  campaigns: CampaignAnalytics[];
  timeSeries: TimeSeriesData[];
  categoryBreakdown: CategoryBreakdown[];
  aiInsights: AIInsight[];
  benchmarks: {
    avgCostPerLead: number;
    avgConversionRate: number;
    avgQualityScore: number;
  };
}

export default function CampaignAnalyticsPage() {
  const { api } = useAuthenticatedApi();
  
  const [data, setData] = useState<AnalyticsData>({
    overview: {} as CampaignAnalytics,
    campaigns: [],
    timeSeries: [],
    categoryBreakdown: [],
    aiInsights: [],
    benchmarks: {
      avgCostPerLead: 0,
      avgConversionRate: 0,
      avgQualityScore: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs()
  ]);
  const [selectedMetric, setSelectedMetric] = useState<string>('leads');

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        campaignId: selectedCampaign,
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString()
      });

      const analyticsData = await api.get<AnalyticsData>(`/api/campaign-analytics?${params}`);
      setData(analyticsData);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [api, selectedCampaign, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        campaignId: selectedCampaign,
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        format: 'excel'
      });

      const response = await api.get(`/api/campaign-analytics/export?${params}`, {
        responseType: 'blob' as any
      });
      
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <BulbOutlined />;
      case 'warning': return <WarningOutlined />;
      case 'opportunity': return <StarOutlined />;
      case 'achievement': return <TrophyOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'recommendation': return 'blue';
      case 'warning': return 'orange';
      case 'opportunity': return 'green';
      case 'achievement': return 'gold';
      default: return 'default';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#f5222d';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#1890ff';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const chartColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

  const campaignColumns = [
    {
      title: 'Campagne',
      dataIndex: 'campaignName',
      key: 'campaignName',
      width: 200,
      render: (name: string, record: CampaignAnalytics) => (
        <div>
          <div className="font-semibold">{name}</div>
          <Text type="secondary" className="text-xs">
            Score qualité: {record.qualityScore}/100
          </Text>
        </div>
      )
    },
    {
      title: 'Leads',
      dataIndex: 'leadsGenerated',
      key: 'leadsGenerated',
      width: 80,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.leadsGenerated - b.leadsGenerated,
      render: (value: number) => (
        <Badge count={value} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Publiés',
      dataIndex: 'leadsPublished',
      key: 'leadsPublished',
      width: 80,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.leadsPublished - b.leadsPublished,
      render: (value: number) => (
        <Badge count={value} style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: 'Dépensé',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 100,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.totalSpent - b.totalSpent,
      render: (value: number) => (
        <Text strong style={{ color: '#722ed1' }}>
          {formatCurrency(value)}
        </Text>
      )
    },
    {
      title: 'CPL',
      dataIndex: 'costPerLead',
      key: 'costPerLead',
      width: 80,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.costPerLead - b.costPerLead,
      render: (value: number, record: CampaignAnalytics) => {
        const isAboveBenchmark = value > data.benchmarks.avgCostPerLead;
        return (
          <div className="text-center">
            <Text strong style={{ color: isAboveBenchmark ? '#f5222d' : '#52c41a' }}>
              {formatCurrency(value)}
            </Text>
            <div className="text-xs">
              {isAboveBenchmark ? (
                <FallOutlined style={{ color: '#f5222d' }} />
              ) : (
                <RiseOutlined style={{ color: '#52c41a' }} />
              )}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Conversion',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      width: 100,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.conversionRate - b.conversionRate,
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          status={value > data.benchmarks.avgConversionRate ? 'active' : 'exception'}
        />
      )
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 80,
      sorter: (a: CampaignAnalytics, b: CampaignAnalytics) => a.roi - b.roi,
      render: (value: number) => (
        <Tag color={value > 100 ? 'green' : value > 50 ? 'orange' : 'red'}>
          {formatPercentage(value)}
        </Tag>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-0">
              <BarChartOutlined className="mr-2" />
              Analytics des campagnes
            </Title>
            <Text type="secondary">
              Analysez les performances de vos campagnes avec l'IA
            </Text>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Exporter
            </Button>
          </Space>
        </div>

        {/* Filtres */}
        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Select
              value={selectedCampaign}
              onChange={setSelectedCampaign}
              placeholder="Sélectionner une campagne"
              style={{ width: '100%' }}
            >
              <Select.Option value="all">Toutes les campagnes</Select.Option>
              {data.campaigns.map(campaign => (
                <Select.Option key={campaign.campaignId} value={campaign.campaignId}>
                  {campaign.campaignName}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates)}
              style={{ width: '100%' }}
              presets={[
                { label: '7 derniers jours', value: [dayjs().subtract(7, 'days'), dayjs()] },
                { label: '30 derniers jours', value: [dayjs().subtract(30, 'days'), dayjs()] },
                { label: '3 derniers mois', value: [dayjs().subtract(3, 'months'), dayjs()] }
              ]}
            />
          </Col>
          <Col span={8}>
            <Select
              value={selectedMetric}
              onChange={setSelectedMetric}
              placeholder="Métrique à afficher"
              style={{ width: '100%' }}
            >
              <Select.Option value="leads">Leads générés</Select.Option>
              <Select.Option value="spent">Budget dépensé</Select.Option>
              <Select.Option value="conversions">Conversions</Select.Option>
              <Select.Option value="revenue">Revenus</Select.Option>
            </Select>
          </Col>
        </Row>
      </div>

      {/* Vue d'ensemble */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Leads générés"
              value={data.overview.leadsGenerated}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-xs">
                {data.overview.leadsPublished} publiés sur marketplace
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Budget dépensé"
              value={data.overview.totalSpent}
              precision={2}
              suffix="€"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-xs">
                CPL moyen: {formatCurrency(data.overview.costPerLead)}
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Taux de conversion"
              value={data.overview.conversionRate}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: data.overview.conversionRate > data.benchmarks.avgConversionRate ? '#52c41a' : '#f5222d' 
              }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-xs">
                Benchmark: {formatPercentage(data.benchmarks.avgConversionRate)}
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="ROI"
              value={data.overview.roi}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ 
                color: data.overview.roi > 100 ? '#52c41a' : data.overview.roi > 50 ? '#faad14' : '#f5222d' 
              }}
            />
            <div className="mt-2">
              <Text type="secondary" className="text-xs">
                Revenus: {formatCurrency(data.overview.revenueGenerated)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Graphiques */}
      <Row gutter={16} className="mb-6">
        <Col span={16}>
          <Card title={
            <Space>
              <LineChartOutlined />
              Évolution temporelle
            </Space>
          }>
            {data.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => dayjs(value).format('DD/MM')} />
                  <YAxis />
                  <RechartsTooltip
                    labelFormatter={(value) => dayjs(value).format('DD/MM/YYYY')}
                    formatter={(value: number, name: string) => {
                      const formatters = {
                        leads: (v: number) => `${v} leads`,
                        spent: (v: number) => formatCurrency(v),
                        conversions: (v: number) => `${v} conversions`,
                        revenue: (v: number) => formatCurrency(v)
                      };
                      const formatter = formatters[name as keyof typeof formatters];
                      return formatter ? formatter(value) : value;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke="#1890ff" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Aucune donnée pour la période sélectionnée" />
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Répartition par catégorie">
            {data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    dataKey="leads"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                  >
                    {data.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Aucune donnée de catégorie" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Insights IA */}
      {data.aiInsights.length > 0 && (
        <Card 
          title={
            <Space>
              <BulbOutlined />
              Insights IA & Recommandations
            </Space>
          }
          className="mb-6"
        >
          <List
            dataSource={data.aiInsights}
            renderItem={(insight) => (
              <List.Item
                actions={[
                  <Tag color={getInsightColor(insight.type)}>
                    {insight.type}
                  </Tag>,
                  <Badge 
                    color={getImpactColor(insight.impact)} 
                    text={`Impact ${insight.impact}`}
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={getInsightIcon(insight.type)}
                  title={insight.title}
                  description={
                    <div>
                      <Paragraph type="secondary" className="mb-2">
                        {insight.description}
                      </Paragraph>
                      {insight.actionable && (
                        <Tag color="blue" icon={<CheckCircleOutlined />}>
                          Action recommandée
                        </Tag>
                      )}
                      <Text type="secondary" className="text-xs ml-2">
                        {dayjs(insight.createdAt).fromNow()}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Tableau détaillé par campagne */}
      <Card title="Détail par campagne">
        <Table
          columns={campaignColumns}
          dataSource={data.campaigns}
          rowKey="campaignId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: false
          }}
          size="middle"
        />
      </Card>

      {/* Benchmarks */}
      <Row gutter={16} className="mt-6">
        <Col span={24}>
          <Alert
            message="Benchmarks du secteur"
            description={
              <Row gutter={16}>
                <Col span={8}>
                  <Text>CPL moyen: {formatCurrency(data.benchmarks.avgCostPerLead)}</Text>
                </Col>
                <Col span={8}>
                  <Text>Conversion moyenne: {formatPercentage(data.benchmarks.avgConversionRate)}</Text>
                </Col>
                <Col span={8}>
                  <Text>Score qualité moyen: {data.benchmarks.avgQualityScore}/100</Text>
                </Col>
              </Row>
            }
            type="info"
            showIcon
          />
        </Col>
      </Row>
    </div>
  );
}
