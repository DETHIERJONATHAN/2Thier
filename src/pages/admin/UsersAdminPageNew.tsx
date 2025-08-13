import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Table, 
  Button, 
  message, 
  Space, 
  Switch, 
  Tooltip, 
  Tag, 
  Popconfirm, 
  Tabs, 
  Card,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  Typography,
  Badge,
  Spin
} from 'antd';
import { 
  MailOutlined, 
  EditOutlined, 
  StopOutlined, 
  CheckCircleOutlined, 
  ApartmentOutlined, 
  PhoneOutlined, 
  DeleteOutlined, 
  UserAddOutlined, 
  TeamOutlined, 
  SendOutlined, 
  ThunderboltOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  GoogleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import InvitationModal from '../../components/admin/InvitationModal';
import EditUserModal from '../../components/admin/EditUserModal';
import UserOrganizationsModal from '../../components/admin/UserOrganizationsModal';
import UserGoogleWorkspaceModal from '../../components/admin/UserGoogleWorkspaceModal';
import UserTelnyxModal from '../../components/admin/UserTelnyxModal';
import { User, Role, UserService } from '../../types';
import { 
  formatUserName,
  formatUserEmail,
  getUserStatusConfig,
  getUserRoleColor,
  getStatusLabel,
  formatLastLogin,
  calculateUserStats,
  validateUserData,
  debounce
} from '../../utils/usersOptimizations';

const UsersAdminPageNew: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { permissions } = useAuth();
  const hasPermission = (permission: string) => permissions.includes(permission);

  // État général
  const [users, setUsers] = useState<User[]>([]);
  const [freeUsers, setFreeUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userServices, setUserServices] = useState<Record<string, UserService[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // Modals
  const [isInvitationModalVisible, setIsInvitationModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isManageOrgModalVisible, setIsManageOrgModalVisible] = useState(false);
  const [isGoogleWorkspaceModalVisible, setIsGoogleWorkspaceModalVisible] = useState(false);
  const [isTelnyxModalVisible, setIsTelnyxModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const apiInstance = useMemo(() => api, [api]);

  // Récupération des données
  const fetchUsers = useCallback(async () => {
    try {
      const usersResponse = await apiInstance.get('/users');
      const processUsers = (rawData: unknown[]) => rawData.map((u: any) => ({
        ...u,
        key: u.id,
        organizationId: u.UserOrganization?.[0]?.organizationId,
        organizationRole: u.UserOrganization?.[0]?.Role,
        userOrganizationId: u.UserOrganization?.[0]?.id,
        status: u.UserOrganization?.[0]?.status,
      }));

      let fetchedUsers: User[] = [];
      if (usersResponse?.success && Array.isArray(usersResponse.data)) {
        fetchedUsers = processUsers(usersResponse.data);
      } else if (Array.isArray(usersResponse)) {
        fetchedUsers = processUsers(usersResponse);
      }

      setUsers(fetchedUsers);

      // Récupération des services utilisateurs
      if (fetchedUsers.length > 0) {
        const userIds = fetchedUsers.map(user => user.id);
        const result = await apiInstance.post('/services/status/bulk', { userIds });
        if (result.success) {
          setUserServices(result.data);
        }
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des utilisateurs.");
    }
  }, [apiInstance]);

  const fetchFreeUsers = useCallback(async () => {
    try {
      const freeUsersResponse = await apiInstance.get('/users/free');
      if (freeUsersResponse?.success && Array.isArray(freeUsersResponse.data)) {
        setFreeUsers(freeUsersResponse.data);
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des utilisateurs libres.");
    }
  }, [apiInstance]);

  const fetchInvitations = useCallback(async () => {
    try {
      const invitationsResponse = await apiInstance.get('/users/invitations');
      if (invitationsResponse?.success && Array.isArray(invitationsResponse.data)) {
        setInvitations(invitationsResponse.data);
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des invitations.");
    }
  }, [apiInstance]);

  const fetchRoles = useCallback(async () => {
    try {
      const rolesResponse = await apiInstance.get('/roles?organizationId=current');
      if (rolesResponse?.success && Array.isArray(rolesResponse.data)) {
        setRoles(rolesResponse.data);
      } else if (Array.isArray(rolesResponse)) {
        setRoles(rolesResponse);
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des rôles.");
    }
  }, [apiInstance]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUsers(), fetchFreeUsers(), fetchInvitations(), fetchRoles()]);
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, fetchFreeUsers, fetchInvitations, fetchRoles]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Actions des utilisateurs
  const handleServiceToggle = async (userId: string, serviceName: 'email' | 'telnyx', currentlyActive: boolean) => {
    const endpoint = currentlyActive ? `/services/${serviceName}/disable/${userId}` : `/services/${serviceName}/enable/${userId}`;
    try {
      const response = await api.post(endpoint);
      if (response.success) {
        message.success(`Service ${serviceName} mis à jour.`);
        await fetchAllData();
      }
    } catch (error) {
      // géré par le hook
    }
  };
  
  const handleStatusChange = async (user: User, newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!user.userOrganizationId) {
      message.error("ID de relation manquant, impossible de changer le statut.");
      return;
    }
    try {
      const response = await api.patch(`/users/user-organizations/${user.userOrganizationId}`, { status: newStatus });
      if (response.success) {
        message.success(`Utilisateur ${newStatus === 'ACTIVE' ? 'réactivé' : 'désactivé'}.`);
        await fetchAllData();
      }
    } catch (error) {
      // Le hook gère l'erreur
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalVisible(true);
  };

  const handleManageOrganizations = (user: User) => {
    setSelectedUser(user);
    setIsManageOrgModalVisible(true);
  };

  const handleGoogleWorkspace = (user: User) => {
    setSelectedUser(user);
    setIsGoogleWorkspaceModalVisible(true);
  };

  const handleTelnyx = (user: User) => {
    setSelectedUser(user);
    setIsTelnyxModalVisible(true);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await apiInstance.delete(`/users/${user.id}`);
      message.success(`Utilisateur ${user.email} supprimé avec succès`);
      // 🔄 Recharger TOUTES les données après suppression
      await fetchAllData();
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as any)?.response?.data?.message || 'Erreur lors de la suppression'
        : 'Erreur lors de la suppression de l\'utilisateur';
      message.error(errorMessage);
    }
  };

  const handleModalClose = () => {
    setIsEditModalVisible(false);
    setIsManageOrgModalVisible(false);
    setIsGoogleWorkspaceModalVisible(false);
    setSelectedUser(null);
    fetchAllData();
  };

  const handleInviteSuccess = () => {
    setIsInvitationModalVisible(false);
    fetchAllData();
  };

  // Action pour inviter un utilisateur libre
  const handleInviteFreeUser = (user: User) => {
    // TODO: Implémenter la logique d'invitation des utilisateurs libres
    message.info(`Inviter ${user.email} dans votre organisation`);
  };

  // Action pour accepter une invitation (force-accept)
  const handleForceAcceptInvitation = async (invitation: any) => {
    try {
      const response = await apiInstance.post(`/users/invitations/${invitation.id}/force-accept`);
      if (response.success) {
        message.success(`Invitation acceptée automatiquement pour ${invitation.email}`);
        await fetchAllData();
      }
    } catch (error) {
      // Le hook gère l'erreur
    }
  };

  // Action pour supprimer une invitation
  const handleDeleteInvitation = async (invitation: any) => {
    try {
      const response = await apiInstance.delete(`/users/invitations/${invitation.id}`);
      if (response.success) {
        message.success(`Invitation pour ${invitation.email} supprimée avec succès`);
        await fetchAllData();
      }
    } catch (error) {
      // Le hook gère l'erreur
    }
  };

  // Colonnes pour les utilisateurs normaux
  const userColumns = [
    { title: 'Nom', dataIndex: 'lastName', key: 'lastName', sorter: (a: User, b: User) => a.lastName.localeCompare(b.lastName) },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName', sorter: (a: User, b: User) => a.firstName.localeCompare(b.firstName) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Rôle', dataIndex: ['organizationRole', 'name'], key: 'role' },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string, record: User) => {
        const isActive = status === 'ACTIVE';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag color={isActive ? 'green' : 'red'}>
              {isActive ? 'Actif' : 'Inactif'}
            </Tag>
            <Switch
              checked={isActive}
              onChange={(checked) => handleStatusChange(record, checked ? 'ACTIVE' : 'INACTIVE')}
              size="small"
            />
          </div>
        );
      }
    },
    {
      title: 'Services',
      key: 'services',
      render: (_: unknown, record: User) => {
        const services = userServices[record.id] || [];
        const emailService = services.find(s => s.serviceName === 'email');
        const telnyxService = services.find(s => s.serviceName === 'telnyx');
        
        return (
          <Space>
            <Tooltip title={`Email ${emailService?.isActive ? 'activé' : 'désactivé'}`}>
              <Switch
                checked={emailService?.isActive || false}
                onChange={(checked) => handleServiceToggle(record.id, 'email', !checked)}
                size="small"
                checkedChildren={<MailOutlined />}
                unCheckedChildren={<MailOutlined />}
              />
            </Tooltip>
            <Tooltip title={`Telnyx ${telnyxService?.isActive ? 'activé' : 'désactivé'}`}>
              <Switch
                checked={telnyxService?.isActive || false}
                onChange={(checked) => handleServiceToggle(record.id, 'telnyx', !checked)}
                size="small"
                checkedChildren={<PhoneOutlined />}
                unCheckedChildren={<PhoneOutlined />}
              />
            </Tooltip>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          {(hasPermission('admin') || hasPermission('super_admin')) && (
            <Tooltip title="Modifier">
              <Button icon={<EditOutlined />} onClick={() => handleEditUser(record)} />
            </Tooltip>
          )}
          {(record.organizationId && record.UserOrganization?.[0]?.Organization?.googleWorkspaceConfig && 
            (hasPermission('super_admin') || hasPermission('admin'))) && (
            <Tooltip title="Google Workspace">
              <Button 
                icon={<GoogleOutlined />} 
                onClick={() => handleGoogleWorkspace(record)}
                style={{ color: '#4285F4' }}
              />
            </Tooltip>
          )}
          {(record.organizationId && (hasPermission('super_admin') || hasPermission('admin'))) && (
            <Tooltip title="Telnyx">
              <Button 
                icon={<PhoneOutlined />} 
                onClick={() => handleTelnyx(record)}
                style={{ color: '#FF6B6B' }}
              />
            </Tooltip>
          )}
          {hasPermission('super_admin') && (
            <Tooltip title="Gérer les organisations">
              <Button icon={<ApartmentOutlined />} onClick={() => handleManageOrganizations(record)} />
            </Tooltip>
          )}
          {hasPermission('super_admin') && (
            <Popconfirm
              title="Supprimer l'utilisateur"
              description={`Êtes-vous sûr de vouloir supprimer ${record.email} ? Cette action est irréversible.`}
              onConfirm={() => handleDeleteUser(record)}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Supprimer l'utilisateur">
                <Button icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Colonnes pour les utilisateurs libres
  const freeUserColumns = [
    { title: 'Nom', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Date inscription', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <Button 
            type="primary" 
            icon={<UserAddOutlined />} 
            onClick={() => handleInviteFreeUser(record)}
          >
            Inviter
          </Button>
          {hasPermission('super_admin') && (
            <Popconfirm
              title="Supprimer l'utilisateur"
              description={`Êtes-vous sûr de vouloir supprimer ${record.email} ? Cette action est irréversible.`}
              onConfirm={() => handleDeleteUser(record)}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Supprimer l'utilisateur">
                <Button icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Colonnes pour les invitations
  const invitationColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Organisation', dataIndex: ['organization', 'name'], key: 'organization' },
    { title: 'Rôle', dataIndex: ['role', 'name'], key: 'role' },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'PENDING' ? 'orange' : 'red'}>{status}</Tag> },
    { title: 'Date création', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Expire le', dataIndex: 'expiresAt', key: 'expiresAt', render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: any) => (
        <Space>
          <Tooltip title="Accepter automatiquement">
            <Button 
              type="primary" 
              icon={<ThunderboltOutlined />} 
              onClick={() => handleForceAcceptInvitation(record)}
              disabled={record.status !== 'PENDING'}
            >
              Force Accept
            </Button>
          </Tooltip>
          <Tooltip title="Renvoyer l'invitation">
            <Button icon={<SendOutlined />} disabled={record.status !== 'PENDING'}>
              Renvoyer
            </Button>
          </Tooltip>
          <Popconfirm
            title="Supprimer l'invitation"
            description="Êtes-vous sûr de vouloir supprimer cette invitation ?"
            onConfirm={() => handleDeleteInvitation(record)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer l'invitation">
              <Button icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

const { Title } = Typography;

  return (
    <div>
      {/* 📊 EN-TÊTE AMÉLIORÉ AVEC STATISTIQUES */}
      <div className="mb-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: 12, color: '#1890ff' }} />
            Gestion des Utilisateurs
          </Title>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsInvitationModalVisible(true)} size="large">
            Inviter un utilisateur
          </Button>
        </div>

        {/* 📈 STATISTIQUES RAPIDES */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Utilisateurs"
                value={users.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Utilisateurs Actifs"
                value={users.filter(u => u.status === 'ACTIVE').length}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Invitations En Attente"
                value={invitations.length}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Utilisateurs Libres"
                value={freeUsers.length}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined />
                Utilisateurs ({users.length})
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={userColumns}
                  dataSource={users}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'free-users',
            label: (
              <span>
                <UserAddOutlined />
                Utilisateurs libres ({freeUsers.length})
              </span>
            ),
            children: (
              <Card>
                <div style={{ marginBottom: 16 }}>
                  <Tag color="blue">
                    Ces utilisateurs se sont inscrits librement et n'appartiennent à aucune organisation
                  </Tag>
                </div>
                <Table
                  columns={freeUserColumns}
                  dataSource={freeUsers}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'invitations',
            label: (
              <span>
                <SendOutlined />
                Invitations ({invitations.length})
              </span>
            ),
            children: (
              <Card>
                <Table
                  columns={invitationColumns}
                  dataSource={invitations}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modals */}
      <InvitationModal
        visible={isInvitationModalVisible}
        onCancel={() => setIsInvitationModalVisible(false)}
        onSuccess={handleInviteSuccess}
        roles={roles.filter(r => r.name !== 'SuperAdmin')}
      />

      {selectedUser && (hasPermission('admin') || hasPermission('super_admin')) && (
        <EditUserModal
          open={isEditModalVisible}
          user={selectedUser}
          onCancel={handleModalClose}
          onSuccess={handleModalClose}
          roles={roles}
        />
      )}

      {selectedUser && hasPermission('super_admin') && (
        <UserOrganizationsModal
          visible={isManageOrgModalVisible}
          user={selectedUser}
          onCancel={handleModalClose}
          onSuccess={handleModalClose}
        />
      )}

      {selectedUser && (hasPermission('admin') || hasPermission('super_admin')) && (
        <UserGoogleWorkspaceModal
          visible={isGoogleWorkspaceModalVisible}
          user={selectedUser}
          onCancel={handleModalClose}
          onSuccess={handleModalClose}
        />
      )}

      {selectedUser && (hasPermission('admin') || hasPermission('super_admin')) && (
        <UserTelnyxModal
          visible={isTelnyxModalVisible}
          user={selectedUser}
          onClose={() => setIsTelnyxModalVisible(false)}
        />
      )}
    </div>
  );
};

export default UsersAdminPageNew;
