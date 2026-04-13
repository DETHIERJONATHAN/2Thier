import { FB } from '../../components/zhiive/ZhiiveTheme';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Modal, Form, Input, Select, Tag, Alert, Badge, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, AppstoreOutlined, CheckCircleOutlined, CrownOutlined, TagsOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import { useTranslation } from 'react-i18next';

// ── Facebook Design Tokens ──
// ── FBToggle (identique à UsersAdminPageNew) ──
const FBToggle = ({ checked, onChange, disabled, size = 'default' }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'small' | 'default';
}) => {
  const w = size === 'small' ? 36 : 44;
  const h = size === 'small' ? 20 : 24;
  const dot = size === 'small' ? 16 : 20;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); !disabled && onChange(!checked); }}
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
  const [width, setWidth] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1100, width };
}

const compactTableStyles = `
.roles-compact-table .ant-table-thead > tr > th,
.roles-compact-table .ant-table-tbody > tr > td {
  padding: 6px 10px;
}

.roles-compact-table .ant-table-tbody > tr > td {
  line-height: 1.2;
}
`;

// Typography non utilisé

// Définition d'une interface pour les modules pour un typage plus fort
interface Module {
  id: string;
  key: string;
  label: string;
  active: boolean;
  isActiveForOrg?: boolean;
  parameters?: {
    availableActions?: Array<{
      key: string;
      label: string;
      scopes: string[] | null;
    }>;
    scopeLabels?: Record<string, string>;
  } | null;
}

// Ajout d'une interface pour les organisations
interface Organization {
  id: string;
  name: string;
}

// Ajout d'une interface pour les rôles
interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
  };
  isGlobal?: boolean;
  isActiveForOrg?: boolean;
}

