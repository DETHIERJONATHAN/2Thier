import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { message as antdMessage } from 'antd';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useDebouncedCallback } from 'use-debounce';
import {
  getActionTranslation,
  getModuleTranslation
} from '../../utils/permissionsTranslations';

// ── Types ──
interface Role {
  id: string;
  name: string;
  label: string;
  organizationId: string | null;
  _count?: { UserOrganization: number };
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

// ── Facebook Design Tokens ──
const FB = {
  bg: '#f0f2f5', white: '#ffffff', text: '#050505', textSecondary: '#65676b',
  blue: '#1877f2', blueHover: '#166fe5', border: '#ced0d4',
  btnGray: '#e4e6eb', btnGrayHover: '#d8dadf',
  green: '#42b72a', red: '#e4405f', orange: '#f7931a', purple: '#722ed1',
  shadow: '0 1px 2px rgba(0,0,0,0.1)', radius: 8,
};

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
    <div onClick={() => !disabled && onChange(!checked)} style={{
      width: w, height: h, borderRadius: h, cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? FB.blue : '#ccc', transition: 'background .2s', position: 'relative',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        width: dot, height: dot, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: (h - dot) / 2, left: checked ? w - dot - (h - dot) / 2 : (h - dot) / 2,
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
};

// ── ACTION config with translations ──
const ACTION_ICONS: Record<string, string> = {
  view: '👁️', create: '➕', edit: '✏️', delete: '🗑️', manage: '⚙️',
};
const ACTION_COLORS: Record<string, string> = {
  view: '#1877f2', create: '#42b72a', edit: '#f7931a', delete: '#e4405f', manage: '#722ed1',
};
const ACTIONS = [
  { key: 'view' }, { key: 'create' }, { key: 'edit' }, { key: 'delete' }, { key: 'manage' },
].map(action => ({
  ...action,
  ...getActionTranslation(action.key),
  icon: ACTION_ICONS[action.key],
  color: ACTION_COLORS[action.key],
}));

// ── Memoized Permission Switch ──
const PermissionSwitch = React.memo(({
  permission, moduleId, action, resource, onChange, disabled = false
}: {
  permission?: Permission; moduleId: string; action: string; resource: string;
  onChange: (moduleId: string, action: string, resource: string, allowed: boolean) => void;
  disabled?: boolean;
}) => {
  const isAllowed = permission?.allowed || false;
  return (
    <FBToggle
      checked={isAllowed}
      onChange={(val) => onChange(moduleId, action, resource, val)}
      disabled={disabled}
      size="small"
    />
  );
});
PermissionSwitch.displayName = 'PermissionSwitch';

// ══════════════════════════════════════
// Main Component
// ══════════════════════════════════════
const PermissionsAdminPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin, currentOrganization } = useAuth();
  const { isMobile } = useScreenSize();

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);

  const orgId = currentOrganization?.id;

  // Categories
  const categories = useMemo(() => {
    if (!Array.isArray(modules)) return [];
    const cats = new Set(modules.map(m => m.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [modules]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!Array.isArray(modules)) return [];
    return modules.filter(m => {
      const matchSearch = !searchTerm ||
        m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [modules, searchTerm, categoryFilter]);

  // Load roles & modules
  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        api.get(`/api/roles?organizationId=${orgId}`),
        api.get(`/api/modules?organizationId=${orgId}`)
      ]);
      const rolesArr = rolesRes?.roles || rolesRes?.data || (Array.isArray(rolesRes) ? rolesRes : []);
      const modulesArr = modulesRes?.modules || modulesRes?.data || (Array.isArray(modulesRes) ? modulesRes : []);
      setRoles(Array.isArray(rolesArr) ? rolesArr : []);
      setModules(Array.isArray(modulesArr) ? modulesArr : []);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
      antdMessage.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [api, orgId]);

  // Load permissions for a role
  const loadPermissions = useCallback(async (role: Role) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/permissions?roleId=${role.id}&organizationId=${orgId}`);
      const permsArr = res?.permissions || res?.data || (Array.isArray(res) ? res : []);
      setPermissions(Array.isArray(permsArr) ? permsArr : []);
      setHasUnsavedChanges(false);
    } catch {
      antdMessage.error('Erreur lors du chargement des permissions');
    } finally {
      setLoading(false);
    }
  }, [api, orgId]);

  // Debounced auto-save (1.5s)
  const debouncedSave = useDebouncedCallback(async (perms: Permission[]) => {
    if (!selectedRole || !orgId) return;
    setSaving(true);
    try {
      await api.post('/api/permissions', {
        roleId: selectedRole.id,
        organizationId: orgId,
        permissions: perms.map(p => ({
          moduleId: p.moduleId, action: p.action, allowed: p.allowed, resource: p.resource || '*'
        })),
      });
      setHasUnsavedChanges(false);
      antdMessage.success('Permissions sauvegardées');
    } catch {
      antdMessage.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, 1500);

  // Handle permission change
  const handlePermissionChange = useCallback((moduleId: string, action: string, resource: string, allowed: boolean) => {
    setPermissions(prev => {
      const idx = prev.findIndex(p => p.moduleId === moduleId && p.action === action);
      let newPerms: Permission[];
      if (idx >= 0) {
        newPerms = [...prev];
        newPerms[idx] = { ...newPerms[idx], allowed };
      } else {
        newPerms = [...prev, { moduleId, action, allowed, resource: resource || '*' }];
      }
      setHasUnsavedChanges(true);
      debouncedSave(newPerms);
      return newPerms;
    });
  }, [debouncedSave]);

  // Toggle all permissions for a module
  const handleToggleModule = useCallback((moduleId: string, enabled: boolean) => {
    setPermissions(prev => {
      const newPerms = [...prev];
      ACTIONS.forEach(({ key: action }) => {
        const idx = newPerms.findIndex(p => p.moduleId === moduleId && p.action === action);
        if (idx >= 0) {
          newPerms[idx] = { ...newPerms[idx], allowed: enabled };
        } else {
          newPerms.push({ moduleId, action, allowed: enabled, resource: '*' });
        }
      });
      setHasUnsavedChanges(true);
      debouncedSave(newPerms);
      return newPerms;
    });
  }, [debouncedSave]);

  // Role selection
  const handleRoleSelect = useCallback((roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      setSelectedRole(role);
      loadPermissions(role);
    }
    setRoleDropdownOpen(false);
  }, [roles, loadPermissions]);

  useEffect(() => { loadData(); }, [loadData]);

  // Module stats helpers
  const getModuleStats = useCallback((moduleId: string) => {
    const standardActions = ACTIONS.map(a => a.key);
    const modulePerms = permissions.filter(p => p.moduleId === moduleId && standardActions.includes(p.action));
    const allowed = modulePerms.filter(p => p.allowed === true).length;
    const total = ACTIONS.length;
    return { allowed, total, percentage: total > 0 ? Math.round((allowed / total) * 100) : 0 };
  }, [permissions]);

  const isModuleFullyEnabled = useCallback((moduleId: string) => {
    return ACTIONS.every(({ key: action }) => {
      const perm = permissions.find(p => p.moduleId === moduleId && p.action === action);
      return perm?.allowed === true;
    });
  }, [permissions]);

  // Global stats (inline PermissionStats)
  const globalStats = useMemo(() => {
    const STD = ['view', 'create', 'edit', 'delete', 'manage'];
    const stdPerms = permissions.filter(p => STD.includes(p.action));
    const totalMod = modules.length;
    const totalAllowed = modules.reduce((t, mod) => {
      return t + Math.min(stdPerms.filter(p => p.moduleId === mod.id && p.allowed).length, 5);
    }, 0);
    const totalPossible = totalMod * 5;
    const pct = totalPossible > 0 ? Math.round((totalAllowed / totalPossible) * 100) : 0;
    const full = modules.filter(m => stdPerms.filter(p => p.moduleId === m.id && p.allowed).length >= 5).length;
    const partial = modules.filter(m => {
      const c = stdPerms.filter(p => p.moduleId === m.id && p.allowed).length;
      return c > 0 && c < 5;
    }).length;
    return { totalAllowed, totalPossible, pct, full, partial, none: totalMod - full - partial, totalMod };
  }, [permissions, modules]);

  // ── Access check ──
  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: FB.text }}>Accès restreint</div>
        <div style={{ color: FB.textSecondary, marginTop: 8 }}>
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        </div>
      </div>
    );
  }

  const progressColor = (p: number) => (p >= 80 ? FB.green : p >= 50 ? FB.orange : FB.red);

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: FB.bg, padding: isMobile ? '12px 8px' : '20px 24px' }}>

      {/* ── Header ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
        padding: isMobile ? 16 : 24, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28 }}>⚙️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: FB.text }}>
              Gestion des Permissions
            </div>
            <div style={{ color: FB.textSecondary, fontSize: 14 }}>
              Configurez les permissions par rôle pour {currentOrganization?.name}
            </div>
          </div>
          {saving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: FB.blue, fontSize: 13 }}>
              ⏳ Sauvegarde...
            </div>
          )}
          {hasUnsavedChanges && !saving && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: FB.green, fontSize: 13 }}>
              ✓ Sauvegarde auto activée
            </div>
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
        padding: isMobile ? 12 : 20, marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end',
      }}>
        {/* Role Select */}
        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 220px', minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Rôle à modifier :</div>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setRoleDropdownOpen(!roleDropdownOpen)} style={{
              border: `1px solid ${FB.border}`, borderRadius: FB.radius, padding: '8px 12px',
              cursor: 'pointer', background: FB.white, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              fontSize: 14, color: selectedRole ? FB.text : FB.textSecondary,
            }}>
              <span>{selectedRole ? selectedRole.label : 'Sélectionner un rôle'}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </div>
            {roleDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: FB.white, border: `1px solid ${FB.border}`, borderRadius: FB.radius,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 250, overflowY: 'auto',
              }}>
                {roles.map(role => (
                  <div key={role.id} onClick={() => handleRoleSelect(role.id)} style={{
                    padding: '10px 12px', cursor: 'pointer', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    background: selectedRole?.id === role.id ? '#e7f3ff' : 'transparent',
                    borderBottom: `1px solid ${FB.bg}`,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f2f5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selectedRole?.id === role.id ? '#e7f3ff' : 'transparent'; }}
                  >
                    <span style={{ fontWeight: 500 }}>{role.label}</span>
                    {role._count?.UserOrganization != null && role._count.UserOrganization > 0 && (
                      <span style={{
                        background: FB.blue, color: '#fff', fontSize: 11,
                        padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      }}>{role._count.UserOrganization}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 220px', minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Rechercher :</div>
          <div style={{
            border: `1px solid ${FB.border}`, borderRadius: FB.radius, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8, background: FB.bg,
          }}>
            <span>🔍</span>
            <input type="text" placeholder="Rechercher un module..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 14, color: FB.text }}
            />
          </div>
        </div>

        {/* Category */}
        <div style={{ flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 6 }}>Catégorie :</div>
          <div style={{ position: 'relative' }}>
            <div onClick={() => setCatDropdownOpen(!catDropdownOpen)} style={{
              border: `1px solid ${FB.border}`, borderRadius: FB.radius, padding: '8px 12px',
              cursor: 'pointer', background: FB.white, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: FB.text,
            }}>
              <span>{categoryFilter === 'all' ? 'Toutes les catégories' : categoryFilter}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </div>
            {catDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: FB.white, border: `1px solid ${FB.border}`, borderRadius: FB.radius,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto',
              }}>
                <div onClick={() => { setCategoryFilter('all'); setCatDropdownOpen(false); }}
                  style={{ padding: '10px 12px', cursor: 'pointer', background: categoryFilter === 'all' ? '#e7f3ff' : 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0f2f5'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = categoryFilter === 'all' ? '#e7f3ff' : 'transparent'; }}
                >Toutes les catégories</div>
                {categories.map(cat => (
                  <div key={cat} onClick={() => { setCategoryFilter(cat); setCatDropdownOpen(false); }}
                    style={{ padding: '10px 12px', cursor: 'pointer', background: categoryFilter === cat ? '#e7f3ff' : 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f2f5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = categoryFilter === cat ? '#e7f3ff' : 'transparent'; }}
                  >{cat}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refresh */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'transparent', marginBottom: 6, userSelect: 'none' }}>.</div>
          <button onClick={loadData} disabled={loading} style={{
            background: FB.btnGray, border: 'none', borderRadius: FB.radius, padding: '9px 16px',
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, color: FB.text,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = FB.btnGrayHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = FB.btnGray; }}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div style={{
        background: '#e7f3ff', borderRadius: FB.radius, padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #b6d4fe',
      }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: '#0c5fba' }}>
          <strong>Sauvegarde automatique activée</strong> — Vos modifications sont sauvegardées après 1.5s d&apos;inactivité.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fff2f0', borderRadius: FB.radius, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #ffccc7',
        }}>
          <span style={{ fontSize: 18 }}>❌</span>
          <div style={{ fontSize: 13, color: '#cf1322', flex: 1 }}>{error}</div>
          <button onClick={() => setError(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#cf1322',
          }}>✕</button>
        </div>
      )}

      {/* No role selected */}
      {!selectedRole && !loading && (
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
          padding: 40, textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎭</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: FB.text }}>Aucun rôle sélectionné</div>
          <div style={{ color: FB.textSecondary, marginTop: 8 }}>
            Sélectionnez un rôle ci-dessus pour configurer ses permissions.
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
          padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ color: FB.textSecondary }}>Chargement...</div>
        </div>
      )}

      {/* ── Stats ── */}
      {selectedRole && !loading && (
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
          padding: isMobile ? 16 : 20, marginBottom: 16,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, marginBottom: 16 }}>
            📊 Statistiques pour {selectedRole.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Circle */}
            <div style={{ flex: '1 1 200px', textAlign: 'center', padding: 16 }}>
              <div style={{
                width: 120, height: 120, borderRadius: '50%', margin: '0 auto 12px',
                background: `conic-gradient(${progressColor(globalStats.pct)} ${globalStats.pct * 3.6}deg, #e4e6eb ${globalStats.pct * 3.6}deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%', background: FB.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: progressColor(globalStats.pct) }}>
                    {globalStats.pct}%
                  </div>
                  <div style={{ fontSize: 11, color: FB.textSecondary }}>des permissions</div>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: FB.text }}>Couverture globale</div>
              <div style={{ fontSize: 12, color: FB.textSecondary }}>
                {globalStats.totalAllowed} sur {globalStats.totalPossible} permissions activées
              </div>
            </div>
            {/* Details */}
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: FB.green }}>
                    {globalStats.full}
                    <span style={{ fontSize: 14, color: FB.textSecondary, fontWeight: 400 }}> / {globalStats.totalMod}</span>
                  </div>
                  <div style={{ fontSize: 12, color: FB.textSecondary }}>Modules accès complet</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: FB.orange }}>
                    {globalStats.partial}
                    <span style={{ fontSize: 14, color: FB.textSecondary, fontWeight: 400 }}> / {globalStats.totalMod}</span>
                  </div>
                  <div style={{ fontSize: 12, color: FB.textSecondary }}>Modules accès partiel</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: globalStats.none > 0 ? FB.red : FB.textSecondary }}>
                    {globalStats.none}
                    <span style={{ fontSize: 14, color: FB.textSecondary, fontWeight: 400 }}> / {globalStats.totalMod}</span>
                  </div>
                  <div style={{ fontSize: 12, color: FB.textSecondary }}>Modules sans accès</div>
                </div>
              </div>
            </div>
            {/* Bar */}
            <div style={{ flex: '1 1 100%', marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: FB.text, marginBottom: 8 }}>Répartition des accès :</div>
              <div style={{ height: 8, borderRadius: 4, background: '#e4e6eb', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(globalStats.full / Math.max(globalStats.totalMod, 1)) * 100}%`, background: FB.green, transition: 'width .3s' }} />
                <div style={{ width: `${(globalStats.partial / Math.max(globalStats.totalMod, 1)) * 100}%`, background: FB.orange, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6, fontSize: 12 }}>
                <span><span style={{ color: FB.green }}>●</span> Complet ({globalStats.full})</span>
                <span><span style={{ color: FB.orange }}>●</span> Partiel ({globalStats.partial})</span>
                <span><span style={{ color: '#e4e6eb' }}>●</span> Aucun ({globalStats.none})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Permissions Grid ── */}
      {selectedRole && !loading && (
        <div style={{
          background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
          padding: isMobile ? 12 : 20,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 16, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: FB.text }}>
              Permissions pour {selectedRole.label}
            </div>
            <div style={{ fontSize: 13, color: FB.textSecondary }}>
              {filteredModules.length} module{filteredModules.length > 1 ? 's' : ''}
              {saving && <span style={{ color: FB.blue, marginLeft: 8 }}>⏳ Sauvegarde...</span>}
            </div>
          </div>

          {/* ── Desktop: Grid view ── */}
          {!isMobile && (
            <div style={{ overflowX: 'auto' }}>
              {/* Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 100px repeat(5, 90px)',
                gap: 1, background: FB.bg, borderRadius: FB.radius, padding: '10px 0', marginBottom: 2,
                minWidth: 700,
              }}>
                <div style={{ padding: '0 12px', fontWeight: 700, fontSize: 13, color: FB.textSecondary }}>Module</div>
                <div style={{ padding: '0 8px', fontWeight: 700, fontSize: 13, color: FB.textSecondary, textAlign: 'center' }}>Tout</div>
                {ACTIONS.map(a => (
                  <div key={a.key} style={{ padding: '0 4px', fontWeight: 700, fontSize: 12, color: a.color, textAlign: 'center' }}>
                    {a.icon} {a.name}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {filteredModules.map((mod, idx) => {
                const stats = getModuleStats(mod.id);
                const fullyEnabled = isModuleFullyEnabled(mod.id);
                const mt = getModuleTranslation(mod.key);
                const displayName = mt.name !== mod.key ? mt.name : mod.label;
                return (
                  <div key={mod.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 100px repeat(5, 90px)',
                    gap: 1, padding: '12px 0', alignItems: 'center',
                    borderBottom: idx < filteredModules.length - 1 ? `1px solid ${FB.bg}` : 'none',
                    minWidth: 700,
                  }}>
                    <div style={{ padding: '0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: FB.text, fontSize: 14 }}>{displayName}</span>
                        <span style={{
                          background: fullyEnabled ? FB.green : stats.allowed > 0 ? FB.orange : FB.btnGray,
                          color: stats.allowed === 0 ? FB.textSecondary : '#fff',
                          fontSize: 11, padding: '1px 8px', borderRadius: 10, fontWeight: 600,
                        }}>{stats.allowed}/{stats.total}</span>
                      </div>
                      {mt.description && (
                        <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 2 }}>{mt.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <FBToggle checked={fullyEnabled} onChange={val => handleToggleModule(mod.id, val)} disabled={!selectedRole} size="small" />
                    </div>
                    {ACTIONS.map(({ key: action }) => {
                      const perm = permissions.find(p => p.moduleId === mod.id && p.action === action);
                      return (
                        <div key={action} style={{ display: 'flex', justifyContent: 'center' }}>
                          <PermissionSwitch permission={perm} moduleId={mod.id} action={action} resource="*" onChange={handlePermissionChange} disabled={!selectedRole} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filteredModules.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: FB.textSecondary }}>Aucun module trouvé</div>
              )}
            </div>
          )}

          {/* ── Mobile: Card view ── */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredModules.map(mod => {
                const stats = getModuleStats(mod.id);
                const fullyEnabled = isModuleFullyEnabled(mod.id);
                const mt = getModuleTranslation(mod.key);
                const displayName = mt.name !== mod.key ? mt.name : mod.label;
                return (
                  <div key={mod.id} style={{ border: `1px solid ${FB.border}`, borderRadius: FB.radius, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: FB.text, fontSize: 14 }}>{displayName}</div>
                        {mt.description && <div style={{ fontSize: 12, color: FB.textSecondary, marginTop: 2 }}>{mt.description}</div>}
                      </div>
                      <span style={{
                        background: fullyEnabled ? FB.green : stats.allowed > 0 ? FB.orange : FB.btnGray,
                        color: stats.allowed === 0 ? FB.textSecondary : '#fff',
                        fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      }}>{stats.allowed}/{stats.total}</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: `1px solid ${FB.bg}`, marginBottom: 8,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: FB.textSecondary }}>Toutes les permissions</span>
                      <FBToggle checked={fullyEnabled} onChange={val => handleToggleModule(mod.id, val)} disabled={!selectedRole} size="small" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ACTIONS.map(({ key: action, name, icon, color }) => {
                        const perm = permissions.find(p => p.moduleId === mod.id && p.action === action);
                        return (
                          <div key={action} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                            <span style={{ fontSize: 13, color: FB.text }}>{icon} <span style={{ color }}>{name}</span></span>
                            <PermissionSwitch permission={perm} moduleId={mod.id} action={action} resource="*" onChange={handlePermissionChange} disabled={!selectedRole} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredModules.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: FB.textSecondary }}>Aucun module trouvé</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PermissionsAdminPage;
