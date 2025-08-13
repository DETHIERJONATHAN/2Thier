import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Spin, Alert, Row, Col, Statistic, Tag, Tooltip, Typography, Space, AutoComplete } from 'antd';
import { UserOutlined, TeamOutlined, ReloadOutlined, DownloadOutlined, SafetyOutlined, SettingOutlined, 
         KeyOutlined, SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { summaryTranslations, permissionActionTranslations, moduleTranslations, tooltips } from '../../utils/userRightsTranslations';
import DebugAuthNew from './DebugAuthNew';
import { useDebouncedCallback } from 'use-debounce';
import '../../styles/user-rights-summary.css';

const { Title, Text, Paragraph } = Typography;

// Types avec interfaces complètes
interface User { 
  id: string; 
  email: string; 
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  status?: string;
  createdAt?: string;
}

interface Organization { 
  id: string; 
  name: string; 
  status?: string;
  createdAt?: string;
}

interface Module {
  key: string;
  label: string;
  description?: string;
}

interface RightsSummary {
  roles: string[];
  permissions: { [moduleKey: string]: { label: string; actions: string[] } };
  userInfo?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    lastConnection?: string;
    accountStatus?: string;
  };
  organizationInfo?: {
    id: string;
    name: string;
    status?: string;
    moduleCount?: number;
  };
}

