import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Spin,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  CrownOutlined,
  TagsOutlined,
  UserSwitchOutlined,
  PoweroffOutlined,
  SearchOutlined,
  ReloadOutlined,
  SafetyOutlined,
  LockOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import AdminSwitch from '../../components/admin/AdminSwitch';
import { 
  formatRoleName,
  formatRoleDescription,
  getRoleIcon,
  getRoleTypeLabel,
  calculateRoleStats,
  validateRoleData,
  debounce
} from '../../utils/rolesOptimizations';

const { Title, Text } = Typography;

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

function InfoIcon({ text }: { text: string }) {
  return (
    <span className="ml-1 text-blue-500 cursor-pointer" title={text}>
      ℹ️
    </span>
  );
}

function RoleForm({ initial, onSave, onCancel, error, defaultOrganizationId }: { initial?: Role, onSave: (form: any) => void, onCancel: () => void, error: string, defaultOrganizationId?: string | null }) {
  const [form, setForm] = useState<Partial<Role>>(initial || { name: '', label: '', description: '', organizationId: defaultOrganizationId });
  const isSuperAdminRole = initial?.name === 'super_admin';
  const { isSuperAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const { api } = useAuthenticatedApi();

  useEffect(() => {
    if (isSuperAdmin) {
      api.get('/api/organizations').then(response => {
        if (response.success) {
          setOrganizations(response.data);
        }
      });
    }
  }, [isSuperAdmin, api]);

  return (
    <div className="border p-4 bg-gray-50 rounded mb-4">
      <div className="flex gap-2 mb-2">
        <div className="flex-1 relative">
          <input 
            className={`border p-1 w-full ${isSuperAdminRole ? 'bg-gray-200 cursor-not-allowed' : ''}`} 
            placeholder="Nom technique" 
            value={form.name} 
            onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} 
            disabled={isSuperAdminRole}
            title={isSuperAdminRole ? "Le nom technique du super_admin ne peut pas être modifié." : "Identifiant unique du rôle"}
          />
          <InfoIcon text="Identifiant unique du rôle (ex: admin, manager, support)" />
        </div>
        <div className="flex-1 relative">
          <input className="border p-1 w-full" placeholder="Label" value={form.label} onChange={e => setForm((f: any) => ({ ...f, label: e.target.value }))} />
          <InfoIcon text="Nom affiché dans l’interface (ex: Administrateur, Manager)" />
        </div>
      </div>
      <div className="relative mb-2">
        <textarea className="border p-1 w-full" placeholder="Description" value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
        <InfoIcon text="Description du rôle (optionnel)" />
      </div>

      {isSuperAdmin && (
        <div className="relative mb-2">
            <select 
                className="border p-1 w-full bg-white" 
                value={form.organizationId === null ? 'global' : form.organizationId || ''} 
                onChange={e => {
                    const value = e.target.value;
                    setForm(f => ({ ...f, organizationId: value === 'global' ? null : value }));
                }}
            >
                <option value="global">Rôle Global (visible par toutes les organisations)</option>
                {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                ))}
            </select>
            <InfoIcon text="Assigne le rôle à une organisation spécifique ou le rend global." />
        </div>
      )}

      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => onSave(form)}>Enregistrer</button>
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