// --------- UI modernisée: Modal + Form pour créer/modifier un rôle ---------
function RoleFormModal({
  open,
  initial,
  organizations,
  isSuperAdmin,
  onCancel,
  onSubmit,
  confirmLoading,
}: {
  open: boolean;
  initial?: Role | null;
  organizations: Array<{ id: string; name: string }>;
  isSuperAdmin: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void;
  confirmLoading?: boolean;
}) {
  const [form] = Form.useForm();
  const { isMobile } = useScreenSize();
  const isEditing = !!initial?.id;
  const isSuperAdminRole = initial?.name === 'super_admin';

  // Hydrater le formulaire à l'ouverture
  React.useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        name: initial?.name ?? '',
        label: initial?.label ?? '',
        description: initial?.description ?? '',
        organizationId: isSuperAdmin ? (initial ? (initial.organizationId ?? 'global') : 'global') : undefined,
      });
    }
  }, [open, initial, isSuperAdmin, form]);

  const handleFinish = useCallback(async (values: Record<string, unknown>) => {
    const payload = { ...values } as Record<string, unknown> & { organizationId?: string | null };
    if (isSuperAdmin && payload.organizationId === 'global') {
      payload.organizationId = null;
    }
    try {
      await onSubmit(payload);
    } catch {
      // Les erreurs sont gérées par le parent
    }
  }, [isSuperAdmin, onSubmit]);

  return (
    <Modal
      title={isEditing ? `Modifier le rôle : ${initial?.label}` : 'Nouveau rôle'}
      open={open}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
      centered={!isMobile}
      width={isMobile ? '100%' : 520}
      style={isMobile ? { top: 16 } : undefined}
      styles={{ body: { padding: isMobile ? 16 : undefined } }}
      footer={
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: 12, width: '100%' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: isMobile ? '100%' : 'auto' }}>Annuler</button>
          <button type="submit" form="role-form-modal" disabled={!!confirmLoading} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: confirmLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: confirmLoading ? 0.7 : 1, width: isMobile ? '100%' : 'auto' }}>{confirmLoading ? '⏳' : ''} {isEditing ? 'Enregistrer' : 'Créer'}</button>
        </div>
      }
    >
      <Alert
        style={{ marginBottom: 12 }}
        message="Conseil"
        description="Le nom technique sert d'identifiant unique (ex: admin, manager). Le rôle 'super_admin' est réservé et non modifiable."
        type="info"
        showIcon
      />
      <Form
        form={form}
        layout="vertical"
        id="role-form-modal"
        name="role-form-modal"
        onFinish={handleFinish}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Form.Item
          name="name"
          label="Nom technique"
          rules={[
            { required: true, message: 'Veuillez entrer un nom technique' },
            { min: 2, message: 'Minimum 2 caractères' },
            { max: 50, message: 'Maximum 50 caractères' },
            { pattern: /^[a-zA-Z0-9_\-\s]+$/, message: 'Caractères non autorisés' },
          ]}
        >
          <Input disabled={isSuperAdminRole} placeholder="ex: admin, manager, support" />
        </Form.Item>
        <Form.Item name="label" label="Label" rules={[{ required: true, message: 'Veuillez entrer un label' }]}>
          <Input placeholder="Nom affiché (ex: Administrateur, Manager)" />
        </Form.Item>
        <Form.Item name="description" label={t('fields.description')}>
          <Input.TextArea placeholder="Description du rôle (optionnel)" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
        {isSuperAdmin && (
          <Form.Item name="organizationId" label="Portée du rôle">
            <Select
              options={[
                { value: 'global', label: 'Rôle Global (visible par toutes les organisations)' },
                ...organizations.map((o) => ({ value: o.id, label: o.name })),
              ]}
              showSearch
              optionFilterProp="label"
              placeholder="Sélectionner une organisation ou global"
              popupMatchSelectWidth={false}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

// --------- UI modernisée: Modal pour gérer les modules d'un rôle ---------
function ModulesModal({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();
  const [permissions, setPermissions] = useState<Array<{ moduleId: string; action: string; resource?: string; allowed: boolean }>>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const fetchPermissions = useCallback(async () => {
    if (!role?.id) return;
    try {
      const url = role.organizationId
        ? `/api/permissions?roleId=${role.id}&organizationId=${role.organizationId}`
        : `/api/permissions?roleId=${role.id}`;
      const response = await api.get(url);
      if (response.success) {
        const permsData = Array.isArray(response.data) ? response.data : [];
        console.log('[ModulesModal] Permissions loaded:', permsData.length, '| access:', permsData.filter((p: Record<string, unknown>) => p.action === 'access' && p.allowed).length);
        setPermissions(permsData);
        // Auto-expand modules that have fine-grained permissions
        const modulesWithFinePerms = new Set<string>();
        permsData.forEach((p: Record<string, unknown>) => {
          if (p.action !== 'access' && p.moduleId) modulesWithFinePerms.add(p.moduleId);
        });
        setExpandedModules(modulesWithFinePerms);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des modules activés');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Erreur lors du chargement des modules activés';
      setError(msg);
      NotificationManager.error(msg);
    }
  }, [api, role.id, role.organizationId]);

  const fetchModules = useCallback(async () => {
    try {
      const orgId = role.organizationId;
      const url = orgId ? `/api/modules?organizationId=${orgId}` : '/api/modules/all';
      const response = await api.get(url);
      if (response.success) {
        const all: Module[] = Array.isArray(response.data) ? response.data : [];
        const activeModules = all.filter(m => m.active !== false);
        activeModules.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
        console.log('[ModulesModal] Modules loaded:', all.length, '| actifs:', activeModules.length, '| with actions:', activeModules.filter(m => m.parameters?.availableActions?.length).length);
        setModules(activeModules);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des modules');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Erreur lors du chargement des modules';
      setError(msg);
      NotificationManager.error(msg);
    }
  }, [api, role.organizationId]);

  useEffect(() => {
    if (open) {
      setError('');
      fetchPermissions();
      fetchModules();
      console.log('[ModulesModal] Opened for role:', role.label, '(', role.id, ')');
    }
  }, [open, fetchPermissions, fetchModules]);

  // Toggle module access (ON/OFF)
  const updatePermission = useCallback((moduleId: string, allowed: boolean) => {
    setPermissions(prev => {
      const newPerms = [...prev];
      const idx = newPerms.findIndex((p) => p.moduleId === moduleId && p.action === 'access');
      if (idx > -1) newPerms[idx] = { ...newPerms[idx], allowed };
      else if (allowed)
        newPerms.push({ moduleId, action: 'access', resource: '*', allowed: true });
      return newPerms;
    });
  }, []);

  // Toggle fine-grained action permission
  const updateActionPermission = useCallback((moduleId: string, actionKey: string, allowed: boolean) => {
    setPermissions(prev => {
      const newPerms = [...prev];
      const idx = newPerms.findIndex((p) => p.moduleId === moduleId && p.action === actionKey);
      if (idx > -1) {
        if (allowed) {
          newPerms[idx] = { ...newPerms[idx], allowed };
        } else {
          // Remove the permission entry when disabling
          newPerms.splice(idx, 1);
        }
      } else if (allowed) {
        newPerms.push({ moduleId, action: actionKey, resource: '*', allowed: true });
      }
      return newPerms;
    });
  }, []);

  // Update scope for an action
  const updateActionScope = useCallback((moduleId: string, actionKey: string, scope: string) => {
    setPermissions(prev => {
      const newPerms = [...prev];
      const idx = newPerms.findIndex((p) => p.moduleId === moduleId && p.action === actionKey);
      if (idx > -1) {
        newPerms[idx] = { ...newPerms[idx], resource: scope };
      } else {
        newPerms.push({ moduleId, action: actionKey, resource: scope, allowed: true });
      }
      return newPerms;
    });
  }, []);

  const toggleAll = (checked: boolean) => {
    setPermissions(prev => {
      const newPerms = prev.map(p => ({ ...p }));
      modules.forEach((mod) => {
        const idx = newPerms.findIndex((p) => p.moduleId === mod.id && p.action === 'access');
        if (idx > -1) newPerms[idx] = { ...newPerms[idx], allowed: checked };
        else if (checked)
          newPerms.push({ moduleId: mod.id, action: 'access', resource: '*', allowed: true });
      });
      return newPerms;
    });
  };

  const toggleExpand = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        roleId: role.id,
        organizationId: role.organizationId,
        permissions: permissions.map(({ moduleId, action, resource, allowed }) => ({ moduleId, action, resource: resource || '*', allowed })),
      };
      console.log('[ModulesModal] Saving', payload.permissions.length, 'permissions for role', role.label);
      const response = await api.post('/api/permissions/bulk', payload);
      if (response.success) {
        NotificationManager.success('Modules du rôle sauvegardés avec succès.');
        window.dispatchEvent(new CustomEvent('modulesUpdated', { detail: { roleId: role.id } }));
        onClose();
      } else {
        throw new Error(response.message || 'Erreur lors de la sauvegarde des modules');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Erreur lors de la sauvegarde des modules';
      setError(msg);
      NotificationManager.error(msg);
    } finally {
      setSaving(false);
    }
  }, [api, role.id, role.organizationId, permissions, onClose]);

  type PermItem = { moduleId: string; action: string; resource?: string; allowed: boolean };
  const allChecked = modules.length > 0 && modules.every((m) => permissions.find((p: PermItem) => p.moduleId === m.id && p.action === 'access' && p.allowed));
  const loading = apiIsLoading && !permissions.length && !modules.length;

  return (
    <Modal
      title={
        <span>
          Modules du rôle <Badge color="gold" text={role.label} />
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: isMobile ? 'stretch' : 'flex-end', gap: 12, width: '100%' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 6, border: `1px solid ${FB.border}`, background: FB.btnGray, color: FB.text, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: isMobile ? '100%' : 'auto' }}>Annuler</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1, width: isMobile ? '100%' : 'auto' }}>{saving ? '⏳ ' : ''}Sauvegarder</button>
        </div>
      }
      destroyOnClose
      centered={!isMobile}
      width={isMobile ? '100%' : 820}
      style={isMobile ? { top: 16 } : undefined}
      styles={{ body: { padding: isMobile ? 16 : undefined, maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {error && <Alert type="error" message={error} style={{ marginBottom: 12 }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: isMobile ? 'wrap' : undefined, fontSize: isMobile ? 13 : undefined }}>
        <span style={{ fontWeight: 600 }}>Tout activer/désactiver</span>
        <FBToggle checked={allChecked} onChange={toggleAll} size={isMobile ? 'small' : 'default'} />
      </div>

      {loading ? <Spin /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {modules.map((mod) => {
            const accessPerm = permissions.find((p: PermItem) => p.moduleId === mod.id && p.action === 'access');
            const hasAccess = !!(accessPerm && accessPerm.allowed);
            const actions = mod.parameters?.availableActions;
            const scopeLabels = mod.parameters?.scopeLabels || {};
            const hasActions = actions && actions.length > 0;
            const isExpanded = expandedModules.has(mod.id);

            return (
              <div key={mod.id} style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                overflow: 'hidden',
                background: hasAccess ? '#fff' : '#fafafa',
              }}>
                {/* Module row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '8px 10px' : '10px 16px',
                  cursor: hasActions && hasAccess ? 'pointer' : 'default',
                }} onClick={() => hasActions && hasAccess && toggleExpand(mod.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    {hasActions && hasAccess && (
                      <span style={{ fontSize: 10, color: '#8c8c8c', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                    )}
                    <span style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>{mod.label}</span>
                    <span style={{ color: '#999', fontSize: 11 }}>({mod.key})</span>
                    {hasActions && (
                      <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                        {actions!.length} actions
                      </Tag>
                    )}
                  </div>
                  <FBToggle
                    checked={hasAccess}
                    onChange={(checked) => { updatePermission(mod.id, checked); }}
                    size={isMobile ? 'small' : 'default'}
                  />
                </div>

                {/* Fine-grained actions (expandable) */}
                {hasActions && hasAccess && isExpanded && (
                  <div style={{
                    borderTop: '1px solid #f0f0f0',
                    background: '#fafcff',
                    padding: isMobile ? '6px 10px' : '8px 16px 12px',
                  }}>
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6, fontWeight: 500 }}>
                      Permissions fines pour {mod.label}
                    </div>
                    {actions!.map((act) => {
                      const perm = permissions.find((p: PermItem) => p.moduleId === mod.id && p.action === act.key);
                      const isAllowed = !!(perm && perm.allowed);
                      const currentScope = perm?.resource || (act.scopes ? act.scopes[act.scopes.length - 1] : '*');

                      return (
                        <div key={act.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 0',
                          borderBottom: '1px solid #f5f5f5',
                          gap: 8,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <FBToggle
                              checked={isAllowed}
                              onChange={(checked) => updateActionPermission(mod.id, act.key, checked)}
                              size="small"
                            />
                            <span style={{ fontSize: 13, color: isAllowed ? '#262626' : '#bfbfbf' }}>{act.label}</span>
                          </div>
                          {act.scopes && isAllowed && (
                            <Select
                              value={currentScope}
                              onChange={(val) => updateActionScope(mod.id, act.key, val)}
                              size="small"
                              style={{ width: isMobile ? 130 : 180 }}
                              onClick={(e) => e.stopPropagation()}
                              options={act.scopes.map(s => ({
                                value: s,
                                label: scopeLabels[s] || s,
                              }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export default function RolesAdminPage() {
  const { t } = useTranslation();
  const { isSuperAdmin, selectedOrganization } = useAuth();
  const organizationId = selectedOrganization?.id;
  const { api, isLoading } = useAuthenticatedApi();
  const { isMobile } = useScreenSize();

  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filterOrgId, setFilterOrgId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);

  const handleToggleRoleStatus = useCallback(
    async (role: Role) => {
      const orgIdForStatusChange = isSuperAdmin ? filterOrgId : organizationId;
      if (!role.isGlobal || !orgIdForStatusChange) return;

      const newStatus = !role.isActiveForOrg;

      try {
        const response = await api.patch('/api/roles/status', {
          roleId: role.id,
          organizationId: orgIdForStatusChange,
          active: newStatus,
        });

        if (response.success) {
          NotificationManager.success(`Statut du rôle '${role.label}' mis à jour.`);
          setRoles((prevRoles) =>
            prevRoles.map((r) => (r.id === role.id ? { ...r, isActiveForOrg: newStatus } : r))
          );
        } else {
          throw new Error(response.message || 'Erreur lors de la mise à jour du statut.');
        }
      } catch (e: unknown) {
        NotificationManager.error((e as Error).message || 'Erreur lors de la mise à jour du statut.');
      }
    },
    [api, isSuperAdmin, filterOrgId, organizationId]
  );

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/api/organizations').then(response => {
        if (response.success && Array.isArray(response.data)) {
          setOrganizations(response.data);
        }
      });
    }
  }, [isSuperAdmin, api]);

  // This useEffect was causing the filter to reset. It has been corrected.
  useEffect(() => {
    // For a non-super-admin, we lock the filter to their current organization.
    if (!isSuperAdmin && organizationId) {
      setFilterOrgId(organizationId);
    }
    // For a super-admin, we no longer reset the filter here, allowing leur sélection à persister.
  }, [organizationId, isSuperAdmin]);

  const fetchRoles = useCallback(async () => {
    // Use the context's organizationId for non-admins, and the stateful filter for super-admins.
    const orgToFetch = isSuperAdmin ? filterOrgId : organizationId;

    // A super-admin with an empty filter should fetch all roles, so we don't block.
    if (!isSuperAdmin && !orgToFetch) {
      setRoles([]); // Clear roles if a non-admin has no org
      setError(null);
      return;
    }
    
    setError(null);
    try {
      const url = orgToFetch ? `/api/roles?organizationId=${orgToFetch}` : '/api/roles';
      const response = await api.get(url);
      if (response.success) {
        setRoles(Array.isArray(response.data) ? response.data : []);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des rôles.');
      }
    } catch (e: unknown) {
        const errorMessage = (e as Error).message || 'Erreur lors du chargement des rôles';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setRoles([]);
    }
  }, [api, organizationId, isSuperAdmin, filterOrgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleSaveRole = async (form: Record<string, unknown>) => {
    setSavingRole(true);
    try {
      // Pour un nouveau rôle, l'organizationId est géré par le formulaire (surtout pour le super-admin)
      // Pour un rôle existant, on s'assure de ne pas l'écraser involontairement.
      const payload = { ...form };
      if (!isSuperAdmin) {
          payload.organizationId = organizationId;
      } // Pour le super admin, l'organizationId est déjà dans le form.

      let response;
      if (editingRole?.id) {
        response = await api.patch(`/api/roles/${editingRole.id}`, payload);
        if (!response.success) {
          throw new Error(response.message || 'La mise à jour du rôle a échoué.');
        }
        // On force le rechargement pour être sûr d'avoir l'objet Organization à jour
        fetchRoles();
      } else {
        console.log("Création d'un nouveau rôle avec le payload :", payload);
        response = await api.post('/api/roles', payload);
        console.log("Réponse de l'API après création :", response);
        if (!response.success) {
          throw new Error(response.message || 'La création du rôle a échoué.');
        }
      }
      
      NotificationManager.success(`Rôle ${editingRole?.id ? 'mis à jour' : 'créé'} avec succès.`);
      setEditingRole(null);
      setIsRoleModalOpen(false);
      fetchRoles(); // On recharge toujours les rôles pour avoir les données à jour.
    } catch (e: unknown) {
      NotificationManager.error((e as Error).message || 'Une erreur est survenue.');
    }
    setSavingRole(false);
  };

  const handleDeleteRole = useCallback(async (role: Role) => {
    Modal.confirm({
      title: `Supprimer le rôle « ${role.label} » ?`,
      content: 'Cette action est irréversible.',
      okText: 'Supprimer',
      okButtonProps: { danger: true },
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          const response = await api.delete(`/api/roles/${role.id}`);
          if (response.success) {
            NotificationManager.success('Rôle supprimé avec succès.');
            fetchRoles();
          } else {
            throw new Error(response.message || 'La suppression du rôle a échoué.');
          }
        } catch (e: unknown) {
          NotificationManager.error((e as Error).message || 'La suppression du rôle a échoué.');
        }
      },
    });
  }, [api, fetchRoles]);

  const columns = useMemo(() => {
    const orgScope = isSuperAdmin ? filterOrgId : organizationId;

    return [
      {
        title: 'Nom',
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        render: (value: string) => <span style={{ fontWeight: 500, color: FB.text }}>{value}</span>,
      },
      {
        title: 'Label',
        dataIndex: 'label',
        key: 'label',
        ellipsis: true,
        render: (value: string) => <span style={{ color: FB.textSecondary }}>{value}</span>,
      },
      {
        title: 'Organisation',
        key: 'organization',
        responsive: ['sm'],
        render: (_: unknown, r: Role) =>
          r.organizationId ? <Tag color="blue">{r.organization?.name || 'N/A'}</Tag> : <Tag>Global</Tag>,
      },
      {
        title: 'Statut',
        key: 'status',
        align: 'center' as const,
        width: isMobile ? 120 : 140,
        render: (_: unknown, r: Role) =>
          r.isGlobal && orgScope ? (
            <FBToggle
              checked={!!r.isActiveForOrg}
              onChange={() => handleToggleRoleStatus(r)}
              disabled={r.name === 'super_admin'}
              size={isMobile ? 'small' : 'default'}
            />
          ) : (
            <span style={{ color: '#999' }}>—</span>
          ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: isMobile ? undefined : 160,
        render: (_: unknown, r: Role) => {
          const disabledPerm = !isSuperAdmin && r.isGlobal && !r.isActiveForOrg;
          const disabledEdit = r.name === 'super_admin' || (r.isGlobal && !isSuperAdmin);
          const ABtnStyle = (opts: { danger?: boolean; disabled?: boolean; primary?: boolean }) => ({
            display: 'inline-flex' as const, alignItems: 'center' as const, gap: 6,
            padding: '6px 12px', borderRadius: 6, border: 'none',
            background: opts.primary ? FB.blue : opts.danger ? '#ffeef0' : FB.btnGray,
            color: opts.disabled ? '#bbb' : opts.primary ? FB.white : opts.danger ? FB.red : FB.text,
            cursor: opts.disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
            transition: 'background 0.15s', whiteSpace: 'nowrap' as const, opacity: opts.disabled ? 0.6 : 1,
          });
          return (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => !disabledPerm && setSelectedRoleForPermissions(r)}
                title="Gérer les modules"
                disabled={disabledPerm}
                style={ABtnStyle({ disabled: disabledPerm })}
              >
                <span>📋</span><span>Modules</span>
              </button>
              <button
                onClick={() => { if (!disabledEdit) { setEditingRole(r); setIsRoleModalOpen(true); } }}
                title="Modifier le rôle"
                disabled={disabledEdit}
                style={ABtnStyle({ disabled: disabledEdit })}
              >
                <span>✏️</span><span>Modifier</span>
              </button>
              <button
                onClick={() => !disabledEdit && handleDeleteRole(r)}
                title="Supprimer le rôle"
                disabled={disabledEdit}
                style={ABtnStyle({ danger: true, disabled: disabledEdit })}
              >
                <span>🗑️</span><span>Supprimer</span>
              </button>
            </div>
          );
        },
      },
    ];
  }, [isSuperAdmin, filterOrgId, organizationId, handleToggleRoleStatus, handleDeleteRole, isMobile]);

  const expandable = useMemo(() => {
    if (!isMobile) return undefined;
    return {
      expandedRowRender: (record: Role) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <div>
            <span style={{ fontWeight: 600, color: FB.textSecondary }}>Organisation :</span>{' '}
            {record.organizationId ? record.organization?.name ?? 'N/A' : 'Global'}
          </div>
          {record.description && (
            <div>
              <span style={{ fontWeight: 600, color: FB.textSecondary }}>Description :</span> {record.description}
            </div>
          )}
        </div>
      ),
      expandRowByClick: true,
      showExpandColumn: false,
    } as import('antd').TableProps<Role>['expandable'];
  }, [isMobile]);

  const statCardStyle: React.CSSProperties = {
    background: FB.white, borderRadius: FB.radius, padding: isMobile ? 14 : 18,
    boxShadow: FB.shadow, flex: '1 1 180px', minWidth: isMobile ? '100%' : 180,
  };
  const statLabel: React.CSSProperties = { fontSize: 12, color: FB.textSecondary, marginBottom: 4 };
  const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 700, color: FB.text };

  return (
    <div style={{ background: FB.bg, minHeight: '100vh', width: '100%', padding: isMobile ? '12px 8px' : '20px 24px' }}>
      <style>{compactTableStyles}</style>

      {/* ── Header ── */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, padding: isMobile ? '14px 16px' : '18px 24px',
        boxShadow: FB.shadow, marginBottom: 16,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CrownOutlined style={{ fontSize: isMobile ? 22 : 26, color: FB.orange }} />
          <span style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: FB.text }}>Gestion des Rôles</span>
        </div>
        <button
          onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }}
          style={{
            background: FB.blue, color: '#fff', border: 'none', borderRadius: 6,
            padding: isMobile ? '10px 18px' : '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 6, width: isMobile ? '100%' : 'auto', justifyContent: 'center',
          }}
        >
          <PlusOutlined /> Nouveau Rôle
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={statCardStyle}>
          <div style={statLabel}>Total Rôles</div>
          <div style={{ ...statValue, color: FB.blue }}><TagsOutlined style={{ marginRight: 6 }} />{roles.length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Rôles Actifs</div>
          <div style={{ ...statValue, color: FB.green }}><CheckCircleOutlined style={{ marginRight: 6 }} />{roles.filter((r) => !r.isGlobal || r.isActiveForOrg).length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Rôles Globaux</div>
          <div style={{ ...statValue, color: FB.purple }}><AppstoreOutlined style={{ marginRight: 6 }} />{roles.filter((r) => r.isGlobal).length}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabel}>Organisations</div>
          <div style={{ ...statValue, color: FB.orange }}><TeamOutlined style={{ marginRight: 6 }} />{new Set(roles.filter((r) => r.organization).map((r) => r.organization?.id)).size}</div>
        </div>
      </div>

      {/* ── Filtre Organisation (SuperAdmin) ── */}
      {isSuperAdmin && (
        <div style={{
          background: FB.white, borderRadius: FB.radius, padding: isMobile ? 12 : 16,
          boxShadow: FB.shadow, marginBottom: 16,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: FB.text }}>Filtrer par organisation :</span>
          <Select
            value={filterOrgId}
            onChange={(val: string | undefined) => setFilterOrgId(val ?? '')}
            style={{ width: isMobile ? '100%' : 320 }}
            options={[{ value: '', label: 'Toutes les organisations & Rôles Globaux' }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]}
            showSearch
            allowClear
            placeholder="Toutes les organisations & Rôles Globaux"
            optionFilterProp="label"
            popupMatchSelectWidth={false}
          />
        </div>
      )}

      {error && <Alert type="error" message={error} style={{ marginBottom: 16, borderRadius: FB.radius }} />}

      {/* ── Table ── */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, overflow: 'hidden' }}>
        <div style={{ overflow: isMobile ? 'auto' : undefined }}>
          <Table
            rowKey={(r) => r.id}
            columns={columns as unknown as import('antd').TableProps<Role>['columns']}
            dataSource={roles}
            loading={isLoading}
            size="small"
            pagination={{
              pageSize: isMobile ? 5 : 10,
              showSizeChanger: !isMobile,
              position: isMobile ? ['bottomCenter'] : ['bottomRight'],
            }}
            scroll={isMobile ? { x: 720 } : undefined}
            expandable={expandable}
            locale={{ emptyText: 'Aucun rôle à afficher pour le filtre sélectionné.' }}
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      <RoleFormModal
        open={isRoleModalOpen}
        initial={editingRole}
        organizations={organizations}
        isSuperAdmin={!!isSuperAdmin}
        onCancel={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSubmit={handleSaveRole}
        confirmLoading={savingRole}
      />

      {selectedRoleForPermissions && (
        <ModulesModal role={selectedRoleForPermissions} open={!!selectedRoleForPermissions} onClose={() => setSelectedRoleForPermissions(null)} />
      )}
    </div>
  );
}
