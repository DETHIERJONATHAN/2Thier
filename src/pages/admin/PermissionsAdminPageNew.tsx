import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  Table, 
  Switch, 
  Space, 
  Typography, 
  Button, 
  Select, 
  Alert, 
  Spin,
  Tooltip,
  Row,
  Col,
  Badge,
  notification,
  Input
} from 'antd';
import { 
  SaveOutlined, 
  ReloadOutlined, 
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useDebouncedCallback } from 'use-debounce';
import PermissionStats from '../../components/admin/PermissionStats';
import { 
  getActionTranslation, 
  getModuleTranslation 
} from '../../utils/permissionsTranslations';
import '../../styles/permissions.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Types
interface Role {
  id: string;
  name: string;
  label: string;
  organizationId: string | null;
  _count?: {
    UserOrganization: number;
  };
}

interface Module {
  id: string;
  key: string;
  label: string;
  description?: string;
  category?: string;
}

interface Permission {
  id?: string;
  moduleId: string;
  action: string;
  allowed: boolean;
  resource: string;
}

// Actions et descriptions avec traductions
const ACTIONS = [
  { key: 'view', icon: <EyeOutlined />, color: '#1890ff' },
  { key: 'create', icon: <PlusOutlined />, color: '#52c41a' },
  { key: 'edit', icon: <EditOutlined />, color: '#faad14' },
  { key: 'delete', icon: <DeleteOutlined />, color: '#ff4d4f' },
  { key: 'manage', icon: <SettingOutlined />, color: '#722ed1' }
].map(action => ({
  ...action,
  ...getActionTranslation(action.key)
}));

// Composant optimisé pour un switch individuel
const PermissionSwitch = React.memo(({ 
  permission, 
  moduleId, 
  action, 
  resource, 
  onChange,
  disabled = false 
}: {
  permission?: Permission;
  moduleId: string;
  action: string;
  resource: string;
  onChange: (moduleId: string, action: string, resource: string, allowed: boolean) => void;
  disabled?: boolean;
}) => {
  const isAllowed = permission?.allowed || false;
  
  return (
    <Switch
      checked={isAllowed}
      onChange={(checked) => onChange(moduleId, action, resource, checked)}
      disabled={disabled}
      size="small"
    />
  );
});

PermissionSwitch.displayName = 'PermissionSwitch';

