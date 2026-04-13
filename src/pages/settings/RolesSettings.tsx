import { FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Spin, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  CloseOutlined,
  LoadingOutlined,
  RightOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

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
  checked: boolean; onChange: (v: boolean) => void; size?: 'default' | 'small';
}> = ({ checked, onChange, size = 'default' }) => {
  const s = size === 'small';
  const w = s ? 36 : 44; const h = s ? 20 : 24; const d = s ? 16 : 20; const p = 2;
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: w, height: h, borderRadius: h, background: checked ? FB.blue : '#bec3c9',
      cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: p, left: checked ? w - d - p : p,
        width: d, height: d, borderRadius: '50%', background: FB.white,
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.25s',
      }} />
    </div>
  );
};

/* ── Facebook Checkbox ─────────────────────────────────────── */
const FBCheckbox: React.FC<{
  checked: boolean; onChange: () => void; label: string;
}> = ({ checked, onChange, label }) => (
  <div onClick={onChange} style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
    borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
  }}
    onMouseEnter={e => (e.currentTarget.style.background = FB.btnGray)}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    <div style={{
      width: 20, height: 20, borderRadius: 4,
      border: checked ? 'none' : '2px solid ' + FB.border,
      background: checked ? FB.blue : FB.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', flexShrink: 0,
    }}>
      {checked && <CheckOutlined style={{ fontSize: 12, color: FB.white }} />}
    </div>
    <span style={{ fontSize: 14, color: FB.text }}>{label}</span>
  </div>
);

/* ── FB Modal Shell ────────────────────────────────────────── */
const FBModal: React.FC<{
  open: boolean; onClose: () => void; title: React.ReactNode;
  children: React.ReactNode; width?: number;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, children, width = 480, footer }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: FB.white, borderRadius: FB.radius, width: '100%',
        maxWidth: width, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid ' + FB.border, flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: FB.text }}>{title}</div>
          <div onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', background: FB.btnGray,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <CloseOutlined style={{ fontSize: 14, color: FB.textSecondary }} />
          </div>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid ' + FB.border, flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface Role {
  id: string; name: string; label: string; description: string;
  organizationId?: string | null; isGlobal?: boolean;
  _count?: { users?: number };
}

interface Module {
  id: string; key: string; label: string; active: boolean;
  parameters?: {
    availableActions?: Array<{ key: string; label: string; scopes: string[] | null }>;
    scopeLabels?: Record<string, string>;
  } | null;
}

