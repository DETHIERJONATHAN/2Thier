import { FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, message } from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  MailOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const useScreenSize = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return { isMobile: w < 768 };
};

const FBCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: 20, marginBottom: 16, ...style }}>
    {children}
  </div>
);

/* ── Facebook Toggle ───────────────────────────────────────── */
const FBToggle: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  size?: 'default' | 'small';
}> = ({ checked, onChange, size = 'default' }) => {
  const isSmall = size === 'small';
  const w = isSmall ? 36 : 44;
  const h = isSmall ? 20 : 24;
  const dot = isSmall ? 16 : 20;
  const pad = 2;
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: h,
        background: checked ? FB.blue : '#bec3c9',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.25s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: pad, left: checked ? w - dot - pad : pad,
        width: dot, height: dot, borderRadius: '50%',
        background: FB.white, boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.25s',
      }} />
    </div>
  );
};

interface UserRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  status?: string;
  userOrganizationId?: string;
  userOrgStatus?: string;
  role?: { id: string; name: string; label: string };
}

const UsersSettings: React.FC = () => {
  const { currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const orgId = currentOrganization?.id;

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [usersRes, rolesRes]: any[] = await Promise.all([
        api.get(`/api/users?organizationId=${orgId}`),
        api.get(`/api/roles?organizationId=${orgId}`),
      ]);
      const userList = Array.isArray(usersRes) ? usersRes : usersRes?.data || usersRes?.users || [];
      setUsers(userList.map((u: any) => {
        const uo = u.UserOrganization?.find?.((uo: any) => uo.organizationId === orgId) || u.userOrganization;
        return {
          id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
          avatarUrl: u.avatarUrl, status: u.status,
          userOrganizationId: uo?.id, userOrgStatus: uo?.status || 'ACTIVE',
          role: uo?.Role || uo?.role,
        };
      }));
      const roleList = Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || rolesRes?.roles || [];
      setRoles(roleList);
    } catch (err) {
      console.error('Erreur chargement users:', err);
      message.error('Erreur lors du chargement des utilisateurs.');
    } finally { setLoading(false); }
  }, [api, orgId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleStatus = async (user: UserRow) => {
    if (!user.userOrganizationId) return;
    const newStatus = user.userOrgStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/api/users/user-organizations/${user.userOrganizationId}`, { status: newStatus });
      message.success(`${user.firstName || user.email} est maintenant ${newStatus === 'ACTIVE' ? 'actif' : 'inactif'}`);
      fetchUsers();
    } catch { message.error('Erreur lors du changement de statut.'); }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRoleId) {
      message.error('Email et rôle requis.');
      return;
    }
    setInviting(true);
    try {
      await api.post('/api/users/invitations', {
        email: inviteEmail, organizationId: orgId, roleId: inviteRoleId,
        firstName: inviteFirstName, lastName: inviteLastName,
      });
      message.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteModal(false);
      setInviteEmail(''); setInviteFirstName(''); setInviteLastName(''); setInviteRoleId('');
      fetchUsers();
    } catch (err: any) {
      message.error(err?.message || "Erreur lors de l'envoi de l'invitation.");
    } finally { setInviting(false); }
  };

  const handleDelete = async (userId: string) => {
    try {
      await api.delete(`/api/users/${userId}`);
      message.success('Utilisateur supprimé');
      setDeleteConfirm(null);
      fetchUsers();
    } catch { message.error('Erreur lors de la suppression.'); }
  };

  const normalizeSearch = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = normalizeSearch(search);
    return (
      normalizeSearch(u.email || '').includes(q) ||
      normalizeSearch(u.firstName || '').includes(q) ||
      normalizeSearch(u.lastName || '').includes(q) ||
      normalizeSearch(u.role?.label || '').includes(q)
    );
  });

  const activeCount = users.filter(u => u.userOrgStatus === 'ACTIVE').length;
  const pendingCount = users.filter(u => u.userOrgStatus === 'PENDING').length;
  const inactiveCount = users.filter(u => u.userOrgStatus === 'INACTIVE').length;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="large" /></div>
  );

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Utilisateurs</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>
              Gérez les membres de {currentOrganization?.name || 'votre Colony'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchUsers}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: '1px solid ' + FB.border,
                background: FB.white, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ReloadOutlined style={{ color: FB.textSecondary }} />
            </button>
            <button
              onClick={() => setInviteModal(true)}
              style={{
                padding: '8px 16px', borderRadius: 6, border: 'none',
                background: FB.blue, color: FB.white, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 6,
              }}
            >
              <UserAddOutlined /> {!isMobile && 'Inviter'}
            </button>
          </div>
        </div>
      </FBCard>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { icon: <CheckCircleOutlined />, label: 'Actifs', value: activeCount, color: FB.green },
          { icon: <ClockCircleOutlined />, label: 'En attente', value: pendingCount, color: FB.orange },
          { icon: <StopOutlined />, label: 'Inactifs', value: inactiveCount, color: FB.textSecondary },
        ].map((s, i) => (
          <FBCard key={i} style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: FB.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ color: s.color }}>{s.icon}</span> {s.label}
            </div>
          </FBCard>
        ))}
      </div>

      {/* Search */}
      <FBCard style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <SearchOutlined style={{ color: FB.textSecondary, fontSize: 16 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15,
              color: FB.text, background: 'transparent', fontFamily: 'inherit',
            }}
          />
          {search && (
            <CloseOutlined
              onClick={() => setSearch('')}
              style={{ color: FB.textSecondary, cursor: 'pointer', fontSize: 12 }}
            />
          )}
        </div>
      </FBCard>

      {/* Users List */}
      <FBCard style={{ padding: 0 }}>
        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: FB.textSecondary }}>
            Aucun utilisateur trouvé
          </div>
        ) : (
          filteredUsers.map((u, i) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < filteredUsers.length - 1 ? '1px solid ' + FB.border : 'none',
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                background: FB.blue + '20', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserOutlined style={{ fontSize: 18, color: FB.blue }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}
                </div>
                <div style={{ fontSize: 12, color: FB.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
              </div>

              {/* Role badge */}
              {!isMobile && (
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: FB.blue + '15', color: FB.blue, flexShrink: 0,
                }}>
                  {u.role?.label || u.role?.name || '-'}
                </span>
              )}

              {/* Toggle */}
              <FBToggle
                checked={u.userOrgStatus === 'ACTIVE'}
                onChange={() => handleToggleStatus(u)}
                size="small"
              />

              {/* Delete */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {deleteConfirm === u.id ? (
                  <div style={{
                    position: 'absolute', right: 0, top: -8,
                    background: FB.white, borderRadius: FB.radius, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                    padding: 12, zIndex: 10, width: 200,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 8 }}>Supprimer cet utilisateur ?</div>
                    <div style={{ fontSize: 12, color: FB.textSecondary, marginBottom: 12 }}>Cette action est irréversible.</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setDeleteConfirm(null)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                        background: FB.btnGray, color: FB.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>Annuler</button>
                      <button onClick={() => handleDelete(u.id)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                        background: FB.red, color: FB.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>Supprimer</button>
                    </div>
                  </div>
                ) : null}
                <button
                  onClick={() => setDeleteConfirm(deleteConfirm === u.id ? null : u.id)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: 'transparent', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <DeleteOutlined style={{ fontSize: 14, color: FB.red }} />
                </button>
              </div>
            </div>
          ))
        )}
      </FBCard>

      {/* ── Invite Modal ── */}
      {inviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }} onClick={() => setInviteModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: FB.white, borderRadius: FB.radius, width: '100%',
            maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid ' + FB.border,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>
                <UserAddOutlined style={{ marginRight: 8 }} />Inviter un membre
              </div>
              <div
                onClick={() => setInviteModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: FB.btnGray,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <CloseOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Email *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px' }}>
                  <MailOutlined style={{ color: FB.textSecondary }} />
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="nom@example.com" type="email"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: FB.text, background: 'transparent', fontFamily: 'inherit' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0 12px' }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Prénom</label>
                  <input value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)}
                    placeholder="Prénom"
                    style={{ width: '100%', border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px', fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Nom</label>
                  <input value={inviteLastName} onChange={e => setInviteLastName(e.target.value)}
                    placeholder="Nom"
                    style={{ width: '100%', border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px', fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Rôle *</label>
                <select value={inviteRoleId} onChange={e => setInviteRoleId(e.target.value)}
                  style={{
                    width: '100%', border: '1px solid ' + FB.border, borderRadius: 6,
                    padding: '10px 12px', fontSize: 15, color: inviteRoleId ? FB.text : FB.textSecondary,
                    outline: 'none', fontFamily: 'inherit', background: FB.white, boxSizing: 'border-box',
                  }}>
                  <option value="">Sélectionner un rôle</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label || r.name}</option>)}
                </select>
              </div>

              <div style={{ height: 1, background: FB.border, margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setInviteModal(false)} style={{
                  padding: '8px 16px', borderRadius: 6, border: 'none',
                  background: FB.btnGray, color: FB.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Annuler</button>
                <button onClick={handleInvite} disabled={inviting} style={{
                  padding: '8px 20px', borderRadius: 6, border: 'none',
                  background: FB.blue, color: FB.white, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', opacity: inviting ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {inviting && <LoadingOutlined />} Envoyer l'invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSettings;
