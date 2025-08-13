import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, Modal, message, Typography, Card, Row, Spin, Empty, Tooltip, Tag } from 'antd';
import { BarChartOutlined, PlusOutlined, SearchOutlined, SyncOutlined, UserOutlined, GlobalOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title } = Typography;
const { Search } = Input;

// Interface pour les données Google Analytics
interface AnalyticsData {
  id: string;
  page: string;
  views: number;
  uniqueVisitors: number;
  avgTimeOnPage: number; // en secondes
}

// Interface pour les statistiques
interface AnalyticsStats {
  totalViews: number;
  totalVisitors: number;
  mostViewedPage: string;
}

export const GoogleAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats>({ totalViews: 0, totalVisitors: 0, mostViewedPage: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Simulation d'une réponse d'API pour Google Analytics
      const mockData: AnalyticsData[] = [
        { id: '1', page: '/accueil', views: 1250, uniqueVisitors: 800, avgTimeOnPage: 180 },
        { id: '2', page: '/produits', views: 980, uniqueVisitors: 650, avgTimeOnPage: 240 },
        { id: '3', page: '/contact', views: 450, uniqueVisitors: 300, avgTimeOnPage: 90 },
      ];
      setData(mockData);
      updateStats(mockData);
    } catch (error) {
      message.error('Erreur lors de la récupération des données Google Analytics.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const updateStats = (analyticsData: AnalyticsData[]) => {
    const totalViews = analyticsData.reduce((acc, item) => acc + item.views, 0);
    const totalVisitors = analyticsData.reduce((acc, item) => acc + item.uniqueVisitors, 0);
    const mostViewedPage = analyticsData.reduce((prev, current) => (prev.views > current.views) ? prev : current).page;
    
    setStats({
      totalViews,
      totalVisitors,
      mostViewedPage,
    });
  };

  const filteredData = useMemo(() => {
    return data.filter(item =>
      item.page.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const columns = [
    {
      title: 'Page',
      dataIndex: 'page',
      key: 'page',
    },
    {
      title: 'Vues',
      dataIndex: 'views',
      key: 'views',
      sorter: (a: AnalyticsData, b: AnalyticsData) => a.views - b.views,
    },
    {
      title: 'Visiteurs uniques',
      dataIndex: 'uniqueVisitors',
      key: 'uniqueVisitors',
      sorter: (a: AnalyticsData, b: AnalyticsData) => a.uniqueVisitors - b.uniqueVisitors,
    },
    {
      title: 'Temps moyen (min)',
      dataIndex: 'avgTimeOnPage',
      key: 'avgTimeOnPage',
      render: (time: number) => (time / 60).toFixed(2),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Google Analytics"
        icon={<BarChartOutlined />}
        subtitle="Analysez les performances de votre site web."
        actions={
          <>
            <Button type="primary" onClick={() => window.open('https://analytics.google.com', '_blank')}>
              Voir le tableau de bord complet
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<GlobalOutlined />} title="Vues totales" value={stats.totalViews} loading={loading} />
        <StatCard icon={<UserOutlined />} title="Visiteurs uniques" value={stats.totalVisitors} loading={loading} />
        <StatCard icon={<i className="fas fa-file"></i>} title="Page la plus vue" value={stats.mostViewedPage} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Données par page</Title>
        <Search
          placeholder="Rechercher une page..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucune donnée trouvée." /> }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default GoogleAnalyticsPage;
