import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
import { useLeadStatuses } from "../hooks/useLeadStatuses";
import { Link } from "react-router-dom";
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Timeline, 
  List, 
  Avatar, 
  Progress, 
  Button, 
  Space, 
  Typography,
  Spin,
  Badge,
  Table,
  Tag,
  Divider,
  Tabs,
  Segmented,
  Switch,
  Tooltip as AntTooltip
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  CalendarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  MailOutlined,
  BankOutlined,
  SettingOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  FireOutlined,
  ThunderboltOutlined,
  StarOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SmartNotifications } from '../components/SmartNotifications';
import { LEAD_SOURCES, LEAD_PRIORITIES } from './Leads/LeadsConfig';
import { NotificationManager } from '../components/Notifications';
import type { SegmentedValue } from 'antd/es/segmented';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

type ChartType = 'pie' | 'bar';
type TimeRange = 'week' | 'month' | 'quarter';

const isChartType = (value: SegmentedValue): value is ChartType => value === 'pie' || value === 'bar';
const isTimeRange = (value: SegmentedValue): value is TimeRange =>
  value === 'week' || value === 'month' || value === 'quarter';

interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  totalClients: number;
  totalUsers: number;
  conversionRate: number;
  pendingTasks: number;
  upcomingMeetings: number;
  totalRevenue: number;
  monthlyGrowth: number;
  averageResponseTime: number;
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'client' | 'email' | 'meeting' | 'task' | 'creation';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  user?: string;
}

interface TopLead {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;
  email?: string;
  phone?: string;
  status: string;
  statusColor?: string;
  score: number;
  lastContact?: string;
  nextFollowUp?: string;
  assignedTo?: string;
  source?: string;
  createdAt: string;
  notes?: string;
}

interface LeadChartData {
  leadsByStatus: { name: string; value: number; color: string }[];
  leadsBySource: { name: string; value: number }[];
  leadsByPriority: { name: string; value: number; color: string }[];
  leadsEvolution: { name: string; value: number }[];
}

// Composant épuré pour les utilisateurs sans organisation
const CreateOrganizationPrompt = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <Avatar size={64} icon={<BankOutlined />} className="mb-4" />
          <Title level={3}>Bienvenue</Title>
          <Text type="secondary">
            Pour commencer, vous devez créer ou rejoindre une organisation.
          </Text>
        </div>
        
        <Space direction="vertical" size="middle" className="w-full">
          <Link to="/organization/create">
            <Button type="primary" size="large" icon={<PlusOutlined />} block>
              Créer une organisation
            </Button>
          </Link>
          
          <Link to="/settings/profile">
            <Button size="large" icon={<SettingOutlined />} block>
              Paramètres du profil
            </Button>
          </Link>
        </Space>
        
        <Divider />
        
        <Paragraph type="secondary" className="text-sm">
          <ExclamationCircleOutlined className="mr-2" />
          Si vous avez déjà été invité à rejoindre une organisation,
          vérifiez vos emails et acceptez l'invitation.
        </Paragraph>
      </Card>
    </div>
  );
};

