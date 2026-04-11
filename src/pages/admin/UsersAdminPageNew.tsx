import { SF, FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { message as antdMessage } from 'antd';
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

// ── Facebook Design Tokens ──
// ── Responsive Hook ──
function useScreenSize() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1100, width: w };
}

// ── FBToggle ──
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

// ── FBCard ──
const FBCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
    padding: 16, ...style,
  }}>
    {children}
  </div>
);

// ── Confirm Popup ──
const FBConfirm = ({ title, description, onConfirm, children }: {
  title: string; description: string; onConfirm: () => void; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(true)}>{children}</div>
      {open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: FB.white, borderRadius: FB.radius, padding: 24,
            maxWidth: 400, width: '90%', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: FB.text, marginBottom: 8 }}>{title}</div>
            <div style={{ color: FB.textSecondary, fontSize: 14, marginBottom: 20 }}>{description}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: FB.btnGray, color: FB.text, fontWeight: 600,
                cursor: 'pointer', fontSize: 14,
              }}>Annuler</button>
              <button onClick={() => { onConfirm(); setOpen(false); }} style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: FB.red, color: FB.white, fontWeight: 600,
                cursor: 'pointer', fontSize: 14,
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════
const UsersAdminPageNew: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [msgApi, contextHolder] = antdMessage.useMessage();
  const { permissions, currentOrganization } = useAuth();
  const hasPermission = useCallback((permission: string) => permissions.includes(permission), [permissions]);
  const { isMobile } = useScreenSize();

  // ── State ──
  const [users, setUsers] = useState<User[]>([]);
  const [freeUsers, setFreeUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<UiInvitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userServices, setUserServices] = useState<Record<string, UserService[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Modals ──
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
      user.email, user.firstName, user.firstname,
      user.lastName, user.lastname,
      user.organizationRole?.name, user.organizationRole?.label,
    ].filter(Boolean).map(value => String(value).toLowerCase());
    return parts.some(value => value.includes(normalizedSearch));
  }, [normalizedSearch]);

  // Fusionner les utilisateurs org + libres en une seule liste
  const allUsers = useMemo(() => {
    const orgUserIds = new Set(users.map(u => u.id));
    const processedFree = freeUsers.map(u => ({
      ...u,
      key: u.id,
      globalStatus: (u as Record<string, unknown>).status as string || 'active',
      orgStatus: 'NONE' as string,
      status: 'NONE',
    }));
    return [...users, ...processedFree.filter(u => !orgUserIds.has(u.id))];
  }, [users, freeUsers]);

  const filteredUsers = useMemo(() => (
    normalizedSearch ? allUsers.filter(matchesUserSearch) : allUsers
  ), [allUsers, normalizedSearch, matchesUserSearch]);

  const filteredInvitations = useMemo(() => (
    normalizedSearch
      ? invitations.filter(inv => inv.email.toLowerCase().includes(normalizedSearch))
      : invitations
  ), [invitations, normalizedSearch]);

  // ══════════════════════════════════════════
  // ── DATA FETCHING (100% identique) ──
  // ══════════════════════════════════════════
  const fetchUsers = useCallback(async () => {
    try {
      const usersResponse = await apiInstance.get('/api/users');
      type RawUserFromApi = {
        id: string; email: string; firstName?: string; lastName?: string;
        status?: string;
        UserOrganization?: Array<{
          id: string; organizationId: string;
          status: 'ACTIVE' | 'INACTIVE' | string;
          Role?: Role; Organization?: Organization;
        }>;
      };
      const processUsers = (rawData: unknown[]): User[] => (rawData as RawUserFromApi[]).map((u) => {
        const rel = Array.isArray(u.UserOrganization)
          ? (currentOrganization?.id && currentOrganization.id !== 'all'
              ? u.UserOrganization.find((r) => r.organizationId === currentOrganization.id) || u.UserOrganization[0]
              : u.UserOrganization[0])
          : undefined;
        const orgStatus = (rel?.status as string) || 'INACTIVE';
        const globalStatus = (u as Record<string, unknown>).status as string || 'active';
        return {
          ...(u as unknown as User),
          key: u.id,
          organizationId: rel?.organizationId,
          organizationRole: rel?.Role,
          userOrganizationId: rel?.id,
          status: orgStatus,
          orgStatus,
          globalStatus,
        };
      });

      let fetchedUsers: User[] = [];
      if (usersResponse?.success && Array.isArray(usersResponse.data)) {
        fetchedUsers = processUsers(usersResponse.data);
      } else if (Array.isArray(usersResponse)) {
        fetchedUsers = processUsers(usersResponse);
      }
      setUsers(fetchedUsers);

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
      const resp = await apiInstance.get('/api/users/free');
      if (resp?.success && Array.isArray(resp.data)) setFreeUsers(resp.data);
    } catch {
      msgApi.error("Erreur lors de la récupération des utilisateurs libres.");
    }
  }, [apiInstance, msgApi]);

  const fetchInvitations = useCallback(async () => {
    try {
      const resp = await apiInstance.get('/api/users/invitations');
      if (resp?.success && Array.isArray(resp.data)) setInvitations(resp.data);
    } catch {
      msgApi.error("Erreur lors de la récupération des invitations.");
    }
  }, [apiInstance, msgApi]);

  const fetchRoles = useCallback(async () => {
    try {
      const resp = await apiInstance.get('/api/roles?organizationId=current');
      if (resp?.success && Array.isArray(resp.data)) {
        setRoles(resp.data);
      } else if (Array.isArray(resp)) {
        setRoles(resp);
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

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ══════════════════════════════════════════
  // ── HANDLERS (100% identiques) ──
  // ══════════════════════════════════════════
  const handleServiceToggle = async (userId: string, serviceName: 'email' | 'telnyx', currentlyActive: boolean) => {
    const endpoint = currentlyActive
      ? `/services/${serviceName}/disable/${userId}`
      : `/services/${serviceName}/enable/${userId}`;
    try {
      const response = await api.post(endpoint);
      if (response.success) {
        msgApi.success(`Service ${serviceName} mis à jour.`);
        await fetchAllData();
      }
    } catch { /* géré par le hook */ }
  };

  const handleResendVerification = async (user: User) => {
    try {
      const response = await api.post(`/api/users/${user.id}/resend-verification`);
      if (response.success) {
        if (response.alreadyVerified) {
          msgApi.info('Cet utilisateur a déjà vérifié son email.');
        } else {
          msgApi.success(`Email de confirmation renvoyé à ${user.email}`);
        }
        await fetchAllData();
      }
    } catch { /* géré par le hook */ }
  };

  const handleStatusChange = async (user: User, newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (!user.userOrganizationId) {
      msgApi.error("ID de relation manquant, impossible de changer le statut.");
      return;
    }
    try {
      const response = await api.patch(
        `/api/users/user-organizations/${user.userOrganizationId}`,
        { status: newStatus }
      );
      if (response.success) {
        msgApi.success(`Utilisateur ${newStatus === 'ACTIVE' ? 'réactivé' : 'désactivé'} dans l'organisation.`);
        await fetchAllData();
      }
    } catch { /* Le hook gère l'erreur */ }
  };

  const handleGlobalStatusChange = async (user: User, newStatus: 'active' | 'inactive') => {
    try {
      const response = await api.patch(
        `/api/users/${user.id}/global-status`,
        { status: newStatus }
      );
      if (response.success) {
        msgApi.success(`Compte Zhiive ${newStatus === 'active' ? 'activé' : 'désactivé'}.`);
        await fetchAllData();
      }
    } catch { /* Le hook gère l'erreur */ }
  };

  const handleEditUser = (user: User) => { setSelectedUser(user); setIsEditModalVisible(true); };
  const handleManageOrganizations = (user: User) => { setSelectedUser(user); setIsManageOrgModalVisible(true); };
  const handleGoogleWorkspace = (user: User) => { setSelectedUser(user); setIsGoogleWorkspaceModalVisible(true); };
  const handleTelnyx = (user: User) => { setSelectedUser(user); setIsTelnyxModalVisible(true); };

  const handleDeleteUser = async (user: User) => {
    try {
      await apiInstance.delete(`/api/users/${user.id}`);
      msgApi.success(`Utilisateur ${user.email} supprimé avec succès`);
      await fetchAllData();
    } catch (e: unknown) {
      console.error('Erreur lors de la suppression:', e);
      type AxiosErrorLike = { response?: { data?: { message?: string } } };
      const err = e as AxiosErrorLike;
      msgApi.error(err.response?.data?.message ?? "Erreur lors de la suppression de l'utilisateur");
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

  const handleAttachToOrg = async (user: User, roleName: string = 'super_admin') => {
    try {
      if (!currentOrganization?.id || currentOrganization.id === 'all') {
        msgApi.error("Organisation courante non définie.");
        return;
      }
      const targetRole = roles.find(r =>
        (r.name?.toLowerCase?.() === roleName.toLowerCase()) ||
        (r.label?.toLowerCase?.() === roleName.toLowerCase())
      );
      if (!targetRole) {
        msgApi.error(`Rôle ${roleName} introuvable pour cette organisation.`);
        return;
      }
      const res = await apiInstance.post('/api/users/user-organizations', {
        userId: user.id,
        organizationId: currentOrganization.id,
        roleId: targetRole.id,
      });
      if (res?.success) {
        msgApi.success(`${user.email} ajouté à l'organisation en ${roleName}.`);
        await fetchAllData();
      }
    } catch (e) {
      console.error('Erreur attach user to org:', e);
      msgApi.error("Impossible d'ajouter l'utilisateur à l'organisation.");
    }
  };

  const handleForceAcceptInvitation = async (invitation: UiInvitation) => {
    try {
      const response = await apiInstance.post(`/api/users/invitations/${invitation.id}/force-accept`);
      if (response.success) {
        msgApi.success(`Invitation acceptée automatiquement pour ${invitation.email}`);
        await fetchAllData();
      }
    } catch { /* Le hook gère l'erreur */ }
  };

  const handleDeleteInvitation = async (invitation: UiInvitation) => {
    try {
      const response = await apiInstance.delete(`/api/users/invitations/${invitation.id}`);
      if (response.success) {
        msgApi.success(`Invitation pour ${invitation.email} supprimée avec succès`);
        await fetchAllData();
      }
    } catch { /* Le hook gère l'erreur */ }
  };

  // ══════════════════════════════════════════
  // ── HELPERS ──
  // ══════════════════════════════════════════
  const getInitials = (u: { firstName?: string; firstname?: string; lastName?: string; lastname?: string; email?: string }) => {
    const fn = u.firstName || u.firstname || '';
    const ln = u.lastName || u.lastname || '';
    if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase();
    if (fn) return fn[0].toUpperCase();
    if (u.email) return u.email[0].toUpperCase();
    return '?';
  };

  const getFullName = (u: { firstName?: string; firstname?: string; lastName?: string; lastname?: string; email?: string }) => {
    const fn = u.firstName || u.firstname || '';
    const ln = u.lastName || u.lastname || '';
    return `${fn} ${ln}`.trim() || u.email || '';
  };

  const activeOrgCount = allUsers.filter(u => u.orgStatus === 'ACTIVE').length;
  const activeZhiiveCount = allUsers.filter(u => u.globalStatus === 'active').length;
  const freeCount = allUsers.filter(u => !u.userOrganizationId).length;
  const pendingInvCount = invitations.filter(i => i.status === 'PENDING').length;

  const tabs = [
    { key: 'users', label: 'Utilisateurs', count: allUsers.length, icon: '👥' },
    { key: 'invitations', label: 'Invitations', count: invitations.length, icon: '📨' },
  ];

  const getSourceLabel = (source?: string) => {
    if (!source) return { label: 'Manuel', bg: FB.btnGray, color: FB.text };
    const map: Record<string, { label: string; bg: string; color: string }> = {
      'form:go': { label: '📋 Formulaire Go', bg: '#e7f3ff', color: FB.blue },
      'form:partenaire': { label: '🤝 Partenaire', bg: '#e7f3ff', color: FB.blue },
      'form:reunion': { label: '📅 Réunion', bg: '#e7f3ff', color: FB.blue },
    };
    return map[source] || { label: source, bg: FB.btnGray, color: FB.text };
  };

  // ── Reusable action button ──
  const ActionBtn = ({ label, icon, onClick, color, danger, primary }: {
    label: string; icon: string; onClick: () => void;
    color?: string; danger?: boolean; primary?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: isMobile ? '8px 10px' : '6px 12px',
        borderRadius: 6, border: 'none',
        background: primary ? FB.blue : danger ? '#ffeef0' : FB.btnGray,
        color: primary ? FB.white : danger ? FB.red : color || FB.text,
        cursor: 'pointer', fontSize: 13, fontWeight: 600,
        transition: 'background 0.15s', whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      {!isMobile && <span>{label}</span>}
    </button>
  );

  // ══════════════════════════════════════════
  // ── RENDER: User Card ──
  // ══════════════════════════════════════════
  const renderUserCard = (user: User) => {
    const services = userServices[user.id] || [];
    const emailSvc = services.find(s => s.serviceName === 'email');
    const telnyxSvc = services.find(s => s.serviceName === 'telnyx');
    const isOrgActive = user.orgStatus === 'ACTIVE';
    const hasOrg = user.orgStatus !== 'NONE' && !!user.userOrganizationId;
    const isGlobalActive = user.globalStatus === 'active';
    const roleName = user.organizationRole?.label || user.organizationRole?.name || (hasOrg ? '—' : 'Libre');
    const showAddToOrg = !user.userOrganizationId && currentOrganization?.id && currentOrganization.id !== 'all' && hasPermission('super_admin');
    const canEdit = hasPermission('admin') || hasPermission('super_admin');
    const canManageOrgs = hasPermission('super_admin');
    const canAccessGoogle = Boolean(
      user.organizationId &&
      user.UserOrganization?.[0]?.Organization?.googleWorkspaceConfig &&
      canEdit
    );
    const canAccessTelnyx = Boolean(user.organizationId && canEdit);

    return (
      <FBCard key={user.id} style={{ marginBottom: 12 }}>
        {/* Top row: avatar + info + status toggle */}
        <div style={{
          display: 'flex', gap: isMobile ? 10 : 14,
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: FB.blue,
            color: FB.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden',
          }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              : getInitials(user)}
          </div>

          {/* Info block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: FB.text }}>{getFullName(user)}</span>
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 12,
                background: '#e7f3ff', color: FB.blue, fontWeight: 500,
              }}>{roleName}</span>
              <span title="Statut sur le réseau Zhiive" style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: isGlobalActive ? '#e6f4ea' : '#fce8e6',
                color: isGlobalActive ? FB.green : FB.red, fontWeight: 600,
              }}>{isGlobalActive ? '🐝 Zhiive' : '○ Zhiive'}</span>
              <span title="Statut dans l'organisation" style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: !hasOrg ? FB.btnGray : isOrgActive ? '#e6f4ea' : '#fce8e6',
                color: !hasOrg ? FB.textSecondary : isOrgActive ? FB.green : FB.red, fontWeight: 600,
              }}>{!hasOrg ? '— Aucune org' : isOrgActive ? '🏢 Org' : '○ Org'}</span>
            </div>
            <div style={{ color: FB.textSecondary, fontSize: 13, marginTop: 2, wordBreak: 'break-all' }}>{user.email}</div>
          </div>

          {/* Status toggles: Zhiive (global) + Org */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: FB.textSecondary }}>🐝 Zhiive</span>
              <FBToggle
                checked={isGlobalActive}
                onChange={(c) => handleGlobalStatusChange(user, c ? 'active' : 'inactive')}
                disabled={!canEdit}
                size="small"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: FB.textSecondary }}>🏢 Org</span>
              <FBToggle
                checked={isOrgActive}
                onChange={(c) => handleStatusChange(user, c ? 'ACTIVE' : 'INACTIVE')}
                disabled={!user.userOrganizationId}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* Services + actions row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16,
          marginTop: 12, padding: '10px 0 0', borderTop: `1px solid ${FB.border}`,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: FB.textSecondary }}>📧 Email</span>
            <FBToggle
              checked={emailSvc?.isActive || false}
              onChange={() => handleServiceToggle(user.id, 'email', emailSvc?.isActive || false)}
              size="small"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: FB.textSecondary }}>📞 Telnyx</span>
            <FBToggle
              checked={telnyxSvc?.isActive || false}
              onChange={() => handleServiceToggle(user.id, 'telnyx', telnyxSvc?.isActive || false)}
              size="small"
            />
          </div>

          {/* Email verification indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: FB.textSecondary }}>📤 Envoyé</span>
            <FBToggle
              checked={!!user.confirmationEmailSentAt}
              onChange={() => {}}
              disabled
              size="small"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: user.emailVerified ? FB.green : FB.textSecondary }}>
              {user.emailVerified ? '✅' : '⏳'} Confirmé
            </span>
            <FBToggle
              checked={user.emailVerified || false}
              onChange={() => {}}
              disabled
              size="small"
            />
          </div>
          {/* Resend button - only if not yet verified */}
          {!user.emailVerified && canEdit && (
            <button
              onClick={() => handleResendVerification(user)}
              title={user.confirmationEmailSentAt
                ? `Dernier envoi : ${new Date(user.confirmationEmailSentAt).toLocaleString()}`
                : 'Aucun email envoyé'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6, border: `1px solid ${FB.orange}`,
                background: '#fff8f0', color: FB.orange,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'background 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <span>📤</span> Renvoyer
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {showAddToOrg && (
              <ActionBtn label="Ajouter à l'org" icon="➕" onClick={() => handleAttachToOrg(user)} primary />
            )}
            {canEdit && (
              <ActionBtn label="Modifier" icon="✏️" onClick={() => handleEditUser(user)} />
            )}
            {canAccessGoogle && (
              <ActionBtn label="Google" icon="🔵" onClick={() => handleGoogleWorkspace(user)} color="#4285F4" />
            )}
            {canAccessTelnyx && (
              <ActionBtn label="Telnyx" icon="📱" onClick={() => handleTelnyx(user)} color={SF.like} />
            )}
            {canManageOrgs && (
              <ActionBtn label="Organisations" icon="🏢" onClick={() => handleManageOrganizations(user)} />
            )}
            {canManageOrgs && (
              <FBConfirm
                title="Supprimer l'utilisateur"
                description={`Êtes-vous sûr de vouloir supprimer ${user.email} ? Cette action est irréversible.`}
                onConfirm={() => handleDeleteUser(user)}
              >
                <ActionBtn label="Supprimer" icon="🗑️" onClick={() => {}} danger />
              </FBConfirm>
            )}
          </div>
        </div>
      </FBCard>
    );
  };

  // ══════════════════════════════════════════
  // ── RENDER: Invitation Card ──
  // ══════════════════════════════════════════
  const renderInvitationCard = (invitation: UiInvitation) => {
    const meta = invitation.metadata as Record<string, unknown> | undefined;
    const source = getSourceLabel(invitation.source);
    const isPending = invitation.status === 'PENDING';

    return (
      <FBCard key={`inv-${invitation.id}`} style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex', gap: isMobile ? 10 : 14,
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: FB.orange,
            color: FB.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, flexShrink: 0,
          }}>📨</div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: FB.text, wordBreak: 'break-all' }}>{invitation.email}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: isPending ? '#fff3e0' : '#fce8e6',
                color: isPending ? FB.orange : FB.red, fontWeight: 600,
              }}>{invitation.status}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                background: source.bg, color: source.color, fontWeight: 500,
              }}>{source.label}</span>
            </div>
            {meta && meta.firstName && (
              <div style={{ color: FB.textSecondary, fontSize: 13, marginTop: 2 }}>
                {String(meta.firstName)} {String(meta.lastName || '')}
                {meta.phone && ` • ${String(meta.phone)}`}
              </div>
            )}
            {meta && meta.company && (
              <div style={{ color: FB.blue, fontSize: 12, marginTop: 1 }}>{String(meta.company)}</div>
            )}
            <div style={{
              color: FB.textSecondary, fontSize: 12, marginTop: 4,
              display: 'flex', gap: 12, flexWrap: 'wrap',
            }}>
              {invitation.organization?.name && <span>🏢 {invitation.organization.name}</span>}
              {invitation.role?.name && <span>👤 {invitation.role.name}</span>}
              <span>📅 {new Date(invitation.createdAt).toLocaleDateString()}</span>
              {invitation.expiresAt && <span>⏰ Expire {new Date(invitation.expiresAt).toLocaleDateString()}</span>}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleForceAcceptInvitation(invitation)}
              disabled={!isPending}
              style={{
                padding: '8px 14px', borderRadius: 6, border: 'none',
                background: isPending ? FB.blue : FB.btnGray,
                color: isPending ? FB.white : FB.textSecondary,
                fontWeight: 600, cursor: isPending ? 'pointer' : 'not-allowed',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                opacity: isPending ? 1 : 0.5, whiteSpace: 'nowrap',
              }}
            >⚡ {isMobile ? 'Accept' : 'Force Accept'}</button>
            <button
              disabled={!isPending}
              style={{
                padding: '8px 14px', borderRadius: 6, border: `1px solid ${FB.border}`,
                background: FB.white, color: isPending ? FB.text : FB.textSecondary,
                fontWeight: 500, cursor: isPending ? 'pointer' : 'not-allowed',
                fontSize: 13, opacity: isPending ? 1 : 0.5, whiteSpace: 'nowrap',
              }}
            >📤 {isMobile ? '' : 'Renvoyer'}</button>
            <FBConfirm
              title="Supprimer l'invitation"
              description="Êtes-vous sûr de vouloir supprimer cette invitation ?"
              onConfirm={() => handleDeleteInvitation(invitation)}
            >
              <button style={{
                padding: '8px 12px', borderRadius: 6, border: 'none',
                background: '#ffeef0', color: FB.red, fontWeight: 600,
                cursor: 'pointer', fontSize: 13,
              }}>🗑️</button>
            </FBConfirm>
          </div>
        </div>
      </FBCard>
    );
  };

  // ══════════════════════════════════════════
  // ── MAIN RENDER ──
  // ══════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: FB.bg }}>
      {contextHolder}

      {/* Full-width container — same approach as Mur/Profil/Paramètres */}
      <div style={{
        width: '100%',
        padding: isMobile ? '12px 8px' : '20px 24px',
      }}>

        {/* ── Header Card ── */}
        <FBCard style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between', gap: 12,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: FB.blue,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 22, filter: 'grayscale(0)' }}>👥</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 18 : 22, color: FB.text }}>
                  Gestion des Utilisateurs
                </div>
                <div style={{ color: FB.textSecondary, fontSize: 13 }}>
                  {currentOrganization?.name || 'Toutes les organisations'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsInvitationModalVisible(true)}
              style={{
                padding: isMobile ? '12px 20px' : '10px 24px',
                borderRadius: 6, border: 'none',
                background: FB.blue, color: FB.white, fontWeight: 600,
                cursor: 'pointer', fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <span>➕</span> Inviter un utilisateur
            </button>
          </div>
        </FBCard>

        {/* ── Search bar ── */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: FB.textSecondary, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher un utilisateur, un email ou un rôle..."
            style={{
              width: '100%', padding: '12px 40px 12px 42px',
              borderRadius: 20, border: 'none', background: FB.btnGray,
              fontSize: 15, color: FB.text, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: FB.textSecondary, padding: 4,
              }}
            >✕</button>
          )}
        </div>

        {/* ── Stats Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: 12, marginBottom: 16,
        }}>
          {[
            { label: 'Total Utilisateurs', value: allUsers.length, icon: '👥', color: FB.blue },
            { label: 'Actifs Zhiive', value: activeZhiiveCount, icon: '🐝', color: FB.green },
            { label: 'Actifs Org', value: activeOrgCount, icon: '🏢', color: FB.blue },
            { label: 'Sans organisation', value: freeCount, icon: '🆓', color: FB.purple },
            { label: 'Invitations en attente', value: pendingInvCount, icon: '⏳', color: FB.orange },
          ].map(stat => (
            <FBCard key={stat.label} style={{ textAlign: 'center', padding: isMobile ? '12px 8px' : '16px 12px' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: stat.color }}>
                {loading ? '...' : stat.value}
              </div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: FB.textSecondary, marginTop: 4 }}>
                {stat.label}
              </div>
            </FBCard>
          ))}
        </div>

        {/* ── Tab Bar ── */}
        <div style={{
          display: 'flex', gap: 0, marginBottom: 16,
          background: FB.white, borderRadius: FB.radius,
          boxShadow: FB.shadow, overflow: 'hidden',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: isMobile ? '12px 4px' : '14px 8px',
                border: 'none',
                background: activeTab === tab.key ? FB.white : 'transparent',
                borderBottom: activeTab === tab.key ? `3px solid ${FB.blue}` : '3px solid transparent',
                color: activeTab === tab.key ? FB.blue : FB.textSecondary,
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: isMobile ? 13 : 14, cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              {!isMobile && <span>{tab.label}</span>}
              <span style={{
                background: activeTab === tab.key ? '#e7f3ff' : FB.btnGray,
                color: activeTab === tab.key ? FB.blue : FB.textSecondary,
                padding: '1px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {loading ? (
          <FBCard style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <div style={{ color: FB.textSecondary, fontSize: 15 }}>Chargement des données...</div>
          </FBCard>
        ) : (
          <>
            {/* ── Users Tab ── */}
            {activeTab === 'users' && (
              filteredUsers.length > 0 ? (
                <div>{filteredUsers.map(renderUserCard)}</div>
              ) : (
                <FBCard style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
                  <div style={{ color: FB.textSecondary, fontSize: 15 }}>
                    {normalizedSearch ? 'Aucun utilisateur ne correspond à la recherche' : 'Aucun utilisateur'}
                  </div>
                </FBCard>
              )
            )}

            {/* ── Invitations Tab ── */}
            {activeTab === 'invitations' && (
              filteredInvitations.length > 0 ? (
                <div>{filteredInvitations.map(renderInvitationCard)}</div>
              ) : (
                <FBCard style={{ textAlign: 'center', padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📨</div>
                  <div style={{ color: FB.textSecondary, fontSize: 15 }}>
                    {normalizedSearch ? 'Aucune invitation ne correspond' : 'Aucune invitation en attente'}
                  </div>
                </FBCard>
              )
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ── MODALS (100% conservés identiques) ── */}
      {/* ══════════════════════════════════════════ */}
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
