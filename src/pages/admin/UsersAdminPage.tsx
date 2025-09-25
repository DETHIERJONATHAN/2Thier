import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Button, message, Space, Switch, Tooltip, Tag, Popconfirm } from 'antd';
import { MailOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, ApartmentOutlined, PhoneOutlined, DeleteOutlined, GoogleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import InvitationModal from '../../components/admin/InvitationModal';
import EditUserModal from '../../components/admin/EditUserModal';
import UserOrganizationsModal from '../../components/admin/UserOrganizationsModal';
import UserGoogleWorkspaceModal from '../../components/admin/UserGoogleWorkspaceModal';
import InvitationsList from '../../components/admin/InvitationsList';
import { User, Role, UserService } from '../../types';

const UsersAdminPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  // Correction ici : on récupère 'permissions' et on crée 'hasPermission' manuellement
  const { permissions } = useAuth();
  const hasPermission = (permission: string) => permissions.includes(permission);

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userServices, setUserServices] = useState<Record<string, UserService[]>>({});
  const [loading, setLoading] = useState(true);
  const [isInvitationModalVisible, setIsInvitationModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isManageOrgModalVisible, setIsManageOrgModalVisible] = useState(false);
  const [isGoogleWorkspaceModalVisible, setIsGoogleWorkspaceModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [refreshInvitations, setRefreshInvitations] = useState(false);

  const apiInstance = useMemo(() => api, [api]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        apiInstance.get('/api/users'),
        apiInstance.get('/api/roles?organizationId=current')
      ]);

      let fetchedUsers: User[] = [];
      const processUsers = (rawData: any[]) => rawData.map((u: any) => ({
        ...u,
        key: u.id,
        organizationRole: u.UserOrganization?.[0]?.Role,
        userOrganizationId: u.UserOrganization?.[0]?.id,
        status: u.UserOrganization?.[0]?.status,
      }));

      if (usersResponse?.success && Array.isArray(usersResponse.data)) {
        fetchedUsers = processUsers(usersResponse.data);
      } else if (Array.isArray(usersResponse)) {
        fetchedUsers = processUsers(usersResponse);
      }
      setUsers(fetchedUsers);

      if (rolesResponse?.success && Array.isArray(rolesResponse.data)) {
        setRoles(rolesResponse.data);
      } else if (Array.isArray(rolesResponse)) {
        setRoles(rolesResponse);
      }

      if (fetchedUsers.length > 0) {
        const userIds = fetchedUsers.map(user => user.id);
        const result = await apiInstance.post('/services/status/bulk', { userIds });
        if (result.success) {
          setUserServices(result.data);
        }
      }
    } catch (error) {
      message.error("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  }, [apiInstance]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData, refreshInvitations]);

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
      const response = await api.patch(`/api/users/user-organizations/${user.userOrganizationId}`, { status: newStatus });
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

  const handleDeleteUser = async (user: User) => {
    try {
      await apiInstance.delete(`/users/${user.id}`);
      message.success(`Utilisateur ${user.email} supprimé avec succès`);
      fetchAllData(); // Recharger la liste des utilisateurs
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error?.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur';
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
    setRefreshInvitations(prev => !prev);
    fetchAllData();
  };

  const userColumns = [
    { title: 'Nom', dataIndex: 'lastName', key: 'lastName', sorter: (a: User, b: User) => a.lastName.localeCompare(b.lastName) },
    { title: 'Prénom', dataIndex: 'firstName', key: 'firstName', sorter: (a: User, b: User) => a.firstName.localeCompare(b.firstName) },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Rôle', dataIndex: ['organizationRole', 'name'], key: 'role' },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status || 'INCONNU'}</Tag>
    },
    {
      title: 'Services',
      key: 'services',
      render: (_: any, record: User) => {
        const services = userServices[record.id] || [];
        const emailService = services.find(s => s.serviceType === 'EMAIL');
        const telnyxService = services.find(s => s.serviceType === 'TELNYX');
        return (
          <Space>
            <Tooltip title={emailService?.isActive ? "Désactiver l'email" : "Activer l'email"}>
              <Switch
                checkedChildren={<MailOutlined />}
                unCheckedChildren={<MailOutlined />}
                checked={emailService?.isActive}
                onChange={() => handleServiceToggle(record.id, 'email', !!emailService?.isActive)}
              />
            </Tooltip>
            <Tooltip title={telnyxService?.isActive ? "Désactiver Telnyx" : "Activer Telnyx"}>
              <Switch
                checkedChildren={<PhoneOutlined />}
                unCheckedChildren={<PhoneOutlined />}
                checked={telnyxService?.isActive}
                onChange={() => handleServiceToggle(record.id, 'telnyx', !!telnyxService?.isActive)}
              />
            </Tooltip>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="Modifier l'utilisateur">
            <Button icon={<EditOutlined />} onClick={() => handleEditUser(record)} />
          </Tooltip>
          {record.status === 'ACTIVE' ? (
            <Tooltip title="Désactiver l'utilisateur">
              <Button icon={<StopOutlined />} onClick={() => handleStatusChange(record, 'INACTIVE')} danger />
            </Tooltip>
          ) : (
            <Tooltip title="Réactiver l'utilisateur">
              <Button icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record, 'ACTIVE')} />
            </Tooltip>
          )}
          {hasPermission('super_admin') && (
            <Tooltip title="Gérer les organisations">
              <Button icon={<ApartmentOutlined />} onClick={() => handleManageOrganizations(record)} />
            </Tooltip>
          )}
          {(hasPermission('admin') || hasPermission('super_admin')) && record.organizationId && (
            <Tooltip title="Google Workspace">
              <Button icon={<GoogleOutlined />} onClick={() => handleGoogleWorkspace(record)} />
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Gestion des Utilisateurs</h1>
        <Button type="primary" onClick={() => setIsInvitationModalVisible(true)}>
          Inviter un utilisateur
        </Button>
      </div>

      <Table
        columns={userColumns}
        dataSource={users}
        loading={loading}
        rowKey="id"
      />

      <InvitationsList refreshKey={refreshInvitations} />

      <InvitationModal
        visible={isInvitationModalVisible}
        onCancel={() => setIsInvitationModalVisible(false)}
        onSuccess={handleInviteSuccess}
        roles={roles.filter(r => r.name !== 'SuperAdmin')}
      />

      {selectedUser && (
        <EditUserModal
          visible={isEditModalVisible}
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
    </div>
  );
};

export default UsersAdminPage;
