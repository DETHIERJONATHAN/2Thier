import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, Modal, message, Typography, Card, Row, Spin, Empty, Tooltip, Tag } from 'antd';
import { PhoneOutlined, PlusOutlined, SearchOutlined, SyncOutlined, MessageOutlined, AudioOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title } = Typography;
const { Search } = Input;

// Interface pour un appel ou SMS Google Voice
interface VoiceActivity {
  id: string;
  type: 'call' | 'sms';
  from: string;
  to: string;
  startTime: string;
  duration?: number; // en secondes pour les appels
  content?: string; // pour les SMS
  direction: 'inbound' | 'outbound';
}

// Interface pour les statistiques
interface VoiceStats {
  totalCalls: number;
  totalSMS: number;
  totalDuration: number; // en minutes
}

export const GoogleVoicePage: React.FC = () => {
  const [activities, setActivities] = useState<VoiceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VoiceStats>({ totalCalls: 0, totalSMS: 0, totalDuration: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // Note: L'API Google Voice n'est pas directement exposée de la même manière que Drive.
      // Nous simulons ici une réponse d'API.
      // Dans une implémentation réelle, il faudrait un backend qui interagit avec l'API Google Voice.
      const mockActivities: VoiceActivity[] = [
        { id: '1', type: 'call', from: '+15551234567', to: user?.phoneNumber || '', startTime: new Date().toISOString(), duration: 125, direction: 'inbound' },
        { id: '2', type: 'sms', from: '+15559876543', to: user?.phoneNumber || '', startTime: new Date(Date.now() - 3600000).toISOString(), content: 'Bonjour, c\'est pour notre rdv.', direction: 'inbound' },
        { id: '3', type: 'call', from: user?.phoneNumber || '', to: '+15557654321', startTime: new Date(Date.now() - 86400000).toISOString(), duration: 340, direction: 'outbound' },
      ];
      setActivities(mockActivities);
      updateStats(mockActivities);
    } catch (error) {
      message.error('Erreur lors de la récupération des activités Google Voice.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const updateStats = (data: VoiceActivity[]) => {
    const totalCalls = data.filter(a => a.type === 'call').length;
    const totalSMS = data.filter(a => a.type === 'sms').length;
    const totalDuration = data.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    
    setStats({
      totalCalls,
      totalSMS,
      totalDuration: Math.round(totalDuration / 60),
    });
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(act =>
      act.from.includes(searchTerm) || act.to.includes(searchTerm) || act.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activities, searchTerm]);

  const columns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'call' | 'sms') => (
        type === 'call' ? <Tag color="blue" icon={<PhoneOutlined />}>Appel</Tag> : <Tag color="green" icon={<MessageOutlined />}>SMS</Tag>
      ),
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      key: 'direction',
      render: (direction: 'inbound' | 'outbound') => (
        direction === 'inbound' ? <Tag color="cyan">Entrant</Tag> : <Tag color="purple">Sortant</Tag>
      ),
    },
    {
      title: 'Contact',
      dataIndex: 'from',
      key: 'contact',
      render: (from: string, record: VoiceActivity) => (
        record.direction === 'inbound' ? from : record.to
      ),
    },
    {
      title: 'Date et Heure',
      dataIndex: 'startTime',
      key: 'startTime',
      sorter: (a: VoiceActivity, b: VoiceActivity) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Détails',
      key: 'details',
      render: (_: any, record: VoiceActivity) => (
        record.type === 'call' ? `${Math.round((record.duration || 0) / 60)} min` : record.content
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Google Voice"
        icon={<PhoneOutlined />}
        subtitle="Gérez vos appels et SMS professionnels."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => message.info('Fonctionnalité à venir.')}>
              Nouvel Appel
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchActivities} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<PhoneOutlined />} title="Appels" value={stats.totalCalls} loading={loading} />
        <StatCard icon={<MessageOutlined />} title="SMS" value={stats.totalSMS} loading={loading} />
        <StatCard icon={<AudioOutlined />} title="Durée totale (min)" value={stats.totalDuration} loading={loading} />
        <StatCard icon={<UserOutlined />} title="Votre numéro" value={user?.phoneNumber || 'Non configuré'} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Historique des activités</Title>
        <Search
          placeholder="Rechercher par numéro ou contenu..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredActivities}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucune activité trouvée." /> }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default GoogleVoicePage;