const UserRightsSummaryPageNew: React.FC = React.memo(() => {
  const { user } = useAuth();
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);
  
  // États principaux
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [rightsSummary, setRightsSummary] = useState<RightsSummary | null>(null);
  const [organizationModules, setOrganizationModules] = useState<Module[]>([]);
  
  // États de chargement et d'erreur
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États de recherche
  const [userSearchValue, setUserSearchValue] = useState('');
  const [orgSearchValue, setOrgSearchValue] = useState('');

  // Fetch initial data avec gestion d'erreur améliorée
  const fetchInitialData = useCallback(async () => {
    setIsFetchingData(true);
    setError(null);
    console.log("[UserRightsSummaryPage] Fetching initial data...");

    try {
      const [usersResponse, orgsResponse] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/organizations')
      ]);

      console.log("[UserRightsSummaryPage] Users response:", usersResponse);
      console.log("[UserRightsSummaryPage] Organizations response:", orgsResponse);

      if (Array.isArray(usersResponse)) {
        setUsers(usersResponse);
      } else {
        console.warn("[UserRightsSummaryPage] Users response is not an array:", usersResponse);
        setUsers([]);
      }

      if (Array.isArray(orgsResponse)) {
        setOrganizations(orgsResponse);
      } else {
        console.warn("[UserRightsSummaryPage] Organizations response is not an array:", orgsResponse);
        setOrganizations([]);
      }

    } catch (error) {
      console.error('[UserRightsSummaryPage] Error fetching initial data:', error);
      setError('Erreur lors du chargement des données initiales');
    } finally {
      setIsFetchingData(false);
    }
  }, [api]);

  // Fetch rights summary avec debouncing
  const fetchRightsSummary = useDebouncedCallback(async () => {
    if (!selectedUserId || !selectedOrgId) {
      setRightsSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`[UserRightsSummaryPage] Fetching rights for user ${selectedUserId} in org ${selectedOrgId}`);

    try {
      const [summaryResponse, modulesResponse] = await Promise.all([
        api.get(`/users/${selectedUserId}/rights-summary?organizationId=${selectedOrgId}`),
        api.get(`/organizations/${selectedOrgId}/modules`)
      ]);

      console.log("[UserRightsSummaryPage] Rights summary response:", summaryResponse);
      console.log("[UserRightsSummaryPage] Organization modules response:", modulesResponse);

      setRightsSummary(summaryResponse);
      setOrganizationModules(Array.isArray(modulesResponse) ? modulesResponse : []);

    } catch (error) {
      console.error('[UserRightsSummaryPage] Error fetching rights summary:', error);
      setError('Erreur lors de la récupération du résumé des droits');
      setRightsSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, 1000);

  // Effets
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchRightsSummary();
  }, [selectedUserId, selectedOrgId, fetchRightsSummary]);

  // Handlers avec callbacks optimisés
  const handleUserChange = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setUserSearchValue('');
  }, []);

  const handleOrgChange = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    setOrgSearchValue('');
  }, []);

  const handleRefresh = useCallback(() => {
    fetchInitialData();
    if (selectedUserId && selectedOrgId) {
      fetchRightsSummary();
    }
  }, [fetchInitialData, fetchRightsSummary, selectedUserId, selectedOrgId]);

  const handleExport = useCallback(() => {
    // Logique d'exportation à implémenter
    console.log('Export functionality to be implemented');
  }, []);

  // Données filtrées pour la recherche
  const filteredUsers = useMemo(() => {
    if (!userSearchValue) return users;
    return users.filter(user => 
      user.email.toLowerCase().includes(userSearchValue.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(userSearchValue.toLowerCase())
    );
  }, [users, userSearchValue]);

  const filteredOrganizations = useMemo(() => {
    if (!orgSearchValue) return organizations;
    return organizations.filter(org => 
      org.name.toLowerCase().includes(orgSearchValue.toLowerCase())
    );
  }, [organizations, orgSearchValue]);

  // Options pour AutoComplete
  const userOptions = useMemo(() => 
    filteredUsers.map(user => ({
      value: user.id,
      label: `${user.firstName} ${user.lastName} (${user.email})`
    })), [filteredUsers]);

  const orgOptions = useMemo(() => 
    filteredOrganizations.map(org => ({
      value: org.id,
      label: org.name
    })), [filteredOrganizations]);

  // Statistiques calculées
  const summaryStats = useMemo(() => {
    if (!rightsSummary) {
      return { totalRoles: 0, totalModules: 0, totalPermissions: 0, effectivePermissions: 0 };
    }

    const totalRoles = rightsSummary.roles?.length || 0;
    const totalModules = organizationModules?.length || 0;
    const totalPermissions = Object.values(rightsSummary.permissions || {})
      .reduce((acc, mod) => acc + (mod.actions?.length || 0), 0);
    const effectivePermissions = Object.keys(rightsSummary.permissions || {}).length;

    return { totalRoles, totalModules, totalPermissions, effectivePermissions };
  }, [rightsSummary, organizationModules]);

  // N'afficher que pour les utilisateurs connectés
  if (!user) {
    return (
      <div className="summary-page-container">
        <Alert
          message="Accès non autorisé"
          description="Vous devez être connecté pour accéder à cette page."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="summary-page-container">
      {/* En-tête avec gradient */}
      <div className="summary-header">
        <Title level={1} className="summary-title">
          {summaryTranslations.title}
        </Title>
        <Paragraph className="summary-subtitle">
          {summaryTranslations.subtitle}
        </Paragraph>
      </div>

      {/* Section de filtrage */}
      <Card className="filter-section" loading={isFetchingData}>
        <div className="filter-grid">
          <div>
            <Text strong className="block mb-2">
              <UserOutlined className="mr-2" />
              {summaryTranslations.selectUser}
            </Text>
            <Tooltip title={tooltips.userSelection}>
              <AutoComplete
                style={{ width: '100%' }}
                options={userOptions}
                placeholder={summaryTranslations.selectUserPlaceholder}
                value={selectedUserId}
                onSelect={handleUserChange}
                onSearch={setUserSearchValue}
                allowClear
                showSearch
                filterOption={false}
                notFoundContent={isFetchingData ? <Spin size="small" /> : summaryTranslations.noUsers}
              />
            </Tooltip>
          </div>

          <div>
            <Text strong className="block mb-2">
              <TeamOutlined className="mr-2" />
              {summaryTranslations.selectOrganization}
            </Text>
            <Tooltip title={tooltips.organizationSelection}>
              <AutoComplete
                style={{ width: '100%' }}
                options={orgOptions}
                placeholder={summaryTranslations.selectOrgPlaceholder}
                value={selectedOrgId}
                onSelect={handleOrgChange}
                onSearch={setOrgSearchValue}
                allowClear
                showSearch
                filterOption={false}
                notFoundContent={isFetchingData ? <Spin size="small" /> : summaryTranslations.noOrganizations}
              />
            </Tooltip>
          </div>

          <div className="action-buttons">
            <Tooltip title={tooltips.refreshButton}>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={isFetchingData}
                className="refresh-button"
              >
                {summaryTranslations.refreshData}
              </Button>
            </Tooltip>
            <Tooltip title={tooltips.exportButton}>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
                disabled={!rightsSummary}
                className="export-button"
              >
                {summaryTranslations.exportSummary}
              </Button>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Section des résultats */}
      <Card className="results-section">
        <div className="results-header">
          <Title level={2} className="m-0">
            <FileTextOutlined className="mr-3" />
            {summaryTranslations.effectivePermissions}
          </Title>
        </div>

        <div className="results-content">
          {isLoading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Text className="mt-4 text-gray-500">{summaryTranslations.loadingSummary}</Text>
            </div>
          ) : error && !rightsSummary ? (
            <div className="error-container">
              <Alert
                message={summaryTranslations.errorLoadingData}
                description={error}
                type="error"
                showIcon
              />
            </div>
          ) : rightsSummary ? (
            <>
              {/* Statistiques rapides */}
              <Row gutter={[16, 16]} className="quick-stats">
                <Col xs={24} sm={12} md={6}>
                  <Card className="stat-card">
                    <Statistic
                      title={summaryTranslations.roleCount}
                      value={summaryStats.totalRoles}
                      prefix={<UserOutlined style={{ color: '#1677ff' }} />}
                      valueStyle={{ color: '#1677ff', fontSize: '2rem' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="stat-card">
                    <Statistic
                      title={summaryTranslations.moduleCount}
                      value={summaryStats.totalModules}
                      prefix={<SettingOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a', fontSize: '2rem' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="stat-card">
                    <Statistic
                      title={summaryTranslations.permissionCount}
                      value={summaryStats.totalPermissions}
                      prefix={<KeyOutlined style={{ color: '#faad14' }} />}
                      valueStyle={{ color: '#faad14', fontSize: '2rem' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card className="stat-card">
                    <Statistic
                      title="Modules Actifs"
                      value={summaryStats.effectivePermissions}
                      prefix={<SafetyOutlined style={{ color: '#722ed1' }} />}
                      valueStyle={{ color: '#722ed1', fontSize: '2rem' }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Rôles de l'utilisateur */}
              <div className="permission-section">
                <Title level={3} className="text-gray-800 border-b pb-2 mb-4">
                  <UserOutlined className="mr-2" />
                  {summaryTranslations.userRoles}
                </Title>
                {rightsSummary.roles.length > 0 ? (
                  <Space wrap>
                    {rightsSummary.roles.map(role => (
                      <Tag key={role} className="role-tag">
                        {role}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Alert 
                    message={summaryTranslations.noRolesAssigned} 
                    type="info" 
                    showIcon 
                  />
                )}
              </div>

              {/* Modules actifs */}
              <div className="permission-section">
                <Title level={3} className="text-gray-800 border-b pb-2 mb-4">
                  <SettingOutlined className="mr-2" />
                  {summaryTranslations.activeModules}
                </Title>
                {organizationModules.length > 0 ? (
                  <Space wrap>
                    {organizationModules.map((module) => (
                      <Tag key={module.key} className="module-tag">
                        {moduleTranslations[module.key as keyof typeof moduleTranslations] || module.label}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Alert 
                    message={summaryTranslations.noModulesActive} 
                    type="warning" 
                    showIcon 
                  />
                )}
              </div>

              {/* Permissions effectives */}
              <div className="permission-section">
                <Title level={3} className="text-gray-800 border-b pb-2 mb-4">
                  <KeyOutlined className="mr-2" />
                  {summaryTranslations.effectivePermissions}
                </Title>
                {Object.keys(rightsSummary.permissions).length > 0 ? (
                  Object.entries(rightsSummary.permissions).map(([moduleKey, permData]) => (
                    <div key={moduleKey} className="permission-section">
                      <div className="permission-module-title">
                        {moduleTranslations[moduleKey as keyof typeof moduleTranslations] || permData.label}
                      </div>
                      <div className="permission-list">
                        {Array.isArray(permData.actions) && permData.actions.length > 0 ? (
                          permData.actions.map(permission => (
                            <div key={permission} className="permission-item">
                              <div className="permission-action">
                                {permissionActionTranslations[permission as keyof typeof permissionActionTranslations] || permission}
                              </div>
                            </div>
                          ))
                        ) : (
                          <Text type="secondary" italic>Aucune action spécifique.</Text>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <Alert 
                    message={summaryTranslations.noPermissionsFound} 
                    type="info" 
                    showIcon 
                  />
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <SearchOutlined className="empty-state-icon" />
              <Title level={4} type="secondary">
                {summaryTranslations.selectUserAndOrg}
              </Title>
              <Paragraph type="secondary">
                Choisissez un utilisateur et une organisation pour voir le résumé détaillé des droits et permissions.
              </Paragraph>
            </div>
          )}
        </div>
      </Card>

      {/* Composant de débogage */}
      <DebugAuthNew />
    </div>
  );
});

UserRightsSummaryPageNew.displayName = 'UserRightsSummaryPageNew';

export default UserRightsSummaryPageNew;
