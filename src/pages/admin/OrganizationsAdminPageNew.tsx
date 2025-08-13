import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Tag, 
  Space, 
  Tooltip, 
  Switch, 
  Statistic, 
  Row, 
  Col,
  Alert,
  Badge,
  message,
  Popconfirm,
  Typography,
  Tabs,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GoogleOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  MailOutlined,
  CalendarOutlined,
  FileOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  DatabaseOutlined,
  PoweroffOutlined,
  AppstoreAddOutlined,
  BarChartOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import GoogleWorkspaceConfig from '../../components/admin/GoogleWorkspaceConfig';
import TelnyxConfig from '../../components/admin/TelnyxConfig';
import { 
  formatOrganizationName,
  formatDescription,
  getCachedGoogleIcon,
  debounce
} from '../../utils/organizationOptimizations';

const { Title, Text } = Typography;

// 🏷️ INTERFACES TYPES ULTRA-PRÉCISES
interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  googleWorkspaceDomain?: string;
  googleWorkspaceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalUsers: number;
    totalRoles: number;
    activeModules: number;
    activeCrmModules?: number; // Comptage précis des modules CRM actifs
    googleWorkspaceEnabled: boolean;
  };
  googleWorkspaceModules: Array<{
    id: string;
    key: string;
    label: string;
    feature: string;
    icon: string;
  }>;
}

interface Module {
  id: string;
  key: string;
  label: string;
  name: string;
  feature: string;
  icon?: string;
  route?: string;
  description?: string;
  active: boolean;
  order: number;
  isGlobal?: boolean;
  isActiveForOrg?: boolean;
  organizationId?: string | null;
}

interface OrganizationFormData {
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
}

interface GoogleWorkspaceModuleStatus {
  enabled: boolean;
  configured: boolean;
}

interface GoogleWorkspaceModules {
  gmail?: GoogleWorkspaceModuleStatus;
  calendar?: GoogleWorkspaceModuleStatus;
  drive?: GoogleWorkspaceModuleStatus;
  meet?: GoogleWorkspaceModuleStatus;
  docs?: GoogleWorkspaceModuleStatus;
  sheets?: GoogleWorkspaceModuleStatus;
  voice?: GoogleWorkspaceModuleStatus;
}

// Métadonnées des modules Google Workspace
const GOOGLE_MODULE_METADATA = {
  gmail: { label: 'Gmail', description: 'Service de messagerie électronique' },
  calendar: { label: 'Calendar', description: 'Gestion de calendrier et événements' },
  drive: { label: 'Drive', description: 'Stockage et partage de fichiers' },
  meet: { label: 'Meet', description: 'Visioconférence et réunions' },
  docs: { label: 'Docs', description: 'Traitement de texte collaboratif' },
  sheets: { label: 'Sheets', description: 'Tableur collaboratif' },
  voice: { label: 'Voice', description: 'Service de téléphonie' }
} as const;

interface GoogleWorkspaceConfig {
  isConfigured: boolean;
  clientId: string;
  clientSecret: string;
  hasClientSecret?: boolean;
  redirectUri: string;
  domain: string;
  adminEmail: string;
  gmailEnabled: boolean;
  calendarEnabled: boolean;
  driveEnabled: boolean;
  meetEnabled: boolean;
  docsEnabled: boolean;
  sheetsEnabled: boolean;
  voiceEnabled: boolean;
  enabled: boolean;
}

