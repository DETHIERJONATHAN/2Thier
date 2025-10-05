import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Switch, Statistic, Alert, Badge, Grid, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, AppstoreOutlined, CheckCircleOutlined, CrownOutlined, TagsOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
// AdminSwitch remplacé par Switch d'AntD
// utilitaires potentiels (non utilisés partout, conservés si existants)
// import { formatRoleName, formatRoleDescription, getRoleIcon, getRoleTypeLabel, calculateRoleStats, validateRoleData, debounce } from '../../utils/rolesOptimizations';

const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
      bodyStyle={{ padding: isMobile ? 16 : undefined }}
      footer={
        <Space
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ width: '100%', justifyContent: isMobile ? 'stretch' : 'flex-end' }}
          size={12}
        >
          <Button onClick={onCancel} block={isMobile}>
            Annuler
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            form="role-form-modal"
            loading={!!confirmLoading}
            block={isMobile}
          >
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </Space>
      }
    >
      <Alert
        className="mb-3"
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
        className="space-y-4"
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
        <Form.Item name="description" label="Description">
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

// --------- UI modernisée: Modal pour gérer les permissions ---------
function PermissionsModal({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [permissions, setPermissions] = useState<Array<{ moduleId: string; action: string; resource?: string; allowed: boolean }>>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchPermissions = useCallback(async () => {
    if (!role?.id) return;
    try {
      const url = role.organizationId
        ? `/api/permissions?roleId=${role.id}&organizationId=${role.organizationId}`
        : `/api/permissions?roleId=${role.id}`;
      const response = await api.get(url);
      if (response.success) {
        setPermissions(Array.isArray(response.data) ? response.data : []);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des permissions');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Erreur lors du chargement des permissions';
      setError(msg);
      NotificationManager.error(msg);
    }
  }, [api, role.id, role.organizationId]);

  const fetchModules = useCallback(async () => {
    try {
      const url = role.organizationId ? `/api/modules?organizationId=${role.organizationId}` : '/api/modules';
      const response = await api.get(url);
      if (response.success) {
        const all: Module[] = Array.isArray(response.data) ? response.data : [];
        const active = role.organizationId ? all.filter((m) => m.isActiveForOrg) : all.filter((m) => m.active);
        setModules(active);
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
    }
  }, [open, fetchPermissions, fetchModules]);

  const updatePermission = useCallback((moduleId: string, allowed: boolean) => {
    const newPerms = [...permissions];
    const idx = newPerms.findIndex((p) => p.moduleId === moduleId && p.action === 'access');
    const resource = modules.find((m) => m.id === moduleId)?.key;
    if (idx > -1) newPerms[idx] = { ...newPerms[idx], allowed };
    else if (allowed)
      newPerms.push({ roleId: role.id, organizationId: role.organizationId, moduleId, action: 'access', resource, allowed: true });
    setPermissions(newPerms);
  }, [permissions, modules, role.id, role.organizationId]);

  const toggleAll = (checked: boolean) => {
    const newPerms = [...permissions];
    modules.forEach((mod) => {
      const idx = newPerms.findIndex((p) => p.moduleId === mod.id && p.action === 'access');
      if (idx > -1) newPerms[idx].allowed = checked;
      else if (checked)
        newPerms.push({ roleId: role.id, organizationId: role.organizationId, moduleId: mod.id, action: 'access', resource: mod.key, allowed: true });
    });
    setPermissions(newPerms);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        roleId: role.id,
        organizationId: role.organizationId,
        permissions: permissions.map(({ moduleId, action, resource, allowed }) => ({ moduleId, action, resource, allowed })),
      };
      const response = await api.post('/api/permissions/bulk', payload);
      if (response.success) {
        NotificationManager.success('Permissions sauvegardées avec succès.');
        onClose();
      } else {
        throw new Error(response.message || 'Erreur lors de la sauvegarde des permissions');
      }
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Erreur lors de la sauvegarde des permissions';
      setError(msg);
      NotificationManager.error(msg);
    } finally {
      setSaving(false);
    }
  }, [api, role.id, role.organizationId, permissions, onClose]);

  type Permission = { moduleId: string; action: string; resource?: string; allowed: boolean };
  const columns = useMemo(
    () => [
      {
        title: 'Module',
        dataIndex: 'label',
        key: 'label',
        render: (_: unknown, m: Module) => (
          <span>
            {m.label} <span style={{ color: '#999', fontSize: 12 }}>({m.key})</span>
          </span>
        ),
      },
      {
        title: 'Accès',
        key: 'access',
        width: isMobile ? 120 : 160,
        render: (_: unknown, m: Module) => {
          const perm = permissions.find((p: Permission) => p.moduleId === m.id && p.action === 'access');
          const allowed = !!(perm && perm.allowed);
          return (
            <Switch
              checked={allowed}
              onChange={(checked) => updatePermission(m.id, checked)}
              size={isMobile ? 'small' : 'default'}
            />
          );
        },
      },
    ],
    [permissions, updatePermission, isMobile]
  );

  const allChecked = modules.length > 0 && modules.every((m) => permissions.find((p: Permission) => p.moduleId === m.id && p.allowed));
  const loading = apiIsLoading && !permissions.length && !modules.length;

  return (
    <Modal
      title={
        <span>
          Permissions du rôle <Badge color="gold" text={role.label} />
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Space
          direction={isMobile ? 'vertical' : 'horizontal'}
          style={{ width: '100%', justifyContent: isMobile ? 'stretch' : 'flex-end' }}
          size={12}
        >
          <Button onClick={onClose} block={isMobile}>
            Annuler
          </Button>
          <Button type="primary" loading={saving} onClick={handleSave} block={isMobile}>
            Sauvegarder
          </Button>
        </Space>
      }
      destroyOnClose
      centered={!isMobile}
      width={isMobile ? '100%' : 720}
      style={isMobile ? { top: 16 } : undefined}
      bodyStyle={{ padding: isMobile ? 16 : undefined }}
    >
      {error && <Alert type="error" message={error} className="mb-3" />}
      <div className={`flex items-center gap-3 mb-3 ${isMobile ? 'flex-wrap text-sm' : ''}`}>
        <span className="font-semibold">Tout activer/désactiver</span>
        <Switch checked={allChecked} onChange={toggleAll} size={isMobile ? 'small' : 'default'} />
      </div>
      <Table
        size={isMobile ? 'small' : 'middle'}
        rowKey={(m) => (m as Module).id}
        columns={columns as unknown as import('antd').TableProps<Module>['columns']}
        dataSource={modules}
        pagination={false}
        loading={loading}
        scroll={{ x: 'max-content' }}
      />
    </Modal>
  );
}

