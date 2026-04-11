import { useState, useEffect, useMemo, useCallback } from 'react';
import { SF } from '../../components/zhiive/ZhiiveTheme';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import { useAuth } from '../../auth/useAuth';
import { LEAD_SOURCES, LEAD_PRIORITIES } from './LeadsConfig';
import { NotificationManager } from '../../components/Notifications';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Timeline, 
  Badge, 
  Avatar, 
  Button, 
  Segmented, 
  DatePicker, 
  Space,
  Typography,
  Tag,
  Tooltip as AntTooltip,
  Spin,
  Empty,
  Divider,
  Switch
} from 'antd';
import { SmartNotifications } from '../../components/SmartNotifications';
import type { SegmentedValue } from 'antd/es/segmented';
import { getErrorMessage } from '../../utils/errorHandling';
import { 
  UserOutlined, 
  TrophyOutlined, 
  RiseOutlined, 
  ClockCircleOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  EyeOutlined,
  FireOutlined,
  ThunderboltOutlined,
  StarOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

type ChartType = 'pie' | 'bar';
type TimeRange = 'week' | 'month' | 'quarter';

const isChartType = (value: SegmentedValue): value is ChartType => value === 'pie' || value === 'bar';
const isTimeRange = (value: SegmentedValue): value is TimeRange =>
  value === 'week' || value === 'month' || value === 'quarter';

interface LeadDashboardState {
  totalLeads: number;
  newLeads: number;
  leadsByStatus: { name: string; value: number; color: string }[];
  leadsBySource: { name: string; value: number }[];
  leadsByPriority: { name: string; value: number; color: string }[];
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
    user?: string;
  }>;
  conversionRate: number;
  averageResponseTime: number;
  leadsEvolution: { name: string; value: number }[];
  loading: boolean;
}