export default function DashboardPageUnified() {
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook.api]);
  const { currentOrganization, isSuperAdmin, user } = useAuth();
  const { leadStatuses } = useLeadStatuses();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [showDetails, setShowDetails] = useState(false);
  
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeadsToday: 0,
    totalClients: 0,
    totalUsers: 0,
    conversionRate: 0,
    pendingTasks: 0,
    upcomingMeetings: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    averageResponseTime: 0,
  });
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [chartData, setChartData] = useState<LeadChartData>({
    leadsByStatus: [],
    leadsBySource: [],
    leadsByPriority: [],
    leadsEvolution: []
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer TOUTES les données
      const [leadsResponse, usersResponse, clientsResponse] = await Promise.all([
        api.get('/api/leads').catch(() => ({ data: [] })),
        api.get('/api/users').catch(() => ({ data: [] })),
        api.get('/api/users?role=CLIENT').catch(() => ({ data: [] }))
      ]);

      const leads = Array.isArray(leadsResponse) ? leadsResponse : (leadsResponse?.data || []);
      const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.data || []);
      const clients = Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse?.data || []);

      console.log('📊 Données complètes chargées:', {
        leads: leads.length,
        users: users.length,
        clients: clients.length
      });

      // Calcul des statistiques globales
      const totalLeads = leads.length;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const newLeadsToday = leads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === today.getTime();
      }).length;

      // Taux de conversion
      const convertedLeads = leads.filter(lead => {
        const statusName = lead.LeadStatus?.name?.toLowerCase();
        return statusName?.includes('gagné') || statusName?.includes('converti') || statusName?.includes('client');
      });
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

      // Temps de réponse moyen
      let totalResponseTime = 0;
      let leadsWithResponse = 0;
      
      leads.forEach(lead => {
        if (lead.lastContactDate && lead.createdAt) {
          const responseTime = new Date(lead.lastContactDate).getTime() - new Date(lead.createdAt).getTime();
          totalResponseTime += responseTime / (1000 * 60 * 60);
          leadsWithResponse++;
        }
      });
      
      const averageResponseTime = leadsWithResponse > 0 ? totalResponseTime / leadsWithResponse : 0;

      // Revenus (simulation basée sur les clients convertis)
      const avgDealSize = 5000;
      const totalRevenue = convertedLeads.length * avgDealSize;

      // Croissance mensuelle (simulation)
      const lastMonthLeads = leads.filter(lead => {
        const createdDate = new Date(lead.createdAt);
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return createdDate >= lastMonth;
      }).length;
      const monthlyGrowth = totalLeads > 0 ? ((lastMonthLeads / totalLeads) * 100) : 0;

      setStats({
        totalLeads,
        newLeadsToday,
        totalClients: clients.length,
        totalUsers: users.length,
        conversionRate,
        pendingTasks: Math.floor(totalLeads * 0.15),
        upcomingMeetings: Math.floor(totalLeads * 0.1),
        totalRevenue,
        monthlyGrowth,
        averageResponseTime
      });

      // Données pour les graphiques
      const statusCounts: Record<string, number> = {};
      leadStatuses.forEach(status => {
        statusCounts[status.id] = 0;
      });
      
      leads.forEach(lead => {
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

      const sourceCounts: Record<string, number> = {};
      LEAD_SOURCES.forEach(source => {
        sourceCounts[source.value] = 0;
      });
      
      leads.forEach(lead => {
        const source = lead.source || lead.data?.source || 'direct';
        if (sourceCounts[source] !== undefined) {
          sourceCounts[source]++;
        } else {
          sourceCounts['other'] = (sourceCounts['other'] || 0) + 1;
        }
      });
      
      const leadsBySource = LEAD_SOURCES.map(source => ({
        name: source.label,
        value: sourceCounts[source.value] || 0
      }));

      const priorityCounts: Record<string, number> = {};
      LEAD_PRIORITIES.forEach(priority => {
        priorityCounts[priority.value] = 0;
      });
      
      leads.forEach(lead => {
        const priority = lead.priority || lead.data?.priority || 'medium';
        if (priorityCounts[priority] !== undefined) {
          priorityCounts[priority]++;
        } else {
          priorityCounts['medium']++;
        }
      });
      
      const leadsByPriority = LEAD_PRIORITIES.map(priority => ({
        name: priority.label,
        value: priorityCounts[priority.value] || 0,
        color: priority.color
      }));

      // Évolution mensuelle
      const monthCounts: Record<string, number> = {};
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      
      leads.forEach(lead => {
        const createdDate = new Date(lead.createdAt);
        const monthKey = `${months[createdDate.getMonth()]} ${createdDate.getFullYear()}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      });
      
      const leadsEvolution = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([name, value]) => ({ name, value }));

      setChartData({
        leadsByStatus,
        leadsBySource,
        leadsByPriority,
        leadsEvolution
      });

      // Top Leads
      const sortedLeads = [...leads]
        .sort((a, b) => {
          const scoreA = (a.data?.score || 50);
          const scoreB = (b.data?.score || 50);
          return scoreB - scoreA;
        })
        .slice(0, 10);

      const formattedTopLeads: TopLead[] = sortedLeads.map(lead => ({
        id: lead.id,
        nom: lead.lastName || lead.data?.lastName || 'N/A',
        prenom: lead.firstName || lead.data?.firstName || 'N/A',
        entreprise: lead.company || lead.data?.company || 'N/A',
        email: lead.email || lead.data?.email,
        phone: lead.phone || lead.data?.phone,
        status: lead.LeadStatus?.name || 'Inconnu',
        statusColor: lead.LeadStatus?.color,
        score: lead.data?.score || 50,
        lastContact: lead.lastContactDate,
        nextFollowUp: lead.data?.nextFollowUp,
        assignedTo: lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() : undefined,
        source: lead.source || lead.data?.source,
        createdAt: lead.createdAt,
        notes: lead.notes
      }));

      setTopLeads(formattedTopLeads);

      // Activités récentes
      const activities: RecentActivity[] = [];
      
      leads.forEach(lead => {
        activities.push({
          id: `creation-${lead.id}`,
          type: 'creation',
          title: `Nouveau lead`,
          description: `${lead.firstName || ''} ${lead.lastName || ''} ${lead.company ? `(${lead.company})` : ''}`.trim(),
          timestamp: lead.createdAt,
          status: 'success',
          user: lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() : 'Système'
        });

        if (lead.TimelineEvent && Array.isArray(lead.TimelineEvent)) {
          lead.TimelineEvent.forEach(event => {
            activities.push({
              id: event.id,
              type: event.eventType === 'email' ? 'email' : event.eventType === 'call' ? 'lead' : event.eventType === 'meeting' ? 'meeting' : 'task',
              title: event.eventType,
              description: event.data?.description || `Événement ${event.eventType}`,
              timestamp: event.createdAt,
              status: 'info',
              user: 'Utilisateur'
            });
          });
        }
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 15));

    } catch (error) {
      console.error("❌ Erreur lors du chargement des données:", error);
      NotificationManager.error('Impossible de charger les données du dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, leadStatuses]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    NotificationManager.success('Données actualisées !');
  }, [fetchDashboardData]);

  const handleTimeRangeChange = useCallback((next: SegmentedValue) => {
    if (isTimeRange(next)) setTimeRange(next);
  }, []);

  const handleChartTypeChange = useCallback((next: SegmentedValue) => {
    if (isChartType(next)) setChartType(next);
  }, []);

  useEffect(() => {
    if (!user) {
      console.log('Utilisateur non authentifié');
      return;
    }
    
    if (!currentOrganization && !isSuperAdmin) {
      console.log('Aucune organisation');
      return;
    }
    
    fetchDashboardData();
  }, [user, currentOrganization, isSuperAdmin, fetchDashboardData]);

  if (!currentOrganization && !isSuperAdmin) {
    return <CreateOrganizationPrompt />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" tip="Chargement du dashboard...">
          <div className="p-20" />
        </Spin>
      </div>
    );
  }

  const leadColumns = [
    {
      title: 'Contact',
      dataIndex: 'nom',
      key: 'nom',
      render: (text: string, record: TopLead) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.prenom} {record.nom}</Text>
            <br />
            <Text type="secondary" className="text-xs">{record.entreprise}</Text>
            {record.source && (
              <>
                <br />
                <Text type="secondary" className="text-xs">Source: {record.source}</Text>
              </>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact Info',
      key: 'contact',
      render: (record: TopLead) => (
        <Space direction="vertical" size="small">
          {record.email && (
            <Text className="text-xs" copyable={{ text: record.email }}>
              <MailOutlined /> {record.email}
            </Text>
          )}
          {record.phone && (
            <Text className="text-xs" copyable={{ text: record.phone }}>
              <PhoneOutlined /> {record.phone}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Progress 
          percent={score} 
          size="small" 
          format={(percent) => `${percent}%`} 
          strokeColor={score > 80 ? '#52c41a' : score > 60 ? '#faad14' : '#ff4d4f'}
        />
      ),
      sorter: (a: TopLead, b: TopLead) => a.score - b.score,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: TopLead) => (
        <Tag color={record.statusColor || '#6b7280'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TopLead) => (
        <Space>
          <Link to={`/leads/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>Voir</Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête global */}
      <div className="bg-white border-b border-gray-200 p-6 mb-6">
        <div className="max-w-7xl mx-auto">
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2} className="!mb-2">
                <BarChartOutlined className="text-blue-500 mr-2" />
                Dashboard Central
              </Title>
              <Paragraph className="!mb-0 text-gray-600">
                Vue d'ensemble complète de votre CRM avec données en temps réel
              </Paragraph>
            </Col>
            <Col>
              <Space size="middle">
                <AntTooltip title="Actualiser">
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />}
                    loading={refreshing}
                    onClick={handleRefresh}
                  >
                    Actualiser
                  </Button>
                </AntTooltip>
                <Button icon={<FilterOutlined />}>Filtres</Button>
                <Button icon={<ExportOutlined />}>Export</Button>
              </Space>
            </Col>
          </Row>
        </div>
      </div>

      {/* Notifications IA */}
      <div className="max-w-7xl mx-auto px-6 mb-6">
        <SmartNotifications context="dashboard" />
      </div>

      {/* Contenu principal avec onglets */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          tabBarExtraContent={
            <Space>
              <Switch 
                checkedChildren="Détails" 
                unCheckedChildren="Simple"
                checked={showDetails}
                onChange={setShowDetails}
              />
            </Space>
          }
        >
          {/* ONGLET 1 : VUE D'ENSEMBLE */}
          <TabPane 
            tab={
              <span>
                <TrophyOutlined />
                Vue d'ensemble
              </span>
            } 
            key="overview"
          >
            {/* Stats principales */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card hoverable>
                  <Statistic
                    title="Total Leads"
                    value={stats.totalLeads}
                    prefix={<UserOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Progress percent={100} showInfo={false} strokeColor="#1890ff" />
                  <Text type="secondary" className="text-xs">+{stats.newLeadsToday} aujourd'hui</Text>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Card hoverable>
                  <Statistic
                    title="Clients Actifs"
                    value={stats.totalClients}
                    prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Progress percent={75} showInfo={false} strokeColor="#52c41a" />
                  <Text type="secondary" className="text-xs">+{Math.floor(stats.monthlyGrowth)}% ce mois</Text>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Card hoverable>
                  <Statistic
                    title="Taux de conversion"
                    value={stats.conversionRate}
                    precision={1}
                    suffix="%"
                    prefix={<TrophyOutlined style={{ color: '#fa8c16' }} />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                  <Progress percent={stats.conversionRate} showInfo={false} strokeColor="#fa8c16" />
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Card hoverable>
                  <Statistic
                    title="Chiffre d'Affaires"
                    value={stats.totalRevenue}
                    prefix="€"
                    precision={0}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Progress percent={65} showInfo={false} strokeColor="#722ed1" />
                  <Text type="secondary" className="text-xs">
                    <RiseOutlined /> {stats.monthlyGrowth.toFixed(1)}% vs mois dernier
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* Actions rapides & Activités récentes */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card title="Actions Rapides" hoverable>
                  <Space direction="vertical" className="w-full">
                    <Link to="/leads/kanban">
                      <Button type="primary" icon={<PlusOutlined />} block>
                        Nouveau Lead
                      </Button>
                    </Link>
                    <Link to="/clients">
                      <Button icon={<UserOutlined />} block>
                        Nouveau Client
                      </Button>
                    </Link>
                    <Link to="/calendar">
                      <Button icon={<CalendarOutlined />} block>
                        Planifier RDV
                      </Button>
                    </Link>
                    <Link to="/emails">
                      <Button icon={<MailOutlined />} block>
                        Envoyer Email
                      </Button>
                    </Link>
                  </Space>
                  
                  <Divider />
                  
                  <div>
                    <Text strong>À faire aujourd'hui</Text>
                    <div className="mt-3">
                      <Badge status="error" text={`${stats.pendingTasks} tâches en retard`} className="block mb-2" />
                      <Badge status="processing" text={`${stats.upcomingMeetings} RDV aujourd'hui`} className="block" />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={16}>
                <Card 
                  title={
                    <Space>
                      <ClockCircleOutlined />
                      Activités Récentes
                    </Space>
                  }
                  extra={<Button size="small" icon={<ReloadOutlined />}>Actualiser</Button>}
                  hoverable
                >
                  <List
                    dataSource={recentActivities.slice(0, 5)}
                    renderItem={(activity) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar 
                              icon={
                                activity.type === 'creation' ? <UserOutlined /> :
                                activity.type === 'email' ? <MailOutlined /> :
                                activity.type === 'meeting' ? <CalendarOutlined /> :
                                <ThunderboltOutlined />
                              }
                              style={{
                                backgroundColor: 
                                  activity.type === 'creation' ? '#52c41a' :
                                  activity.type === 'email' ? '#1890ff' :
                                  activity.type === 'meeting' ? '#fa8c16' :
                                  '#722ed1'
                              }}
                            />
                          }
                          title={
                            <Space>
                              <Text strong>{activity.title}</Text>
                              <Tag color={activity.status === 'success' ? 'green' : activity.status === 'warning' ? 'orange' : 'blue'}>
                                {activity.type}
                              </Tag>
                            </Space>
                          }
                          description={
                            <>
                              <Text>{activity.description}</Text>
                              <br />
                              <Text type="secondary" className="text-xs">
                                {new Date(activity.timestamp).toLocaleString('fr-FR')} • {activity.user}
                              </Text>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                  <div className="text-center mt-3">
                    <Button type="link" onClick={() => setActiveTab('activity')}>
                      Voir toute l'activité ({recentActivities.length})
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Top Leads */}
            <Card 
              title={
                <Space>
                  <StarOutlined className="text-orange-500" />
                  Top Leads à suivre
                </Space>
              }
              extra={<Link to="/leads/list"><Button size="small">Voir tous</Button></Link>}
              className="mt-6"
            >
              <Table 
                dataSource={topLeads}
                columns={leadColumns}
                pagination={{ pageSize: 5 }}
                size="middle"
              />
            </Card>
          </TabPane>

          {/* ONGLET 2 : LEADS EN DÉTAIL */}
          <TabPane 
            tab={
              <span>
                <PieChartOutlined />
                Leads en détail
              </span>
            } 
            key="leads"
          >
            {/* Contrôles */}
            <Card className="mb-6">
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

            {/* KPIs Leads */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="Total des leads"
                    value={stats.totalLeads}
                    prefix={<UserOutlined className="text-blue-500" />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Progress percent={100} showInfo={false} strokeColor="#1890ff" className="mt-2" />
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="Nouveaux leads"
                    value={stats.newLeadsToday}
                    prefix={<FireOutlined className="text-green-500" />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Progress 
                    percent={stats.totalLeads > 0 ? (stats.newLeadsToday / stats.totalLeads) * 100 : 0}
                    showInfo={false} 
                    strokeColor="#52c41a"
                    className="mt-2"
                  />
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="Taux de conversion"
                    value={stats.conversionRate}
                    precision={1}
                    suffix="%"
                    prefix={<TrophyOutlined className="text-orange-500" />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                  <Progress percent={stats.conversionRate} showInfo={false} strokeColor="#fa8c16" className="mt-2" />
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Statistic
                    title="Temps de réponse"
                    value={stats.averageResponseTime}
                    precision={1}
                    suffix="h"
                    prefix={<ClockCircleOutlined className="text-purple-500" />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Progress 
                    percent={Math.max(0, 100 - (stats.averageResponseTime * 4))} 
                    showInfo={false} 
                    strokeColor="#722ed1"
                    className="mt-2"
                  />
                </Card>
              </Col>
            </Row>

            {/* Graphiques */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card 
                  title={<Space><PieChartOutlined />Répartition par statut</Space>}
                  extra={<Badge status="processing" text="Temps réel" />}
                  hoverable
                >
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'pie' ? (
                        <PieChart>
                          <Pie
                            data={chartData.leadsByStatus}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {chartData.leadsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      ) : (
                        <BarChart data={chartData.leadsByStatus}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3B82F6" />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card 
                  title={<Space><LineChartOutlined />Évolution mensuelle</Space>}
                  extra={<Tag color="green">Tendance ↗</Tag>}
                  hoverable
                >
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.leadsEvolution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#52c41a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* ONGLET 3 : ACTIVITÉS */}
          <TabPane 
            tab={
              <span>
                <ClockCircleOutlined />
                Activités ({recentActivities.length})
              </span>
            } 
            key="activity"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card 
                  title="Timeline complète"
                  extra={<Button icon={<ReloadOutlined />} onClick={handleRefresh}>Actualiser</Button>}
                >
                  <Timeline>
                    {recentActivities.map((activity) => (
                      <Timeline.Item
                        key={activity.id}
                        dot={
                          <Avatar 
                            size="small" 
                            icon={
                              activity.type === 'creation' ? <UserOutlined /> :
                              activity.type === 'email' ? <MailOutlined /> :
                              activity.type === 'meeting' ? <CalendarOutlined /> :
                              <ThunderboltOutlined />
                            }
                            style={{
                              backgroundColor: 
                                activity.type === 'creation' ? '#52c41a' :
                                activity.type === 'email' ? '#1890ff' :
                                '#722ed1'
                            }}
                          />
                        }
                      >
                        <div className="flex justify-between">
                          <div>
                            <Text strong>{activity.title}</Text>
                            <br />
                            <Text>{activity.description}</Text>
                            <br />
                            <Text type="secondary" className="text-xs">
                              {new Date(activity.timestamp).toLocaleString('fr-FR')} • {activity.user}
                            </Text>
                          </div>
                          <Tag color={activity.status === 'success' ? 'green' : 'blue'}>
                            {activity.type}
                          </Tag>
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Stats rapides">
                  <Row gutter={[0, 16]}>
                    <Col span={24}>
                      <Statistic
                        title="Leads actifs"
                        value={stats.totalLeads - stats.newLeadsToday}
                        prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={24}>
                      <Statistic
                        title="En attente"
                        value={stats.pendingTasks}
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
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
}