export default function RolesAdminPage() {
  const { isSuperAdmin, selectedOrganization } = useAuth();
  const organizationId = selectedOrganization?.id;
  const { api, isLoading } = useAuthenticatedApi();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
        render: (value: string) => <span className="font-medium text-gray-800">{value}</span>,
      },
      {
        title: 'Label',
        dataIndex: 'label',
        key: 'label',
        ellipsis: true,
        render: (value: string) => <span className="text-gray-600">{value}</span>,
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
            <Switch
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
        render: (_: unknown, r: Role) => (
          <Space
            size={isMobile ? 8 : 12}
            wrap
            className={isMobile ? 'w-full' : undefined}
          >
            <Tooltip title={!isSuperAdmin && r.isGlobal && !r.isActiveForOrg ? 'Activer le rôle pour modifier les permissions' : 'Gérer les permissions'}>
              <Button
                size="small"
                icon={<SafetyOutlined />}
                onClick={() => setSelectedRoleForPermissions(r)}
                disabled={!isSuperAdmin && r.isGlobal && !r.isActiveForOrg}
                shape="circle"
                aria-label="Gérer les permissions"
              />
            </Tooltip>
            <Tooltip title="Modifier le rôle">
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={r.name === 'super_admin' || (r.isGlobal && !isSuperAdmin)}
                onClick={() => {
                  setEditingRole(r);
                  setIsRoleModalOpen(true);
                }}
                shape="circle"
                aria-label="Modifier le rôle"
              />
            </Tooltip>
            <Tooltip title="Supprimer le rôle">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={r.name === 'super_admin' || (r.isGlobal && !isSuperAdmin)}
                onClick={() => handleDeleteRole(r)}
                shape="circle"
                aria-label="Supprimer le rôle"
              />
            </Tooltip>
          </Space>
        ),
      },
    ];
  }, [isSuperAdmin, filterOrgId, organizationId, handleToggleRoleStatus, handleDeleteRole, isMobile]);

  const expandable = useMemo(() => {
    if (!isMobile) return undefined;
    return {
      expandedRowRender: (record: Role) => (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gray-600">Organisation :</span>{' '}
            {record.organizationId ? record.organization?.name ?? 'N/A' : 'Global'}
          </div>
          {record.description && (
            <div>
              <span className="font-semibold text-gray-600">Description :</span> {record.description}
            </div>
          )}
        </div>
      ),
      expandRowByClick: true,
      showExpandColumn: false,
    } as import('antd').TableProps<Role>['expandable'];
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <style>{compactTableStyles}</style>
      <div className="mb-4 flex flex-wrap items-start gap-3 md:items-center md:justify-between">
        <h1 className="flex items-center text-xl font-semibold text-gray-900 md:text-2xl">
          <CrownOutlined className="mr-2 text-orange-500 md:mr-3" />
          <span>Gestion des Rôles</span>
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRole(null);
            setIsRoleModalOpen(true);
          }}
          block={isMobile}
          size={isMobile ? 'large' : 'middle'}
        >
          Nouveau Rôle
        </Button>
      </div>


      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card size={isMobile ? 'small' : 'default'} className="shadow-sm" bodyStyle={{ padding: isMobile ? 16 : 20 }}>
          <Statistic title="Total Rôles" value={roles.length} prefix={<TagsOutlined />} valueStyle={{ color: '#1890ff' }} />
        </Card>
        <Card size={isMobile ? 'small' : 'default'} className="shadow-sm" bodyStyle={{ padding: isMobile ? 16 : 20 }}>
          <Statistic
            title="Rôles Actifs"
            value={roles.filter((r) => !r.isGlobal || r.isActiveForOrg).length}
            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
        <Card size={isMobile ? 'small' : 'default'} className="shadow-sm" bodyStyle={{ padding: isMobile ? 16 : 20 }}>
          <Statistic
            title="Rôles Globaux"
            value={roles.filter((r) => r.isGlobal).length}
            prefix={<AppstoreOutlined style={{ color: '#722ed1' }} />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
        <Card size={isMobile ? 'small' : 'default'} className="shadow-sm" bodyStyle={{ padding: isMobile ? 16 : 20 }}>
          <Statistic
            title="Organisations"
            value={new Set(roles.filter((r) => r.organization).map((r) => r.organization?.id)).size}
            prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </div>

      {isSuperAdmin && (
        <Card
          className="mb-4 shadow-sm"
          size="small"
          bodyStyle={{ padding: isMobile ? 12 : 16 }}
        >
          <Space
            direction={isMobile ? 'vertical' : 'horizontal'}
            className="w-full"
            align={isMobile ? 'start' : 'center'}
            size={12}
          >
            <span className="font-semibold text-sm md:text-base">Filtrer par organisation :</span>
            <Select
              value={filterOrgId}
              onChange={(val: string | undefined) => setFilterOrgId(val ?? '')}
              style={{ width: isMobile ? '100%' : 320 }}
              options={[{ value: '', label: 'Toutes les organisations & Rôles Globaux' }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]}
              showSearch
              allowClear
              placeholder="Toutes les organisations & Rôles Globaux"
              optionFilterProp="label"
              dropdownMatchSelectWidth={false}
            />
          </Space>
        </Card>
      )}

      {error && <Alert type="error" message={error} className="mb-4" />}

      <Card className="shadow-sm" bodyStyle={{ padding: isMobile ? 0 : 24 }}>
        <div className={isMobile ? 'overflow-x-auto' : undefined}>
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
            className="roles-compact-table"
            rowClassName={() => 'text-sm'}
          />
        </div>
      </Card>

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
        <PermissionsModal role={selectedRoleForPermissions} open={!!selectedRoleForPermissions} onClose={() => setSelectedRoleForPermissions(null)} />
      )}
    </div>
  );
}
