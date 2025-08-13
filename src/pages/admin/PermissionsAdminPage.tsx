import { useEffect, useState, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import AdminSwitch from '../../components/admin/AdminSwitch';

interface Organization {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  label: string;
  organizationId: string | null;
}

interface Module {
  id: string;
  key: string;
  label: string;
}

interface Permission {
  moduleId: string;
  action: string;
  allowed: boolean;
  resource: string;
}

// Composant pour gérer les permissions par action et ressource
export default function PermissionsAdminPage() {
  const { isSuperAdmin, currentOrganization, selectOrganization, organizations: authOrganizations } = useAuth();
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();

  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ce useEffect n'est plus nécessaire, on utilise les organisations du AuthContext
  // useEffect(() => {
  //   const fetchOrgs = async () => {
  //       if (isSuperAdmin) {
  //           try {
  //               const response = await api.get('/api/organizations');
  //               if (response.success) {
  //                   setOrganizations(response.data || []);
  //                   // Do not auto-select here to allow the user to pick
  //               } else {
  //                   NotificationManager.error("Erreur lors du chargement des organisations.");
  //               }
  //           } catch (error) {
  //               NotificationManager.error("Erreur critique lors du chargement des organisations.");
  //           }
  //       }
  //   };
  //   if (api && isSuperAdmin) {
  //       fetchOrgs();
  //   }
  // }, [api, isSuperAdmin]);


  const fetchAllData = useCallback(async () => {
    if (!currentOrganization) {
      setRoles([]);
      setModules([]);
      setPermissions([]);
      setSelectedRole(null);
      setError(null);
      return;
    }

    setError(null);
    try {
      const orgId = currentOrganization.id;
      const [rolesResponse, modulesResponse] = await Promise.all([
        api.get(`/roles?organizationId=${orgId}`),
        api.get(`/modules?organizationId=${orgId}`),
      ]);

      if (rolesResponse.success) {
        setRoles(rolesResponse.data || []);
      } else {
        throw new Error(rolesResponse.message || 'Erreur lors du chargement des rôles');
      }

      if (modulesResponse.success) {
        setModules(modulesResponse.data || []);
      } else {
        throw new Error(modulesResponse.message || 'Erreur lors du chargement des modules');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Une erreur est survenue lors du chargement des données.';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setRoles([]);
      setModules([]);
      setSelectedRole(null);
    }
  }, [api, currentOrganization]);

  const fetchPermissions = useCallback(async () => {
    if (!selectedRole) {
      setPermissions([]);
      return;
    }
    // Ensure organization is selected, which should be the case if a role is selected.
    if (!currentOrganization) {
        setPermissions([]);
        setError("Aucune organisation n'est sélectionnée pour charger les permissions.");
        return;
    }
    try {
      // Always pass organizationId to ensure correct permission checking on the backend, especially for super admins.
      const response = await api.get(`/permissions?roleId=${selectedRole.id}&organizationId=${currentOrganization.id}`);
      if (response.success) {
        setPermissions(response.data || []);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des permissions');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors du chargement des permissions.';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setPermissions([]);
    }
  }, [api, selectedRole, currentOrganization]);

  useEffect(() => {
    // If an organization is selected, fetch its data (roles, modules).
    if (currentOrganization) {
      fetchAllData();
    }
  }, [currentOrganization, fetchAllData]);

  useEffect(() => {
    // When roles are loaded or changed, automatically select a role.
    // This logic is separated to avoid dependency cycles.
    if (roles.length > 0 && !roles.find(r => r.id === selectedRole?.id)) {
      setSelectedRole(roles[0]);
    } else if (roles.length === 0) {
      setSelectedRole(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  useEffect(() => {
    // If a role is selected, fetch its permissions. Otherwise, clear them.
    if (selectedRole) {
      fetchPermissions();
    } else {
      setPermissions([]);
    }
  }, [selectedRole, fetchPermissions]);

  const handlePermissionChange = (moduleId: string, action: string, resource: string, allowed: boolean) => {
    const newPermissions = [...permissions];
    const permIndex = newPermissions.findIndex(p => p.moduleId === moduleId && p.action === action);

    if (permIndex > -1) {
      newPermissions[permIndex].allowed = allowed;
    } else if (allowed) {
      newPermissions.push({ moduleId, action, resource, allowed });
    }
    setPermissions(newPermissions);
  };

  const handleToggleAllForModule = (moduleId: string, allowed: boolean) => {
    const newPermissions = [...permissions];
    actions.forEach(action => {
      const permIndex = newPermissions.findIndex(p => p.moduleId === moduleId && p.action === action);
      if (permIndex > -1) {
        newPermissions[permIndex].allowed = allowed;
      } else if (allowed) {
        newPermissions.push({ moduleId, action, resource: '*', allowed });
      }
    });
    setPermissions(newPermissions);
  };

  const handleSelectRole = async (role: Role | null) => {
    setSelectedRole(role);
    if (!role) {
      setPermissions([]);
      return;
    }
    try {
      const response = await api.get(`/permissions?roleId=${role.id}&organizationId=${currentOrganization?.id}`);
      if (response.success) {
        setPermissions(response.data || []);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des permissions');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors du chargement des permissions.';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setPermissions([]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !currentOrganization) return;

    setIsSaving(true);
    setError(null);

    const permissionsToSave = permissions.map(({ moduleId, action, resource, allowed }) => 
      ({ moduleId, action, resource, allowed }));

    console.log('[PermissionsAdminPage] Saving permissions with payload:', JSON.stringify(permissionsToSave, null, 2));

    try {
      const response = await api.post('/api/permissions', {
        roleId: selectedRole.id,
        organizationId: currentOrganization.id,
        permissions: permissionsToSave,
      });

      if (response.success) {
        NotificationManager.success('Permissions sauvegardées avec succès.');
        fetchPermissions(); // Refresh permissions from server
      } else {
        throw new Error(response.message || 'Erreur lors de la sauvegarde.');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors de la sauvegarde.';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = apiIsLoading && !error && (!roles.length || !modules.length);
  // Liste d'actions standard inspirée des meilleurs CRM/ERP (Odoo, SaaS)
  const actions = [
    'access',
    'create',
    'read',
    'update',
    'delete',
    'manage',
    'export',
    'import',
    'archive',
    'restore',
    'approve',
    'share',
  ];

  const actionDescriptions: { [key: string]: string } = {
    'access': 'Permet d\'accéder au module ou à la fonctionnalité. Sans ce droit, le module n\'est même pas visible.',
    'create': 'Autorise la création de nouveaux enregistrements (ex: créer un nouveau client, un nouveau produit).',
    'read': 'Permet de voir les enregistrements existants. Sans ce droit, l\'utilisateur ne peut pas consulter les données.',
    'update': 'Autorise la modification des enregistrements existants (ex: changer l\'adresse d\'un client).',
    'delete': 'Permet de supprimer des enregistrements. C\'est une action destructive à utiliser avec précaution.',
    'manage': 'Droit de "super-utilisateur" pour un module. Donne tous les droits (créer, lire, modifier, supprimer) et souvent l\'accès aux configurations du module.',
    'export': 'Autorise l\'exportation des données (ex: télécharger une liste de clients en CSV).',
    'import': 'Permet l\'importation de données dans le système (ex: importer une liste de prospects).',
    'archive': 'Permet de désactiver ou masquer des enregistrements sans les supprimer définitivement. Utile pour garder l\'historique.',
    'restore': 'Autorise la restauration d\'enregistrements qui ont été archivés.',
    'approve': 'Permet de valider des enregistrements ou des processus (ex: approuver une note de frais, valider une commande).',
    'share': 'Autorise le partage d\'enregistrements avec d\'autres utilisateurs ou en externe.',
  };

  if (!currentOrganization) {
    return (
      <div className="p-4 text-center text-gray-500">
        Veuillez sélectionner une organisation pour gérer les permissions.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Gestion des Permissions</h1>
      {isSuperAdmin && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Sélectionner une organisation</label>
          <select
            value={currentOrganization?.id || ''}
            onChange={(e) => {
              if (e.target.value) {
                selectOrganization(e.target.value);
              }
            }}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">-- Choisissez une organisation --</option>
            {authOrganizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentOrganization ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colonne des rôles */}
          <div>
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">Rôle :</label>
            <select
              id="role-select"
              value={selectedRole?.id || ''}
              onChange={(e) => {
                const role = roles.find(r => r.id === e.target.value);
                handleSelectRole(role || null);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={apiIsLoading || roles.length === 0}
            >
              <option value="" disabled>Sélectionner un rôle</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </div>
          {/* Colonne des actions */}
          <div className="flex justify-end">
            <button
              onClick={handleSavePermissions}
              disabled={isSaving || !selectedRole}
              className={`inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder les permissions'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          Veuillez sélectionner un rôle pour voir les permissions.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center">Chargement...</div>
      ) : selectedRole ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tout activer/désactiver
                </th>
                {actions.map(action => (
                  <th key={action} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" title={actionDescriptions[action]}>
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules.map(module => {
                const allAllowedForModule = actions.every(action => 
                  permissions.find(p => p.moduleId === module.id && p.action === action)?.allowed
                );

                return (
                  <tr key={module.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{module.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdminSwitch
                        checked={allAllowedForModule}
                        onChange={(checked) => handleToggleAllForModule(module.id, checked)}
                      />
                    </td>
                    {actions.map(action => {
                      const permission = permissions.find(p => p.moduleId === module.id && p.action === action);
                      const isAllowed = permission?.allowed || false;
                      return (
                        <td key={action} className="px-6 py-4 whitespace-nowrap">
                          <AdminSwitch
                            checked={isAllowed}
                            onChange={(checked) => handlePermissionChange(module.id, action, '*', checked)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          Veuillez sélectionner un rôle pour voir les permissions.
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
