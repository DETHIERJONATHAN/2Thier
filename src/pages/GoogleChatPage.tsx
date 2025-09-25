import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Table, Input, message, Typography, Card, Row, Spin, Empty, Tag, Avatar } from 'antd';
import { MessageOutlined, PlusOutlined, SyncOutlined, UsergroupAddOutlined, WechatOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Title } = Typography;
const { Search } = Input;

// Interface pour une conversation Google Chat
interface ChatConversation {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  members: { name: string, avatarUrl?: string }[];
  isGroup: boolean;
}

// Interface pour les statistiques
interface ChatStats {
  totalConversations: number;
  groupChats: number;
  directMessages: number;
}

export const GoogleChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChatStats>({ totalConversations: 0, groupChats: 0, directMessages: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const { api } = useAuthenticatedApi();
  const { user } = useAuth();

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Simulation d'une réponse d'API pour Google Chat
      const mockConversations: ChatConversation[] = [
        { id: '1', name: 'Projet CRM', lastMessage: 'N\'oubliez pas la démo de demain.', lastMessageTimestamp: new Date().toISOString(), members: [{ name: 'Alice' }, { name: 'Bob' }, { name: user?.firstName || 'Moi' }], isGroup: true },
        { id: '2', name: 'Alice', lastMessage: 'Peux-tu vérifier le rapport ?', lastMessageTimestamp: new Date(Date.now() - 3600000).toISOString(), members: [{ name: 'Alice' }], isGroup: false },
        { id: '3', name: 'Marketing Team', lastMessage: 'Nouvelle campagne lancée !', lastMessageTimestamp: new Date(Date.now() - 86400000).toISOString(), members: [{ name: 'Claire' }, { name: 'David' }], isGroup: true },
      ];
      setConversations(mockConversations);
      updateStats(mockConversations);
    } catch (error) {
      message.error('Erreur lors de la récupération des conversations Google Chat.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const updateStats = (data: ChatConversation[]) => {
    setStats({
      totalConversations: data.length,
      groupChats: data.filter(c => c.isGroup).length,
      directMessages: data.filter(c => !c.isGroup).length,
    });
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const columns = [
    {
      title: 'Conversation',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ChatConversation) => (
        <div>
          <Avatar.Group maxCount={2}>
            {record.members.map(m => <Avatar key={m.name}>{m.name.charAt(0)}</Avatar>)}
          </Avatar.Group>
          <span style={{ marginLeft: 8 }}>{name}</span>
          {record.isGroup && <Tag style={{ marginLeft: 8 }}>Groupe</Tag>}
        </div>
      ),
    },
    {
      title: 'Dernier message',
      dataIndex: 'lastMessage',
      key: 'lastMessage',
    },
    {
      title: 'Date',
      dataIndex: 'lastMessageTimestamp',
      key: 'lastMessageTimestamp',
      sorter: (a: ChatConversation, b: ChatConversation) => new Date(a.lastMessageTimestamp).getTime() - new Date(b.lastMessageTimestamp).getTime(),
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button type="primary" onClick={() => window.open('https://chat.google.com', '_blank')}>
          Ouvrir dans Google Chat
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Google Chat"
        icon={<WechatOutlined />}
        subtitle="Communiquez avec votre équipe en temps réel."
        actions={
          <>
            <Button icon={<PlusOutlined />} type="primary" onClick={() => window.open('https://chat.google.com', '_blank')}>
              Nouveau Message
            </Button>
            <Button icon={<SyncOutlined />} onClick={fetchConversations} loading={loading}>
              Synchroniser
            </Button>
          </>
        }
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <StatCard icon={<MessageOutlined />} title="Conversations" value={stats.totalConversations} loading={loading} />
        <StatCard icon={<UsergroupAddOutlined />} title="Discussions de groupe" value={stats.groupChats} loading={loading} />
        <StatCard icon={<i className="fas fa-user"></i>} title="Messages directs" value={stats.directMessages} loading={loading} />
      </Row>

      <Card>
        <Title level={4}>Liste des conversations</Title>
        <Search
          placeholder="Rechercher une conversation..."
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginBottom: 20, width: 300 }}
          enterButton={<SearchOutlined />}
        />
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredConversations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucune conversation trouvée." /> }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default GoogleChatPage;
