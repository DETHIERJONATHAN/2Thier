import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  message as antdMessage,
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
  Typography,
  Grid,
  Empty,
  Divider,
  Input
} from 'antd';
import {
  MailOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ApartmentOutlined,
  PhoneOutlined,
  DeleteOutlined,
  UserAddOutlined,
  TeamOutlined,
  SendOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ClockCircleOutlined,
  GoogleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import InvitationModal from '../../components/admin/InvitationModal';
import EditUserModal from '../../components/admin/EditUserModal';
import UserOrganizationsModal from '../../components/admin/UserOrganizationsModal';
import UserGoogleWorkspaceModal from '../../components/admin/UserGoogleWorkspaceModal';
import UserTelnyxModal from '../../components/admin/UserTelnyxModal';
import { User, Role, UserService, Organization } from '../../types';
type UiInvitation = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  organization?: Organization;
  role?: Role;
  source?: string;
  metadata?: Record<string, unknown>;
};
// import helpers éventuels de usersOptimizations si nécessaire

const UsersAdminPageNew: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [msgApi, contextHolder] = antdMessage.useMessage();
  const { permissions, currentOrganization } = useAuth();
  const hasPermission = useCallback((permission: string) => permissions.includes(permission), [permissions]);

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !!screens.md && !screens.lg;

  // État général
  const [users, setUsers] = useState<User[]>([]);
  const [freeUsers, setFreeUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UiInvitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userServices, setUserServices] = useState<Record<string, UserService[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isInvitationModalVisible, setIsInvitationModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isManageOrgModalVisible, setIsManageOrgModalVisible] = useState(false);
  const [isGoogleWorkspaceModalVisible, setIsGoogleWorkspaceModalVisible] = useState(false);
  const [isTelnyxModalVisible, setIsTelnyxModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const apiInstance = useMemo(() => api, [api]);

  const normalizedSearch = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);

  const matchesUserSearch = useCallback((user: User) => {
    if (!normalizedSearch) return true;
    const parts = [
      user.email,
      user.firstName,
      user.firstname,
      user.lastName,
      user.lastname,
      user.organizationRole?.name,
      user.organizationRole?.label
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());
    return parts.some(value => value.includes(normalizedSearch));
  }, [normalizedSearch]);

  const filteredUsers = useMemo(() => (
    normalizedSearch ? users.filter(matchesUserSearch) : users
  ), [users, normalizedSearch, matchesUserSearch]);

  const filteredFreeUsers = useMemo(() => (
    normalizedSearch
      ? freeUsers.filter(user => matchesUserSearch(user))
      : freeUsers
  ), [freeUsers, normalizedSearch, matchesUserSearch]);

  const filteredInvitations = useMemo(() => (
    normalizedSearch
      ? invitations.filter(invite => invite.email.toLowerCase().includes(normalizedSearch))
      : invitations
  ), [invitations, normalizedSearch]);

  // Récupération des données
  const fetchUsers = useCallback(async () => {
    try {
      const usersResponse = await apiInstance.get('/api/users');
      type RawUserFromApi = {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        UserOrganization?: Array<{
          id: string;
          organizationId: string;
          status: 'ACTIVE' | 'INACTIVE' | string;
          Role?: Role;
          Organization?: Organization;
        }>;
      };
      const processUsers = (rawData: unknown[]): User[] => (rawData as RawUserFromApi[]).map((u) => {
        const rel = Array.isArray(u.UserOrganization)
          ? (
              currentOrganization?.id && currentOrganization.id !== 'all'
                ? u.UserOrganization.find((r) => r.organizationId === currentOrganization.id) || u.UserOrganization[0]
                : u.UserOrganization[0]
            )
          : undefined;
        return {
          ...(u as unknown as User),
          key: u.id,
          organizationId: rel?.organizationId,
          organizationRole: rel?.Role,
          userOrganizationId: rel?.id,
          status: (rel?.status as User['status']) || 'INACTIVE',
        };
      });

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
        const result = await apiInstance.post('/api/services/status/bulk', { userIds });
        if (result.success) {
          setUserServices(result.data);
        }
      }
    } catch {
      msgApi.error("Erreur lors de la récupération des utilisateurs.");
    }
  }, [apiInstance, msgApi, currentOrganization?.id]);

  const fetchFreeUsers = useCallback(async () => {
    try {
      const freeUsersResponse = await apiInstance.get('/api/users/free');
      if (freeUsersResponse?.success && Array.isArray(freeUsersResponse.data)) {
        setFreeUsers(freeUsersResponse.data);
      }
    } catch {
      msgApi.error("Erreur lors de la récupération des utilisateurs libres.");
    }
  }, [apiInstance, msgApi]);

  const fetchInvitations = useCallback(async () => {
    try {
      const invitationsResponse = await apiInstance.get('/api/users/invitations');
      if (invitationsResponse?.success && Array.isArray(invitationsResponse.data)) {
        setInvitations(invitationsResponse.data);
      }
    } catch {
      msgApi.error("Erreur lors de la récupération des invitations.");
    }
  }, [apiInstance, msgApi]);

  const fetchRoles = useCallback(async () => {
    try {
      const rolesResponse = await apiInstance.get('/api/roles?organizationId=current');
      if (rolesResponse?.success && Array.isArray(rolesResponse.data)) {
        setRoles(rolesResponse.data);
      } else if (Array.isArray(rolesResponse)) {
        setRoles(rolesResponse);
      }
    } catch {
      msgApi.error("Erreur lors de la récupération des rôles.");
    }
  }, [apiInstance, msgApi]);

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
  msgApi.success(`Service ${serviceName} mis à jour.`);
        await fetchAllData();
      }
    } catch {
      // géré par le hook
    }
  };
  
  const handleStatusChange = async (user: User, newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!user.userOrganizationId) {
  msgApi.error("ID de relation manquant, impossible de changer le statut.");
      return;
    }
    try {
      const response = await api.patch(`/api/users/user-organizations/${user.userOrganizationId}`, { status: newStatus });
      if (response.success) {
  msgApi.success(`Utilisateur ${newStatus === 'ACTIVE' ? 'réactivé' : 'désactivé'}.`);
        await fetchAllData();
      }
    } catch {
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
      await apiInstance.delete(`/api/users/${user.id}`);
  msgApi.success(`Utilisateur ${user.email} supprimé avec succès`);
      // 🔄 Recharger TOUTES les données après suppression
      await fetchAllData();
    } catch (e: unknown) {
      console.error('Erreur lors de la suppression:', e);
      type AxiosErrorLike = { response?: { data?: { message?: string } } };
      const err = e as AxiosErrorLike;
      const errorMessage = err.response?.data?.message ?? "Erreur lors de la suppression de l'utilisateur";
      msgApi.error(errorMessage);
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
  // (supprimé) ancien handler d'invitation des utilisateurs libres

  // Ajouter un utilisateur à l'organisation courante avec un rôle (par défaut super_admin)
  const handleAttachToOrg = async (user: User, roleName: string = 'super_admin') => {
    try {
      if (!currentOrganization?.id || currentOrganization.id === 'all') {
        msgApi.error("Organisation courante non définie.");
        return;
      }
      // Trouver le rôle demandé dans la liste courante des rôles
      const targetRole = roles.find(r => (r.name?.toLowerCase?.() === roleName.toLowerCase()) || (r.label?.toLowerCase?.() === roleName.toLowerCase()));
      if (!targetRole) {
        msgApi.error(`Rôle ${roleName} introuvable pour cette organisation.`);
        return;
      }
      const payload = {
        userId: user.id,
        organizationId: currentOrganization.id,
        roleId: targetRole.id,
      };
      const res = await apiInstance.post('/api/users/user-organizations', payload);
      if (res?.success) {
        msgApi.success(`${user.email} ajouté à l'organisation en ${roleName}.`);
        await fetchAllData();
      }
    } catch (e) {
      console.error('Erreur attach user to org:', e);
      msgApi.error("Impossible d'ajouter l'utilisateur à l'organisation.");
    }
  };

  // Action pour accepter une invitation (force-accept)
  const handleForceAcceptInvitation = async (invitation: UiInvitation) => {
    try {
      const response = await apiInstance.post(`/api/users/invitations/${invitation.id}/force-accept`);
      if (response.success) {
  msgApi.success(`Invitation acceptée automatiquement pour ${invitation.email}`);
        await fetchAllData();
      }
    } catch {
      // Le hook gère l'erreur
    }
  };

  // Action pour supprimer une invitation
  const handleDeleteInvitation = async (invitation: UiInvitation) => {
    try {
      const response = await apiInstance.delete(`/api/users/invitations/${invitation.id}`);
      if (response.success) {
  msgApi.success(`Invitation pour ${invitation.email} supprimée avec succès`);
        await fetchAllData();
      }
    } catch {
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
              disabled={!record.userOrganizationId}
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
          {/* Ajouter à l'organisation si l'utilisateur n'a pas encore de relation dans l'orga courante */}
          {(!record.userOrganizationId && currentOrganization?.id && currentOrganization.id !== 'all' && hasPermission('super_admin')) && (
            <Tooltip title="Ajouter à l'organisation (super_admin)">
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => handleAttachToOrg(record)} />
            </Tooltip>
          )}
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
          {(currentOrganization?.id && currentOrganization.id !== 'all' && hasPermission('super_admin')) && (
            <Button 
              type="primary" 
              icon={<UserAddOutlined />} 
              onClick={() => handleAttachToOrg(record)}
            >
              Ajouter à l'organisation
            </Button>
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

  // Colonnes pour les invitations
  const invitationColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email',
      render: (email: string, record: UiInvitation) => (
        <div>
          <div>{email}</div>
          {record.metadata && (record.metadata as Record<string, unknown>).firstName && (
            <div className="text-xs text-gray-400">
              {(record.metadata as Record<string, unknown>).firstName} {(record.metadata as Record<string, unknown>).lastName}
              {(record.metadata as Record<string, unknown>).phone && ` • ${(record.metadata as Record<string, unknown>).phone}`}
            </div>
          )}
          {record.metadata && (record.metadata as Record<string, unknown>).company && (
            <div className="text-xs text-blue-400">{String((record.metadata as Record<string, unknown>).company)}</div>
          )}
        </div>
      )
    },
    { title: 'Organisation', dataIndex: ['organization', 'name'], key: 'organization' },
    { title: 'Rôle', dataIndex: ['role', 'name'], key: 'role' },
    { title: 'Source', dataIndex: 'source', key: 'source',
      render: (source: string) => {
        if (!source) return <Tag>Manuel</Tag>;
        if (source.startsWith('form:')) {
          const formSlug = source.replace('form:', '');
          const labels: Record<string, string> = { go: '📋 Formulaire Go', partenaire: '🤝 Partenaire', reunion: '📅 Réunion' };
          return <Tag color="blue">{labels[formSlug] || source}</Tag>;
        }
        return <Tag>{source}</Tag>;
      }
    },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={status === 'PENDING' ? 'orange' : 'red'}>{status}</Tag> },
    { title: 'Date création', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Expire le', dataIndex: 'expiresAt', key: 'expiresAt', render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
  render: (_: unknown, record: UiInvitation) => (
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
  const renderUserMobileCard = (user: User) => {
    const services = userServices[user.id] || [];
    const emailService = services.find(service => service.serviceName === 'email');
    const telnyxService = services.find(service => service.serviceName === 'telnyx');
    const isActive = user.status === 'ACTIVE';
    const showAddToOrg = !user.userOrganizationId && currentOrganization?.id && currentOrganization.id !== 'all' && hasPermission('super_admin');
    const canEdit = hasPermission('admin') || hasPermission('super_admin');
    const canManageOrgs = hasPermission('super_admin');
    const canAccessGoogle = Boolean(
      user.organizationId &&
      user.UserOrganization?.[0]?.Organization?.googleWorkspaceConfig &&
      (hasPermission('super_admin') || hasPermission('admin'))
    );
    const canAccessTelnyx = Boolean(user.organizationId && (hasPermission('super_admin') || hasPermission('admin')));
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    return (
      <Card key={user.id} size="small" styles={{ body: { padding: 16 } }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text strong style={{ fontSize: 16 }}>{fullName || user.email}</Text>
            <Text type="secondary">{user.email}</Text>
            <Space size={[8, 8]} wrap>
              {user.organizationRole?.name && (
                <Tag color="geekblue">{user.organizationRole.name}</Tag>
              )}
              {user.organizationRole?.label && user.organizationRole.label !== user.organizationRole.name && (
                <Tag color="blue">{user.organizationRole.label}</Tag>
              )}
            </Space>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Tag color={isActive ? 'green' : 'red'} style={{ margin: 0 }}>
              {isActive ? 'Actif' : 'Inactif'}
            </Tag>
            <Space size={8} align="center">
              <Text type="secondary">Statut</Text>
              <Switch
                size="small"
                checked={isActive}
                onChange={(checked) => handleStatusChange(user, checked ? 'ACTIVE' : 'INACTIVE')}
                disabled={!user.userOrganizationId}
              />
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text type="secondary">Services</Text>
            <Space size={[12, 8]} wrap style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  size="small"
                  checked={emailService?.isActive || false}
                  onChange={() => handleServiceToggle(user.id, 'email', emailService?.isActive || false)}
                  checkedChildren={<MailOutlined />}
                  unCheckedChildren={<MailOutlined />}
                />
                <Text>Email</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  size="small"
                  checked={telnyxService?.isActive || false}
                  onChange={() => handleServiceToggle(user.id, 'telnyx', telnyxService?.isActive || false)}
                  checkedChildren={<PhoneOutlined />}
                  unCheckedChildren={<PhoneOutlined />}
                />
                <Text>Telnyx</Text>
              </div>
            </Space>
          </Space>

          <Divider style={{ margin: 0 }} />

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text type="secondary">Actions</Text>
            <Space size={[12, 12]} wrap style={{ width: '100%' }}>
              {showAddToOrg && (
                <Button
                  key="add-org"
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => handleAttachToOrg(user)}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
                >
                  Ajouter à l'organisation
                </Button>
              )}
              {canEdit && (
                <Button
                  key="edit"
                  icon={<EditOutlined />}
                  onClick={() => handleEditUser(user)}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
                >
                  Modifier
                </Button>
              )}
              {canAccessGoogle && (
                <Button
                  key="google"
                  icon={<GoogleOutlined />}
                  onClick={() => handleGoogleWorkspace(user)}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, color: '#4285F4' }}
                >
                  Google Workspace
                </Button>
              )}
              {canAccessTelnyx && (
                <Button
                  key="telnyx"
                  icon={<PhoneOutlined />}
                  onClick={() => handleTelnyx(user)}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8, color: '#FF6B6B' }}
                >
                  Telnyx
                </Button>
              )}
              {canManageOrgs && (
                <Button
                  key="organizations"
                  icon={<ApartmentOutlined />}
                  onClick={() => handleManageOrganizations(user)}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
                >
                  Gérer les organisations
                </Button>
              )}
              {canManageOrgs && (
                <Popconfirm
                  key="delete"
                  title="Supprimer l'utilisateur"
                  description={`Êtes-vous sûr de vouloir supprimer ${user.email} ? Cette action est irréversible.`}
                  onConfirm={() => handleDeleteUser(user)}
                  okText="Supprimer"
                  cancelText="Annuler"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    block
                    style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
                  >
                    Supprimer
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Space>
        </Space>
      </Card>
    );
  };

  const renderFreeUserMobileCard = (user: User) => {
    const showAddToOrg = currentOrganization?.id && currentOrganization.id !== 'all' && hasPermission('super_admin');
    const canDelete = hasPermission('super_admin');
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    return (
      <Card key={`free-${user.id}`} size="small" styles={{ body: { padding: 16 } }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Text strong>{fullName || user.email}</Text>
            <Text type="secondary">{user.email}</Text>
            {user.createdAt && (
              <Text type="secondary">Inscrit le {new Date(user.createdAt).toLocaleDateString()}</Text>
            )}
          </div>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {showAddToOrg && (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => handleAttachToOrg(user)}
                block
                style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
              >
                Ajouter à l'organisation
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="Supprimer l'utilisateur"
                description={`Êtes-vous sûr de vouloir supprimer ${user.email} ? Cette action est irréversible.`}
                onConfirm={() => handleDeleteUser(user)}
                okText="Supprimer"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  block
                  style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
                >
                  Supprimer
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Space>
      </Card>
    );
  };

  const renderInvitationMobileCard = (invitation: UiInvitation) => (
    <Card key={`invite-${invitation.id}`} size="small" styles={{ body: { padding: 16 } }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text strong>{invitation.email}</Text>
          {invitation.organization?.name && (
            <Text type="secondary">Organisation : {invitation.organization.name}</Text>
          )}
          {invitation.role?.name && (
            <Text type="secondary">Rôle : {invitation.role.name}</Text>
          )}
        </div>

        <Space size={8} align="center" wrap>
          <Tag color={invitation.status === 'PENDING' ? 'orange' : 'red'}>{invitation.status}</Tag>
          <Text type="secondary">Créée le {new Date(invitation.createdAt).toLocaleDateString()}</Text>
          {invitation.expiresAt && (
            <Text type="secondary">Expire le {new Date(invitation.expiresAt).toLocaleDateString()}</Text>
          )}
        </Space>

        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => handleForceAcceptInvitation(invitation)}
            block
            disabled={invitation.status !== 'PENDING'}
            style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
          >
            Force Accept
          </Button>
          <Button
            icon={<SendOutlined />}
            disabled={invitation.status !== 'PENDING'}
            block
            style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
          >
            Renvoyer l'invitation
          </Button>
          <Popconfirm
            title="Supprimer l'invitation"
            description="Êtes-vous sûr de vouloir supprimer cette invitation ?"
            onConfirm={() => handleDeleteInvitation(invitation)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              block
              style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}
            >
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    </Card>
  );

  const { Title, Text } = Typography;

  return (
    <div
      style={{
        padding: isMobile ? '12px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 24
      }}
    >
      {contextHolder}
      {/* 📊 EN-TÊTE AMÉLIORÉ AVEC STATISTIQUES */}
      <div className="mb-6">
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 16,
            marginBottom: 16
          }}
        >
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <UserOutlined style={{ marginRight: 12, color: '#1890ff' }} />
            Gestion des Utilisateurs
          </Title>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsInvitationModalVisible(true)}
            size={isMobile ? 'middle' : 'large'}
            block={isMobile}
          >
            Inviter un utilisateur
          </Button>
        </div>

        <Input
          allowClear
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher un utilisateur, un email ou un rôle"
          prefix={<SearchOutlined style={{ color: '#93a3aa' }} />}
          size={isMobile ? 'middle' : 'large'}
          style={{ width: '100%', maxWidth: isMobile ? '100%' : 360, marginBottom: 16 }}
        />

        {/* 📈 STATISTIQUES RAPIDES */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Utilisateurs"
                value={users.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Utilisateurs Actifs"
                value={users.filter(u => u.status === 'ACTIVE').length}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Invitations En Attente"
                value={invitations.length}
                prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
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
        type={isMobile ? 'line' : 'card'}
        tabBarGutter={isMobile ? 8 : 24}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined />
                Utilisateurs ({users.length})
              </span>
            ),
            children: isMobile ? (
              users.length ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {users.map(renderUserMobileCard)}
                </Space>
              ) : (
                <Card>
                  <Empty description="Aucun utilisateur" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              )
            ) : (
              <Card>
                <Table
                  columns={userColumns}
                  dataSource={users}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
                  size={isTablet ? 'small' : 'middle'}
                  scroll={isTablet ? { x: 1000 } : undefined}
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
            children: isMobile ? (
              freeUsers.length ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {freeUsers.map(renderFreeUserMobileCard)}
                </Space>
              ) : (
                <Card>
                  <Empty description="Aucun utilisateur libre" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              )
            ) : (
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
                  pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
                  size={isTablet ? 'small' : 'middle'}
                  scroll={isTablet ? { x: 900 } : undefined}
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
            children: isMobile ? (
              invitations.length ? (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {invitations.map(renderInvitationMobileCard)}
                </Space>
              ) : (
                <Card>
                  <Empty description="Aucune invitation" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </Card>
              )
            ) : (
              <Card>
                <Table
                  columns={invitationColumns}
                  dataSource={invitations}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10, showSizeChanger: true, responsive: true }}
                  size={isTablet ? 'small' : 'middle'}
                  scroll={isTablet ? { x: 800 } : undefined}
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