const OrganizationsAdminPageNew: React.FC = () => {
  // 🔐 HOOKS AUTHENTIFIÉS
  const { api } = useAuthenticatedApi();
  const { user, refreshModules } = useAuth();

  // 📊 ÉTATS PRINCIPAUX
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  // � CACHE pour éviter les appels répétés et STABILISER les comptages
  const [moduleCache, setModuleCache] = useState<Record<string, number>>({});
  
  // �🔧 MODALS ET FORMULAIRES
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [googleWorkspaceModal, setGoogleWorkspaceModal] = useState(false);
  const [telnyxModal, setTelnyxModal] = useState(false);
  const [modulesModal, setModulesModal] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 🌐 GOOGLE WORKSPACE
  const [googleModules, setGoogleModules] = useState<GoogleWorkspaceModules>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  // � MODULES GÉNÉRAUX
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [organizationModules, setOrganizationModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // �📱 RESPONSIVE & FILTERS
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');

  // 🎯 PERMISSIONS
  const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin;
  const canManageOrgs = isSuperAdmin;

  // � RECHERCHE OPTIMISÉE AVEC DEBOUNCE 
  const [searchInputValue, setSearchInputValue] = useState('');
  
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // �📊 DONNÉES FILTRÉES ET MÉMORISÉES
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, statusFilter]);

  // 🚀 PRÉ-CHARGEMENT COMPLET AU DÉMARRAGE POUR STABILITÉ TOTALE
  const preloadAllModuleCounts = useCallback(async () => {
    if (!organizations || organizations.length === 0) return;
    
    const newCache: Record<string, number> = {};
    
    // Charger TOUS les modules de TOUTES les organisations EN PARALLÈLE
    const promises = organizations.map(async (org) => {
      try {
        const response = await api.get(`/modules?organizationId=${org.id}`);
        if (response?.success && Array.isArray(response.data)) {
          const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
          const crmModules = response.data.filter((mod: Module) => 
            !googleModuleKeys.includes(mod.key) && mod.isActiveForOrg === true
          );
          newCache[org.id] = crmModules.length;
        } else {
          newCache[org.id] = 0;
        }
      } catch {
        newCache[org.id] = 0;
      }
    });
    
    // Attendre que TOUT soit calculé avant de mettre à jour
    await Promise.all(promises);
    
    // Mettre à jour le cache en une seule fois avec TOUS les résultats
    setModuleCache(newCache);
  }, [api, organizations]);

  // 🎯 DÉCLENCHEMENT DU PRÉ-CHARGEMENT quand les organisations sont chargées
  useEffect(() => {
    if (organizations.length > 0 && Object.keys(moduleCache).length === 0) {
      preloadAllModuleCounts();
    }
  }, [organizations, preloadAllModuleCounts, moduleCache]);

  // 📡 FONCTIONS API SÉCURISÉES
  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/organizations');
      if (response.success && Array.isArray(response.data)) {
        setOrganizations(response.data);
      } else {
        message.error('Erreur lors du chargement des organisations');
      }
    } catch {
      
      message.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchGoogleWorkspaceModules = async (orgId: string) => {
    if (!orgId) return;
    
    setGoogleLoading(true);
    try {
      const response = await api.get(`/organizations/${orgId}/google-modules`);
      if (response.success) {
        setGoogleModules(response.data || {});
      } else {
        message.error('Erreur lors du chargement des modules Google Workspace');
      }
    } catch {
      
      message.error('Erreur de connexion Google Workspace');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fetchCrmModulesForDetails = async (orgId: string) => {
    if (!orgId) return;
    
    try {
      const response = await api.get(`/modules?organizationId=${orgId}`);
      if (response.success) {
        // Filtrer pour garder seulement les modules CRM actifs (pas Google Workspace)
        const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
        const activeCrmModules = response.data?.filter((mod: Module) => 
          mod.isActiveForOrg && !googleModuleKeys.includes(mod.key)
        ) || [];
        setOrganizationModules(activeCrmModules);
      }
    } catch {
      // Gestion silencieuse des erreurs
    }
  };

  const fetchOrganizationModules = async (orgId: string) => {
    if (!orgId) return;
    
    setModulesLoading(true);
    try {
      // 📊 Charger les modules pour la MODAL (différent du cache d'affichage)
      const orgModulesResponse = await api.get(`/modules?organizationId=${orgId}`);
      
      if (orgModulesResponse.success) {
        // 🛡️ SÉCURITÉ : Filtrer seulement les modules CRM (exclure COMPLÈTEMENT les modules Google Workspace)
        const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
        
        // Diviser les modules en deux catégories
        const allCrmModules = orgModulesResponse.data?.filter((mod: Module) => 
          !googleModuleKeys.includes(mod.key)
        ) || [];
        
        // Modules disponibles (globaux uniquement - ce sont les modules qu'on peut activer/désactiver)
        const availableCrmModules = allCrmModules.filter((mod: Module) => mod.isGlobal);
        
        // ✅ ÉTAT POUR LA MODAL
        setAllModules(availableCrmModules);
        setOrganizationModules(allCrmModules);
        
      } else {
        setAllModules([]);
        setOrganizationModules([]);
      }
    } catch {
      setAllModules([]);
      setOrganizationModules([]);
    } finally {
      setModulesLoading(false);
    }
  };

  const handleToggleModule = async (module: Module, enabled: boolean) => {
    if (!selectedOrganization) return;
    
    // 🛡️ SÉCURITÉ : Vérifier que ce n'est PAS un module Google Workspace
    const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
    if (googleModuleKeys.includes(module.key)) {
      message.error('Les modules Google Workspace doivent être gérés via le bouton Google Workspace');
      return;
    }
    
    try {
      const response = await api.patch('/modules/status', {
        moduleId: module.id,
        organizationId: selectedOrganization.id,
        active: enabled
      });
      
      if (response.success) {
        message.success(`Module ${module.label || module.name} ${enabled ? 'activé' : 'désactivé'} avec succès`);
        
        // 🔄 IMPORTANT : Recharger les modules pour cette organisation
        await fetchOrganizationModules(selectedOrganization.id);
        
        // � IMPORTANT : Recharger aussi les organisations pour mettre à jour les stats dans le tableau
        await fetchOrganizations();
        
        // 💾 CRUCIAL : Forcer la mise à jour du cache des modules pour la colonne "Module CRM"
        
        setModuleCache({}); // Vider le cache pour forcer le rechargement
        await preloadAllModuleCounts(); // Recharger tous les comptages
        
        // �🚀 CRUCIAL : Rafraîchir les modules dans le contexte d'authentification pour mettre à jour la sidebar
        // Cela force la sidebar à se mettre à jour avec les nouveaux modules disponibles
        if (refreshModules) {
          await refreshModules();
        } else {
          // Fallback si la fonction n'existe pas
          window.location.reload();
        }
      } else {
        message.error(`Erreur lors de la ${enabled ? 'activation' : 'désactivation'} du module`);
      }
    } catch {
      
      message.error('Erreur de connexion');
    }
  };

  const handleCreateOrganization = async (values: OrganizationFormData) => {
    try {
      // 🧹 FILTRAGE DES DONNÉES POUR L'API - Suppression des données Google Workspace
      const organizationData: Partial<OrganizationFormData> = {
        name: values.name,
  description: values.description === '' ? undefined : values.description,
  phone: values.phone === '' ? undefined : values.phone,
  address: values.address === '' ? undefined : values.address
      };

      // 🌐 TRAITEMENT SPÉCIAL DU WEBSITE pour éviter les erreurs de validation
      if (values.website && values.website.trim() !== '') {
        // Si un website est fourni, s'assurer qu'il a un protocole
        organizationData.website = values.website.startsWith('http') 
          ? values.website 
          : `https://${values.website}`;
      }
      // Si le champ website est vide, on ne l'inclut pas dans les données pour éviter l'erreur de validation URL
      
      
      
      const response = await api.post('/api/organizations', organizationData);
      if (response.success) {
        message.success('Organisation créée avec succès');
        setCreateModal(false);
        form.resetFields();
        await fetchOrganizations();
      } else {
        message.error(response.message || 'Erreur lors de la création');
      }
    } catch {
      
      message.error('Erreur de création');
    }
  };

  const handleUpdateOrganization = async (values: OrganizationFormData) => {
    if (!selectedOrganization) return;
    
    try {
      // 🧹 FILTRAGE DES DONNÉES POUR L'API - Suppression des données Google Workspace
      const organizationData: Partial<OrganizationFormData> = {
        name: values.name,
  description: values.description === '' ? undefined : values.description,
  phone: values.phone === '' ? undefined : values.phone,
  address: values.address === '' ? undefined : values.address
      };

      // 🌐 TRAITEMENT SPÉCIAL DU WEBSITE pour éviter les erreurs de validation
      if (values.website && values.website.trim() !== '') {
        // Si un website est fourni, s'assurer qu'il a un protocole
        organizationData.website = values.website.startsWith('http') 
          ? values.website 
          : `https://${values.website}`;
      }
      // Si le champ website est vide, on ne l'inclut pas dans les données pour éviter l'erreur de validation URL
      
      
      
      const response = await api.put(`/organizations/${selectedOrganization.id}`, organizationData);
      if (response.success) {
        message.success('Organisation modifiée avec succès');
        setEditModal(false);
        editForm.resetFields();
        await fetchOrganizations();
      } else {
        message.error(response.message || 'Erreur lors de la modification');
      }
    } catch {
      
      message.error('Erreur de modification');
    }
  };

  const handleToggleOrganizationStatus = async (orgId: string, orgName: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'activer' : 'désactiver';
    
    try {
      const response = await api.put(`/organizations/${orgId}`, {
        status: newStatus
      });
      
      if (response.success) {
        message.success(`Organisation "${orgName}" ${newStatus === 'ACTIVE' ? 'activée' : 'désactivée'} avec succès`);
        await fetchOrganizations();
      } else {
        message.error(response.message || `Erreur lors de la ${actionText === 'activer' ? 'activation' : 'désactivation'}`);
      }
    } catch {
      
      message.error(`Erreur de ${actionText === 'activer' ? 'activation' : 'désactivation'}`);
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    try {
      const response = await api.delete(`/organizations/${orgId}`);
      if (response.success) {
        message.success(`Organisation "${orgName}" supprimée avec succès`);
        await fetchOrganizations();
      } else {
        message.error(response.message || 'Erreur lors de la suppression');
      }
    } catch {
      
      message.error('Erreur de suppression');
    }
  };

  const handleToggleGoogleModule = async (moduleKey: string, enabled: boolean) => {
    if (!selectedOrganization) return;
    
    try {
      const response = await api.post(`/organizations/${selectedOrganization.id}/google-modules/${moduleKey}/toggle`, {
        enabled
      });
      
      if (response.success) {
        message.success(`Module ${enabled ? 'activé' : 'désactivé'} avec succès`);
        await fetchGoogleWorkspaceModules(selectedOrganization.id);
      } else {
        message.error(response.message || 'Erreur lors de la modification du module');
      }
    } catch {
      
      message.error('Erreur de modification');
    }
  };

  // 🎨 ICÔNES GOOGLE WORKSPACE
  const getGoogleModuleIcon = (moduleKey: string) => {
    const icons: Record<string, React.ReactNode> = {
      gmail: <MailOutlined style={{ color: '#EA4335' }} />,
      calendar: <CalendarOutlined style={{ color: '#4285F4' }} />,
      drive: <FileOutlined style={{ color: '#34A853' }} />,
      meet: <VideoCameraOutlined style={{ color: '#FBBC04' }} />,
      docs: <FileOutlined style={{ color: '#4285F4' }} />,
      sheets: <DatabaseOutlined style={{ color: '#34A853' }} />,
      voice: <PhoneOutlined style={{ color: '#EA4335' }} />
    };
    return icons[moduleKey] || <AppstoreOutlined />;
  };

  // 🎨 ICÔNES MODULES CRM
  const getCrmModuleIcon = (moduleKey: string) => {
    const icons: Record<string, React.ReactNode> = {
      leads: <UserOutlined style={{ color: '#1890ff' }} />,
      customers: <TeamOutlined style={{ color: '#52c41a' }} />,
      projects: <DatabaseOutlined style={{ color: '#722ed1' }} />,
      tasks: <CheckCircleOutlined style={{ color: '#fa8c16' }} />,
      documents: <FileOutlined style={{ color: '#13c2c2' }} />,
      reports: <BarChartOutlined style={{ color: '#eb2f96' }} />
    };
    return icons[moduleKey] || <AppstoreOutlined style={{ color: '#666' }} />;
  };

  // 📋 COLONNES TABLEAU PRINCIPALES
  const columns = [
    {
      title: 'Organisation',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Organization) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>
            {formatOrganizationName(name, 35)}
          </Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatDescription(record.description, 55)}
            </Text>
          )}
          {record.website && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              🌐 {record.website}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag 
          color={status === 'ACTIVE' ? 'green' : 'red'} 
          icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <PoweroffOutlined />}
          style={{ borderRadius: '4px', fontWeight: 500 }}
        >
          {status === 'ACTIVE' ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Utilisateurs',
      key: 'users',
      width: 120,
      render: (_, record: Organization) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <Text strong>{record.stats?.totalUsers || 0}</Text>
        </Space>
      ),
    },
    {
      title: 'Modules CRM',
      key: 'modules',
      width: 120,
      render: (_, record: Organization) => {
        // 🔒 COMPTAGE ULTRA-STABLE : UNIQUEMENT le cache pré-chargé
        const count = moduleCache[record.id];
        
        // Si pas encore dans le cache, afficher spinner en attendant le pré-chargement
        if (count === undefined) {
          return (
            <Space>
              <Spin size="small" />
              <Text type="secondary">Chargement...</Text>
            </Space>
          );
        }
        
        // Utiliser UNIQUEMENT la valeur du cache - Plus jamais de recalcul
        return (
          <Space>
            <AppstoreOutlined style={{ color: count > 0 ? '#52c41a' : '#d9d9d9' }} />
            <Text strong style={{ color: count > 0 ? '#52c41a' : '#999' }}>{count}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Google Workspace',
      key: 'googleWorkspace',
      width: 150,
      render: (_, record: Organization) => (
        <Space direction="vertical" size={0}>
          <Badge 
            status={record.stats?.googleWorkspaceEnabled ? 'success' : 'default'} 
            text={
              <Text style={{ 
                fontWeight: record.stats?.googleWorkspaceEnabled ? 600 : 400,
                color: record.stats?.googleWorkspaceEnabled ? '#52c41a' : '#999'
              }}>
                {record.stats?.googleWorkspaceEnabled ? 'Activé' : 'Désactivé'}
              </Text>
            }
          />
          {record.googleWorkspaceDomain && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.googleWorkspaceDomain}
            </Text>
          )}
          {record.googleWorkspaceModules.length > 0 && (
            <Space size={2}>
              {record.googleWorkspaceModules.slice(0, 3).map(module => {
                const iconConfig = getCachedGoogleIcon(module.key);
                return (
                  <Tooltip key={module.id} title={module.label}>
                    <span style={{ 
                      color: iconConfig.color, 
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      {getGoogleModuleIcon(module.key)}
                    </span>
                  </Tooltip>
                );
              })}
              {record.googleWorkspaceModules.length > 3 && (
                <Tooltip 
                  title={
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        Modules supplémentaires :
                      </div>
                      {record.googleWorkspaceModules.slice(3).map(module => (
                        <div key={module.id}>• {module.label}</div>
                      ))}
                    </div>
                  }
                >
                  <Badge 
                    count={record.googleWorkspaceModules.length - 3}
                    size="small"
                    style={{ 
                      backgroundColor: '#4285F4',
                      cursor: 'help'
                    }}
                  />
                </Tooltip>
              )}
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 240,
      render: (_, record: Organization) => (
        <Space size={4}>
          <Tooltip title="📋 Voir détails complets">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedOrganization(record);
                setDetailModal(true);
                fetchGoogleWorkspaceModules(record.id);
                fetchCrmModulesForDetails(record.id);
              }}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          
          {canManageOrgs && (
            <>
              <Tooltip title={`⚡ ${record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'} l'organisation`}>
                <Popconfirm
                  title={`${record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'} cette organisation ?`}
                  description={`L'organisation sera ${record.status === 'ACTIVE' ? 'désactivée' : 'activée'}.`}
                  onConfirm={() => handleToggleOrganizationStatus(record.id, record.name, record.status)}
                  okText={record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  cancelText="Annuler"
                  okButtonProps={{ 
                    type: record.status === 'ACTIVE' ? 'default' : 'primary'
                  }}
                >
                  <Button
                    type="text"
                    icon={<PoweroffOutlined style={{ 
                      color: record.status === 'ACTIVE' ? '#ff4d4f' : '#52c41a' 
                    }} />}
                  />
                </Popconfirm>
              </Tooltip>

              <Tooltip title="✏️ Modifier les informations">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedOrganization(record);
                    editForm.setFieldsValue({
                      name: record.name,
                      description: record.description,
                      website: record.website,
                      phone: record.phone,
                      address: record.address
                    });
                    setEditModal(true);
                  }}
                  style={{ color: '#722ed1' }}
                />
              </Tooltip>

              <Tooltip title="🔗 Configuration Google Workspace">
                <Button
                  type="text"
                  icon={<GoogleOutlined />}
                  onClick={() => {
                    setSelectedOrganization(record);
                    fetchGoogleWorkspaceModules(record.id);
                    setGoogleWorkspaceModal(true);
                  }}
                  style={{ color: '#4285F4' }}
                />
              </Tooltip>

              <Tooltip title="📞 Configuration Telnyx">
                <Button
                  type="text"
                  icon={<PhoneOutlined />}
                  onClick={() => {
                    setSelectedOrganization(record);
                    setTelnyxModal(true);
                  }}
                  style={{ color: '#FF6B6B' }}
                />
              </Tooltip>

              <Tooltip title="🧩 Gérer les modules CRM">
                <Button
                  type="text"
                  icon={<AppstoreAddOutlined />}
                  onClick={() => {
                    setSelectedOrganization(record);
                    fetchOrganizationModules(record.id);
                    setModulesModal(true);
                  }}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>

              <Popconfirm
                title="⚠️ Supprimer cette organisation ?"
                description="Cette action est irréversible et supprimera toutes les données associées."
                onConfirm={() => handleDeleteOrganization(record.id, record.name)}
                okText="🗑️ Supprimer"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="🗑️ Supprimer définitivement">
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 🚀 EFFET DE CHARGEMENT INITIAL
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return (
    <div className="p-6">
      {/* 📊 EN-TÊTE AVEC STATISTIQUES */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <Title level={2} className="mb-0">
            <TeamOutlined className="mr-3" />
            Gestion des Organisations
          </Title>
          
          {canManageOrgs && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModal(true)}
              size="large"
            >
              Nouvelle Organisation
            </Button>
          )}
        </div>

        {/* 📈 STATISTIQUES RAPIDES */}
        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Organisations"
                value={organizations.length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Organisations Actives"
                value={organizations.filter(o => o.status === 'ACTIVE').length}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Avec Google Workspace"
                value={organizations.filter(o => o.googleWorkspaceEnabled).length}
                prefix={<GoogleOutlined style={{ color: '#4285F4' }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Modules Actifs"
                value={Object.values(moduleCache).reduce((sum, count) => sum + count, 0)}
                prefix={<AppstoreOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* 🔍 BARRE DE RECHERCHE ET FILTRES OPTIMISÉS */}
        <Card className="mb-4" style={{ borderRadius: '8px' }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Input
                placeholder="🔍 Rechercher par nom ou description..."
                value={searchInputValue}
                onChange={handleSearchChange}
                prefix={<SearchOutlined style={{ color: '#666' }} />}
                allowClear
                size="large"
                style={{ borderRadius: '6px' }}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filtrer par statut"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                size="large"
              >
                <Select.Option value="all">
                  <Space>
                    <AppstoreOutlined />
                    Tous les statuts
                  </Space>
                </Select.Option>
                <Select.Option value="ACTIVE">
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    Actives
                  </Space>
                </Select.Option>
                <Select.Option value="INACTIVE">
                  <Space>
                    <PoweroffOutlined style={{ color: '#f5222d' }} />
                    Inactives
                  </Space>
                </Select.Option>
              </Select>
            </Col>
            <Col span={4}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchOrganizations}
                loading={loading}
                size="large"
                style={{ width: '100%' }}
              >
                Actualiser
              </Button>
            </Col>
            <Col span={2}>
              <Text type="secondary">
                {filteredOrganizations.length} résultat{filteredOrganizations.length > 1 ? 's' : ''}
              </Text>
            </Col>
          </Row>
        </Card>
      </div>

      {/* 🔍 FILTRES ET RECHERCHE */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input.Search
              placeholder="Rechercher par nom ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Select.Option value="all">Tous</Select.Option>
              <Select.Option value="ACTIVE">Actifs</Select.Option>
              <Select.Option value="INACTIVE">Inactifs</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 📋 TABLEAU PRINCIPAL */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredOrganizations}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} sur ${total} organisations`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 🏗️ MODAL CRÉATION ORGANISATION */}
      <Modal
        title="Nouvelle Organisation"
        open={createModal}
        onCancel={() => {
          setCreateModal(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrganization}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom de l'organisation"
                rules={[
                  { required: true, message: 'Le nom est requis' },
                  { min: 2, message: 'Minimum 2 caractères' },
                  { max: 100, message: 'Maximum 100 caractères' }
                ]}
              >
                <Input placeholder="Nom de l'organisation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="website"
                label="Site web"
              >
                <Input placeholder="exemple.com (https:// sera ajouté automatiquement)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: 'Maximum 500 caractères' }]}
          >
            <Input.TextArea 
              placeholder="Description de l'organisation"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Téléphone"
              >
                <Input placeholder="+32 123 456 789" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="address"
                label="Adresse"
                rules={[{ max: 200, message: 'Maximum 200 caractères' }]}
              >
                <Input placeholder="Adresse complète" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setCreateModal(false)}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Créer l'Organisation
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ✏️ MODAL MODIFICATION ORGANISATION */}
      <Modal
        title="Modifier Organisation"
        open={editModal}
        onCancel={() => {
          setEditModal(false);
          editForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateOrganization}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom de l'organisation"
                rules={[
                  { required: true, message: 'Le nom est requis' },
                  { min: 2, message: 'Minimum 2 caractères' },
                  { max: 100, message: 'Maximum 100 caractères' }
                ]}
              >
                <Input placeholder="Nom de l'organisation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="website"
                label="Site web"
              >
                <Input placeholder="exemple.com (https:// sera ajouté automatiquement)" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: 'Maximum 500 caractères' }]}
          >
            <Input.TextArea 
              placeholder="Description de l'organisation"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Téléphone"
              >
                <Input placeholder="+32 123 456 789" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="address"
                label="Adresse"
                rules={[{ max: 200, message: 'Maximum 200 caractères' }]}
              >
                <Input placeholder="Adresse complète" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setEditModal(false)}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Sauvegarder
            </Button>
          </div>
        </Form>
      </Modal>

      {/* 👁️ MODAL DÉTAILS ORGANISATION */}
      <Modal
        title="Détails de l'Organisation"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            Fermer
          </Button>
        ]}
        width={900}
      >
        {selectedOrganization && (
          <div className="space-y-6">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Informations Générales">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Nom: </Text>
                      <Text>{selectedOrganization.name}</Text>
                    </div>
                    {selectedOrganization.description && (
                      <div>
                        <Text strong>Description: </Text>
                        <Text>{selectedOrganization.description}</Text>
                      </div>
                    )}
                    {selectedOrganization.website && (
                      <div>
                        <Text strong>Site web: </Text>
                        <Text copyable>{selectedOrganization.website}</Text>
                      </div>
                    )}
                    {selectedOrganization.phone && (
                      <div>
                        <Text strong>Téléphone: </Text>
                        <Text copyable>{selectedOrganization.phone}</Text>
                      </div>
                    )}
                    {selectedOrganization.address && (
                      <div>
                        <Text strong>Adresse: </Text>
                        <Text>{selectedOrganization.address}</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card title="Statistiques">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="Utilisateurs"
                        value={selectedOrganization.stats?.totalUsers || 0}
                        prefix={<UserOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Rôles"
                        value={selectedOrganization.stats?.totalRoles || 0}
                        prefix={<TeamOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Modules Actifs"
                        value={selectedOrganization.stats?.activeModules || 0}
                        prefix={<AppstoreOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Google Workspace"
                        value={selectedOrganization.stats?.googleWorkspaceEnabled ? 'Activé' : 'Désactivé'}
                        prefix={<GoogleOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {organizationModules.length > 0 && (
              <Card title="Modules CRM Actifs">
                <Space wrap>
                  {organizationModules.map(module => (
                    <Tag
                      key={module.id}
                      icon={getCrmModuleIcon(module.key)}
                      color="blue"
                    >
                      {module.label || module.name}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            {selectedOrganization.googleWorkspaceModules.length > 0 && (
              <Card title="Modules Google Workspace Actifs">
                <Space wrap>
                  {selectedOrganization.googleWorkspaceModules.map(module => (
                    <Tag
                      key={module.id}
                      icon={getGoogleModuleIcon(module.key)}
                      color="blue"
                    >
                      {module.label}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* 🌐 MODAL GOOGLE WORKSPACE */}
      <Modal
        title={
          <Space>
            <GoogleOutlined style={{ color: '#4285F4' }} />
            Google Workspace - {selectedOrganization?.name}
          </Space>
        }
        open={googleWorkspaceModal}
        onCancel={() => setGoogleWorkspaceModal(false)}
        footer={[
          <Button key="close" onClick={() => setGoogleWorkspaceModal(false)}>
            Fermer
          </Button>
        ]}
        width={1000}
      >
        {selectedOrganization && (
          <Tabs 
            defaultActiveKey="config"
            items={[
              {
                key: 'config',
                label: (
                  <span>
                    <SettingOutlined />
                    Configuration
                  </span>
                ),
                children: (
                  <div className="space-y-4">
                    <GoogleWorkspaceConfig organizationId={selectedOrganization.id} />
                  </div>
                ),
              },
              {
                key: 'modules',
                label: (
                  <span>
                    <AppstoreOutlined />
                    Modules
                  </span>
                ),
                children: (
                  <div className="space-y-4">
                {Object.keys(googleModules).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(googleModules).map(([moduleKey, moduleStatus]) => {
                      const metadata = GOOGLE_MODULE_METADATA[moduleKey as keyof typeof GOOGLE_MODULE_METADATA];
                      if (!metadata) return null;
                      
                      return (
                        <Card
                          key={moduleKey}
                          size="small"
                          title={
                            <Space>
                              {getGoogleModuleIcon(moduleKey)}
                              {metadata.label}
                            </Space>
                          }
                          extra={
                            <Switch
                              checked={moduleStatus?.enabled || false}
                              onChange={(checked) => handleToggleGoogleModule(moduleKey, checked)}
                              loading={googleLoading}
                            />
                          }
                        >
                          <Text type="secondary">{metadata.description}</Text>
                          {moduleStatus?.enabled && (
                            <div className="mt-2">
                              <Tag color={moduleStatus.configured ? "green" : "orange"}>
                                {moduleStatus.configured ? "Configuré" : "Non configuré"}
                              </Tag>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Alert
                    message="Aucun module Google Workspace disponible"
                    description="Les modules Google Workspace doivent être configurés au niveau système."
                    type="info"
                    showIcon
                  />
                )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* 📦 MODAL GESTION DES MODULES */}
      <Modal
        title={
          <Space>
            <AppstoreAddOutlined style={{ color: '#1890ff' }} />
            Gestion des modules - {selectedOrganization?.name}
          </Space>
        }
        open={modulesModal}
        onCancel={() => setModulesModal(false)}
        footer={[
          <Button key="close" onClick={() => setModulesModal(false)}>
            Fermer
          </Button>
        ]}
        width={800}
      >
        {selectedOrganization && (
          <div className="space-y-4">
            <Alert
              message="Gestion des modules pour l'organisation"
              description="Activez ou désactivez les modules disponibles pour cette organisation. Les modules actifs seront visibles dans le menu de navigation des utilisateurs de cette organisation."
              type="info"
              showIcon
              className="mb-4"
            />
            
            {modulesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Modules globaux disponibles */}
                <Card title="Modules disponibles" size="small">
                  {(() => {
                    console.log('[Modal] État des modules disponibles:', {
                      allModulesLength: allModules?.length || 0,
                      allModules: allModules?.map(m => ({ id: m.id, name: m.name, key: m.key })) || [],
                      organizationModulesLength: organizationModules?.length || 0,
                      organizationModules: organizationModules?.map(m => ({ id: m.id, name: m.name, key: m.key, isActiveForOrg: m.isActiveForOrg })) || [],
                      modulesLoading
                    });
                    return null;
                  })()}
                  {allModules && allModules.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allModules.map((module: Module) => {
                        // Trouver le module correspondant dans organizationModules pour récupérer le statut
                        const orgModule = organizationModules.find((orgMod: Module) => 
                          orgMod.id === module.id
                        );
                        const isActive = orgModule?.isActiveForOrg || false;
                        
                        return (
                          <Card 
                            key={module.id} 
                            size="small" 
                            className={`cursor-pointer transition-all ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {module.icon ? (
                                  <span className="text-lg">{module.icon}</span>
                                ) : (
                                  <AppstoreOutlined className="text-lg text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium">{module.label || module.name}</div>
                                  {module.description && (
                                    <div className="text-xs text-gray-500">{module.description}</div>
                                  )}
                                  <div className="text-xs text-gray-400">
                                    {module.feature || module.key}
                                  </div>
                                </div>
                              </div>
                              <Switch
                                checked={isActive}
                                size="small"
                                onChange={(checked) => handleToggleModule(module, checked)}
                              />
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Alert
                      message="Aucun module disponible"
                      description="Aucun module n'est configuré dans le système."
                      type="warning"
                      showIcon
                    />
                  )}
                </Card>

                {/* Modules actifs pour cette organisation */}
                <Card title="Modules actifs pour cette organisation" size="small">
                  {organizationModules && organizationModules.filter((mod: Module) => mod.isActiveForOrg).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {organizationModules.filter((mod: Module) => mod.isActiveForOrg).map((module: Module) => (
                        <Card key={module.id} size="small" className="border-green-500 bg-green-50">
                          <div className="flex items-center space-x-3">
                            {module.icon ? (
                              <span className="text-lg">{module.icon}</span>
                            ) : (
                              <AppstoreOutlined className="text-lg text-green-600" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-green-800">{module.label || module.name}</div>
                              {module.description && (
                                <div className="text-xs text-green-600">{module.description}</div>
                              )}
                            </div>
                            <Badge status="success" text="Actif" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Alert
                      message="Aucun module actif"
                      description="Cette organisation n'a aucun module activé. Activez des modules ci-dessus pour qu'ils apparaissent dans le menu de navigation."
                      type="warning"
                      showIcon
                    />
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Configuration Telnyx */}
      <TelnyxConfig
        visible={telnyxModal}
        onClose={() => setTelnyxModal(false)}
        organizationId={selectedOrganization?.id || ''}
        organizationName={selectedOrganization?.name || ''}
      />
    </div>
  );
};

export default OrganizationsAdminPageNew;

