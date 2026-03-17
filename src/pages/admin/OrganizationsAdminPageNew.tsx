import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  App,
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
  Statistic, 
  Row, 
  Col,
  Grid,
  Alert,
  Badge,
  Popconfirm,
  Typography,
  Spin,
  Empty
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

// ── Facebook Design Tokens ──
const FB = {
  bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b',
  blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4',
  btnGray: '#e4e6eb', btnGrayHover: '#d8dadf',
  green: '#42b72a', red: '#e4405f', orange: '#f7931a', purple: '#722ed1',
  shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8,
};

// ── FBToggle (identique à UsersAdminPageNew) ──
const FBToggle = ({ checked, onChange, disabled, size = 'default' }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'small' | 'default';
}) => {
  const w = size === 'small' ? 36 : 44;
  const h = size === 'small' ? 20 : 24;
  const dot = size === 'small' ? 16 : 20;
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: h,
        background: disabled ? '#ccc' : checked ? FB.blue : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        width: dot, height: dot, borderRadius: '50%', background: FB.white,
        position: 'absolute', top: (h - dot) / 2,
        left: checked ? w - dot - (h - dot) / 2 : (h - dot) / 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
};

function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1100, width: w };
}

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
  const { message: messageApi } = App.useApp();

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

  const { isMobile, isTablet } = useScreenSize();

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
        messageApi.error('Erreur lors du chargement des organisations');
      }
    } catch (error) {
      
      const errMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      messageApi.error(errMessage);
    } finally {
      setLoading(false);
    }
  }, [api, messageApi]);

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
      messageApi.error('Les modules Google Workspace doivent être gérés via le bouton Google Workspace');
      return;
    }
    
    try {
      const response = await api.patch('/api/modules/status', {
        moduleId: module.id,
        organizationId: selectedOrganization.id,
        active: enabled
      });
      
      if (response.success) {
        messageApi.success(`Module ${module.label || module.name} ${enabled ? 'activé' : 'désactivé'} avec succès`);
        
        // � MISE À JOUR EN TEMPS RÉEL - Feedback visuel immédiat
        await updateRealTimeModuleCount(selectedOrganization.id, enabled);
        
        // 🔄 IMPORTANT : Recharger les modules pour cette organisation
        await fetchOrganizationModules(selectedOrganization.id);
        
        // 🚀 CRUCIAL : Rafraîchir les modules dans le contexte d'authentification pour mettre à jour la sidebar
        if (refreshModules) {
          await refreshModules();
        }
      } else {
        messageApi.error(`Erreur lors de la ${enabled ? 'activation' : 'désactivation'} du module`);
      }
    } catch (error) {
      
      const errMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      messageApi.error(errMessage);
    }
  }, [selectedOrganization, api, fetchOrganizationModules, updateRealTimeModuleCount, refreshModules, messageApi]);

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
        messageApi.success('Section Google Workspace activée');
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
        messageApi.success(`${successCount} modules Google Workspace activés avec succès`);
        
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
        messageApi.warning('Aucun module Google Workspace n\'a pu être activé');
      }

    } catch (error) {
      console.error('Erreur lors de l\'activation des modules Google Workspace:', error);
      messageApi.error('Erreur lors de l\'activation des modules Google Workspace');
    }
  }, [allModules, api, fetchOrganizationModules, fetchOrganizations, messageApi, refreshModules, sections, toggleSectionActive]);

  // 🔗 Fonction pour activer Google Workspace et ses modules en un clic
  const handleQuickActivateGoogleWorkspace = useCallback(async (organization: Organization) => {
    if (organization.googleWorkspaceEnabled || organization.stats?.googleWorkspaceEnabled) {
      messageApi.info('Google Workspace est déjà activé pour cette organisation');
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
        messageApi.success('Google Workspace activé avec succès');
        
        // 2. Activer automatiquement les modules Google Workspace
        await handleActivateGoogleWorkspaceModules(organization.id);
        
        // 3. Recharger les données
        await fetchOrganizations();
      } else {
        messageApi.error('Erreur lors de l\'activation de Google Workspace');
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation rapide de Google Workspace:', error);
      messageApi.error('Erreur lors de l\'activation de Google Workspace');
    }
  }, [api, fetchOrganizations, handleActivateGoogleWorkspaceModules, messageApi]);

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
        messageApi.success('Organisation créée avec succès');
        setCreateModal(false);
        form.resetFields();
        await fetchOrganizations();
      } else {
        messageApi.error(response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      
      const errMessage = error instanceof Error ? error.message : 'Erreur de création';
      messageApi.error(errMessage);
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
        messageApi.success('Organisation modifiée avec succès');
        setEditModal(false);
        editForm.resetFields();
        await fetchOrganizations();
      } else {
        messageApi.error(response.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      
      const errMessage = error instanceof Error ? error.message : 'Erreur de modification';
      messageApi.error(errMessage);
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
        messageApi.success(`Organisation "${orgName}" ${newStatus === 'ACTIVE' ? 'activée' : 'désactivée'} avec succès`);
        await fetchOrganizations();
      } else {
        messageApi.error(response.message || `Erreur lors de la ${actionText === 'activer' ? 'activation' : 'désactivation'}`);
      }
    } catch (error) {
      
      const errMessage = error instanceof Error ? error.message : `Erreur de ${actionText === 'activer' ? 'activation' : 'désactivation'}`;
      messageApi.error(errMessage);
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    try {
      const response = await api.delete(`/api/organizations/${orgId}`);
      if (response.success) {
        messageApi.success(`Organisation "${orgName}" supprimée avec succès`);
        await fetchOrganizations();
      } else {
        messageApi.error(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      
      const apiError = error as (Error & { status?: number });
      if (apiError.status === 409) {
        messageApi.error(apiError.message || 'Impossible de supprimer cette organisation tant que des données associées existent.');
      } else {
        const errMessage = apiError.message || 'Erreur de suppression';
        messageApi.error(errMessage);
      }
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
      const errMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des modules';
      messageApi.error(errMessage);
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
        messageApi.success(`Module ${active ? 'activé' : 'désactivé'} avec succès`);
        
        // Mettre à jour l'état local
        setDevis1minuteModules(prevModules =>
          prevModules.map(m =>
            m.id === module.id ? { ...m, isActiveForOrg: active } : m
          )
        );
        
        // Rafraîchir la liste des organisations pour les compteurs
        await fetchOrganizations();
      } else {
        messageApi.error(response.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur toggle module:', error);
      const errMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du module';
      messageApi.error(errMessage);
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
      <div key={sectionId} style={{
        border: `1px solid ${sectionActive ? FB.border : '#ffa39e'}`,
        borderRadius: FB.radius, overflow: 'hidden',
        background: sectionActive ? FB.white : '#fff1f0',
      }}>
        {/* En-tête de section */}
        <button
          onClick={() => toggleSection(sectionId)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, transition: 'background 0.2s', border: 'none', cursor: 'pointer',
            background: sectionActive ? '#f8f9fa' : '#fff1f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: !sectionActive ? FB.red : FB.text }}>
                {title}
                {!sectionActive && <span style={{ marginLeft: 8, fontSize: 11, color: FB.red }}>(DÉSACTIVÉE)</span>}
              </div>
              <div style={{ fontSize: 13, color: sectionActive ? FB.textSecondary : FB.red }}>
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
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: FB.white }}>
            {modules.length > 0 ? (
              modules.map((module: Module) => {
                const orgModule = organizationModules.find((orgMod: Module) => 
                  orgMod.id === module.id
                );
                const isActive = orgModule?.isActiveForOrg || false;
                
                return (
                  <div 
                    key={module.id} 
                    style={{
                      padding: 16, borderRadius: FB.radius, transition: 'box-shadow 0.2s',
                      border: `1px solid ${!sectionActive ? '#ffa39e' : isActive ? FB.green : FB.border}`,
                      background: !sectionActive ? '#fff1f0' : isActive ? '#f6ffed' : FB.white,
                      opacity: !sectionActive ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        {module.icon ? (
                          <span style={{ fontSize: 24, color: !sectionActive ? '#bfbfbf' : undefined }}>
                            {module.icon}
                          </span>
                        ) : (
                          <AppstoreOutlined style={{ fontSize: 24, color: !sectionActive ? '#bfbfbf' : FB.textSecondary }} />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 16, color: !sectionActive ? FB.textSecondary : FB.text }}>
                            {module.label || module.name}
                            {!sectionActive && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: FB.red }}>(Section désactivée)</span>
                            )}
                          </div>
                          {module.description && (
                            <div style={{ fontSize: 13, marginTop: 4, color: !sectionActive ? '#bfbfbf' : FB.textSecondary }}>
                              {module.description}
                            </div>
                          )}
                          <div style={{ fontSize: 11, marginTop: 4, color: '#bfbfbf' }}>
                            Clé: {module.feature || module.key}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Badge 
                          status={!sectionActive ? "error" : isActive ? "success" : "default"} 
                          text={!sectionActive ? "Section désactivée" : isActive ? "Actif" : "Inactif"}
                        />
                        <FBToggle
                          checked={sectionActive && isActive}
                          onChange={(checked) => sectionActive && handleToggleModule(module, checked)}
                          disabled={!sectionActive}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: FB.textSecondary }}>
                Aucun module dans cette catégorie
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [organizationModules, sectionsOpen, toggleSection, handleToggleModule]);

  // 📋 COLONNES TABLEAU PRINCIPALES
  const openOrganizationDetails = (organization: Organization) => {
    setSelectedOrganization(organization);
    setDetailModal(true);
    fetchCrmModulesForDetails(organization.id);
  };

  const openEditOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    editForm.setFieldsValue({
      name: organization.name,
      description: organization.description,
      website: organization.website,
      phone: organization.phone,
      address: organization.address
    });
    setEditModal(true);
  };

  const openGoogleWorkspaceConfig = (organization: Organization) => {
    setSelectedOrganization(organization);
    setGoogleWorkspaceModal(true);
  };

  const openModulesManager = (organization: Organization) => {
    setSelectedOrganization(organization);
    fetchOrganizationModules(organization.id);
    setModulesModal(true);
  };

  const openTelnyxConfig = (organization: Organization) => {
    setSelectedOrganization(organization);
    setTelnyxModal(true);
  };

  const openDevis1Minute = (organization: Organization) => {
    handleActivateDevis1Minute(organization);
  };

  const renderStatusTag = (status: 'ACTIVE' | 'INACTIVE') => (
    <Tag 
      color={status === 'ACTIVE' ? 'green' : 'red'} 
      icon={status === 'ACTIVE' ? <CheckCircleOutlined /> : <PoweroffOutlined />} 
      style={{ borderRadius: '4px', fontWeight: 500 }}
    >
      {status === 'ACTIVE' ? 'Actif' : 'Inactif'}
    </Tag>
  );

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
      render: (status: 'ACTIVE' | 'INACTIVE') => renderStatusTag(status),
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
      width: 260,
      render: (_, record: Organization) => {
        const ab = (emoji: string, label: string, onClick: () => void, opts: { bg?: string; color?: string; danger?: boolean } = {}) => (
          <button key={label} onClick={onClick} title={label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
            border: 'none', background: opts.danger ? '#ffeef0' : opts.bg || FB.btnGray,
            color: opts.danger ? FB.red : opts.color || FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            transition: 'background 0.15s', whiteSpace: 'nowrap' as const,
          }}><span>{emoji}</span><span>{label}</span></button>
        );
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ab('📋', 'Détails', () => openOrganizationDetails(record), { bg: '#e7f3ff', color: FB.blue })}
            {canManageOrgs && (
              <>
                <Popconfirm
                  title={`${record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'} cette organisation ?`}
                  description={`L'organisation sera ${record.status === 'ACTIVE' ? 'désactivée' : 'activée'}.`}
                  onConfirm={() => handleToggleOrganizationStatus(record.id, record.name, record.status)}
                  okText={record.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  cancelText="Annuler"
                >
                  {ab(record.status === 'ACTIVE' ? '⛔' : '✅', record.status === 'ACTIVE' ? 'Désactiver' : 'Activer', () => {}, { bg: record.status === 'ACTIVE' ? '#fff2f0' : '#f6ffed', color: record.status === 'ACTIVE' ? FB.red : FB.green })}
                </Popconfirm>
                {ab('✏️', 'Modifier', () => openEditOrganization(record), { bg: '#f9f0ff', color: FB.purple })}
                {ab('🔗', 'Google WS', () => openGoogleWorkspaceConfig(record), { bg: '#e6f4ff', color: '#4285F4' })}
                {ab('🚀', 'GW Modules', () => handleActivateGoogleWorkspaceModules(record.id), { bg: '#fff1f0', color: FB.red })}
                {ab('📞', 'Telnyx', () => openTelnyxConfig(record), { bg: '#fff0f0', color: '#FF6B6B' })}
                {ab('🧩', 'Modules', () => openModulesManager(record), { bg: '#f6ffed', color: FB.green })}
                {ab('🚀', 'Devis1Min', () => openDevis1Minute(record), { bg: '#fff7e6', color: '#ff7a00' })}
                <Popconfirm
                  title="⚠️ Supprimer cette organisation ?"
                  description="Cette action est irréversible et supprimera toutes les données associées."
                  onConfirm={() => handleDeleteOrganization(record.id, record.name)}
                  okText="🗑️ Supprimer"
                  cancelText="Annuler"
                  okButtonProps={{ danger: true }}
                >
                  {ab('🗑️', 'Supprimer', () => {}, { danger: true })}
                </Popconfirm>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const renderMobileOrganizationActions = (organization: Organization) => {
    const googleWorkspaceEnabled = organization.googleWorkspaceEnabled || organization.stats?.googleWorkspaceEnabled;
    const btnStyle: React.CSSProperties = {
      width: '100%', padding: '10px 0', border: `1px solid ${FB.border}`,
      borderRadius: FB.radius, background: FB.white, cursor: 'pointer',
      fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: 6, color: FB.text,
    };
    const primaryBtn: React.CSSProperties = { ...btnStyle, background: FB.blue, color: '#fff', border: 'none' };
    const dangerBtn: React.CSSProperties = { ...btnStyle, color: FB.red, borderColor: FB.red };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button style={primaryBtn} onClick={() => openOrganizationDetails(organization)}>
          <EyeOutlined /> Voir les détails
        </button>
        {canManageOrgs && (<>
          <button style={btnStyle} onClick={() => openEditOrganization(organization)}>
            <EditOutlined /> Modifier l'organisation
          </button>
          <button style={btnStyle} onClick={() => openModulesManager(organization)}>
            <AppstoreAddOutlined /> Modules CRM
          </button>
          <button style={btnStyle} onClick={() => openGoogleWorkspaceConfig(organization)}>
            <GoogleOutlined /> Google Workspace
          </button>
          {!googleWorkspaceEnabled && (
            <button style={btnStyle} onClick={() => handleQuickActivateGoogleWorkspace(organization)}>
              <RocketOutlined /> Activer Google Workspace
            </button>
          )}
          <button style={btnStyle} onClick={() => openTelnyxConfig(organization)}>
            <PhoneOutlined /> Configuration Telnyx
          </button>
          <button style={btnStyle} onClick={() => openDevis1Minute(organization)}>
            <RocketOutlined /> Devis1Minute
          </button>
          <Popconfirm
            title={`${organization.status === 'ACTIVE' ? 'Désactiver' : 'Activer'} cette organisation ?`}
            onConfirm={() => handleToggleOrganizationStatus(organization.id, organization.name, organization.status)}
            okText={organization.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
            cancelText="Annuler"
          >
            <button style={btnStyle}>
              <PoweroffOutlined /> {organization.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
            </button>
          </Popconfirm>
          <Popconfirm
            title="Supprimer cette organisation ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeleteOrganization(organization.id, organization.name)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <button style={dangerBtn}>
              <DeleteOutlined /> Supprimer
            </button>
          </Popconfirm>
        </>)}
      </div>
    );
  };

  const renderOrganizationCard = (organization: Organization) => {
    const cachedModuleCount = moduleCache[organization.id];
    const moduleCount = cachedModuleCount !== undefined
      ? cachedModuleCount
      : organization.stats?.activeModules || 0;
    const googleEnabled = organization.googleWorkspaceEnabled || organization.stats?.googleWorkspaceEnabled;

    return (
      <div key={organization.id} style={{
        background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
        padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: FB.text }}>
                {formatOrganizationName(organization.name, 60)}
              </span>
              {renderStatusTag(organization.status)}
            </div>
            {organization.description && (
              <div style={{ color: FB.textSecondary, fontSize: 13, marginTop: 4 }}>
                {formatDescription(organization.description, 90)}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: FB.textSecondary, fontSize: 12 }}>Modules actifs</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: moduleCount > 0 ? FB.green : '#999' }}>{moduleCount}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: <UserOutlined style={{ color: FB.blue }} />, label: 'Utilisateurs', val: organization.stats?.totalUsers || 0 },
            { icon: <TeamOutlined style={{ color: FB.purple }} />, label: 'Rôles', val: organization.stats?.totalRoles || 0 },
            { icon: <AppstoreOutlined style={{ color: FB.green }} />, label: 'Modules CRM', val: moduleCount },
            { icon: <GoogleOutlined style={{ color: '#4285F4' }} />, label: 'Google', val: googleEnabled ? 'Activé' : 'Inactif' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              borderRadius: FB.radius, background: FB.bg, flex: '1 1 45%', minWidth: 130,
            }}>
              {s.icon}
              <div>
                <div style={{ fontSize: 11, color: FB.textSecondary }}>{s.label}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Google Workspace modules pills */}
        {organization.googleWorkspaceModules.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {organization.googleWorkspaceModules.map(module => (
              <Tag key={module.id} icon={getGoogleModuleIcon(module.key)} color={getCachedGoogleIcon(module.key).color}
                style={{ borderRadius: 16, marginRight: 0 }}>
                {module.label}
              </Tag>
            ))}
          </div>
        )}

        {/* Actions */}
        {renderMobileOrganizationActions(organization)}
      </div>
    );
  };

  // 🚀 EFFET DE CHARGEMENT INITIAL
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // ── FB helpers ──
  const statCardStyle: React.CSSProperties = {
    background: FB.white, borderRadius: FB.radius, padding: isMobile ? 14 : 18,
    boxShadow: FB.shadow, flex: '1 1 200px', minWidth: isMobile ? '100%' : 200,
  };
  const statLabel: React.CSSProperties = { fontSize: 12, color: FB.textSecondary, marginBottom: 4 };
  const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: FB.text };

  return (
    <div style={{ background: FB.bg, minHeight: '100vh', width: '100%', padding: isMobile ? '12px 8px' : '20px 24px' }}>
      {/* ── Header ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, padding: isMobile ? '14px 16px' : '18px 24px',
        boxShadow: FB.shadow, marginBottom: 16, display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TeamOutlined style={{ fontSize: isMobile ? 22 : 26, color: FB.blue }} />
          <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: FB.text }}>
            Gestion des Organisations
          </span>
        </div>
        {canManageOrgs && (
          <button onClick={() => setCreateModal(true)} style={{
            background: FB.blue, color: '#fff', border: 'none', borderRadius: FB.radius,
            padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, width: isMobile ? '100%' : 'auto',
            justifyContent: 'center',
          }}>
            <PlusOutlined /> Nouvelle Organisation
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={statCardStyle}>
          <div style={statLabel}>Total Organisations</div>
          <div style={statValue}><TeamOutlined style={{ marginRight: 6 }} />{organizations.length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Organisations Actives</div>
          <div style={{ ...statValue, color: FB.green }}>
            <CheckCircleOutlined style={{ marginRight: 6 }} />{organizations.filter(o => o.status === 'ACTIVE').length}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Avec Google Workspace</div>
          <div style={{ ...statValue, color: '#4285F4' }}>
            <GoogleOutlined style={{ marginRight: 6 }} />{organizations.filter(o => o.googleWorkspaceEnabled).length}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Total Modules Actifs</div>
          <div style={{ ...statValue, color: FB.purple }}>
            <AppstoreOutlined style={{ marginRight: 6 }} />{Object.values(moduleCache).reduce((sum, count) => sum + count, 0)}
          </div>
        </div>
      </div>

      {/* ── Search / Filter ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, padding: isMobile ? 12 : 16,
        boxShadow: FB.shadow, marginBottom: 16, display: 'flex', flexWrap: 'wrap',
        gap: 12, alignItems: 'center',
      }}>
        <div style={{ flex: '1 1 280px' }}>
          <Input
            placeholder="Rechercher par nom ou description..."
            value={searchInputValue}
            onChange={handleSearchChange}
            prefix={<SearchOutlined style={{ color: FB.textSecondary }} />}
            allowClear
            style={{ borderRadius: FB.radius }}
          />
        </div>
        <div style={{ flex: '0 1 220px' }}>
          <Select
            placeholder="Filtrer par statut"
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: '100%' }}
          >
            <Select.Option value="all">
              <Space>
                <AppstoreOutlined />
                Tous les statuts
              </Space>
            </Select.Option>
            <Select.Option value="ACTIVE">
              <Space>
                <CheckCircleOutlined style={{ color: FB.green }} />
                Actives
              </Space>
            </Select.Option>
            <Select.Option value="INACTIVE">
              <Space>
                <PoweroffOutlined style={{ color: FB.red }} />
                Inactives
              </Space>
                </Select.Option>
              </Select>
        </div>
        <button onClick={fetchOrganizations} disabled={loading} style={{
          background: FB.btnGray, border: 'none', borderRadius: FB.radius,
          padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6, color: FB.text,
        }}>
          <ReloadOutlined spin={loading} /> Actualiser
        </button>
        <span style={{ color: FB.textSecondary, fontSize: 13, whiteSpace: 'nowrap' }}>
          {filteredOrganizations.length} résultat{filteredOrganizations.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Content ── */}
      {isMobile ? (
        filteredOrganizations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredOrganizations.map(renderOrganizationCard)}
          </div>
        ) : (
          <div style={{
            background: FB.white, borderRadius: FB.radius, padding: 40,
            textAlign: 'center', boxShadow: FB.shadow,
          }}>
            <Empty description="Aucune organisation ne correspond à votre recherche" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )
      ) : (
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
          overflow: 'hidden',
        }}>
          <Table
            columns={columns}
            dataSource={filteredOrganizations}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total} organisations`,
            }}
            scroll={{ x: isTablet ? 960 : 1200 }}
          />
        </div>
      )}

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
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <Form.Item
              name="website"
              label="Site web"
            >
              <Input placeholder="exemple.com (https:// sera ajouté automatiquement)" />
            </Form.Item>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input placeholder="+32 123 456 789" />
            </Form.Item>
            <Form.Item
              name="address"
              label="Adresse"
              rules={[{ max: 200, message: 'Maximum 200 caractères' }]}
            >
              <Input placeholder="Adresse complète" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setCreateModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Annuler</button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Créer l'Organisation</button>
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
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <Form.Item
              name="website"
              label="Site web"
            >
              <Input placeholder="exemple.com (https:// sera ajouté automatiquement)" />
            </Form.Item>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input placeholder="+32 123 456 789" />
            </Form.Item>
            <Form.Item
              name="address"
              label="Adresse"
              rules={[{ max: 200, message: 'Maximum 200 caractères' }]}
            >
              <Input placeholder="Adresse complète" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setEditModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Annuler</button>
            <button type="submit" style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Sauvegarder</button>
          </div>
        </Form>
      </Modal>

      {/* 👁️ MODAL DÉTAILS ORGANISATION */}
      <Modal
        title="Détails de l'Organisation"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          <button onClick={() => setDetailModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Fermer</button>
        }
        width={900}
      >
        {selectedOrganization && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Informations Générales */}
              <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: FB.text, marginBottom: 12 }}>Informations Générales</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><span style={{ fontWeight: 600 }}>Nom: </span>{selectedOrganization.name}</div>
                  {selectedOrganization.description && <div><span style={{ fontWeight: 600 }}>Description: </span>{selectedOrganization.description}</div>}
                  {selectedOrganization.website && <div><span style={{ fontWeight: 600 }}>Site web: </span>{selectedOrganization.website}</div>}
                  {selectedOrganization.phone && <div><span style={{ fontWeight: 600 }}>Téléphone: </span>{selectedOrganization.phone}</div>}
                  {selectedOrganization.address && <div><span style={{ fontWeight: 600 }}>Adresse: </span>{selectedOrganization.address}</div>}
                </div>
              </div>

              {/* Statistiques */}
              <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: FB.text, marginBottom: 12 }}>Statistiques</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: FB.white, borderRadius: 6, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: FB.textSecondary }}>Utilisateurs</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: FB.blue }}><UserOutlined style={{ marginRight: 4 }} />{selectedOrganization.stats?.totalUsers || 0}</div>
                  </div>
                  <div style={{ background: FB.white, borderRadius: 6, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: FB.textSecondary }}>Rôles</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: FB.purple }}><TeamOutlined style={{ marginRight: 4 }} />{selectedOrganization.stats?.totalRoles || 0}</div>
                  </div>
                  <div style={{ background: FB.white, borderRadius: 6, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: FB.textSecondary }}>Modules Actifs</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: FB.green }}><AppstoreOutlined style={{ marginRight: 4 }} />{selectedOrganization.stats?.activeModules || 0}</div>
                  </div>
                  <div style={{ background: FB.white, borderRadius: 6, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: FB.textSecondary }}>Google Workspace</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: selectedOrganization.stats?.googleWorkspaceEnabled ? FB.green : FB.red }}><GoogleOutlined style={{ marginRight: 4 }} />{selectedOrganization.stats?.googleWorkspaceEnabled ? 'Activé' : 'Désactivé'}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <button
                    onClick={async () => {
                      console.log('🔄 Actualisation des statistiques...');
                      await fetchOrganizations();
                      messageApi.success('Statistiques actualisées');
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: `1px dashed ${FB.border}`, background: FB.white, color: FB.textSecondary, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  ><span>🔄</span><span>Actualiser les statistiques</span></button>
                </div>
              </div>
            </div>

            {organizationModules.length > 0 && (
              <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: FB.text, marginBottom: 12 }}>Modules CRM Actifs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {organizationModules.map(module => (
                    <Tag key={module.id} icon={getCrmModuleIcon(module.key)} color="blue">
                      {module.label || module.name}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedOrganization.googleWorkspaceModules.length > 0 && (
              <div style={{ background: FB.bg, borderRadius: FB.radius, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: FB.text, marginBottom: 12 }}>Modules Google Workspace Actifs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedOrganization.googleWorkspaceModules.map(module => (
                    <Tag key={module.id} icon={getGoogleModuleIcon(module.key)} color="blue">
                      {module.label}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 🌐 MODAL GOOGLE WORKSPACE */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleOutlined style={{ color: '#4285F4' }} />
            Google Workspace - {selectedOrganization?.name}
          </div>
        }
        open={googleWorkspaceModal}
        onCancel={() => setGoogleWorkspaceModal(false)}
        footer={
          <button onClick={() => setGoogleWorkspaceModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Fermer</button>
        }
        width={1000}
      >
        {selectedOrganization && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreAddOutlined style={{ color: '#1890ff' }} />
            Gestion des modules - {selectedOrganization?.name}
          </div>
        }
        open={modulesModal}
        onCancel={() => setModulesModal(false)}
        footer={
          <button onClick={() => setModulesModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Fermer</button>
        }
        width={800}
      >
        {selectedOrganization && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert
              message="Interface simplifiée de gestion des modules"
              description="Utilisez les interrupteurs pour activer ou désactiver directement chaque module pour cette organisation. Les modules activés seront visibles dans le menu de navigation des utilisateurs."
              type="info"
              showIcon
              style={{ marginBottom: 0 }}
            />
            
            {modulesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Spin size="large" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RocketOutlined style={{ color: '#ff7a00' }} />
            Gestion Devis1Minute - {selectedOrganization?.name}
          </div>
        }
        open={devis1minuteModal}
        onCancel={() => setDevis1minuteModal(false)}
        footer={
          <button onClick={() => setDevis1minuteModal(false)} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Fermer</button>
        }
        width={800}
      >
        {selectedOrganization && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert
              message="Gestion des modules Devis1Minute"
              description="Activez ou désactivez individuellement chaque module Devis1Minute pour cette organisation."
              type="info"
              showIcon
            />
            
            {devis1minuteLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Spin size="large" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {devis1minuteModules.length > 0 ? (
                  devis1minuteModules.map((module: Module) => {
                    const isActive = module.isActiveForOrg || false;
                    
                    return (
                      <div 
                        key={module.id} 
                        style={{
                          padding: 16, borderRadius: FB.radius, transition: 'box-shadow 0.2s',
                          border: `1px solid ${isActive ? FB.orange : FB.border}`,
                          background: isActive ? '#fff7e6' : FB.white,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <RocketOutlined style={{ fontSize: 24, color: isActive ? FB.orange : '#bfbfbf' }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 16 }}>{module.label || module.name}</div>
                              {module.description && (
                                <div style={{ fontSize: 13, color: FB.textSecondary, marginTop: 4 }}>{module.description}</div>
                              )}
                              <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 4 }}>
                                Feature: {module.feature}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Badge 
                              status={isActive ? "success" : "default"} 
                              text={isActive ? "Actif" : "Inactif"}
                            />
                            <FBToggle
                              checked={isActive}
                              onChange={(checked) => handleToggleDevis1minuteModule(module, checked)}
                              size="small"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <RocketOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 16, display: 'block' }} />
                    <p style={{ color: FB.textSecondary }}>Aucun module Devis1Minute disponible</p>
                    <p style={{ fontSize: 13, color: '#bfbfbf', marginTop: 8 }}>
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

