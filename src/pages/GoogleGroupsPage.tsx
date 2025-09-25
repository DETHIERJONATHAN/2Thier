import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Table, Input, message, Card, Row, Spin, Empty, Tooltip, Tag } from 'antd';
import { UsergroupAddOutlined, PlusOutlined, SyncOutlined, TeamOutlined, SettingOutlined, EyeOutlined } from '@ant-design/icons';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Search } = Input;

// Interface pour un groupe Google
interface GoogleGroup {
  id: string;
  name: string;
  email: string;
  description: string;
  memberCount: number;
  createdDate: string;
  isPublic: boolean;
  whoCanJoin: 'INVITED_CAN_JOIN' | 'CAN_REQUEST_TO_JOIN' | 'ALL_IN_DOMAIN';
  whoCanPost: 'ALL_MEMBERS' | 'ALL_MANAGERS' | 'NONE';
}

// Interface pour les statistiques
interface GroupsStats {
  totalGroups: number;
  publicGroups: number;
  privateGroups: number;
  totalMembers: number;
}

export const GoogleGroupsPage: React.FC = () => {
  const [msgApi, msgCtx] = message.useMessage();
  const [groups, setGroups] = useState<GoogleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GroupsStats>({ totalGroups: 0, publicGroups: 0, privateGroups: 0, totalMembers: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // TODO: Utiliser useAuthenticatedApi et useAuth quand l'implémentation backend sera prête

  const updateStats = useCallback((groupsData: GoogleGroup[]) => {
    const totalGroups = groupsData.length;
    const publicGroups = groupsData.filter(g => g.isPublic).length;
    const privateGroups = totalGroups - publicGroups;
    const totalMembers = groupsData.reduce((sum, g) => sum + g.memberCount, 0);

    setStats({ totalGroups, publicGroups, privateGroups, totalMembers });
  }, []);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par un vrai appel API Google Groups
      // const response = await api.get('/google/groups');
      
      // Simulation d'une réponse d'API pour Google Groups
      const mockGroups: GoogleGroup[] = [
        { 
          id: '1', 
          name: 'Équipe Développement', 
          email: 'dev-team@organisation.be', 
          description: 'Groupe pour l\'équipe de développement', 
          memberCount: 12, 
          createdDate: '2024-01-15', 
          isPublic: false,
          whoCanJoin: 'INVITED_CAN_JOIN',
          whoCanPost: 'ALL_MEMBERS'
        },
        { 
          id: '2', 
          name: 'Annonces Générales', 
          email: 'annonces@organisation.be', 
          description: 'Annonces importantes pour tous les employés', 
          memberCount: 45, 
          createdDate: '2023-12-01', 
          isPublic: true,
          whoCanJoin: 'ALL_IN_DOMAIN',
          whoCanPost: 'ALL_MANAGERS'
        },
        { 
          id: '3', 
          name: 'Support Client', 
          email: 'support@organisation.be', 
          description: 'Groupe pour le support client', 
          memberCount: 8, 
          createdDate: '2024-02-10', 
          isPublic: false,
          whoCanJoin: 'CAN_REQUEST_TO_JOIN',
          whoCanPost: 'ALL_MEMBERS'
        },
      ];
      setGroups(mockGroups);
      updateStats(mockGroups);
    } catch (error) {
      msgApi.error('Erreur lors de la récupération des groupes Google.');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [updateStats, msgApi]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Filtrage des groupes selon le terme de recherche
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const getJoinPolicyTag = (policy: string) => {
    switch (policy) {
      case 'INVITED_CAN_JOIN':
        return <Tag color="red">Sur invitation</Tag>;
      case 'CAN_REQUEST_TO_JOIN':
        return <Tag color="orange">Demande requise</Tag>;
      case 'ALL_IN_DOMAIN':
        return <Tag color="green">Ouvert au domaine</Tag>;
      default:
        return <Tag>{policy}</Tag>;
    }
  };

  const getPostPolicyTag = (policy: string) => {
    switch (policy) {
      case 'ALL_MEMBERS':
        return <Tag color="blue">Tous les membres</Tag>;
      case 'ALL_MANAGERS':
        return <Tag color="purple">Managers seulement</Tag>;
      case 'NONE':
        return <Tag color="red">Aucun</Tag>;
      default:
        return <Tag>{policy}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Nom du groupe',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GoogleGroup) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Membres',
      dataIndex: 'memberCount',
      key: 'memberCount',
      align: 'center' as const,
      render: (count: number) => (
        <div className="flex items-center justify-center">
          <TeamOutlined className="mr-1" />
          {count}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'orange'}>
          {isPublic ? 'Public' : 'Privé'}
        </Tag>
      ),
    },
    {
      title: 'Qui peut rejoindre',
      dataIndex: 'whoCanJoin',
      key: 'whoCanJoin',
      render: (policy: string) => getJoinPolicyTag(policy),
    },
    {
      title: 'Qui peut publier',
      dataIndex: 'whoCanPost',
      key: 'whoCanPost',
      render: (policy: string) => getPostPolicyTag(policy),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_, record: GoogleGroup) => (
        <div className="flex gap-2 justify-center">
          <Tooltip title="Voir les détails">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => msgApi.info(`Affichage du groupe ${record.name}`)}
            />
          </Tooltip>
          <Tooltip title="Gérer les membres">
            <Button 
              type="text" 
              icon={<TeamOutlined />} 
              size="small"
              onClick={() => msgApi.info(`Gestion des membres du groupe ${record.name}`)}
            />
          </Tooltip>
          <Tooltip title="Paramètres">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              size="small"
              onClick={() => msgApi.info(`Paramètres du groupe ${record.name}`)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      {msgCtx}
      <PageHeader
        title="Google Groups"
        subtitle="Gestion des groupes de messagerie Google Workspace"
        icon={<UsergroupAddOutlined />}
      />

      {/* Statistiques */}
      <Row gutter={[16, 16]} className="mb-6">
        <StatCard
          title="Total des groupes"
          value={stats.totalGroups}
          icon={<UsergroupAddOutlined />}
          color="#1890ff"
        />
        <StatCard
          title="Groupes publics"
          value={stats.publicGroups}
          icon={<TeamOutlined />}
          color="#52c41a"
        />
        <StatCard
          title="Groupes privés"
          value={stats.privateGroups}
          icon={<SettingOutlined />}
          color="#fa8c16"
        />
        <StatCard
          title="Total des membres"
          value={stats.totalMembers}
          icon={<TeamOutlined />}
          color="#722ed1"
        />
      </Row>

      {/* Carte principale */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3">
            <Search
              placeholder="Rechercher un groupe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button 
              icon={<SyncOutlined />}
              onClick={fetchGroups}
              loading={loading}
            >
              Actualiser
            </Button>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => msgApi.info('Création d\'un nouveau groupe (à implémenter)')}
          >
            Créer un groupe
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-2">Chargement des groupes...</div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <Empty
            description={searchTerm ? "Aucun groupe trouvé pour cette recherche" : "Aucun groupe trouvé"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredGroups}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} groupes`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default GoogleGroupsPage;