const RolesSettings: React.FC = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { api } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [formModal, setFormModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const [permRole, setPermRole] = useState<Role | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const orgId = currentOrganization?.id;

  const fetchRoles = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res: unknown = await api.get(`/api/roles?organizationId=${orgId}`);
      setRoles(Array.isArray(res) ? res : res?.data || res?.roles || []);
    } catch { message.error('Erreur lors du chargement des rôles.'); }
    finally { setLoading(false); }
  }, [api, orgId]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openForm = (role?: Role) => {
    setEditingRole(role || null);
    setFormName(role?.name || '');
    setFormLabel(role?.label || '');
    setFormDesc(role?.description || '');
    setFormModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formLabel) { message.error('Nom technique et nom affiché requis.'); return; }
    setSaving(true);
    try {
      const payload = { name: formName, label: formLabel, description: formDesc, organizationId: orgId };
      if (editingRole) {
        await api.patch(`/api/roles/${editingRole.id}`, payload);
        message.success('Rôle mis à jour');
      } else {
        await api.post('/api/roles', payload);
        message.success('Rôle créé');
      }
      setFormModal(false);
      fetchRoles();
    } catch (err: unknown) { message.error(err?.message || 'Erreur lors de la sauvegarde.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (role: Role) => {
    try {
      await api.delete(`/api/roles/${role.id}`);
      message.success('Rôle supprimé');
      setDeleteConfirm(null);
      fetchRoles();
    } catch { message.error('Erreur lors de la suppression.'); }
  };

  const openPermissions = async (role: Role) => {
    setPermRole(role);
    setPermLoading(true);
    setExpandedModules(new Set());
    try {
      const [modsRes, permsRes]: unknown[] = await Promise.all([
        api.get(`/api/modules?organizationId=${orgId}`),
        api.get(`/api/permissions?roleId=${role.id}&organizationId=${orgId}`),
      ]);
      const mods = modsRes?.data || (Array.isArray(modsRes) ? modsRes : []);
      setModules((Array.isArray(mods) ? mods : []).filter((m: Module) => m.active !== false));
      setPermissions(permsRes?.data || (Array.isArray(permsRes) ? permsRes : []));
      // expand all by default
      const allIds = new Set<string>();
      (Array.isArray(mods) ? mods : []).forEach((m: Module) => allIds.add(m.id));
      setExpandedModules(allIds);
    } catch { message.error('Erreur lors du chargement des permissions.'); }
    finally { setPermLoading(false); }
  };

  const isPermAllowed = (moduleId: string, action: string) =>
    permissions.some((p: Record<string, unknown>) => p.moduleId === moduleId && p.action === action && p.allowed);

  const togglePerm = (moduleId: string, action: string) => {
    setPermissions(prev => {
      const existing = prev.find((p: Record<string, unknown>) => p.moduleId === moduleId && p.action === action);
      if (existing) return prev.map((p: Record<string, unknown>) => p.moduleId === moduleId && p.action === action ? { ...p, allowed: !p.allowed } : p);
      return [...prev, { moduleId, action, allowed: true }];
    });
  };

  const savePermissions = async () => {
    if (!permRole) return;
    setPermSaving(true);
    try {
      await api.post('/api/permissions/bulk', {
        roleId: permRole.id, organizationId: orgId,
        permissions: permissions.map((p: Record<string, unknown>) => ({ moduleId: p.moduleId, action: p.action, allowed: p.allowed })),
      });
      message.success('Permissions sauvegardées');
      setPermRole(null);
    } catch { message.error('Erreur lors de la sauvegarde des permissions.'); }
    finally { setPermSaving(false); }
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filteredRoles = roles.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.label.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="large" /></div>
  );

  return (
    <div>
      {/* Header */}
      <FBCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: FB.text }}>Rôles & Permissions</div>
            <div style={{ fontSize: 14, color: FB.textSecondary }}>
              Gérez les rôles et leurs permissions pour {currentOrganization?.name || 'votre Colony'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={fetchRoles} style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid ' + FB.border,
              background: FB.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><ReloadOutlined style={{ color: FB.textSecondary }} /></button>
            <button onClick={() => openForm()} style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.blue,
              color: FB.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><PlusOutlined /> {!isMobile && 'Nouveau rôle'}</button>
          </div>
        </div>
      </FBCard>

      {/* Search */}
      <FBCard style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
          <SearchOutlined style={{ color: FB.textSecondary, fontSize: 16 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un rôle..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: FB.text, background: 'transparent', fontFamily: 'inherit' }} />
          {search && <CloseOutlined onClick={() => setSearch('')} style={{ color: FB.textSecondary, cursor: 'pointer', fontSize: 12 }} />}
        </div>
      </FBCard>

      {/* Roles list */}
      <FBCard style={{ padding: 0 }}>
        {filteredRoles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: FB.textSecondary }}>
            Aucun rôle trouvé
          </div>
        ) : (
          filteredRoles.map((role, i) => {
            const isProtected = role.name === 'super_admin';
            return (
              <div key={role.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < filteredRoles.length - 1 ? '1px solid ' + FB.border : 'none',
              }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: FB.text }}>{role.label || role.name}</span>
                    {role.isGlobal && (
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: FB.purple + '15', color: FB.purple }}>Global</span>
                    )}
                  </div>
                  {role.description && (
                    <div style={{ fontSize: 13, color: FB.textSecondary, marginTop: 2 }}>{role.description}</div>
                  )}
                </div>

                {/* Tech name */}
                {!isMobile && (
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    background: FB.btnGray, color: FB.textSecondary, flexShrink: 0, fontFamily: 'monospace',
                  }}>{role.name}</span>
                )}

                {/* Members */}
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: FB.blue + '12', color: FB.blue, flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <TeamOutlined /> {role._count?.users ?? '-'}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openPermissions(role)} title="Permissions" style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><SafetyCertificateOutlined style={{ fontSize: 16, color: FB.blue }} /></button>

                  <button onClick={() => !isProtected && openForm(role)} title={t('common.edit')} disabled={isProtected} style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
                    cursor: isProtected ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: isProtected ? 0.4 : 1,
                  }}><EditOutlined style={{ fontSize: 16, color: FB.textSecondary }} /></button>

                  <div style={{ position: 'relative' }}>
                    {deleteConfirm === role.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: -8,
                        background: FB.white, borderRadius: FB.radius, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                        padding: 12, zIndex: 10, width: 220,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 4 }}>Supprimer ce rôle ?</div>
                        <div style={{ fontSize: 12, color: FB.textSecondary, marginBottom: 12 }}>Les utilisateurs conserveront leurs accès actuels.</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setDeleteConfirm(null)} style={{
                            flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: FB.btnGray,
                            color: FB.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}>Annuler</button>
                          <button onClick={() => handleDelete(role)} style={{
                            flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: FB.red,
                            color: FB.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}>Supprimer</button>
                        </div>
                      </div>
                    )}
                    <button onClick={() => !isProtected && setDeleteConfirm(deleteConfirm === role.id ? null : role.id)}
                      disabled={isProtected} title={t('common.delete')} style={{
                        width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent',
                        cursor: isProtected ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: isProtected ? 0.4 : 1,
                      }}><DeleteOutlined style={{ fontSize: 16, color: FB.red }} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </FBCard>

      {/* ── Create/Edit Modal ── */}
      <FBModal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editingRole ? `Modifier : ${editingRole.label}` : 'Nouveau rôle'}
      >
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Nom technique *</label>
          <input value={formName} onChange={e => setFormName(e.target.value)}
            placeholder="ex: commercial_senior"
            disabled={editingRole?.name === 'super_admin'}
            style={{
              width: '100%', border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px',
              fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit',
              background: editingRole?.name === 'super_admin' ? FB.btnGray : FB.white, boxSizing: 'border-box',
            }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Nom affiché *</label>
          <input value={formLabel} onChange={e => setFormLabel(e.target.value)}
            placeholder="ex: Commercial Senior"
            style={{ width: '100%', border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px', fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Description</label>
          <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
            placeholder="Description du rôle" rows={3}
            style={{ width: '100%', border: '1px solid ' + FB.border, borderRadius: 6, padding: '10px 12px', fontSize: 15, color: FB.text, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <div style={{ height: 1, background: FB.border, margin: '16px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setFormModal(false)} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.btnGray,
            color: FB.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue,
            color: FB.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
          }}>{saving && <LoadingOutlined />} {editingRole ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </FBModal>

      {/* ── Permissions Modal ── */}
      <FBModal
        open={!!permRole}
        onClose={() => setPermRole(null)}
        title={<><SafetyCertificateOutlined style={{ marginRight: 8 }} />Permissions : {permRole?.label}</>}
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setPermRole(null)} style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.btnGray,
              color: FB.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={savePermissions} disabled={permSaving} style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue,
              color: FB.white, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: permSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
            }}>{permSaving && <LoadingOutlined />} Sauvegarder</button>
          </div>
        }
      >
        {permLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : modules.length === 0 ? (
          <div style={{
            padding: 16, borderRadius: FB.radius, background: FB.blue + '10',
            color: FB.blue, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AppstoreOutlined /> Aucun module actif trouvé pour cette organisation.
          </div>
        ) : (
          <div>
            {modules.map(mod => (
              <div key={mod.id} style={{ marginBottom: 8, border: '1px solid ' + FB.border, borderRadius: FB.radius, overflow: 'hidden' }}>
                {/* Module header */}
                <div
                  onClick={() => toggleModule(mod.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', cursor: 'pointer', background: FB.btnGray + '60',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RightOutlined style={{
                      fontSize: 10, color: FB.textSecondary,
                      transform: expandedModules.has(mod.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }} />
                    <AppstoreOutlined style={{ color: FB.blue }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: FB.text }}>{mod.label}</span>
                  </div>
                  <FBToggle
                    checked={isPermAllowed(mod.id, 'access')}
                    onChange={() => togglePerm(mod.id, 'access')}
                    size="small"
                  />
                </div>

                {/* Module actions */}
                {expandedModules.has(mod.id) && mod.parameters?.availableActions?.length ? (
                  <div style={{ padding: '8px 16px 12px', paddingLeft: isMobile ? 16 : 40 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2 }}>
                      {mod.parameters.availableActions.map(action => (
                        <FBCheckbox
                          key={action.key}
                          checked={isPermAllowed(mod.id, action.key)}
                          onChange={() => togglePerm(mod.id, action.key)}
                          label={action.label}
                        />
                      ))}
                    </div>
                  </div>
                ) : expandedModules.has(mod.id) ? (
                  <div style={{ padding: '8px 16px 12px', paddingLeft: isMobile ? 16 : 40 }}>
                    <span style={{ fontSize: 13, color: FB.textSecondary }}>Pas d'actions supplémentaires pour ce module.</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </FBModal>
    </div>
  );
};

export default RolesSettings;
