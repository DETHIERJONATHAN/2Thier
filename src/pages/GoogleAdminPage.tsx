import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Table, Input, message, Card, Row, Spin, Empty, Tooltip, Tag, Modal } from 'antd';
import { SettingOutlined, PlusOutlined, SyncOutlined, UserOutlined, TeamOutlined, SafetyOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';

const { Search } = Input;

// Interface pour un utilisateur Google Admin
interface GoogleAdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  lastLoginTime: string;
  suspended: boolean;
  organizationalUnit: string;
  creationTime: string;
}

// Interface pour les statistiques
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
}

export const GoogleAdminPage: React.FC = () => {
  const [users, setUsers] = useState<GoogleAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, adminUsers: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<GoogleAdminUser | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const { api } = useAuthenticatedApi(); // TODO: Utiliser pour les vrais appels API
  const { user } = useAuth(); // TODO: Utiliser pour personnaliser l'affichage

  const updateStats = useCallback((usersData: GoogleAdminUser[]) => {
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => !u.suspended).length;
    const suspendedUsers = usersData.filter(u => u.suspended).length;
    const adminUsers = usersData.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;

    setStats({ totalUsers, activeUsers, suspendedUsers, adminUsers });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par un vrai appel API Google Admin
      // const response = await api.get('/google/admin/users');
      
      // Simulation d'une réponse d'API pour Google Admin
      const mockUsers: GoogleAdminUser[] = [
        { 
          id: '1', 
          name: 'Jean Dupont', 
          email: 'jean.dupont@organisation.be', 
          role: 'SUPER_ADMIN',
          lastLoginTime: new Date().toISOString(),
          suspended: false,
          organizationalUnit: '/Administrators',
          creationTime: '2023-01-15T10:30:00Z'
        },
        { 
          id: '2', 
          name: 'Marie Martin', 
          email: 'marie.martin@organisation.be', 
          role: 'ADMIN',
          lastLoginTime: new Date(Date.now() - 86400000).toISOString(),
          suspended: false,
          organizationalUnit: '/IT Department',
          creationTime: '2023-02-20T14:15:00Z'
        },
        { 
          id: '3', 
          name: 'Pierre Durand', 
          email: 'pierre.durand@organisation.be', 
          role: 'USER',
          lastLoginTime: new Date(Date.now() - 3600000).toISOString(),
          suspended: false,
          organizationalUnit: '/Sales',
          creationTime: '2023-03-10T09:45:00Z'
        },
        { 
          id: '4', 
          name: 'Sophie Legrand', 
          email: 'sophie.legrand@organisation.be', 
          role: 'USER',
          lastLoginTime: new Date(Date.now() - 172800000).toISOString(),
          suspended: true,
          organizationalUnit: '/Marketing',
          creationTime: '2023-04-05T16:20:00Z'
        },
      ];
      setUsers(mockUsers);
      updateStats(mockUsers);
    } catch (error) {
      message.error('Erreur lors de la récupération des utilisateurs Google Admin.');
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [updateStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtrage des utilisateurs selon le terme de recherche
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organizationalUnit.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const getRoleTag = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Tag color="red">Super Admin</Tag>;
      case 'ADMIN':
        return <Tag color="orange">Admin</Tag>;
      case 'USER':
        return <Tag color="blue">Utilisateur</Tag>;
      default:
        return <Tag>{role}</Tag>;
    }
  };

  const getStatusTag = (suspended: boolean) => {
    return suspended ? 
      <Tag color="red">Suspendu</Tag> : 
      <Tag color="green">Actif</Tag>;
  };

  const handleViewDetails = (user: GoogleAdminUser) => {
    setSelectedUser(user);
    setDetailsModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const columns = [
    {
      title: 'Utilisateur',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GoogleAdminUser) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-xs text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: 'Statut',
      dataIndex: 'suspended',
      key: 'suspended',
      render: (suspended: boolean) => getStatusTag(suspended),
    },
    {
      title: 'Unité organisationnelle',
      dataIndex: 'organizationalUnit',
      key: 'organizationalUnit',
      ellipsis: true,
    },
    {
      title: 'Dernière connexion',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      render: (date: string) => (
        <span className="text-sm">{formatDate(date)}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_, record: GoogleAdminUser) => (
        <div className="flex gap-2 justify-center">
          <Tooltip title="Voir les détails">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => message.info(`Modification de ${record.name} (à implémenter)`)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Google Admin"
        subtitle="Gestion des utilisateurs et administration Google Workspace"
        icon={<SettingOutlined />}
      />

      {/* Statistiques */}
      <Row gutter={[16, 16]} className="mb-6">
        <StatCard
          title="Total utilisateurs"
          value={stats.totalUsers}
          icon={<UserOutlined />}
          color="#1890ff"
        />
        <StatCard
          title="Utilisateurs actifs"
          value={stats.activeUsers}
          icon={<SafetyOutlined />}
          color="#52c41a"
        />
        <StatCard
          title="Utilisateurs suspendus"
          value={stats.suspendedUsers}
          icon={<UserOutlined />}
          color="#ff4d4f"
        />
        <StatCard
          title="Administrateurs"
          value={stats.adminUsers}
          icon={<TeamOutlined />}
          color="#722ed1"
        />
      </Row>

      {/* Carte principale */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3">
            <Search
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Button 
              icon={<SyncOutlined />}
              onClick={fetchUsers}
              loading={loading}
            >
              Actualiser
            </Button>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => message.info('Création d\'un nouvel utilisateur (à implémenter)')}
          >
            Nouvel utilisateur
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-2">Chargement des utilisateurs...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Empty
            description={searchTerm ? "Aucun utilisateur trouvé pour cette recherche" : "Aucun utilisateur trouvé"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} utilisateurs`,
            }}
          />
        )}
      </Card>

      {/* Modal des détails */}
      <Modal
        title={`Détails de ${selectedUser?.name}`}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Fermer
          </Button>
        ]}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <strong>Nom :</strong> {selectedUser.name}
            </div>
            <div>
              <strong>Email :</strong> {selectedUser.email}
            </div>
            <div>
              <strong>Rôle :</strong> {getRoleTag(selectedUser.role)}
            </div>
            <div>
              <strong>Statut :</strong> {getStatusTag(selectedUser.suspended)}
            </div>
            <div>
              <strong>Unité organisationnelle :</strong> {selectedUser.organizationalUnit}
            </div>
            <div>
              <strong>Date de création :</strong> {formatDate(selectedUser.creationTime)}
            </div>
            <div>
              <strong>Dernière connexion :</strong> {formatDate(selectedUser.lastLoginTime)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GoogleAdminPage;
