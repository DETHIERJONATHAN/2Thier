import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Table, Input, message, Card, Row, Spin, Empty, Tooltip, Tag, Modal, Form, Select } from 'antd';
import { SettingOutlined, PlusOutlined, SyncOutlined, UserOutlined, TeamOutlined, SafetyOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';

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
  const [msgApi, msgCtx] = message.useMessage();
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [users, setUsers] = useState<GoogleAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeUsers: 0, suspendedUsers: 0, adminUsers: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<GoogleAdminUser | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [usersWithoutWorkspace, setUsersWithoutWorkspace] = useState<any[]>([]);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createForm] = Form.useForm();

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
      // ✅ Vraie API Google Workspace
      const response = await api.get('/api/google-workspace/users');
      
      if (response.success && response.data) {
        const workspaceUsers: GoogleAdminUser[] = response.data.map((wu: any) => ({
          id: wu.id,
          name: `${wu.User?.firstName || ''} ${wu.User?.lastName || ''}`.trim() || wu.email,
          email: wu.email,
          role: wu.User?.role?.toUpperCase() || 'USER',
          lastLoginTime: wu.lastSync || wu.createdAt || new Date().toISOString(),
          suspended: !wu.isActive,
          organizationalUnit: '/',
          creationTime: wu.createdAt || new Date().toISOString(),
        }));
        
        setUsers(workspaceUsers);
        updateStats(workspaceUsers);
      } else {
        // Fallback si pas de données
        setUsers([]);
        updateStats([]);
      }
    } catch (error) {
      msgApi.error('Erreur lors de la récupération des utilisateurs Google Workspace.');
      console.error('Erreur fetchUsers:', error);
      setUsers([]);
      updateStats([]);
    } finally {
      setLoading(false);
    }
  }, [updateStats, msgApi, api]);

  // Charger les utilisateurs sans compte workspace (pour le modal de création)
  const fetchUsersWithoutWorkspace = useCallback(async () => {
    try {
      const response = await api.get('/api/users?withoutWorkspace=true');
      if (response.success) {
        setUsersWithoutWorkspace(response.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement users sans workspace:', error);
    }
  }, [api]);

  // Créer un compte workspace pour un utilisateur existant
  const handleCreateWorkspaceAccount = async (values: { userId: string }) => {
    setCreatingAccount(true);
    try {
      const response = await api.post('/api/google-workspace/create-account', {
        userId: values.userId,
      });

      if (response.success) {
        msgApi.success(`Compte workspace créé : ${response.email || 'succès'}`);
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchUsers(); // Rafraîchir la liste
      } else {
        msgApi.error(response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      msgApi.error('Erreur lors de la création du compte workspace');
    } finally {
      setCreatingAccount(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUsersWithoutWorkspace();
  }, [fetchUsers, fetchUsersWithoutWorkspace]);

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
              onClick={() => msgApi.info(`Modification de ${record.name} (à implémenter)`)}
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
            onClick={() => {
              fetchUsersWithoutWorkspace();
              setCreateModalVisible(true);
            }}
          >
            Créer compte Workspace
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

      {/* ✅ Modal création compte Workspace */}
      <Modal
        title="Créer un compte Google Workspace"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={createForm}
          onFinish={handleCreateWorkspaceAccount}
          layout="vertical"
        >
          <Form.Item
            name="userId"
            label="Sélectionner un utilisateur"
            rules={[{ required: true, message: 'Veuillez sélectionner un utilisateur' }]}
          >
            <Select
              placeholder="Choisir un utilisateur sans compte Workspace"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {usersWithoutWorkspace.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {usersWithoutWorkspace.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Tous les utilisateurs ont déjà un compte Google Workspace.
            </div>
          )}

          <Form.Item className="mb-0 text-right">
            <Button onClick={() => setCreateModalVisible(false)} className="mr-2">
              Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={creatingAccount}
              disabled={usersWithoutWorkspace.length === 0}
            >
              Créer le compte
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GoogleAdminPage;
