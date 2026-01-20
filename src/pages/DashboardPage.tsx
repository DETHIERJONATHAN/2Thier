// ⚠️ Ce fichier a été remplacé par DashboardPageUnified.tsx
// Redirection pour compatibilité
export { default } from './DashboardPageUnified';

/* ANCIEN CODE - CONSERVÉ POUR RÉFÉRENCE
import React, { useEffect, useState } from "react";
import { useAuthenticatedApi } from "../hooks/useAuthenticatedApi";
import { useAuth } from "../auth/useAuth";
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
  Divider
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  PhoneOutlined,
  CalendarOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  MailOutlined,
  BankOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

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
}

interface RecentActivity {
  id: string;
  type: 'lead' | 'client' | 'email' | 'meeting' | 'task';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
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
          <Link to="/organization/join">
            <Button size="large" block>
              Rejoindre une organisation
            </Button>
          </Link>
        </Space>
        
        <Divider />
        
        <Paragraph>
          <Text type="secondary" className="text-sm">
            Besoin d'aide ? Contactez le support technique.
          </Text>
        </Paragraph>
      </Card>
    </div>
  );
};

function DashboardPageOLD() {
  const { api } = useAuthenticatedApi();
  const { user, currentOrganization, isSuperAdmin } = useAuth();
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
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization && !isSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Récupération des VRAIES données depuis l'API
        const [statsResponse, activitiesResponse, topLeadsResponse, tasksResponse] = await Promise.all([
          api.get('/api/dashboard/stats').catch(() => ({ data: { success: false, data: null } })),
          api.get('/api/dashboard/activities?limit=10').catch(() => ({ data: { success: false, data: [] } })),
          api.get('/api/dashboard/top-leads?limit=5').catch(() => ({ data: { success: false, data: [] } })),
          api.get('/api/dashboard/tasks').catch(() => ({ data: { success: false, data: {} } }))
        ]);

        // Statistiques réelles
        if (statsResponse.data?.success && statsResponse.data?.data) {
          setStats(statsResponse.data.data);
        } else {
          console.warn('❌ Impossible de charger les statistiques réelles');
          // Fallback uniquement si l'API échoue
          const fallbackStats: DashboardStats = {
            totalLeads: 0,
            newLeadsToday: 0,
            totalClients: 0,
            totalUsers: 0,
            conversionRate: 0,
            pendingTasks: 0,
            upcomingMeetings: 0,
            totalRevenue: 0,
            monthlyGrowth: 0,
          };
          setStats(fallbackStats);
        }

        // Activités réelles
        if (activitiesResponse.data?.success && activitiesResponse.data?.data) {
          setRecentActivities(activitiesResponse.data.data);
        } else {
          console.warn('❌ Impossible de charger les activités réelles');
          setRecentActivities([]);
        }

        // Top leads réels
        if (topLeadsResponse.data?.success && topLeadsResponse.data?.data) {
          setTopLeads(topLeadsResponse.data.data);
        } else {
          console.warn('❌ Impossible de charger les top leads réels');
          setTopLeads([]);
        }

        // Mise à jour des tâches avec données réelles
        if (tasksResponse.data?.success && tasksResponse.data?.data) {
          const taskData = tasksResponse.data.data;
          setStats(prevStats => ({
            ...prevStats,
            pendingTasks: taskData.pendingTasks || prevStats.pendingTasks,
            upcomingMeetings: taskData.upcomingMeetings || prevStats.upcomingMeetings
          }));
        }

      } catch (error) {
        console.error("❌ Erreur lors du chargement des données du dashboard:", error);
        // En cas d'erreur, afficher des données vides plutôt que des données mockées
        setStats({
          totalLeads: 0,
          newLeadsToday: 0,
          totalClients: 0,
          totalUsers: 0,
          conversionRate: 0,
          pendingTasks: 0,
          upcomingMeetings: 0,
          totalRevenue: 0,
          monthlyGrowth: 0,
        });
        setRecentActivities([]);
        setTopLeads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [api, currentOrganization, isSuperAdmin]);

  // Si pas d'organisation et pas super admin, afficher l'invite de création
  if (!currentOrganization && !isSuperAdmin) {
    return <CreateOrganizationPrompt />;
  }

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
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
      render: (status: string, record: TopLead) => {
        const color = record.statusColor || '#6b7280';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Suivi',
      key: 'followUp',
      render: (record: TopLead) => (
        <Space direction="vertical" size="small">
          {record.lastContact && (
            <Text className="text-xs">
              <ClockCircleOutlined /> Dernier: {new Date(record.lastContact).toLocaleDateString('fr-FR')}
            </Text>
          )}
          {record.nextFollowUp && (
            <Text className="text-xs" type={new Date(record.nextFollowUp) < new Date() ? 'danger' : 'success'}>
              <CalendarOutlined /> Prochain: {new Date(record.nextFollowUp).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: TopLead) => (
        <Space>
          <Link to={`/leads/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />} title="Voir le lead" />
          </Link>
          {record.email && (
            <Button 
              size="small" 
              icon={<MailOutlined />} 
              title="Envoyer un email"
              onClick={() => window.open(`mailto:${record.email}`, '_blank')}
            />
          )}
          {record.phone && (
            <Button 
              size="small" 
              icon={<PhoneOutlined />} 
              title="Appeler"
              onClick={() => window.open(`tel:${record.phone}`, '_blank')}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header avec informations utilisateur */}
      <div className="mb-6">
        <Title level={2} className="!mb-2">
          Tableau de bord 📊
        </Title>
        <Text type="secondary">
          Bienvenue {user?.prenom} {user?.nom} - {currentOrganization?.nom || "Super Admin"}
        </Text>
      </div>

      {/* Statistiques principales */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Total Leads"
              value={stats.totalLeads}
              prefix={<TeamOutlined className="text-blue-500" />}
              suffix={
                <Badge count={stats.newLeadsToday} showZero className="ml-2">
                  <Text type="secondary" className="text-xs">nouveaux aujourd'hui</Text>
                </Badge>
              }
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Clients Actifs"
              value={stats.totalClients}
              prefix={<UserOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Taux de Conversion"
              value={stats.conversionRate}
              suffix="%"
              prefix={<TrophyOutlined className="text-orange-500" />}
              valueStyle={{ color: stats.conversionRate > 50 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="Chiffre d'Affaires"
              value={stats.totalRevenue}
              suffix="€"
              prefix={
                stats.monthlyGrowth > 0 ? 
                  <RiseOutlined className="text-green-500" /> : 
                  <FallOutlined className="text-red-500" />
              }
              valueStyle={{ color: stats.monthlyGrowth > 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Actions rapides */}
        <Col xs={24} lg={8}>
          <Card title="🚀 Actions Rapides" className="h-full" hoverable>
            <Space direction="vertical" size="middle" className="w-full">
              <Link to="/leads/create">
                <Button type="primary" icon={<PlusOutlined />} block size="large" className="bg-blue-500 hover:bg-blue-600">
                  Nouveau Lead
                </Button>
              </Link>
              <Link to="/clients/create">
                <Button icon={<UserOutlined />} block className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                  Nouveau Client
                </Button>
              </Link>
              <Link to="/calendar">
                <Button icon={<CalendarOutlined />} block className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100">
                  Planifier RDV
                </Button>
              </Link>
              <Link to="/mail">
                <Button icon={<MailOutlined />} block className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
                  Envoyer Email
                </Button>
              </Link>
            </Space>
          </Card>
        </Col>

        {/* Activités récentes */}
        <Col xs={24} lg={8}>
          <Card title="📋 Activités Récentes" className="h-full" hoverable>
            {recentActivities.length > 0 ? (
              <Timeline>
                {recentActivities.map((activity) => {
                  const icons = {
                    'lead': <TeamOutlined className="text-blue-500" />,
                    'client': <UserOutlined className="text-green-500" />,
                    'email': <MailOutlined className="text-orange-500" />,
                    'meeting': <CalendarOutlined className="text-purple-500" />,
                    'task': <CheckCircleOutlined className="text-cyan-500" />
                  };

                  return (
                    <Timeline.Item 
                      key={activity.id}
                      dot={icons[activity.type] || <ClockCircleOutlined />}
                    >
                      <div>
                        <Text strong>{activity.title}</Text>
                        <br />
                        <Text type="secondary" className="text-sm">{activity.description}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">
                          {new Date(activity.timestamp).toLocaleString('fr-FR')}
                        </Text>
                      </div>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            ) : (
              <div className="text-center py-8">
                <ClockCircleOutlined className="text-4xl text-gray-300 mb-4" />
                <Text type="secondary" className="block">
                  Aucune activité récente trouvée.
                </Text>
                <Text type="secondary" className="text-xs">
                  Les activités apparaîtront ici quand vous commencerez à utiliser le CRM.
                </Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Tâches et rendez-vous */}
        <Col xs={24} lg={8}>
          <Card title="⏰ À faire aujourd'hui" className="h-full" hoverable>
            <Space direction="vertical" size="middle" className="w-full">
              <Card size="small" className="bg-red-50 border-red-200" hoverable>
                <Statistic
                  title="Tâches en retard"
                  value={stats.pendingTasks}
                  prefix={<ExclamationCircleOutlined className="text-red-500" />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
              
              <Card size="small" className="bg-blue-50 border-blue-200" hoverable>
                <Statistic
                  title="RDV aujourd'hui"
                  value={stats.upcomingMeetings}
                  prefix={<CalendarOutlined className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>

              <Link to="/tasks">
                <Button block>Voir toutes les tâches</Button>
              </Link>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Top leads et performances */}
      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} xl={16}>
          <Card 
            title="🏆 Top Leads" 
            extra={<Link to="/leads"><Button type="link">Voir tous</Button></Link>}
            hoverable
          >
            {topLeads.length > 0 ? (
              <Table
                dataSource={topLeads}
                columns={leadColumns}
                pagination={false}
                size="small"
                rowKey="id"
                scroll={{ x: 800 }}
              />
            ) : (
              <div className="text-center py-8">
                <UserOutlined className="text-4xl text-gray-300 mb-4" />
                <Text type="secondary" className="block">
                  Aucun lead trouvé dans votre base de données.
                </Text>
                <Link to="/leads/create" className="mt-2 inline-block">
                  <Button type="primary" icon={<PlusOutlined />}>
                    Créer votre premier lead
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card title="📊 Performance du Mois" hoverable>
            <Space direction="vertical" size="large" className="w-full">
              <div>
                <Text strong>Objectif Leads</Text>
                <Progress 
                  percent={(stats.totalLeads / 200) * 100} 
                  showInfo 
                  strokeColor="#1890ff"
                />
              </div>
              
              <div>
                <Text strong>Objectif CA</Text>
                <Progress 
                  percent={(stats.totalRevenue / 150000) * 100} 
                  showInfo
                  strokeColor="#52c41a"
                />
              </div>

              <div>
                <Text strong>Satisfaction Client</Text>
                <Progress 
                  percent={87} 
                  showInfo
                  strokeColor="#faad14"
                />
              </div>

              <div>
                <Text strong>Taux de Rétention</Text>
                <Progress 
                  percent={94} 
                  showInfo
                  strokeColor="#722ed1"
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Section administration (Super Admin uniquement) */}
      {isSuperAdmin && (
        <Card 
          title="⚙️ Administration" 
          className="mt-6" 
          extra={<Badge count="Super Admin" style={{ backgroundColor: '#f50' }} />}
          hoverable
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Link to="/admin/organizations">
                <Card hoverable className="text-center bg-red-50 border-red-200">
                  <BankOutlined className="text-2xl text-red-500 mb-2" />
                  <div className="font-medium text-red-700">Organisations</div>
                </Card>
              </Link>
            </Col>
            <Col xs={12} sm={6}>
              <Link to="/admin/users">
                <Card hoverable className="text-center bg-blue-50 border-blue-200">
                  <TeamOutlined className="text-2xl text-blue-500 mb-2" />
                  <div className="font-medium text-blue-700">Utilisateurs</div>
                </Card>
              </Link>
            </Col>
            <Col xs={12} sm={6}>
              <Link to="/admin/modules">
                <Card hoverable className="text-center bg-green-50 border-green-200">
                  <SettingOutlined className="text-2xl text-green-500 mb-2" />
                  <div className="font-medium text-green-700">Modules</div>
                </Card>
              </Link>
            </Col>
            <Col xs={12} sm={6}>
              <Link to="/admin/settings">
                <Card hoverable className="text-center bg-gray-50 border-gray-200">
                  <SettingOutlined className="text-2xl text-gray-500 mb-2" />
                  <div className="font-medium text-gray-700">Paramètres</div>
                </Card>
              </Link>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
}