function PermissionEditor({ role, onClose }: { role: Role, onClose: () => void }) {
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log('[PermissionEditor] Mounted for role:', role);
  }, [role]);

  const fetchPermissions = useCallback(async () => {
    if (!role?.id) return;
    console.log(`[PermissionEditor] Fetching permissions for roleId: ${role.id}`);
    try {
      // On passe explicitement l'organizationId pour lever toute ambiguïté en cas d'usurpation
      const url = role.organizationId
        ? `/api/permissions?roleId=${role.id}&organizationId=${role.organizationId}`
        : `/api/permissions?roleId=${role.id}`;

      console.log(`[PermissionEditor] Permissions URL: ${url}`);
      const response = await api.get(url);
      console.log('[PermissionEditor] Permissions response:', response);

      if (response.success) {
        setPermissions(Array.isArray(response.data) ? response.data : []);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des permissions');
      }
    } catch (e: any) {
      console.error("[PermissionEditor] Erreur détaillée - fetchPermissions:", e);
      const errorMessage = e.message || 'Erreur lors du chargement des permissions';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
    }
  }, [api, role.id, role.organizationId]);

  const fetchModules = useCallback(async () => {
    console.log(`[PermissionEditor] Fetching modules for orgId: ${role.organizationId || 'global'}`);
    try {
      const url = role.organizationId 
        ? `/api/modules?organizationId=${role.organizationId}` 
        : '/api/modules';

      console.log(`[PermissionEditor] Modules URL: ${url}`);
      const response = await api.get(url);
      console.log('[PermissionEditor] Modules response:', response);

      if (response.success) {
        const allModules: Module[] = Array.isArray(response.data) ? response.data : [];
        
        const activeModules = role.organizationId
          ? allModules.filter((m: Module) => m.isActiveForOrg)
          : allModules.filter((m: Module) => m.active);

        console.log('[PermissionEditor] Active modules:', activeModules);
        setModules(activeModules);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des modules');
      }
    } catch (e: any) {
      console.error("[PermissionEditor] Erreur détaillée - fetchModules:", e);
      const errorMessage = e.message || 'Erreur lors du chargement des modules';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
    }
  }, [api, role.organizationId]);

  useEffect(() => {
    console.log('[PermissionEditor] useEffect to fetch data triggered.');
    fetchPermissions();
    fetchModules();
  }, [fetchPermissions, fetchModules]);

  function updatePermission(moduleId: string, allowed: boolean) {
    const newPermissions = [...permissions];
    const permIndex = newPermissions.findIndex(p => p.moduleId === moduleId && p.action === 'access');
    const resource = modules.find(m => m.id === moduleId)?.key;

    if (permIndex > -1) {
      newPermissions[permIndex] = { ...newPermissions[permIndex], allowed };
    } else if (allowed) {
      newPermissions.push({ 
        roleId: role.id, 
        organizationId: role.organizationId, 
        moduleId, 
        action: 'access', 
        resource, 
        allowed: true 
      });
    }
    setPermissions(newPermissions);
  }

  function handleToggle(moduleId: string, currentAllowed: boolean) {
    updatePermission(moduleId, !currentAllowed);
  }

  function handleMultiSelect(checked: boolean) {
    const newPermissions = [...permissions];
    modules.forEach(mod => {
      const permIndex = newPermissions.findIndex(p => p.moduleId === mod.id && p.action === 'access');
      if (permIndex > -1) {
        newPermissions[permIndex].allowed = checked;
      } else if (checked) {
        newPermissions.push({
          roleId: role.id,
          organizationId: role.organizationId,
          moduleId: mod.id,
          action: 'access',
          resource: mod.key,
          allowed: true,
        });
      }
    });
    setPermissions(newPermissions);
  }

  const handleSave = useCallback(async () => {
    setError('');
    setIsSaving(true);
    try {
      // La charge utile est un objet contenant les informations du rôle et la liste des permissions.
      const payload = {
        roleId: role.id,
        organizationId: role.organizationId,
        permissions: permissions.map(({ moduleId, action, resource, allowed }) => ({
          moduleId,
          action,
          resource,
          allowed,
        })),
      };

      console.log('[PermissionEditor] Saving permissions with payload:', payload);
      const response = await api.post(`/api/permissions/bulk`, payload);
      console.log('[PermissionEditor] Save response:', response);

      if (response.success) {
        NotificationManager.success('Permissions sauvegardées avec succès.');
        onClose();
      } else {
        throw new Error(response.message || 'Erreur lors de la sauvegarde des permissions');
      }
    } catch (e: any) {
      console.error('[PermissionEditor] Save error:', e);
      const errorMessage = e.message || 'Erreur lors de la sauvegarde des permissions';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [api, role.id, role.organizationId, permissions, onClose]);

  const isLoading = apiIsLoading && !permissions.length && !modules.length;

  console.log('[PermissionEditor] Rendering with state:', { permissions, modules, error });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl relative">
        <button className="absolute top-2 right-2 text-xl" onClick={onClose}>✖️</button>
        <h2 className="text-xl font-bold mb-4">Permissions du rôle <span className="text-blue-700">{role.label}</span></h2>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {isLoading && <div>Chargement des permissions et modules...</div>}
        {!isLoading && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">Tout activer/désactiver</span>
              <AdminSwitch 
                checked={modules.length > 0 && modules.every(mod => permissions.find(p => p.moduleId === mod.id && p.allowed))} 
                onChange={handleMultiSelect} 
              />
            </div>
            <table className="w-full border rounded bg-white mb-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Module</th>
                  <th className="p-2 text-left">Accès</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => {
                  const perm = permissions.find(p => p.moduleId === mod.id && p.action === 'access');
                  return (
                    <tr key={mod.id} className="border-t">
                      <td className="p-2">{mod.label} <span className="text-xs text-gray-400">({mod.key})</span></td>
                      <td className="p-2">
                        <AdminSwitch checked={!!(perm && perm.allowed)} onChange={() => handleToggle(mod.id, !!(perm && perm.allowed))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-right flex gap-2 justify-end">
              <button className="bg-gray-200 px-3 py-1 rounded" onClick={onClose}>Annuler</button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RolesAdminPage() {
  const { isSuperAdmin, selectedOrganization } = useAuth();
  const organizationId = selectedOrganization?.id;
  const { api, isLoading } = useAuthenticatedApi();

  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filterOrgId, setFilterOrgId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);

  const handleToggleRoleStatus = useCallback(async (role: Role) => {
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
            setRoles(prevRoles => 
                prevRoles.map(r => 
                    r.id === role.id ? { ...r, isActiveForOrg: newStatus } : r
                )
            );
        } else {
            throw new Error(response.message || 'Erreur lors de la mise à jour du statut.');
        }
    } catch (e: any) {
        NotificationManager.error(e.message || 'Erreur lors de la mise à jour du statut.');
    }
  }, [api, isSuperAdmin, filterOrgId, organizationId]);

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
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors du chargement des rôles';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setRoles([]);
    }
  }, [api, organizationId, isSuperAdmin, filterOrgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleSaveRole = async (form: any) => {
    setFormError('');
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
      setIsCreating(false);
      fetchRoles(); // On recharge toujours les rôles pour avoir les données à jour.
    } catch (e: any) {
      const errorMessage = e.message || 'Une erreur est survenue.';
      setFormError(errorMessage);
      NotificationManager.error(errorMessage);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle ? Cette action est irréversible.')) {
      try {
        const response = await api.delete(`/api/roles/${roleId}`);
        if (response.success) {
          NotificationManager.success('Rôle supprimé avec succès.');
          fetchRoles();
        } else {
          throw new Error(response.message || 'La suppression du rôle a échoué.');
        }
      } catch (e: any) {
        const errorMessage = e.message || 'La suppression du rôle a échoué.';
        NotificationManager.error(errorMessage);
      }
    }
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingRole(null);
    setFormError('');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* 📊 EN-TÊTE AMÉLIORÉ AVEC STATISTIQUES */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mb-0 flex items-center">
            <CrownOutlined className="mr-3 text-orange-500" />
            Gestion des Rôles
          </h1>
          
          {!isCreating && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreating(true)}
              size="large"
            >
              Nouveau Rôle
            </Button>
          )}
        </div>

        {/* 📈 STATISTIQUES RAPIDES */}
        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Rôles"
                value={roles.length}
                prefix={<TagsOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Rôles Actifs"
                value={roles.filter(r => !r.isGlobal || r.isActiveForOrg).length}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Rôles Globaux"
                value={roles.filter(r => r.isGlobal).length}
                prefix={<AppstoreOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Organisations"
                value={new Set(roles.filter(r => r.organization).map(r => r.organization?.id)).size}
                prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {isSuperAdmin && (
        <div className="mb-4 p-4 bg-white rounded shadow-sm border border-gray-200">
            <label className="font-semibold mr-2">Filtrer par organisation :</label>
            <select 
              value={filterOrgId} 
              onChange={e => setFilterOrgId(e.target.value)} 
              className="border p-2 bg-white rounded shadow-sm"
            >
                <option value="">Toutes les organisations & Rôles Globaux</option>
                {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                ))}
            </select>
        </div>
      )}

      {!editingRole && (
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700 transition-colors shadow" 
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          {isCreating ? '...' : 'Ajouter un rôle'}
        </button>
      )}

      {isCreating && (
        <RoleForm 
            onSave={handleSaveRole} 
            onCancel={handleCancelForm} 
            error={formError}
            defaultOrganizationId={filterOrgId || null}
        />
      )}
      
      {editingRole && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Modifier le rôle : <span className="text-blue-600">{editingRole.label}</span></h2>
          <RoleForm 
              initial={editingRole} 
              onSave={handleSaveRole} 
              onCancel={handleCancelForm} 
              error={formError}
          />
        </div>
      )}

      {isLoading && <p className="text-center mt-4">Chargement des rôles...</p>}
      
      {error && <div className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</div>}

      {!isLoading && !error && roles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded shadow-md">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-3 text-left font-semibold text-gray-700">Nom</th>
                <th className="p-3 text-left font-semibold text-gray-700">Label</th>
                <th className="p-3 text-left font-semibold text-gray-700">Organisation</th>
                <th className="p-3 text-left font-semibold text-gray-700">Statut</th>
                <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id} className={`border-b hover:bg-gray-50 ${role.isGlobal && !role.isActiveForOrg ? 'bg-gray-100 text-gray-500' : ''}`}>
                  <td className="p-3">{role.name}</td>
                  <td className="p-3">{role.label}</td>
                  <td className="p-3">
                    {role.organizationId ? (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                        {role.organization?.name || 'N/A'}
                      </span>
                    ) : (
                      <span className="bg-gray-200 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                        Global
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {(role.isGlobal && (isSuperAdmin ? filterOrgId : organizationId)) && (
                        <AdminSwitch
                            checked={!!role.isActiveForOrg}
                            onChange={() => handleToggleRoleStatus(role)}
                            disabled={role.name === 'super_admin'}
                        />
                    )}
                  </td>
                  <td className="p-3 flex gap-2 items-center">
                    <button 
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded disabled:bg-gray-300"
                        onClick={() => setSelectedRoleForPermissions(role)}
                        disabled={!isSuperAdmin && role.isGlobal && !role.isActiveForOrg}
                        title={!isSuperAdmin && role.isGlobal && !role.isActiveForOrg ? "Activer le rôle pour modifier les permissions" : "Gérer les permissions"}
                    >
                        Permissions
                    </button>
                    <button 
                        className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded disabled:bg-gray-300" 
                        onClick={() => setEditingRole(role)}
                        disabled={role.name === 'super_admin' || (role.isGlobal && !isSuperAdmin)}
                        title={role.name === 'super_admin' ? "Le super_admin ne peut pas être modifié" : (role.isGlobal && !isSuperAdmin) ? "Seul un super-admin peut modifier un rôle global" : "Modifier le rôle"}
                    >
                        Modifier
                    </button>
                    <button 
                        className="text-sm bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded disabled:bg-gray-300" 
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={role.name === 'super_admin' || (role.isGlobal && !isSuperAdmin)}
                        title={role.name === 'super_admin' ? "Le super_admin ne peut pas être supprimé" : (role.isGlobal && !isSuperAdmin) ? "Seul un super-admin peut supprimer un rôle global" : "Supprimer le rôle"}
                    >
                        Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && roles.length === 0 && (
        <p className="text-center text-gray-500 mt-4">Aucun rôle à afficher pour le filtre sélectionné.</p>
      )}

      {selectedRoleForPermissions && (
        <PermissionEditor role={selectedRoleForPermissions} onClose={() => setSelectedRoleForPermissions(null)} />
      )}
    </div>
  );
}
