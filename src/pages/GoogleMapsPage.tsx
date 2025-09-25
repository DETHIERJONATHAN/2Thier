import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, message, Typography, Card, Row, Spin, Empty, Tag } from 'antd';
import { EnvironmentOutlined, PlusOutlined, SearchOutlined, SyncOutlined, CarOutlined, HomeOutlined, PushpinOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title } = Typography;
const { Search } = Input;

// Interface pour un lieu Google Maps
interface MapsPlace {
  id: string;
  name: string;
  address: string;
  type: 'client' | 'prospect' | 'personnel';
  lastVisit: string;
}

// Interface pour les statistiques
interface MapsStats {
  totalPlaces: number;
  clientPlaces: number;
  prospectPlaces: number;
}

export const GoogleMapsPage: React.FC = () => {
  const [places, setPlaces] = useState<MapsPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MapsStats>({ totalPlaces: 0, clientPlaces: 0, prospectPlaces: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [msgApi, msgCtx] = message.useMessage();

  useAuthenticatedApi();
  const { user } = useAuth();

  const fetchPlaces = React.useCallback(async () => {
    setLoading(true);
    try {
      // Simulation d'une réponse d'API pour Google Maps
      const mockPlaces: MapsPlace[] = [
        { id: '1', name: 'TechCorp', address: '123 Rue de la Tech, Paris', type: 'client', lastVisit: new Date().toISOString() },
        { id: '2', name: 'Innov S.A.', address: '456 Avenue de l\'Innovation, Lyon', type: 'prospect', lastVisit: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', name: 'Bureau', address: '789 Boulevard du Travail, Marseille', type: 'personnel', lastVisit: new Date().toISOString() },
      ];
      setPlaces(mockPlaces);
      updateStats(mockPlaces);
    } catch (error) {
      msgApi.error('Erreur lors de la récupération des lieux Google Maps.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    if (user) {
      fetchPlaces();
    }
  }, [user, fetchPlaces]);

  const updateStats = (data: MapsPlace[]) => {
    setStats({
      totalPlaces: data.length,
      clientPlaces: data.filter(p => p.type === 'client').length,
      prospectPlaces: data.filter(p => p.type === 'prospect').length,
    });
  };

  const filteredPlaces = useMemo(() => {
    return places.filter(place =>
      place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      place.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [places, searchTerm]);

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Adresse',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        let color = 'default';
        if (type === 'client') color = 'success';
        if (type === 'prospect') color = 'processing';
        return <Tag color={color}>{type.charAt(0).toUpperCase() + type.slice(1)}</Tag>;
      },
    },
    {
      title: 'Dernière visite',
      dataIndex: 'lastVisit',
      key: 'lastVisit',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: MapsPlace) => (
        <Button type="primary" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.address)}`, '_blank')}>
          Voir sur la carte
        </Button>
      ),
    },
  ];

  return (
    <div>
      {msgCtx}
      <PageHeader
        title="Google Maps"
        icon={<EnvironmentOutlined />}
        subtitle="Visualisez et gérez vos lieux importants."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => msgApi.info('Fonctionnalité à venir.')}>
              Ajouter un lieu
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchPlaces} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<PushpinOutlined />} title="Lieux enregistrés" value={stats.totalPlaces} loading={loading} />
        <StatCard icon={<HomeOutlined />} title="Clients" value={stats.clientPlaces} loading={loading} />
        <StatCard icon={<CarOutlined />} title="Prospects" value={stats.prospectPlaces} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Liste des lieux</Title>
        <Search
          placeholder="Rechercher un lieu..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredPlaces}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucun lieu trouvé." /> }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default GoogleMapsPage;
