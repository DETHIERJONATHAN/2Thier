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
  ReloadOutlined,
  RocketOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  UserSwitchOutlined,
  FormOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import GoogleWorkspaceConfig from '../../components/admin/GoogleWorkspaceConfig';
import TelnyxConfig from '../../components/admin/TelnyxConfig';
import { useSharedSections } from '../../hooks/useSharedSections';
import { organizeModulesInSections } from '../../utils/modulesSections';
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
  const { sections, toggleSectionActive } = useSharedSections();

  // 📊 ÉTATS PRINCIPAUX
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  // 🚀 ÉTATS POUR DEVIS1MINUTE
  const [devis1minuteModules, setDevis1minuteModules] = useState<Module[]>([]);
  const [devis1minuteLoading, setDevis1minuteLoading] = useState(false);
  
  // � CACHE pour éviter les appels répétés et STABILISER les comptages
  const [moduleCache, setModuleCache] = useState<Record<string, number>>({});
  
  // �🔧 MODALS ET FORMULAIRES
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [googleWorkspaceModal, setGoogleWorkspaceModal] = useState(false);
  const [telnyxModal, setTelnyxModal] = useState(false);
  const [modulesModal, setModulesModal] = useState(false);
  const [devis1minuteModal, setDevis1minuteModal] = useState(false); // 🚀 NOUVELLE MODAL DEVIS1MINUTE

  // 📂 États pour les sections pliables des modules (dynamique)
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // 🌐 GOOGLE WORKSPACE


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
    
    // 🔥 NOUVELLE LOGIQUE : Utiliser directement les stats du backend
    // Au lieu de recalculer côté frontend, on utilise stats.activeModules du backend
    organizations.forEach(org => {
      // Utiliser directement activeModules calculé par notre backend avec la logique Google Workspace
      newCache[org.id] = org.stats?.activeModules || 0;
    });
    
    // Mettre à jour le cache en une seule fois avec TOUS les résultats
    setModuleCache(newCache);
  }, [organizations]);

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

  const fetchCrmModulesForDetails = useCallback(async (orgId: string) => {
    if (!orgId) return;
    
    try {
      const response = await api.get(`/api/modules?organizationId=${orgId}`);
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
  }, [api]);

  const fetchOrganizationModules = useCallback(async (orgId: string) => {
    if (!orgId) return;
    
    setModulesLoading(true);
    try {
      // 📊 Charger les modules pour la MODAL (différent du cache d'affichage)
      const orgModulesResponse = await api.get(`/api/modules?organizationId=${orgId}`);
      
      if (orgModulesResponse.success) {
        // 🛡️ SÉCURITÉ : Filtrer seulement les modules CRM (exclure COMPLÈTEMENT les modules Google Workspace)
        const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
        
        // Diviser les modules en deux catégories
        const allCrmModules = orgModulesResponse.data?.filter((mod: Module) => 
          !googleModuleKeys.includes(mod.key)
        ) || [];
        
        // Modules disponibles (globaux uniquement - ce sont les modules qu'on peut activer/désactiver)
        // Les modules globaux sont ceux avec organizationId = null
        const availableCrmModules = allCrmModules.filter((mod: Module) => !mod.organizationId);
        
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
  }, [api]);

  // 🚀 FONCTION DE MISE À JOUR EN TEMPS RÉEL DES COMPTEURS
  const updateRealTimeModuleCount = useCallback(async (organizationId: string, moduleToggled: boolean) => {
    // Mettre à jour immédiatement le cache local pour un feedback instantané
    setModuleCache(prevCache => {
      const currentCount = prevCache[organizationId] || 0;
      const newCount = moduleToggled ? currentCount + 1 : Math.max(0, currentCount - 1);
      return {
        ...prevCache,
        [organizationId]: newCount
      };
    });
    
    // Petit délai pour laisser la base de données se mettre à jour
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Puis recharger les vraies données du backend
    await fetchOrganizations();
  }, [fetchOrganizations]);

  const handleToggleModule = useCallback(async (module: Module, enabled: boolean) => {
    if (!selectedOrganization) return;
    
    // 🛡️ SÉCURITÉ : Vérifier que ce n'est PAS un module Google Workspace
    const googleModuleKeys = ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'];
    if (googleModuleKeys.includes(module.key)) {
      message.error('Les modules Google Workspace doivent être gérés via le bouton Google Workspace');
      return;
    }
    
    try {
      const response = await api.patch('/api/modules/status', {
        moduleId: module.id,
        organizationId: selectedOrganization.id,
        active: enabled
      });
      
      if (response.success) {
        message.success(`Module ${module.label || module.name} ${enabled ? 'activé' : 'désactivé'} avec succès`);
        
        // � MISE À JOUR EN TEMPS RÉEL - Feedback visuel immédiat
        await updateRealTimeModuleCount(selectedOrganization.id, enabled);
        
        // 🔄 IMPORTANT : Recharger les modules pour cette organisation
        await fetchOrganizationModules(selectedOrganization.id);
        
        // 🚀 CRUCIAL : Rafraîchir les modules dans le contexte d'authentification pour mettre à jour la sidebar
        if (refreshModules) {
          await refreshModules();
        }
      } else {
        message.error(`Erreur lors de la ${enabled ? 'activation' : 'désactivation'} du module`);
      }
    } catch {
      
      message.error('Erreur de connexion');
    }
  }, [selectedOrganization, api, fetchOrganizationModules, updateRealTimeModuleCount, refreshModules]);

  // 🚀 Fonction pour activer automatiquement les modules Google Workspace
  const handleActivateGoogleWorkspaceModules = useCallback(async (organizationId: string) => {
    try {
      console.log('🚀 [DEBUG] handleActivateGoogleWorkspaceModules appelé pour org:', organizationId);
      
      // ✨ 1. Activer automatiquement la section Google Workspace
      const googleWorkspaceSection = sections.find(section => section.id === 'googleWorkspace');
      console.log('🔧 [DEBUG] Section Google Workspace trouvée:', googleWorkspaceSection);
      
      if (googleWorkspaceSection && !googleWorkspaceSection.active) {
        console.log('🔧 Activation de la section Google Workspace...');
        toggleSectionActive('googleWorkspace');
        message.success('Section Google Workspace activée');
      } else if (googleWorkspaceSection?.active) {
        console.log('✅ [DEBUG] Section Google Workspace déjà active');
      }

      // 2. Identifier les modules Google Workspace (utiliser les mêmes clés que l'API)
      const googleModules = allModules?.filter(module => 
        module.feature && (
          module.feature.includes('GOOGLE') || 
          module.feature === 'GMAIL' ||
          ['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets', 'voice'].includes(module.key)
        )
      ) || [];

      console.log('📋 [DEBUG] Modules Google Workspace trouvés:', googleModules.map(m => ({ key: m.key, label: m.label, active: m.active })));

      if (googleModules.length === 0) {
        console.log('⚠️ Aucun module Google Workspace trouvé');
        return;
      }

      console.log(`🚀 Activation de ${googleModules.length} modules Google Workspace pour l'organisation ${organizationId}`);

      // 3. Activer tous les modules Google Workspace
      const activationPromises = googleModules.map(async module => {
        console.log(`🔄 Activation du module ${module.key} (${module.label})`);
        return api.patch('/api/modules/status', {
          moduleId: module.id,
          organizationId: organizationId,
          active: true
        });
      });

      const results = await Promise.allSettled(activationPromises);
      
      // Analyser les résultats
      results.forEach((result, index) => {
        const module = googleModules[index];
        if (result.status === 'fulfilled') {
          console.log(`✅ Module ${module.key} activé avec succès`);
        } else {
          console.error(`❌ Erreur activation module ${module.key}:`, result.reason);
        }
      });
      
      // Compter les succès
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      
      if (successCount > 0) {
        message.success(`${successCount} modules Google Workspace activés avec succès`);
        
        // 🚀 MISE À JOUR EN TEMPS RÉEL - Mettre à jour le compteur immédiatement
        setModuleCache(prevCache => {
          const currentCount = prevCache[organizationId] || 0;
          return {
            ...prevCache,
            [organizationId]: currentCount + successCount
          };
        });
        
        // Recharger les données après un petit délai
        console.log('🔄 Rechargement des données après activation...');
        setTimeout(async () => {
          await fetchOrganizationModules(organizationId);
          await fetchOrganizations();
        }, 100);
        
        if (refreshModules) {
          await refreshModules();
        }
        console.log('✅ Données rechargées');
      } else {
        message.warning('Aucun module Google Workspace n\'a pu être activé');
      }

    } catch (error) {
      console.error('Erreur lors de l\'activation des modules Google Workspace:', error);
      message.error('Erreur lors de l\'activation des modules Google Workspace');
    }
  }, [allModules, api, fetchOrganizationModules, fetchOrganizations, refreshModules, sections, toggleSectionActive]);

  // 🔗 Fonction pour activer Google Workspace et ses modules en un clic
  const handleQuickActivateGoogleWorkspace = useCallback(async (organization: Organization) => {
    if (organization.googleWorkspaceEnabled || organization.stats?.googleWorkspaceEnabled) {
      message.info('Google Workspace est déjà activé pour cette organisation');
      return;
    }

    try {
      // 1. Configurer Google Workspace comme activé via l'API
      const response = await api.post(`/api/organizations/${organization.id}/google-workspace/config`, {
        isActive: true,
        domain: organization.googleWorkspaceDomain || `${organization.name.toLowerCase().replace(/\s+/g, '')}.be`,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        adminEmail: '',
        serviceAccountEmail: '',
        privateKey: ''
      });

      if (response.success) {
        message.success('Google Workspace activé avec succès');
        
        // 2. Activer automatiquement les modules Google Workspace
        await handleActivateGoogleWorkspaceModules(organization.id);
        
        // 3. Recharger les données
        await fetchOrganizations();
      } else {
        message.error('Erreur lors de l\'activation de Google Workspace');
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation rapide de Google Workspace:', error);
      message.error('Erreur lors de l\'activation de Google Workspace');
    }
  }, [api, handleActivateGoogleWorkspaceModules, fetchOrganizations]);

  // 🎯 AUTO-ACTIVATION : Activer automatiquement les modules Google Workspace pour les orgs avec Google Workspace activé mais sans modules
  useEffect(() => {
    const autoActivateGoogleWorkspaceModules = async () => {
      if (!organizations.length || !allModules?.length) return;

      for (const org of organizations) {
        // Si l'org a Google Workspace activé mais aucun module Google Workspace actif
        if (org.stats?.googleWorkspaceEnabled && (!org.googleWorkspaceModules || org.googleWorkspaceModules.length === 0)) {
          console.log(`🔄 Auto-activation des modules Google Workspace pour ${org.name}...`);
          try {
            await handleActivateGoogleWorkspaceModules(org.id);
            // Pause entre les activations pour éviter les surcharges
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`❌ Erreur auto-activation pour ${org.name}:`, error);
          }
        }
      }
    };

    // Déclencher l'auto-activation avec un délai pour éviter les appels trop fréquents
    const timer = setTimeout(autoActivateGoogleWorkspaceModules, 3000);
    return () => clearTimeout(timer);
  }, [organizations, allModules, handleActivateGoogleWorkspaceModules]);

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
      
      
      
      const response = await api.put(`/api/organizations/${selectedOrganization.id}`, organizationData);
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
      const response = await api.put(`/api/organizations/${orgId}`, {
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
      const response = await api.delete(`/api/organizations/${orgId}`);
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

  // 🚀 FONCTION OUVERTURE MODAL DEVIS1MINUTE
  const handleActivateDevis1Minute = async (organization: Organization) => {
    setSelectedOrganization(organization);
    await fetchDevis1minuteModules(organization.id);
    setDevis1minuteModal(true);
  };

  // 🚀 FONCTION CHARGEMENT MODULES DEVIS1MINUTE
  const fetchDevis1minuteModules = async (organizationId: string) => {
    try {
      setDevis1minuteLoading(true);
      
      // SEULEMENT les 4 modules pour ORGANISATIONS (pas Super Admin)
      const devis1minuteFeatures = [
        'marketplace',
        'partner_portal', 
        'my_leads',
        'devis1minute_billing'
        // RETIRÉ : 'campaigns', 'analytics' => Ceux-ci sont Super Admin seulement
      ];

      // Récupérer tous les modules avec leurs statuts pour cette organisation
      const response = await api.get(`/api/modules?organizationId=${organizationId}`);
      
      if (response.success) {
        const allModules = response.data || [];
        
        // Filtrer seulement les 4 modules Devis1Minute ORGANISATIONS
        const devis1MinuteOnly = allModules.filter((module: Module) => 
          devis1minuteFeatures.includes(module.feature || '')
        );
        
        console.log(`🚀 ${devis1MinuteOnly.length}/4 modules Devis1Minute ORGANISATIONS trouvés`);
        setDevis1minuteModules(devis1MinuteOnly);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modules Devis1Minute:', error);
      message.error('Erreur lors du chargement des modules');
    } finally {
      setDevis1minuteLoading(false);
    }
  };

  // 🚀 FONCTION ACTIVATION/DÉSACTIVATION MODULE INDIVIDUEL
  const handleToggleDevis1minuteModule = async (module: Module, active: boolean) => {
    if (!selectedOrganization) return;
    
    try {
      const response = await api.patch('/api/modules/status', {
        moduleId: module.id,
        organizationId: selectedOrganization.id,
        active: active
      });

      if (response.success) {
        message.success(`Module ${active ? 'activé' : 'désactivé'} avec succès`);
        
        // Mettre à jour l'état local
        setDevis1minuteModules(prevModules =>
          prevModules.map(m =>
            m.id === module.id ? { ...m, isActiveForOrg: active } : m
          )
        );
        
        // Rafraîchir la liste des organisations pour les compteurs
        await fetchOrganizations();
      } else {
        message.error(response.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur toggle module:', error);
      message.error('Erreur lors de la mise à jour du module');
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

  // 📂 Fonction pour catégoriser les modules en sections
  // Organiser les modules selon les sections administratives (même logique que ModulesAdminPage)
  const organizedSections = useMemo(() => {
    if (!allModules || allModules.length === 0 || !sections.length) return [];
    
    // Utiliser la même logique d'organisation que l'administration
    return organizeModulesInSections(sections, allModules)
      .filter(section => {
        // Ne pas afficher les sections vides
        if (section.modules.length === 0) return false;
        
        // Filtrer la section Google Workspace selon l'état d'activation
        if (section.id === 'googleWorkspace' && selectedOrganization) {
          return selectedOrganization.googleWorkspaceEnabled || selectedOrganization.stats?.googleWorkspaceEnabled;
        }
        
        return true;
      });
  }, [allModules, sections, selectedOrganization]);

  // Initialiser les sections ouvertes dynamiquement
  useEffect(() => {
    if (organizedSections.length > 0) {
      const initialState: Record<string, boolean> = {};
      organizedSections.forEach(section => {
        initialState[section.id] = true; // Ouvertes par défaut
      });
      setSectionsOpen(initialState);
    }
  }, [organizedSections]);

  // 📊 Toggle pour ouvrir/fermer les sections
  const toggleSection = useCallback((sectionId: string) => {
    setSectionsOpen(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // 🎨 Fonction utilitaire pour obtenir l'icône d'une section
  const getSectionIcon = useCallback((sectionId: string, iconName?: string) => {
    // Utiliser l'icône définie dans la section si disponible
    if (iconName) {
      // Ici on pourrait ajouter une logique pour mapper les noms d'icônes vers les composants
      // Pour l'instant on utilise un mapping simple
    }

    // Mapping par défaut selon l'ID de la section
    switch (sectionId) {
      case 'admin':
        return <UserSwitchOutlined style={{ color: '#f5222d', fontSize: '20px' }} />;
      case 'forms':
        return <FormOutlined style={{ color: '#52c41a', fontSize: '20px' }} />;
      case 'technical':
        return <ToolOutlined style={{ color: '#fa8c16', fontSize: '20px' }} />;
      case 'googleWorkspace':
        return <GoogleOutlined style={{ color: '#4285f4', fontSize: '20px' }} />;
      case 'devis1minuteAdmin':
        return <RocketOutlined style={{ color: '#722ed1', fontSize: '20px' }} />;
      case 'devis1minute':
        return <RocketOutlined style={{ color: '#ff7a00', fontSize: '20px' }} />;
      case 'other':
      default:
        return <AppstoreOutlined style={{ color: '#722ed1', fontSize: '20px' }} />;
    }
  }, []);

  // 🎨 Fonction pour rendre une section de modules
  const renderModuleSection = useCallback((
    title: string,
    icon: React.ReactNode,
    modules: Module[],
    sectionId: string,
    description: string,
    sectionActive: boolean = true
  ) => {
    const isOpen = sectionsOpen[sectionId];
    
    return (
      <div key={sectionId} className={`border rounded-lg overflow-hidden ${
        sectionActive ? 'border-gray-200' : 'border-red-300 bg-red-50'
      }`}>
        {/* En-tête de section */}
        <button
          onClick={() => toggleSection(sectionId)}
          className={`w-full flex items-center justify-between p-4 transition-colors ${
            sectionActive 
              ? 'bg-gray-50 hover:bg-gray-100' 
              : 'bg-red-50 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            {icon}
            <div className="text-left">
              <div className={`font-semibold text-lg ${!sectionActive ? 'text-red-600' : ''}`}>
                {title}
                {!sectionActive && <span className="ml-2 text-xs text-red-500">(DÉSACTIVÉE)</span>}
              </div>
              <div className={`text-sm ${sectionActive ? 'text-gray-600' : 'text-red-500'}`}>
                {description}
              </div>
            </div>
            <Badge 
              count={modules.length} 
              style={{ backgroundColor: sectionActive ? '#52c41a' : '#f5222d' }} 
            />
          </div>
          {isOpen ? <CaretDownOutlined /> : <CaretRightOutlined />}
        </button>
        
        {/* Contenu de la section */}
        {isOpen && (
          <div className="p-4 space-y-3 bg-white">
            {modules.length > 0 ? (
              modules.map((module: Module) => {
                const orgModule = organizationModules.find((orgMod: Module) => 
                  orgMod.id === module.id
                );
                const isActive = orgModule?.isActiveForOrg || false;
                
                return (
                  <div 
                    key={module.id} 
                    className={`p-4 border rounded-lg transition-all ${
                      !sectionActive 
                        ? 'border-red-200 bg-red-50 opacity-60' 
                        : isActive 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white'
                    } hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {module.icon ? (
                          <span className={`text-2xl ${!sectionActive ? 'text-gray-400' : ''}`}>
                            {module.icon}
                          </span>
                        ) : (
                          <AppstoreOutlined className={`text-2xl ${!sectionActive ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                        <div>
                          <div className={`font-semibold text-lg ${!sectionActive ? 'text-gray-500' : ''}`}>
                            {module.label || module.name}
                            {!sectionActive && (
                              <span className="ml-2 text-xs text-red-500">(Section désactivée)</span>
                            )}
                          </div>
                          {module.description && (
                            <div className={`text-sm mt-1 ${!sectionActive ? 'text-gray-400' : 'text-gray-600'}`}>
                              {module.description}
                            </div>
                          )}
                          <div className={`text-xs mt-1 ${!sectionActive ? 'text-gray-400' : 'text-gray-400'}`}>
                            Clé: {module.feature || module.key}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          status={!sectionActive ? "error" : isActive ? "success" : "default"} 
                          text={!sectionActive ? "Section désactivée" : isActive ? "Actif" : "Inactif"}
                        />
                        <Switch
                          checked={sectionActive && isActive}
                          onChange={(checked) => sectionActive && handleToggleModule(module, checked)}
                          disabled={!sectionActive}
                          checkedChildren="ON"
                          unCheckedChildren="OFF"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun module dans cette catégorie
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [organizationModules, sectionsOpen, toggleSection, handleToggleModule]);

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
                    setGoogleWorkspaceModal(true);
                  }}
                  style={{ color: '#4285F4' }}
                />
              </Tooltip>

              {/* 🚀 BOUTON DEBUG : Forcer activation modules Google Workspace */}
              <Tooltip title="🚀 Forcer activation modules Google Workspace (DEBUG)">
                <Button
                  type="text"
                  icon={<RocketOutlined />}
                  onClick={() => handleActivateGoogleWorkspaceModules(record.id)}
                  style={{ color: '#ff4d4f' }}
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

              <Tooltip title="🚀 Activer Devis1Minute">
                <Button
                  type="text"
                  icon={<RocketOutlined />}
                  onClick={() => handleActivateDevis1Minute(record)}
                  style={{ color: '#ff7a00' }}
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
                  
                  {/* 🚀 BOUTON DEBUG : Actualiser les stats */}
                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Button 
                      type="dashed" 
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={async () => {
                        console.log('🔄 Actualisation des statistiques...');
                        await fetchOrganizations();
                        message.success('Statistiques actualisées');
                      }}
                    >
                      Actualiser les statistiques
                    </Button>
                  </div>
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
          <div className="space-y-4">
            <GoogleWorkspaceConfig 
              organizationId={selectedOrganization.id} 
              onGoogleWorkspaceActivated={() => handleActivateGoogleWorkspaceModules(selectedOrganization.id)}
            />
          </div>
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
              message="Interface simplifiée de gestion des modules"
              description="Utilisez les interrupteurs pour activer ou désactiver directement chaque module pour cette organisation. Les modules activés seront visibles dans le menu de navigation des utilisateurs."
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
                {/* MODULES ORGANISÉS PAR SECTIONS */}
                {(() => {
                  console.log('[Modal] État des modules:', {
                    allModulesLength: allModules?.length || 0,
                    allModules: allModules?.map(m => ({ id: m.id, name: m.name, key: m.key })) || [],
                    organizationModulesLength: organizationModules?.length || 0,
                    organizationModules: organizationModules?.map(m => ({ id: m.id, name: m.name, key: m.key, isActiveForOrg: m.isActiveForOrg })) || [],
                    modulesLoading
                  });
                  
                  if (!allModules || allModules.length === 0) {
                    return (
                      <Alert
                        message="Aucun module disponible"
                        description="Aucun module n'est configuré dans le système."
                        type="warning"
                        showIcon
                      />
                    );
                  }

                  // Utiliser les sections organisées dynamiquement (comme dans ModulesAdminPage)
                  return (
                    <div className="space-y-4">
                      {organizedSections.map(section => (
                        renderModuleSection(
                          section.title,
                          getSectionIcon(section.id, section.iconName),
                          section.modules,
                          section.id,
                          section.description || `Modules de la section ${section.title}`,
                          section.active
                        )
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 🚀 MODAL DEVIS1MINUTE */}
      <Modal
        title={
          <Space>
            <RocketOutlined style={{ color: '#ff7a00' }} />
            Gestion Devis1Minute - {selectedOrganization?.name}
          </Space>
        }
        open={devis1minuteModal}
        onCancel={() => setDevis1minuteModal(false)}
        footer={[
          <Button key="close" onClick={() => setDevis1minuteModal(false)}>
            Fermer
          </Button>
        ]}
        width={800}
      >
        {selectedOrganization && (
          <div className="space-y-4">
            <Alert
              message="Gestion des modules Devis1Minute"
              description="Activez ou désactivez individuellement chaque module Devis1Minute pour cette organisation. Les utilisateurs ne verront que les modules activés."
              type="info"
              showIcon
              className="mb-4"
            />
            
            {devis1minuteLoading ? (
              <div className="flex justify-center py-8">
                <Spin size="large" />
              </div>
            ) : (
              <div className="space-y-3">
                {devis1minuteModules.length > 0 ? (
                  devis1minuteModules.map((module: Module) => {
                    const isActive = module.isActiveForOrg || false;
                    
                    return (
                      <div 
                        key={module.id} 
                        className={`p-4 border rounded-lg transition-all ${
                          isActive ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'
                        } hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <RocketOutlined 
                              className={`text-2xl ${isActive ? 'text-orange-500' : 'text-gray-400'}`} 
                            />
                            <div>
                              <div className="font-semibold text-lg">{module.label || module.name}</div>
                              {module.description && (
                                <div className="text-sm text-gray-600 mt-1">{module.description}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                Feature: {module.feature}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              status={isActive ? "success" : "default"} 
                              text={isActive ? "Actif" : "Inactif"}
                            />
                            <Switch
                              checked={isActive}
                              onChange={(checked) => handleToggleDevis1minuteModule(module, checked)}
                              checkedChildren="ON"
                              unCheckedChildren="OFF"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <RocketOutlined className="text-4xl text-gray-300 mb-4" />
                    <p className="text-gray-500">Aucun module Devis1Minute disponible</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Les modules doivent être créés par le Super Admin
                    </p>
                  </div>
                )}
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

