import React, { useState, useEffect, useMemo } from 'react';
import { Button, Table, Input, Modal, message, Typography, Card, Row, Spin, Empty, Tooltip, Tag } from 'antd';
import { PushpinOutlined, PlusOutlined, SearchOutlined, SyncOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title, Paragraph } = Typography;
const { Search } = Input;

// Interface pour une note Google Keep
interface KeepNote {
  id: string;
  title: string;
  content: string;
  lastModified: string;
  color: string;
  isPinned: boolean;
}

// Interface pour les statistiques
interface KeepStats {
  totalNotes: number;
  pinnedNotes: number;
}

export const GoogleKeepPage: React.FC = () => {
  const [notes, setNotes] = useState<KeepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KeepStats>({ totalNotes: 0, pinnedNotes: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Simulation d'une réponse d'API pour Google Keep
      const mockNotes: KeepNote[] = [
        { id: '1', title: 'Idées Projet CRM', content: 'Ajouter une fonctionnalité IA.', lastModified: new Date().toISOString(), color: 'yellow', isPinned: true },
        { id: '2', title: 'Contacts à appeler', content: 'Alice, Bob, Claire', lastModified: new Date(Date.now() - 3600000).toISOString(), color: 'blue', isPinned: false },
        { id: '3', title: 'Rapport hebdomadaire', content: 'Finaliser les stats de vente.', lastModified: new Date(Date.now() - 86400000).toISOString(), color: 'white', isPinned: false },
      ];
      setNotes(mockNotes);
      updateStats(mockNotes);
    } catch (error) {
      message.error('Erreur lors de la récupération des notes Google Keep.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const updateStats = (data: KeepNote[]) => {
    setStats({
      totalNotes: data.length,
      pinnedNotes: data.filter(n => n.isPinned).length,
    });
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [notes, searchTerm]);

  return (
    <div>
      <PageHeader
        title="Google Keep"
        icon={<PushpinOutlined />}
        subtitle="Organisez vos idées et notes importantes."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => window.open('https://keep.google.com', '_blank')}>
              Nouvelle Note
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchNotes} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<PushpinOutlined />} title="Notes" value={stats.totalNotes} loading={loading} />
        <StatCard icon={<i className="fas fa-thumbtack"></i>} title="Notes épinglées" value={stats.pinnedNotes} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Vos notes</Title>
        <Search
          placeholder="Rechercher une note..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {filteredNotes.map(note => (
              <Col key={note.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  title={note.title}
                  style={{ backgroundColor: note.color, height: '100%' }}
                  extra={note.isPinned && <PushpinOutlined />}
                  actions={[
                    <Tooltip title="Modifier"><EditOutlined onClick={() => window.open('https://keep.google.com', '_blank')} /></Tooltip>,
                    <Tooltip title="Supprimer"><DeleteOutlined onClick={() => message.info('Suppression à faire dans Google Keep.')} /></Tooltip>,
                  ]}
                >
                  <Paragraph ellipsis={{ rows: 4 }}>{note.content}</Paragraph>
                  <Text type="secondary">{new Date(note.lastModified).toLocaleDateString()}</Text>
                </Card>
              </Col>
            ))}
          </Row>
          {filteredNotes.length === 0 && !loading && <Empty description="Aucune note trouvée." />}
        </Spin>
      </Card>
    </div>
  );
};

export default GoogleKeepPage;
