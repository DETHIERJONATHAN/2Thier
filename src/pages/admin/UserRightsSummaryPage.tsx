import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Button, Spin, Alert, Row, Col, Select, Typography, Divider, Space, Tag, Statistic, Progress, Badge, Descriptions } from 'antd';
import { 
  UserOutlined, 
  TeamOutlined, 
  ReloadOutlined, 
  DownloadOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';

const { Title, Text, Paragraph } = Typography;

// Types enrichis pour tableau de bord complet
interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  status?: string;
  createdAt?: string;
  lastConnection?: string;
  phoneNumber?: string;
  profilePicture?: string;
}

interface Organization {
  id: string;
  name: string;
  status?: string;
  description?: string;
  website?: string;
  createdAt?: string;
  totalUsers?: number;
  activeModules?: number;
}

interface ModulePermission {
  moduleKey: string;
  moduleName: string;
  label: string;
  actions: string[];
  description?: string;
  category?: string;
  isActive?: boolean;
  lastAccessed?: string;
}

interface UserRoleDetail {
  role: string;
  roleType: string;
  description?: string;
  permissions: string[];
  assignedAt?: string;
  assignedBy?: string;
}

interface ActivityLog {
  action: string;
  timestamp: string;
  details?: string;
  ipAddress?: string;
}

interface SecurityInfo {
  lastPasswordChange?: string;
  mfaEnabled?: boolean;
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface UsageStats {
  totalLogins: number;
  lastLogin?: string;
  averageSessionDuration?: string;
  modulesUsed: string[];
  favoriteModules: string[];
  productivity: number; // 0-100
}

interface RightsSummary {
  // Informations de base
  userInfo?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    lastConnection?: string;
    accountStatus?: string;
    createdAt?: string;
    phoneNumber?: string;
    profilePicture?: string;
  role?: string; // ajout pour correspondre aux accès existants
  };
  organizationInfo?: {
    id: string;
    name: string;
    status?: string;
    moduleCount?: number;
    description?: string;
    website?: string;
    totalUsers?: number;
    createdAt?: string;
  activeModules?: number; // ajout compat
  };
  
  // Rôles et permissions détaillés
  roles: string[];
  roleDetails?: UserRoleDetail[];
  permissions: { [moduleKey: string]: ModulePermission };
  
  // Statistiques et métriques
  stats?: {
    totalPermissions: number;
    activeModules: number;
    restrictedActions: number;
    securityScore: number;
    accessLevel: 'BASIC' | 'STANDARD' | 'ADVANCED' | 'ADMIN' | 'SUPER_ADMIN';
  };
  
  // Sécurité
  security?: SecurityInfo;
  
  // Activité et usage
  usage?: UsageStats;
  recentActivity?: ActivityLog[];
  
  // Relations
  associations?: {
    createdAt: string;
    lastModified: string;
    assignedBy?: string;
    status: string;
  };
}