// Composant principal
const PermissionsAdminPage: React.FC = () => {
  const { currentOrganization, isSuperAdmin } = useAuth();
  const { api } = useAuthenticatedApi();

  // États
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filtrage des modules
  const filteredModules = useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = !searchTerm || 
        module.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.key.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || 
        module.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [modules, searchTerm, categoryFilter]);

  // Catégories uniques
  const categories = useMemo(() => {
    const cats = Array.from(new Set(modules.map(m => m.category).filter(Boolean)));
    return cats.sort();
  }, [modules]);

  // Chargement des données
  const loadData = useCallback(async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const orgId = currentOrganization.id;
      const [rolesResponse, modulesResponse] = await Promise.all([
        api.get(`/roles?organizationId=${orgId}`),
        api.get(`/modules?organizationId=${orgId}`)
      ]);

      if (rolesResponse.success) {
        setRoles(rolesResponse.data || []);
      } else {
        throw new Error('Erreur lors du chargement des rôles');
      }

      if (modulesResponse.success) {
        setModules(modulesResponse.data || []);
      } else {
        throw new Error('Erreur lors du chargement des modules');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(errorMessage);
      notification.error({
        message: 'Erreur de chargement',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, api]);

  // Chargement des permissions pour un rôle
  const loadPermissions = useCallback(async (role: Role) => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/permissions?roleId=${role.id}&organizationId=${currentOrganization.id}`);
      if (response.success) {
        setPermissions(response.data || []);
        setHasUnsavedChanges(false);
      } else {
        throw new Error('Erreur lors du chargement des permissions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des permissions';
      notification.error({
        message: 'Erreur',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, api]);

  // Sauvegarde automatique avec debouncing
  const debouncedSave = useDebouncedCallback(
    async (permissionsToSave: Permission[]) => {
      if (!selectedRole || !currentOrganization) return;
      
      setSaving(true);
      try {
        const response = await api.post(`/permissions`, {
          roleId: selectedRole.id,
          organizationId: currentOrganization.id,
          permissions: permissionsToSave
        });

        if (response.success) {
          setHasUnsavedChanges(false);
          notification.success({
            message: 'Sauvegarde automatique',
            description: 'Les permissions ont été sauvegardées',
            duration: 2
          });
        } else {
          throw new Error('Erreur lors de la sauvegarde');
        }
      } catch {
        notification.error({
          message: 'Erreur de sauvegarde',
          description: 'Impossible de sauvegarder les permissions'
        });
      } finally {
        setSaving(false);
      }
    },
    1500 // Délai de 1.5 secondes
  );

  // Gestionnaire de changement de permission
  const handlePermissionChange = useCallback((
    moduleId: string, 
    action: string, 
    resource: string, 
    allowed: boolean
  ) => {
    setPermissions(prev => {
      const newPermissions = [...prev];
      const permIndex = newPermissions.findIndex(
        p => p.moduleId === moduleId && p.action === action && p.resource === resource
      );

      if (permIndex > -1) {
        newPermissions[permIndex].allowed = allowed;
      } else if (allowed) {
        newPermissions.push({ moduleId, action, resource, allowed });
      }

      setHasUnsavedChanges(true);
      debouncedSave(newPermissions);
      return newPermissions;
    });
  }, [debouncedSave]);

  // Gestionnaire pour activer/désactiver tout un module
  const handleToggleModule = useCallback((moduleId: string, allowed: boolean) => {
    setPermissions(prev => {
      const newPermissions = [...prev];
      
      ACTIONS.forEach(({ key: action }) => {
        const permIndex = newPermissions.findIndex(
          p => p.moduleId === moduleId && p.action === action
        );
        
        if (permIndex > -1) {
          newPermissions[permIndex].allowed = allowed;
        } else if (allowed) {
          newPermissions.push({ moduleId, action, resource: '*', allowed });
        }
      });

      setHasUnsavedChanges(true);
      debouncedSave(newPermissions);
      return newPermissions;
    });
  }, [debouncedSave]);

  // Gestionnaire de sélection de rôle
  const handleRoleSelect = useCallback((roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setSelectedRole(role);
      loadPermissions(role);
    }
  }, [roles, loadPermissions]);

  // Effets
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistiques pour un module
  const getModuleStats = useCallback((moduleId: string) => {
    // Ne compter que les permissions pour nos 5 actions standard
    const standardActions = ACTIONS.map(a => a.key);
    const modulePermissions = permissions.filter(p => 
      p.moduleId === moduleId && standardActions.includes(p.action)
    );
    const allowed = modulePermissions.filter(p => p.allowed === true).length;
    const total = ACTIONS.length; // Toujours 5 actions
    
    return { allowed, total, percentage: total > 0 ? Math.round((allowed / total) * 100) : 0 };
  }, [permissions]);

  // Vérifier si toutes les permissions d'un module sont activées
  const isModuleFullyEnabled = useCallback((moduleId: string) => {
    // Ne vérifier que les actions standard
    return ACTIONS.every(({ key: action }) => {
      const permission = permissions.find(p => 
        p.moduleId === moduleId && p.action === action
      );
      return permission?.allowed === true;
    });
  }, [permissions]);

  // Colonnes pour le tableau
  const columns = [
    {
      title: 'Module',
      dataIndex: 'label',
      key: 'label',
      width: 200,
      render: (text: string, record: Module) => {
        const stats = getModuleStats(record.id);
        const isFullyEnabled = isModuleFullyEnabled(record.id);
        const moduleTranslation = getModuleTranslation(record.key);
        
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Tooltip title={moduleTranslation.description}>
                <Text strong>{moduleTranslation.name}</Text>
              </Tooltip>
              <Badge 
                count={`${stats.allowed}/${stats.total}`} 
                style={{ 
                  backgroundColor: isFullyEnabled ? '#52c41a' : stats.allowed > 0 ? '#faad14' : '#f5f5f5',
                  color: stats.allowed === 0 ? '#999' : '#fff'
                }}
              />
            </Space>
            {moduleTranslation.description && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {moduleTranslation.description}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: (
        <Tooltip title="Activer/désactiver toutes les permissions pour ce module d'un coup">
          <Space style={{ cursor: 'help' }}>
            <Text>Toutes les permissions</Text>
            <SettingOutlined style={{ fontSize: '12px', color: '#999' }} />
          </Space>
        </Tooltip>
      ),
      key: 'toggle-all',
      width: 150,
      align: 'center' as const,
      render: (_: unknown, record: Module) => {
        const isFullyEnabled = isModuleFullyEnabled(record.id);
        const moduleTranslation = getModuleTranslation(record.key);
        
        return (
          <Tooltip title={`${isFullyEnabled ? 'Désactiver' : 'Activer'} toutes les permissions pour "${moduleTranslation.name}"`}>
            <Switch
              checked={isFullyEnabled}
              onChange={(checked) => handleToggleModule(record.id, checked)}
              disabled={!selectedRole}
            />
          </Tooltip>
        );
      }
    },
    ...ACTIONS.map(({ key: action, name, description, icon, color }) => ({
      title: (
        <Tooltip 
          title={
            <div>
              <div><strong>{name}</strong></div>
              <div style={{ marginTop: 4 }}>{description}</div>
            </div>
          }
          placement="top"
        >
          <Space style={{ cursor: 'help' }}>
            <span style={{ color }}>{icon}</span>
            <Text>{name}</Text>
            <InfoCircleOutlined style={{ fontSize: '12px', color: '#999' }} />
          </Space>
        </Tooltip>
      ),
      key: action,
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Module) => {
        const permission = permissions.find(
          p => p.moduleId === record.id && p.action === action
        );
        
        const moduleTranslation = getModuleTranslation(record.key);
        const isChecked = permission ? permission.allowed : false;
        
        // Debug log pour les switches
        if (record.key === 'agenda' && action === 'view') {
          console.log('[DEBUG] Switch Agenda View:', {
            moduleId: record.id,
            action,
            permission,
            isChecked,
            allPermissions: permissions.filter(p => p.moduleId === record.id)
          });
        }
        
        return (
          <Tooltip 
            title={`${isChecked ? 'Autoriser' : 'Interdire'} l'action "${name}" pour le module "${moduleTranslation.name}"`}
          >
            <PermissionSwitch
              permission={permission}
              moduleId={record.id}
              action={action}
              resource="*"
              onChange={handlePermissionChange}
              disabled={!selectedRole}
            />
          </Tooltip>
        );
      }
    }))
  ];

  if (!isSuperAdmin) {
    return (
      <Alert
        message="Accès restreint"
        description="Vous n'avez pas les permissions nécessaires pour accéder à cette page."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          Gestion des Permissions
        </Title>
        <Text type="secondary">
          Configurez les permissions par rôle pour {currentOrganization?.name}
        </Text>
      </div>

      {/* Contrôles */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <Text strong>Rôle à modifier :</Text>
              <Select
                placeholder="Sélectionner un rôle"
                style={{ width: '100%', marginTop: 8 }}
                value={selectedRole?.id}
                onChange={handleRoleSelect}
                loading={loading}
              >
                {roles.map(role => (
                  <Option key={role.id} value={role.id}>
                    <Space>
                      <Text>{role.label}</Text>
                      {role._count?.UserOrganization && (
                        <Badge count={role._count.UserOrganization} size="small" />
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <Text strong>Rechercher :</Text>
              <Input
                placeholder="Rechercher un module..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginTop: 8 }}
              />
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <Text strong>Catégorie :</Text>
              <Select
                placeholder="Toutes les catégories"
                style={{ width: '100%', marginTop: 8 }}
                value={categoryFilter}
                onChange={setCategoryFilter}
              >
                <Option value="all">Toutes les catégories</Option>
                {categories.map(category => (
                  <Option key={category} value={category}>
                    {category}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadData}
                loading={loading}
              >
                Actualiser
              </Button>
              
              {hasUnsavedChanges && (
                <Tooltip title="Sauvegarde automatique en cours...">
                  <Badge dot>
                    <SaveOutlined 
                      style={{ 
                        color: saving ? '#1890ff' : '#52c41a',
                        fontSize: 16 
                      }} 
                    />
                  </Badge>
                </Tooltip>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Messages d'état */}
      <Alert
        message="Sauvegarde automatique activée"
        description="Vos modifications sont automatiquement sauvegardées après 1.5 seconde d'inactivité. Utilisez les tooltips d'aide (ℹ️) pour comprendre chaque permission."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          className="mb-4"
        />
      )}

      {selectedRole && hasUnsavedChanges && (
        <Alert
          message="Modifications en cours"
          description="Vos modifications sont automatiquement sauvegardées."
          type="info"
          showIcon
          icon={saving ? <Spin size="small" /> : <CheckCircleOutlined />}
          className="mb-4"
        />
      )}

      {!selectedRole && (
        <Alert
          message="Aucun rôle sélectionné"
          description="Sélectionnez un rôle pour configurer ses permissions."
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {/* Statistiques des permissions */}
      {selectedRole && (
        <div className="mb-6">
          <PermissionStats
            permissions={permissions}
            modules={modules}
            selectedRole={selectedRole}
          />
        </div>
      )}

      {/* Tableau des permissions */}
      <Card 
        title={selectedRole ? `Permissions pour ${selectedRole.label}` : 'Permissions'}
        extra={
          selectedRole && (
            <Space>
              <Text type="secondary">
                {filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}
              </Text>
              {saving && <Spin size="small" />}
            </Space>
          )
        }
      >
        <Table
          columns={columns}
          dataSource={filteredModules}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          size="middle"
          className="permissions-table"
        />
      </Card>
    </div>
  );
};

export default PermissionsAdminPage;