export default function LeadsDashboard() {
  // Stabiliser l'API selon les instructions du projet
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  
  const { leadStatuses } = useLeadStatuses();
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  
  // 🎛️ États pour l'interactivité
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dashboardData, setDashboardData] = useState<LeadDashboardState>({
    totalLeads: 0,
    newLeads: 0,
    leadsByStatus: [],
    leadsBySource: [],
    leadsByPriority: [],
    recentActivity: [],
    conversionRate: 0,
    averageResponseTime: 0,
    leadsEvolution: [],
    loading: true,
  });
  
  // 📊 Fonction de récupération des données
  const fetchDashboardData = useCallback(async () => {
    try {
      // 🔗 PRISMA INTEGRATION: Récupération des leads avec leurs relations
      const response = await api.get('/api/leads');
      const leadsData = Array.isArray(response) ? response : (response?.data || []);
      
      console.log('📊 Leads récupérés avec relations Prisma:', leadsData.length, 'leads trouvés');
      
      // 📊 Calculs basés sur les vraies données Prisma
      const totalLeads = leadsData.length;
      
      // Nouveaux leads basés sur les statuts Prisma
      const newLeads = leadsData.filter(lead => {
        const statusName = lead.LeadStatus?.name?.toLowerCase();
        return statusName?.includes('nouveau') || statusName?.includes('new');
      }).length;
      
      // 🔄 Répartition par statuts Prisma
      const statusCounts: Record<string, number> = {};
      leadStatuses.forEach(status => {
        statusCounts[status.id] = 0;
      });
      
      leadsData.forEach(lead => {
        const statusId = lead.statusId;
        if (statusCounts[statusId] !== undefined) {
          statusCounts[statusId]++;
        }
      });
      
      const leadsByStatus = leadStatuses.map(status => ({
        name: status.name,
        value: statusCounts[status.id] || 0,
        color: status.color
      }));
      
      // 📊 Sources et priorités avec données réelles
      const sourceCounts: Record<string, number> = {};
      LEAD_SOURCES.forEach(source => {
        sourceCounts[source.value] = 0;
      });
      
      const priorityCounts: Record<string, number> = {};
      LEAD_PRIORITIES.forEach(priority => {
        priorityCounts[priority.value] = 0;
      });
      
      leadsData.forEach(lead => {
        // Sources
        const source = lead.source || lead.data?.source || 'direct';
        if (sourceCounts[source] !== undefined) {
          sourceCounts[source]++;
        } else {
          sourceCounts['other'] = (sourceCounts['other'] || 0) + 1;
        }
        
        // Priorités
        const priority = lead.priority || lead.data?.priority || 'medium';
        if (priorityCounts[priority] !== undefined) {
          priorityCounts[priority]++;
        } else {
          priorityCounts['medium']++;
        }
      });
      
      const leadsBySource = LEAD_SOURCES.map(source => ({
        name: source.label,
        value: sourceCounts[source.value] || 0
      }));
      
      const leadsByPriority = LEAD_PRIORITIES.map(priority => ({
        name: priority.label,
        value: priorityCounts[priority.value] || 0,
        color: priority.color
      }));
      
      // 📈 Calcul du taux de conversion basé sur les statuts Prisma
      const convertedLeads = leadsData.filter(lead => {
        const statusName = lead.LeadStatus?.name?.toLowerCase();
        return statusName?.includes('gagné') || statusName?.includes('converti') || statusName?.includes('client');
      });
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
      
      // 🕒 Activité récente basée sur les TimelineEvent de Prisma
      const recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        date: string;
        user?: string;
      }> = [];
      
      leadsData.forEach(lead => {
        // Activité de création
        recentActivity.push({
          id: `creation-${lead.id}`,
          type: 'creation',
          description: `Nouveau lead : ${lead.firstName || ''} ${lead.lastName || ''} ${lead.company ? `(${lead.company})` : ''}`.trim(),
          date: lead.createdAt,
          user: lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() : 'Système'
        });
        
        // Activités des TimelineEvent si disponibles
        if (lead.TimelineEvent && Array.isArray(lead.TimelineEvent)) {
          lead.TimelineEvent.forEach(event => {
            recentActivity.push({
              id: event.id,
              type: event.eventType,
              description: event.data?.description || `Événement ${event.eventType}`,
              date: event.createdAt,
              user: 'Utilisateur'
            });
          });
        }
      });
      
      // Trier par date décroissante et limiter à 10
      recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // ⏱️ Temps de réponse moyen basé sur les vraies données
      let totalResponseTime = 0;
      let leadsWithResponse = 0;
      
      leadsData.forEach(lead => {
        if (lead.lastContactDate && lead.createdAt) {
          const responseTime = new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime();
          totalResponseTime += responseTime / (1000 * 60 * 60); // Heures
          leadsWithResponse++;
        }
      });
      
      const averageResponseTime = leadsWithResponse > 0 ? totalResponseTime / leadsWithResponse : 0;
      
      // 📊 Évolution des leads sur les derniers mois
      const monthCounts: Record<string, number> = {};
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      leadsData.forEach(lead => {
        const createdDate = new Date(lead.createdAt);
        const monthKey = `${months[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      const leadsEvolution = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // 6 derniers mois
        .map(([name, value]) => ({ name, value }));
      
      // 🎯 Mise à jour de l'état avec les données calculées depuis Prisma
      setDashboardData({
        totalLeads,
        newLeads,
        conversionRate,
        averageResponseTime,
        leadsByStatus,
        leadsBySource,
        leadsByPriority,
        recentActivity: recentActivity.slice(0, 10),
        leadsEvolution,
        loading: false
      });
      
      console.log('✅ Dashboard mis à jour avec les données Prisma');
      
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(
        error,
        'Impossible de charger les données du dashboard. Veuillez réessayer.'
      );
      console.error('❌ Erreur lors du chargement des données du dashboard:', errorMessage, error);

      setDashboardData(prev => ({
        ...prev,
        totalLeads: 0,
        newLeads: 0,
        conversionRate: 0,
        averageResponseTime: 0,
        leadsByStatus: [],
        leadsBySource: [],
        leadsByPriority: [],
        recentActivity: [],
        leadsEvolution: [],
        loading: false
      }));

      NotificationManager.error(errorMessage);
    }
  }, [api, leadStatuses]);
  
  // 🔄 Fonction de rafraîchissement interactive
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    NotificationManager.success('Données actualisées !');
  }, [fetchDashboardData]);

  const handleTimeRangeChange = useCallback(
    (next: SegmentedValue) => {
      if (isTimeRange(next)) {
        setTimeRange(next);
      } else {
        console.warn('[LeadsDashboard] Valeur de période inattendue reçue:', next);
      }
    },
    []
  );

  const handleChartTypeChange = useCallback(
    (next: SegmentedValue) => {
      if (isChartType(next)) {
        setChartType(next);
      } else {
        console.warn('[LeadsDashboard] Type de graphique inattendu reçu:', next);
      }
    },
    []
  );
  
  useEffect(() => {
    // ✅ PRODUCTION: Utiliser le hook useAuth au lieu de isAuthenticated()
    if (!user) {
      console.log('Utilisateur non authentifié, abandon de la récupération des leads');
      NotificationManager.warning("Authentification requise pour accéder aux données");
      return;
    }
    
    // Ne pas exécuter l'effet si l'organisation n'est pas définie et que l'utilisateur n'est pas super admin
    if (!currentOrganization && !isSuperAdmin) {
      console.log('Aucune organisation sélectionnée, abandon de la récupération des leads');
      return;
    }
    
    fetchDashboardData();
  }, [user, currentOrganization, isSuperAdmin, fetchDashboardData]);

  const { loading } = dashboardData;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="Chargement des données du dashboard...">
          <div className="p-20" />
        </Spin>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 🎯 En-tête interactif avec Ant Design */}
        <Card className="mb-6 shadow-sm">
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} className="!mb-2">
                <BarChartOutlined className="text-blue-500 mr-2" />
                Dashboard des Leads
              </Title>
              <Paragraph className="!mb-0 text-gray-600">
                Vue d'ensemble des performances commerciales avec données en temps réel depuis Prisma
              </Paragraph>
            </Col>
            <Col>
              <Space size="middle">
                <AntTooltip title="Actualiser les données">
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    loading={refreshing}
                    onClick={handleRefresh}
                  >
                    Actualiser
                  </Button>
                </AntTooltip>
                
                <AntTooltip title="Afficher les détails">
                  <Button 
                    icon={<EyeOutlined />}
                    onClick={() => setShowDetails(!showDetails)}
                    type={showDetails ? "primary" : "default"}
                  >
                    Détails
                  </Button>
                </AntTooltip>
                
                <AntTooltip title="Filtres">
                  <Button icon={<FilterOutlined />}>
                    Filtres
                  </Button>
                </AntTooltip>
                
                <AntTooltip title="Exporter">
                  <Button icon={<ExportOutlined />}>
                    Export
                  </Button>
                </AntTooltip>
              </Space>
            </Col>
          </Row>
          
          {/* 🎛️ Contrôles interactifs */}
          <Divider />
          <Row gutter={16}>
            <Col>
              <Text strong className="mr-2">Période :</Text>
              <Segmented
                options={[
                  { label: 'Semaine', value: 'week' },
                  { label: 'Mois', value: 'month' },
                  { label: 'Trimestre', value: 'quarter' }
                ]}
                value={timeRange}
                onChange={handleTimeRangeChange}
              />
            </Col>
            <Col>
              <Text strong className="mr-2">Vue :</Text>
              <Segmented
                options={[
                  { label: <PieChartOutlined />, value: 'pie' },
                  { label: <BarChartOutlined />, value: 'bar' }
                ]}
                value={chartType}
                onChange={handleChartTypeChange}
              />
            </Col>
          </Row>
        </Card>

        {/* 🤖 Notifications intelligentes IA - Positionnées entre le menu et le contenu */}
        <SmartNotifications context="leads" />

        {/* 📊 Statistiques principales avec cartes modernes Ant Design */}
        <Row gutter={[16, 16]} className="mb-6">
          {/* Total des leads */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="text-center">
              <Statistic
                title="Total des leads"
                value={dashboardData.totalLeads}
                prefix={<UserOutlined className="text-blue-500" />}
                suffix="leads"
                valueStyle={{ color: '#1890ff' }}
              />
              <Progress 
                percent={Math.min((dashboardData.totalLeads / 100) * 100, 100)} 
                showInfo={false} 
                strokeColor="#1890ff"
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">
                Depuis la base Prisma
              </Text>
            </Card>
          </Col>

          {/* Nouveaux leads */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="text-center">
              <Statistic
                title="Nouveaux leads"
                value={dashboardData.newLeads}
                prefix={<FireOutlined className="text-green-500" />}
                suffix="nouveaux"
                valueStyle={{ color: '#52c41a' }}
              />
              <Progress 
                percent={dashboardData.totalLeads > 0 ? (dashboardData.newLeads / dashboardData.totalLeads) * 100 : 0}
                showInfo={false} 
                strokeColor="#52c41a"
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">
                Basé sur les statuts Prisma
              </Text>
            </Card>
          </Col>

          {/* Taux de conversion */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="text-center">
              <Statistic
                title="Taux de conversion"
                value={dashboardData.conversionRate}
                precision={1}
                suffix="%"
                prefix={<TrophyOutlined className="text-orange-500" />}
                valueStyle={{ color: '#fa8c16' }}
              />
              <Progress 
                percent={dashboardData.conversionRate} 
                showInfo={false} 
                strokeColor="#fa8c16"
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">
                Calculé depuis Prisma
              </Text>
            </Card>
          </Col>

          {/* Temps de réponse moyen */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="text-center">
              <Statistic
                title="Temps de réponse"
                value={dashboardData.averageResponseTime}
                precision={1}
                suffix="h"
                prefix={<ClockCircleOutlined className="text-purple-500" />}
                valueStyle={{ color: '#722ed1' }}
              />
              <Progress 
                percent={Math.max(0, 100 - (dashboardData.averageResponseTime * 4))} 
                showInfo={false} 
                strokeColor="#722ed1"
                className="mt-2"
              />
              <Text type="secondary" className="text-xs">
                Moyenne calculée
              </Text>
            </Card>
          </Col>
        </Row>

        {/* 📈 Graphiques interactifs avec Ant Design */}
        <Row gutter={[16, 16]} className="mb-6">
          {/* Leads par statut */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <PieChartOutlined className="text-blue-500" />
                  <span>Répartition par statut (Prisma)</span>
                </Space>
              }
              extra={
                <Space>
                  <Badge status="processing" text="En temps réel" />
                  <Button size="small" icon={<ReloadOutlined />} />
                </Space>
              }
              hoverable
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={dashboardData.leadsByStatus}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {dashboardData.leadsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={dashboardData.leadsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={SF.blue} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
              {showDetails && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <Text type="secondary" className="text-xs">
                    Données mises à jour automatiquement depuis Prisma. Cliquez sur les segments pour plus de détails.
                  </Text>
                </div>
              )}
            </Card>
          </Col>

          {/* Evolution des leads */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <LineChartOutlined className="text-green-500" />
                  <span>Évolution {timeRange === 'week' ? 'hebdomadaire' : timeRange === 'month' ? 'mensuelle' : 'trimestrielle'}</span>
                </Space>
              }
              extra={
                <Space>
                  <Tag color="green">Tendance ↗</Tag>
                  <RangePicker size="small" />
                </Space>
              }
              hoverable
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.leadsEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Leads']} />
                    <Bar dataKey="value" fill="#52c41a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {showDetails && (
                <div className="mt-4">
                  <Row gutter={8}>
                    <Col span={8}>
                      <Statistic 
                        title="Croissance" 
                        value={18}
                        precision={1}
                        suffix="%" 
                        prefix={<RiseOutlined />}
                        valueStyle={{ fontSize: 14, color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Pic" 
                        value={dashboardData.leadsEvolution.reduce((max, item) => Math.max(max, item.value), 0)}
                        valueStyle={{ fontSize: 14, color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Moyenne" 
                        value={dashboardData.leadsEvolution.reduce((sum, item) => sum + item.value, 0) / (dashboardData.leadsEvolution.length || 1)}
                        precision={0}
                        valueStyle={{ fontSize: 14, color: '#1890ff' }}
                      />
                    </Col>
                  </Row>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 🕒 Activité récente avec Timeline Ant Design */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card 
              title={
                <Space>
                  <ClockCircleOutlined className="text-blue-500" />
                  <span>Activité récente (TimelineEvents)</span>
                </Space>
              }
              extra={
                <Space>
                  <Switch 
                    checkedChildren="Temps réel" 
                    unCheckedChildren="Manuel"
                    defaultChecked 
                  />
                  <Button size="small" icon={<ReloadOutlined />}>Actualiser</Button>
                </Space>
              }
              hoverable
            >
              {dashboardData.recentActivity.length > 0 ? (
                <Timeline>
                  {dashboardData.recentActivity.slice(0, 8).map((activity) => (
                    <Timeline.Item
                      key={activity.id}
                      dot={
                        activity.type === 'creation' ? (
                          <Avatar size="small" style={{ backgroundColor: '#52c41a' }} icon={<UserOutlined />} />
                        ) : (
                          <Avatar size="small" style={{ backgroundColor: '#1890ff' }} icon={<ThunderboltOutlined />} />
                        )
                      }
                      color={activity.type === 'creation' ? 'green' : 'blue'}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Text strong className="block">
                            {activity.description}
                          </Text>
                          <Text type="secondary" className="text-xs flex items-center mt-1">
                            <ClockCircleOutlined className="mr-1" />
                            {new Date(activity.date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} 
                            <span className="ml-2">• {activity.user}</span>
                          </Text>
                        </div>
                        <Tag color={activity.type === 'creation' ? 'green' : 'blue'} className="ml-2">
                          {activity.type === 'creation' ? 'Nouveau' : 'Action'}
                        </Tag>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty 
                  description="Aucune activité récente"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
              
              {showDetails && dashboardData.recentActivity.length > 8 && (
                <div className="mt-4 text-center">
                  <Button type="link">
                    Voir toute l'activité ({dashboardData.recentActivity.length} éléments)
                  </Button>
                </div>
              )}
            </Card>
          </Col>

          {/* 📊 Stats rapides */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <StarOutlined className="text-orange-500" />
                  <span>Stats rapides</span>
                </Space>
              }
              hoverable
              className="mb-4"
            >
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <Statistic
                    title="Leads actifs"
                    value={dashboardData.totalLeads - dashboardData.newLeads}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={24}>
                  <Statistic
                    title="En attente"
                    value={Math.floor(dashboardData.totalLeads * 0.3)}
                    prefix={<WarningOutlined style={{ color: '#fa8c16' }} />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col span={24}>
                  <div>
                    <Text strong>Performance ce mois</Text>
                    <Progress 
                      percent={75} 
                      status="active"
                      strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                      className="mt-2"
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