const UserRightsSummaryPage: React.FC = () => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  
  // États principaux
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);
  const [rightsSummary, setRightsSummary] = useState<RightsSummary | null>(null);
  
  // États pour les filtres dynamiques
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  
  // États de chargement et d'erreur
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vérification des permissions d'accès
  const hasAdminAccess = useMemo(() => {
    if (!user) return false;
    console.log("[UserRightsSummaryPage] User object:", user);
    console.log("[UserRightsSummaryPage] user.isSuperAdmin:", user.isSuperAdmin);
    console.log("[UserRightsSummaryPage] user.role:", (user as { role?: string })?.role);
    console.log("[UserRightsSummaryPage] user.userRole:", (user as { userRole?: string })?.userRole);
    
    // Vérifier si l'utilisateur est super admin ou admin
    const isSuper = user.isSuperAdmin === true;
    const roleCheck = (user as { role?: string })?.role;
    const userRoleCheck = (user as { userRole?: string })?.userRole;
    
    console.log("[UserRightsSummaryPage] isSuper:", isSuper);
    console.log("[UserRightsSummaryPage] roleCheck:", roleCheck);
    console.log("[UserRightsSummaryPage] userRoleCheck:", userRoleCheck);
    
    return isSuper || 
           roleCheck === 'admin' || 
           roleCheck === 'super_admin' || 
           roleCheck === 'ADMIN' || 
           roleCheck === 'SUPER_ADMIN' ||
           userRoleCheck === 'admin' || 
           userRoleCheck === 'super_admin' || 
           userRoleCheck === 'ADMIN' || 
           userRoleCheck === 'SUPER_ADMIN';
  }, [user]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    setIsFetchingData(true);
    setError(null);

    try {
      console.log("[UserRightsSummaryPage] Fetching initial data...");
      console.log("[UserRightsSummaryPage] User permissions check - hasAdminAccess:", hasAdminAccess);
      
      // D'abord vérifier l'authentification avec /auth/me
      const authCheck = await api.get('/api/auth/me').catch(err => {
        console.error("[UserRightsSummaryPage] Auth check failed:", err);
        return { error: 'Non authentifié', authFailed: true };
      });
      
      if (authCheck?.authFailed) {
        setError("Session expirée ou non authentifié. Veuillez vous reconnecter.");
        setUsers([]);
        setOrganizations([]);
        setFilteredUsers([]);
        setFilteredOrganizations([]);
        return;
      }
      
      console.log("[UserRightsSummaryPage] Auth check successful:", authCheck);
      
      const [usersResponse, orgsResponse] = await Promise.all([
        api.get('/api/users').catch(err => {
          console.error("[UserRightsSummaryPage] Error fetching users:", err);
          // Extraire le message d'erreur plus précisément
          const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de la récupération des utilisateurs';
          return { error: errorMsg, status: err.response?.status };
        }),
        api.get('/api/organizations').catch(err => {
          console.error("[UserRightsSummaryPage] Error fetching organizations:", err);
          const errorMsg = err.response?.data?.message || err.message || 'Erreur lors de la récupération des organisations';
          return { error: errorMsg, status: err.response?.status };
        })
      ]);

      console.log("[UserRightsSummaryPage] Users response:", usersResponse);
      console.log("[UserRightsSummaryPage] Organizations response:", orgsResponse);

      // Gestion des erreurs d'accès plus précise
      if (usersResponse?.error || orgsResponse?.error) {
        const userError = usersResponse?.error;
        const orgError = orgsResponse?.error;
        const statusCode = usersResponse?.status || orgsResponse?.status;
        
        if (statusCode === 403) {
          setError(`Accès refusé (403): Permissions insuffisantes pour accéder aux ${userError ? 'utilisateurs' : 'organisations'}. Vérifiez que vous avez le rôle admin ou super_admin.`);
        } else if (statusCode === 401) {
          setError(`Non autorisé (401): Session expirée ou token invalide. Reconnectez-vous.`);
        } else {
          setError(`Erreur API: ${userError || orgError}`);
        }
        setUsers([]);
        setOrganizations([]);
        setFilteredUsers([]);
        setFilteredOrganizations([]);
        return;
      }

      let processedUsers = [];
      let processedOrganizations = [];

      if (Array.isArray(usersResponse)) {
        processedUsers = usersResponse;
        setUsers(usersResponse);
        console.log(`[UserRightsSummaryPage] ${usersResponse.length} utilisateurs chargés:`, usersResponse);
      } else if (usersResponse?.data && Array.isArray(usersResponse.data)) {
        // Extract data from API response format {success: true, data: [...]}
        processedUsers = usersResponse.data;
        setUsers(usersResponse.data);
        console.log(`[UserRightsSummaryPage] ${usersResponse.data.length} utilisateurs chargés depuis response.data:`, usersResponse.data);
      } else {
        console.warn("[UserRightsSummaryPage] Users response is not an array:", usersResponse);
        setUsers([]);
      }

      if (Array.isArray(orgsResponse)) {
        processedOrganizations = orgsResponse;
        setOrganizations(orgsResponse);
        console.log(`[UserRightsSummaryPage] ${orgsResponse.length} organisations chargées:`, orgsResponse);
      } else if (orgsResponse?.data && Array.isArray(orgsResponse.data)) {
        // Extract data from API response format {success: true, data: [...]}
        processedOrganizations = orgsResponse.data;
        setOrganizations(orgsResponse.data);
        console.log(`[UserRightsSummaryPage] ${orgsResponse.data.length} organisations chargées depuis response.data:`, orgsResponse.data);
      } else {
        console.warn("[UserRightsSummaryPage] Organizations response is not an array:", orgsResponse);
        setOrganizations([]);
      }

      // Initialiser les listes filtrées avec toutes les données
      setFilteredUsers(processedUsers);
      setFilteredOrganizations(processedOrganizations);

    } catch (error) {
      console.error('[UserRightsSummaryPage] Error fetching initial data:', error);
      setError('Erreur lors du chargement des données. Vérifiez vos permissions d\'administration.');
      setUsers([]);
      setOrganizations([]);
      setFilteredUsers([]);
      setFilteredOrganizations([]);
    } finally {
      setIsFetchingData(false);
    }
  }, [api, hasAdminAccess]);

  // Fetch rights summary
  const fetchRightsSummary = useCallback(async () => {
    if (!selectedUserId || !selectedOrgId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const summaryResponse = await api.get(`/users/${selectedUserId}/rights-summary?organizationId=${selectedOrgId}`);
      
      console.log("[UserRightsSummaryPage] Rights summary response:", summaryResponse);

      // Extraire les données du format API {success: true, data: {...}}
      let rightsSummaryData;
      if (summaryResponse?.data && typeof summaryResponse.data === 'object') {
        rightsSummaryData = summaryResponse.data;
        console.log("[UserRightsSummaryPage] Using rights summary from response.data:", rightsSummaryData);
      } else if (summaryResponse && typeof summaryResponse === 'object') {
        rightsSummaryData = summaryResponse;
        console.log("[UserRightsSummaryPage] Using rights summary directly:", rightsSummaryData);
      } else {
        console.warn("[UserRightsSummaryPage] Unexpected rights summary response format:", summaryResponse);
        rightsSummaryData = null;
      }

      console.log("[UserRightsSummaryPage] Final rightsSummaryData:", rightsSummaryData);
      console.log('[UserRightsSummaryPage] 🔍 Structure détaillée des données:');
      console.log('- userInfo:', rightsSummaryData?.userInfo);
      console.log('- organizationInfo:', rightsSummaryData?.organizationInfo);
      console.log('- roles:', rightsSummaryData?.roles);
      console.log('- permissions structure:', Object.keys(rightsSummaryData?.permissions || {}));
      console.log('[UserRightsSummaryPage] 📊 Données user complètes:', JSON.stringify(rightsSummaryData?.userInfo, null, 2));
      console.log('[UserRightsSummaryPage] 🏢 Données org complètes:', JSON.stringify(rightsSummaryData?.organizationInfo, null, 2));
      
      // Enrichir les données avec les informations complètes des users et organizations
      if (rightsSummaryData) {
        // Enrichir userInfo avec les données complètes de l'utilisateur
        const fullUserData = users.find(u => u.id === selectedUserId);
        if (fullUserData && rightsSummaryData.userInfo) {
          rightsSummaryData.userInfo = {
            ...rightsSummaryData.userInfo,
            phoneNumber: fullUserData.phoneNumber,
            createdAt: fullUserData.createdAt,
            profilePicture: fullUserData.profilePicture,
            status: fullUserData.status,
            // Enrichir avec plus d'informations si disponibles
            role: fullUserData.role
          };
          console.log('[UserRightsSummaryPage] ✨ Données user enrichies:', rightsSummaryData.userInfo);
        }

        // Enrichir organizationInfo avec les données complètes de l'organisation
        const fullOrgData = organizations.find(o => o.id === selectedOrgId);
        if (fullOrgData && rightsSummaryData.organizationInfo) {
          // Calculer le nombre réel de modules disponibles basé sur les permissions
          const realModuleCount = Object.keys(rightsSummaryData.permissions || {}).length;
          
          // Calculer le nombre réel d'utilisateurs (incluant tous les utilisateurs de la base)
          const realUserCount = users.length; // Tous les utilisateurs chargés
          
          rightsSummaryData.organizationInfo = {
            ...rightsSummaryData.organizationInfo,
            website: fullOrgData.website,
            description: fullOrgData.description,
            createdAt: fullOrgData.createdAt,
            // Utiliser les vraies données calculées au lieu des données API incomplètes
            totalUsers: realUserCount,
            moduleCount: realModuleCount,
            activeModules: fullOrgData.activeModules || realModuleCount
          };
          console.log('[UserRightsSummaryPage] ✨ Données org enrichies avec statistiques réelles:', rightsSummaryData.organizationInfo);
          console.log('[UserRightsSummaryPage] 📊 Calculs: modules réels =', realModuleCount, ', utilisateurs réels =', realUserCount);
        }
      }
      
      setRightsSummary(rightsSummaryData);

      // Scroll vers la section des résultats une fois chargée
      setTimeout(() => {
        const element = document.querySelector('[data-testid="rights-summary-results"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (error) {
      console.error('[UserRightsSummaryPage] Error fetching rights summary:', error);
      setError('Erreur lors de la récupération du résumé des droits');
      setRightsSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [api, selectedUserId, selectedOrgId, users, organizations]);

  // Fonction pour récupérer les organisations d'un utilisateur
  const fetchUserOrganizations = useCallback(async (userId: string) => {
    try {
      console.log("[UserRightsSummaryPage] Fetching organizations for user:", userId);
      const response = await api.get(`/users/${userId}/organizations`);
      
      if (response?.success && Array.isArray(response.data)) {
        const userOrgs = response.data.map((userOrg: { Organization: Organization }) => userOrg.Organization).filter(Boolean);
        console.log("[UserRightsSummaryPage] User organizations found:", userOrgs);
        setFilteredOrganizations(userOrgs);
        
        // Si l'organisation actuellement sélectionnée n'est pas disponible pour cet utilisateur, la déselectionner
        if (selectedOrgId && !userOrgs.some((org: Organization) => org.id === selectedOrgId)) {
          setSelectedOrgId(undefined);
          setRightsSummary(null);
        }
      } else {
        console.warn("[UserRightsSummaryPage] No organizations found for user:", userId);
        setFilteredOrganizations([]);
        setSelectedOrgId(undefined);
        setRightsSummary(null);
      }
    } catch (error) {
      console.error('[UserRightsSummaryPage] Error fetching user organizations:', error);
      setFilteredOrganizations([]);
      setSelectedOrgId(undefined);
      setRightsSummary(null);
    }
  }, [api, selectedOrgId]);

  // Fonction pour filtrer les utilisateurs d'une organisation côté client
  const filterUsersByOrganization = useCallback((organizationId: string) => {
    console.log("[UserRightsSummaryPage] Filtering users for organization:", organizationId);
    
    // Filtrer les utilisateurs qui ont une association avec cette organisation
    const orgUsers = users.filter(user => 
      user.UserOrganization?.some(userOrg => userOrg.organizationId === organizationId)
    );
    
    console.log("[UserRightsSummaryPage] Organization users found:", orgUsers);
    setFilteredUsers(orgUsers);
    
    // Si l'utilisateur actuellement sélectionné n'est pas disponible pour cette organisation, le déselectionner
    if (selectedUserId && !orgUsers.some((user: User) => user.id === selectedUserId)) {
      setSelectedUserId(undefined);
      setRightsSummary(null);
    }
  }, [users, selectedUserId]);

  // Handlers
  const handleUserChange = useCallback((value: string) => {
    console.log("[UserRightsSummaryPage] User selected:", value);
    setSelectedUserId(value);
    setRightsSummary(null);
    
    if (value) {
      // Récupérer les organisations liées à cet utilisateur
      fetchUserOrganizations(value);
    } else {
      // Si aucun utilisateur sélectionné, réinitialiser les organisations
      setFilteredOrganizations(organizations);
      setSelectedOrgId(undefined);
    }
  }, [fetchUserOrganizations, organizations]);

  const handleOrgChange = useCallback((value: string) => {
    console.log("[UserRightsSummaryPage] Organization selected:", value);
    setSelectedOrgId(value);
    setRightsSummary(null);
    
    if (value) {
      // Filtrer les utilisateurs liés à cette organisation
      filterUsersByOrganization(value);
    } else {
      // Si aucune organisation sélectionnée, réinitialiser les utilisateurs
      setFilteredUsers(users);
      setSelectedUserId(undefined);
    }
  }, [filterUsersByOrganization, users]);

  const handleRefresh = useCallback(() => {
    if (selectedUserId && selectedOrgId) {
      fetchRightsSummary();
    } else {
      fetchInitialData();
    }
  }, [selectedUserId, selectedOrgId, fetchRightsSummary, fetchInitialData]);

  const handleExport = useCallback(() => {
    if (!rightsSummary) return;
    
    const exportData = {
      user: rightsSummary.userInfo,
      organization: rightsSummary.organizationInfo,
      roles: rightsSummary.roles,
      permissions: rightsSummary.permissions,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-rights-${selectedUserId}-${selectedOrgId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rightsSummary, selectedUserId, selectedOrgId]);

  // Effets
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedUserId && selectedOrgId) {
      fetchRightsSummary();
    }
  }, [selectedUserId, selectedOrgId, fetchRightsSummary]);

  // Calculer les statistiques globales
  const globalStats = useMemo(() => {
    if (!rightsSummary) return null;

    // Filtrer les modules actifs avec des actions valides
    const activeModulesEntries = Object.entries(rightsSummary.permissions || {}).filter(([, modulePerms]) => {
      const isExplicitlyActive = modulePerms.isActive !== false;
      const hasValidActions = modulePerms.actions && modulePerms.actions.length > 0;
      return isExplicitlyActive && hasValidActions;
    });

    const totalPermissions = activeModulesEntries.length;
    const activeModules = activeModulesEntries.filter(([, modulePerms]) => modulePerms.isActive !== false).length;
    const totalActions = activeModulesEntries.reduce((acc, [, modulePerms]) => acc + (modulePerms.actions?.length || 0), 0);
    
    console.log('[UserRightsSummaryPage] 📊 Statistiques modules actifs:', {
      totalActiveModules: totalPermissions,
      totalActions,
      activeModulesEntries: activeModulesEntries.map(([key, perms]) => ({
        key,
        isActive: perms.isActive,
        actionsCount: perms.actions?.length || 0
      }))
    });
    
    // Calculer le score de sécurité basé sur les rôles et permissions
    let securityScore = 0;
    
    // Vérifier tous les formats possibles de Super Admin
    const isSuperAdmin = rightsSummary.roles?.some(role => 
      role.toLowerCase().includes('super') && role.toLowerCase().includes('admin')
    );
    
    // Vérifier tous les formats possibles d'Admin
    const isAdmin = rightsSummary.roles?.some(role => 
      role.toLowerCase().includes('admin') && !role.toLowerCase().includes('super')
    );
    
    console.log('[UserRightsSummaryPage] 🔐 Calcul sécurité - Rôles détectés:', rightsSummary.roles);
    console.log('[UserRightsSummaryPage] 🔐 isSuperAdmin:', isSuperAdmin, ', isAdmin:', isAdmin, ', totalActions:', totalActions);
    
    if (isSuperAdmin) {
      securityScore = 100;
      console.log('[UserRightsSummaryPage] 🔐 Score Super Admin: 100%');
    } else if (isAdmin) {
      securityScore = 80;
      console.log('[UserRightsSummaryPage] 🔐 Score Admin: 80%');
    } else if (totalActions > 15) {
      securityScore = 70;
      console.log('[UserRightsSummaryPage] 🔐 Score Utilisateur avancé (>15 actions): 70%');
    } else if (totalActions > 10) {
      securityScore = 60;
      console.log('[UserRightsSummaryPage] 🔐 Score Utilisateur standard (>10 actions): 60%');
    } else if (totalActions > 5) {
      securityScore = 40;
      console.log('[UserRightsSummaryPage] 🔐 Score Utilisateur basique (>5 actions): 40%');
    } else {
      securityScore = 20;
      console.log('[UserRightsSummaryPage] 🔐 Score Utilisateur très limité (≤5 actions): 20%');
    }

    return {
      totalPermissions,
      activeModules,
      totalActions,
      securityScore,
      accessLevel: securityScore >= 90 ? 'SUPER_ADMIN' : 
                   securityScore >= 70 ? 'ADMIN' : 
                   securityScore >= 50 ? 'ADVANCED' : 
                   securityScore >= 30 ? 'STANDARD' : 'BASIC'
    };
  }, [rightsSummary]);

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': case 'actif': return 'success';
      case 'inactive': case 'inactif': return 'default';
      case 'suspended': case 'suspendu': return 'warning';
      case 'blocked': case 'bloqué': return 'error';
      default: return 'processing';
    }
  };

  // Fonction pour obtenir la couleur du niveau d'accès
  const getAccessLevelColor = (level?: string) => {
    switch (level) {
      case 'SUPER_ADMIN': return '#722ed1';
      case 'ADMIN': return '#eb2f96';
      case 'ADVANCED': return '#1890ff';
      case 'STANDARD': return '#52c41a';
      case 'BASIC': return '#faad14';
      default: return '#d9d9d9';
    }
  };

  // Options pour les selects
  const userOptions = useMemo(() => {
    const sourceUsers = selectedOrgId ? filteredUsers : users;
    console.log("[UserRightsSummaryPage] Generating user options from:", selectedOrgId ? 'filtered users' : 'all users', sourceUsers);
    
    const options = sourceUsers.map(u => {
      console.log("[UserRightsSummaryPage] Processing user:", u);
      const displayName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      const label = displayName 
        ? `${displayName} (${u.email})`
        : u.email;
      console.log("[UserRightsSummaryPage] Generated label:", label);
      return {
        value: u.id,
        label: label
      };
    });
    console.log("[UserRightsSummaryPage] Final user options:", options);
    return options;
  }, [users, filteredUsers, selectedOrgId]);

  const orgOptions = useMemo(() => {
    const sourceOrgs = selectedUserId ? filteredOrganizations : organizations;
    console.log("[UserRightsSummaryPage] Generating org options from:", selectedUserId ? 'filtered organizations' : 'all organizations', sourceOrgs);
    
    const options = sourceOrgs.map(org => {
      console.log("[UserRightsSummaryPage] Processing org:", org);
      return {
        value: org.id,
        label: org.name
      };
    });
    console.log("[UserRightsSummaryPage] Final org options:", options);
    return options;
  }, [organizations, filteredOrganizations, selectedUserId]);

  // N'afficher que pour les utilisateurs connectés et autorisés
  if (!user) {
    console.log("[UserRightsSummaryPage] No user found, redirecting to login");
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Accès non autorisé"
          description="Vous devez être connecté pour accéder à cette page."
          type="error"
          showIcon
        />
      </div>
    );
  }

  console.log("[UserRightsSummaryPage] Current user:", user);
  console.log("[UserRightsSummaryPage] hasAdminAccess:", hasAdminAccess);

  if (!hasAdminAccess) {
    console.log("[UserRightsSummaryPage] User has no admin access");
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="Permissions insuffisantes"
          description="Cette page nécessite des privilèges d'administration. Contactez votre administrateur si vous pensez que c'est une erreur."
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => window.history.back()}>
              Retour
            </Button>
          }
        />
      </div>
    );
  }

  // Debug simplifié
  if (!user) {
    console.log("[UserRightsSummaryPage] ❌ Aucun utilisateur connecté");
  } else if (!hasAdminAccess) {
    console.log("[UserRightsSummaryPage] ❌ Accès admin refusé pour:", user.email);
  } else {
    console.log("[UserRightsSummaryPage] ✅ Utilisateur admin connecté:", user.email, "| Données:", {
      users: users.length,
      orgs: organizations.length,
      selectedUser: selectedUserId,
      selectedOrg: selectedOrgId,
      hasRightsSummary: !!rightsSummary,
      rightsSummaryKeys: rightsSummary ? Object.keys(rightsSummary) : [],
      permissionsCount: rightsSummary?.permissions ? Object.keys(rightsSummary.permissions).length : 0
    });
  }

  return (
    <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* En-tête simple */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, color: '#262626' }}>
          Résumé des droits utilisateur
        </Title>
        <Text type="secondary">
          Sélectionnez un utilisateur et une organisation pour afficher les permissions
        </Text>
      </div>

      {/* Section de sélection */}
      <Card style={{ marginBottom: 24 }}>
        {/* Informations de diagnostic */}
        {(isFetchingData || error || users.length === 0 || organizations.length === 0) && (
          <Alert
            message={
              isFetchingData ? "Chargement des données..." :
              error ? "Erreur de chargement" :
              users.length === 0 ? `Aucun utilisateur trouvé (permissions: ${hasAdminAccess ? 'OK' : 'INSUFFISANTES'})` :
              organizations.length === 0 ? `Aucune organisation trouvée (permissions: ${hasAdminAccess ? 'OK' : 'INSUFFISANTES'})` :
              "Données chargées"
            }
            description={
              error ? error :
              isFetchingData ? "Récupération des utilisateurs et organisations en cours..." :
              users.length === 0 ? "Vérifiez vos permissions d'administration pour accéder aux utilisateurs." :
              organizations.length === 0 ? "Vérifiez vos permissions d'administration pour accéder aux organisations." :
              `${users.length} utilisateurs et ${organizations.length} organisations chargés.`
            }
            type={
              isFetchingData ? "info" :
              error ? "error" :
              (users.length === 0 || organizations.length === 0) ? "warning" :
              "success"
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                <UserOutlined style={{ marginRight: 8 }} />
                Sélectionner un utilisateur
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({selectedOrgId ? filteredUsers.length : users.length} disponible{(selectedOrgId ? filteredUsers.length : users.length) > 1 ? 's' : ''}{selectedOrgId ? ' dans cette organisation' : ''})
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="-- Choisir un utilisateur --"
              value={selectedUserId}
              onChange={handleUserChange}
              allowClear
              showSearch
              filterOption={(input, option) => {
                console.log("[UserRightsSummaryPage] User filterOption - input:", input, "option:", option);
                return option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false;
              }}
              options={userOptions}
              loading={isFetchingData}
              disabled={(selectedOrgId ? filteredUsers.length : users.length) === 0}
              notFoundContent={isFetchingData ? <Spin size="small" /> : selectedOrgId ? "Aucun utilisateur dans cette organisation" : "Aucun utilisateur trouvé"}
              onFocus={() => {
                console.log("[UserRightsSummaryPage] User Select onFocus - options:", userOptions);
                console.log("[UserRightsSummaryPage] User options detailed:", JSON.stringify(userOptions, null, 2));
              }}
              onOpenChange={(open) => {
                console.log("[UserRightsSummaryPage] User Select dropdown visible:", open, "options:", userOptions);
                if (open) {
                  console.log("[UserRightsSummaryPage] Dropdown opened - checking options structure:", userOptions.map(opt => ({ value: opt.value, label: opt.label })));
                }
              }}
              styles={{ popup: { root: { zIndex: 9999 } } }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                <TeamOutlined style={{ marginRight: 8 }} />
                Sélectionner une organisation
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({selectedUserId ? filteredOrganizations.length : organizations.length} disponible{(selectedUserId ? filteredOrganizations.length : organizations.length) > 1 ? 's' : ''}{selectedUserId ? ' pour cet utilisateur' : ''})
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="-- Choisir une organisation --"
              value={selectedOrgId}
              onChange={handleOrgChange}
              allowClear
              showSearch
              filterOption={(input, option) => {
                console.log("[UserRightsSummaryPage] Org filterOption - input:", input, "option:", option);
                return option?.label?.toLowerCase().includes(input.toLowerCase()) ?? false;
              }}
              options={orgOptions}
              loading={isFetchingData}
              disabled={(selectedUserId ? filteredOrganizations.length : organizations.length) === 0}
              notFoundContent={isFetchingData ? <Spin size="small" /> : selectedUserId ? "Aucune organisation pour cet utilisateur" : "Aucune organisation trouvée"}
              onFocus={() => {
                console.log("[UserRightsSummaryPage] Org Select onFocus - options:", orgOptions);
                console.log("[UserRightsSummaryPage] Org options detailed:", JSON.stringify(orgOptions, null, 2));
              }}
              onOpenChange={(open) => {
                console.log("[UserRightsSummaryPage] Org Select dropdown visible:", open, "options:", orgOptions);
                if (open) {
                  console.log("[UserRightsSummaryPage] Org Dropdown opened - checking options structure:", orgOptions.map(opt => ({ value: opt.value, label: opt.label })));
                }
              }}
              styles={{ popup: { root: { zIndex: 9999 } } }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
          </Col>

          <Col xs={24} sm={24} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Actions</Text>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={isLoading || isFetchingData}
              >
                Actualiser
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleExport}
                disabled={!rightsSummary}
              >
                Exporter
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Section des résultats */}
      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {isLoading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>Chargement des permissions...</Text>
            </div>
          </div>
        </Card>
      ) : rightsSummary ? (
        <div data-testid="rights-summary-results">
          {/* Debug des données reçues */}
          {!rightsSummary.permissions || Object.keys(rightsSummary.permissions).length === 0 ? (
            <Alert
              message="Données de permissions manquantes"
              description={`Les informations de base sont présentes mais les permissions détaillées sont manquantes. Données disponibles: ${Object.keys(rightsSummary).join(', ')}`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button onClick={handleRefresh} type="primary" size="small">
                  Actualiser
                </Button>
              }
            />
          ) : null}

          {/* Tableau de bord principal - Vue d'ensemble statistique */}
          {globalStats && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Modules accessibles"
                    value={globalStats.totalPermissions}
                    prefix={<DatabaseOutlined style={{ color: '#1890ff' }} />}
                    suffix="modules"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Actions autorisées"
                    value={globalStats.totalActions}
                    prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
                    suffix="actions"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Niveau de sécurité"
                    value={globalStats.securityScore}
                    prefix={<SafetyOutlined style={{ color: getAccessLevelColor(globalStats.accessLevel) }} />}
                    suffix="/ 100"
                  />
                  <Progress 
                    percent={globalStats.securityScore} 
                    strokeColor={getAccessLevelColor(globalStats.accessLevel)}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="Niveau d'accès"
                    value={globalStats.accessLevel}
                    prefix={<TrophyOutlined style={{ color: getAccessLevelColor(globalStats.accessLevel) }} />}
                  />
                  <Badge 
                    color={getAccessLevelColor(globalStats.accessLevel)} 
                    text={`${globalStats.activeModules} modules actifs`}
                    style={{ marginTop: 8 }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* Section principale avec layout en deux colonnes */}
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            
            {/* Colonne gauche - Informations utilisateur */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                
                {/* Profil utilisateur détaillé */}
                {rightsSummary.userInfo && (
                  <Card 
                    title={
                      <span>
                        <UserOutlined style={{ marginRight: 8 }} />
                        Profil utilisateur
                      </span>
                    }
                    extra={
                      <Tag color={getStatusColor(rightsSummary.userInfo.accountStatus)}>
                        {rightsSummary.userInfo.accountStatus || 'Statut inconnu'}
                      </Tag>
                    }
                  >
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label={<><MailOutlined /> Email</>}>
                        <Text copyable strong>{rightsSummary.userInfo.email}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Nom complet">
                        <Text strong>
                          {rightsSummary.userInfo.firstName} {rightsSummary.userInfo.lastName}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<><ClockCircleOutlined /> Dernière connexion</>}>
                        {rightsSummary.userInfo.lastConnection ? (
                          <Text>
                            {new Date(rightsSummary.userInfo.lastConnection).toLocaleString('fr-FR')}
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Il y a {Math.floor((Date.now() - new Date(rightsSummary.userInfo.lastConnection).getTime()) / (1000 * 60 * 60 * 24))} jours
                            </Text>
                          </Text>
                        ) : (
                          <Text type="warning">Jamais connecté</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Compte créé">
                        {rightsSummary.userInfo.createdAt ? (
                          <Text>
                            {new Date(rightsSummary.userInfo.createdAt).toLocaleDateString('fr-FR')}
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Il y a {Math.floor((Date.now() - new Date(rightsSummary.userInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24))} jours
                            </Text>
                          </Text>
                        ) : (
                          <Text type="secondary">Date inconnue</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label={<><PhoneOutlined /> Téléphone</>}>
                        {rightsSummary.userInfo.phoneNumber ? (
                          <Text copyable>{rightsSummary.userInfo.phoneNumber}</Text>
                        ) : (
                          <Text type="secondary">Non renseigné</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Rôle système">
                        {rightsSummary.userInfo.role ? (
                          <Tag color={rightsSummary.userInfo.role === 'super_admin' ? 'red' : 'blue'}>
                            {rightsSummary.userInfo.role}
                          </Tag>
                        ) : (
                          <Text type="secondary">Non défini</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="ID Utilisateur">
                        <Text code copyable>{rightsSummary.userInfo.id}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                {/* Rôles attribués */}
                <Card 
                  title={
                    <span>
                      <SafetyOutlined style={{ marginRight: 8 }} />
                      Rôles et privilèges
                    </span>
                  }
                  extra={
                    <Badge count={rightsSummary.roles?.length || 0} showZero>
                      <span>Rôles</span>
                    </Badge>
                  }
                >
                  {rightsSummary.roles && rightsSummary.roles.length > 0 ? (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Space wrap>
                        {rightsSummary.roles.map((role, index) => {
                          const isHighPrivilege = role.toLowerCase().includes('admin') || role.toLowerCase().includes('super');
                          return (
                            <Tag 
                              key={index} 
                              color={isHighPrivilege ? 'red' : 'blue'}
                              icon={isHighPrivilege ? <FireOutlined /> : <UserOutlined />}
                              style={{ padding: '6px 12px', fontSize: '14px' }}
                            >
                              {role}
                            </Tag>
                          );
                        })}
                      </Space>
                      
                      {/* Métriques de sécurité */}
                      <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px' }}>
                        <Text strong style={{ color: '#666' }}>Évaluation de sécurité:</Text>
                        <div style={{ marginTop: 8 }}>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Text style={{ fontSize: '12px', color: '#666' }}>Score de sécurité</Text>
                              <div>
                                <Text strong style={{ color: getAccessLevelColor(globalStats?.accessLevel) }}>
                                  {globalStats?.securityScore || 0}/100
                                </Text>
                              </div>
                            </Col>
                            <Col span={12}>
                              <Text style={{ fontSize: '12px', color: '#666' }}>Niveau d'accès</Text>
                              <div>
                                <Tag color={getAccessLevelColor(globalStats?.accessLevel)}>
                                  {globalStats?.accessLevel || 'INCONNU'}
                                </Tag>
                              </div>
                            </Col>
                          </Row>
                        </div>
                      </div>
                    </Space>
                  ) : (
                    <Alert
                      message="Aucun rôle attribué"
                      description="Cet utilisateur n'a aucun rôle spécifique dans cette organisation."
                      type="warning"
                      showIcon
                    />
                  )}
                </Card>
                
              </Space>
            </Col>

            {/* Colonne droite - Informations organisation */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                
                {/* Informations organisation détaillées */}
                {rightsSummary.organizationInfo && (
                  <Card 
                    title={
                      <span>
                        <TeamOutlined style={{ marginRight: 8 }} />
                        Organisation - {rightsSummary.organizationInfo.name}
                      </span>
                    }
                    extra={
                      <Space>
                        <Tag color={getStatusColor(rightsSummary.organizationInfo.status)}>
                          {rightsSummary.organizationInfo.status || 'Statut inconnu'}
                        </Tag>
                        <Badge count={rightsSummary.organizationInfo.totalUsers || 0} showZero color="#108ee9">
                          <span>Utilisateurs</span>
                        </Badge>
                      </Space>
                    }
                  >
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="Nom organisation">
                        <Text strong>{rightsSummary.organizationInfo.name}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<><DatabaseOutlined /> Modules activés</>}>
                        <Space>
                          <Badge count={rightsSummary.organizationInfo.moduleCount || 0} showZero color="#52c41a">
                            <span>Modules avec permissions</span>
                          </Badge>
                          {rightsSummary.organizationInfo.activeModules !== rightsSummary.organizationInfo.moduleCount && (
                            <Badge count={rightsSummary.organizationInfo.activeModules || 0} showZero color="#1890ff">
                              <span>Modules actifs</span>
                            </Badge>
                          )}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label={<><TeamOutlined /> Équipe</>}>
                        <Space>
                          <Text strong>
                            {rightsSummary.organizationInfo.totalUsers || 0} utilisateur{(rightsSummary.organizationInfo.totalUsers || 0) > 1 ? 's' : ''}
                          </Text>
                          {(rightsSummary.organizationInfo.totalUsers || 0) > 0 && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              (incluant Super Admin)
                            </Text>
                          )}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="Date création">
                        {rightsSummary.organizationInfo.createdAt ? (
                          <Text>
                            {new Date(rightsSummary.organizationInfo.createdAt).toLocaleDateString('fr-FR')}
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Il y a {Math.floor((Date.now() - new Date(rightsSummary.organizationInfo.createdAt).getTime()) / (1000 * 60 * 60 * 24))} jours
                            </Text>
                          </Text>
                        ) : (
                          <Text type="secondary">Date inconnue</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label={<><GlobalOutlined /> Site web</>}>
                        {rightsSummary.organizationInfo.website ? (
                          <a href={rightsSummary.organizationInfo.website} target="_blank" rel="noopener noreferrer">
                            {rightsSummary.organizationInfo.website}
                          </a>
                        ) : (
                          <Text type="secondary">Non renseigné</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="Description">
                        {rightsSummary.organizationInfo.description ? (
                          <Paragraph ellipsis={{ rows: 2, expandable: true }}>
                            {rightsSummary.organizationInfo.description}
                          </Paragraph>
                        ) : (
                          <Text type="secondary">Aucune description</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="ID Organisation">
                        <Text code copyable>{rightsSummary.organizationInfo.id}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                {/* Statistiques d'utilisation */}
                <Card 
                  title={
                    <span>
                      <BulbOutlined style={{ marginRight: 8 }} />
                      Statistiques d'utilisation
                    </span>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="Modules accessibles"
                        value={globalStats?.totalPermissions || 0}
                        prefix={<DatabaseOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Actions autorisées"
                        value={globalStats?.totalActions || 0}
                        prefix={<ThunderboltOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Modules actifs"
                        value={globalStats?.activeModules || 0}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Niveau sécurité"
                        value={globalStats?.securityScore || 0}
                        suffix="/100"
                        prefix={<SafetyOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
                
              </Space>
            </Col>
          </Row>

          {/* Permissions par module - Section principale */}
          <Card 
            title={
              <span>
                <ApiOutlined style={{ marginRight: 8 }} />
                Permissions détaillées par module
              </span>
            }
            extra={
              <Badge 
                count={
                  rightsSummary.permissions ? 
                  Object.entries(rightsSummary.permissions).filter(([, modulePerms]) => {
                    const isExplicitlyActive = modulePerms.isActive !== false;
                    const hasValidActions = modulePerms.actions && modulePerms.actions.length > 0;
                    return isExplicitlyActive && hasValidActions;
                  }).length : 0
                } 
                showZero
              >
                <span>Modules actifs</span>
              </Badge>
            }
          >
            {rightsSummary.permissions && Object.keys(rightsSummary.permissions).length > 0 ? (
              <Row gutter={[16, 16]}>
                {Object.entries(rightsSummary.permissions)
                  // Filtrer pour ne montrer que les modules actifs
                  .filter(([moduleKey, modulePerms]) => {
                    // Considérer un module comme actif si :
                    // 1. Il a explicitement isActive !== false
                    // 2. Il a au moins une action autorisée (non vide)
                    const isExplicitlyActive = modulePerms.isActive !== false;
                    const hasValidActions = modulePerms.actions && modulePerms.actions.length > 0;
                    
                    console.log(`[UserRightsSummaryPage] Module ${moduleKey}:`, {
                      isActive: modulePerms.isActive,
                      isExplicitlyActive,
                      hasValidActions,
                      actionsCount: modulePerms.actions?.length || 0,
                      actions: modulePerms.actions
                    });
                    
                    return isExplicitlyActive && hasValidActions;
                  })
                  .map(([moduleKey, modulePerms]) => {
                  const hasRead = modulePerms.actions?.some(action => action.toLowerCase().includes('read') || action.toLowerCase().includes('view') || action.toLowerCase().includes('list'));
                  const hasWrite = modulePerms.actions?.some(action => action.toLowerCase().includes('write') || action.toLowerCase().includes('create') || action.toLowerCase().includes('update'));
                  const hasDelete = modulePerms.actions?.some(action => action.toLowerCase().includes('delete') || action.toLowerCase().includes('remove'));
                  const hasAdmin = modulePerms.actions?.some(action => action.toLowerCase().includes('admin') || action.toLowerCase().includes('manage'));
                  
                  const permissionLevel = hasAdmin ? 'ADMIN' : hasDelete ? 'FULL' : hasWrite ? 'EDIT' : hasRead ? 'READ' : 'NONE';
                  const levelColors = {
                    'ADMIN': 'red',
                    'FULL': 'orange', 
                    'EDIT': 'blue',
                    'READ': 'green',
                    'NONE': 'default'
                  };

                  return (
                    <Col xs={24} sm={12} lg={8} xl={6} key={moduleKey}>
                      <Card 
                        size="small"
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{modulePerms.label || moduleKey}</span>
                            <Tag color={levelColors[permissionLevel]} size="small">
                              {permissionLevel}
                            </Tag>
                          </div>
                        }
                        style={{ height: '100%' }}
                      >
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text>Lecture</Text>
                            {hasRead ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text>Écriture</Text>
                            {hasWrite ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text>Suppression</Text>
                            {hasDelete ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text>Administration</Text>
                            {hasAdmin ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          </div>
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Alert
                message="Aucune permission trouvée"
                description="Aucun module n'est accessible pour cet utilisateur dans cette organisation."
                type="info"
                showIcon
              />
            )}
          </Card>
        </div>
      ) : (!selectedUserId || !selectedOrgId) ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Text type="secondary">Sélectionnez un utilisateur et une organisation pour voir les permissions</Text>
          </div>
        </Card>
      ) : null}

      {/* Informations de sélection actuelle */}
      {(selectedUserId || selectedOrgId) && (
        <>
          <Divider />
          <Card title="Sélection actuelle" size="small" style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Utilisateur sélectionné :</Text>{' '}
                {selectedUserId ? (
                  <Text code>{users.find(u => u.id === selectedUserId)?.email || selectedUserId}</Text>
                ) : (
                  <Text type="secondary">Aucun</Text>
                )}
              </Col>
              <Col span={12}>
                <Text strong>Organisation sélectionnée :</Text>{' '}
                {selectedOrgId ? (
                  <Text code>{organizations.find(o => o.id === selectedOrgId)?.name || selectedOrgId}</Text>
                ) : (
                  <Text type="secondary">Aucune</Text>
                )}
              </Col>
            </Row>
            {selectedUserId && selectedOrgId && !rightsSummary && !isLoading && (
              <Alert
                message="Prêt à charger les permissions"
                description="Cliquez sur 'Actualiser' pour charger les permissions de cet utilisateur dans cette organisation."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                action={
                  <Button size="small" type="primary" onClick={handleRefresh}>
                    Charger
                  </Button>
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default UserRightsSummaryPage;
