import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import DebugAuth from './DebugAuth';
import { useAuth } from '../../auth/useAuth';
import useAutoAuth from '../../hooks/useAutoAuth';

// Types for data structures
type User = { 
  id: string; 
  email: string; 
  firstName?: string | null;
  lastName?: string | null;
};
type Organization = { 
  id: string; 
  name: string; 
};
type Module = {
  key: string;
  label: string;
};
// CORRECTED TYPE
type RightsSummary = {
  roles: string[];
  permissions: { [moduleKey: string]: { label: string; actions: string[] } };
};

const UserRightsSummaryPage = () => {
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin, user } = useAuth();
  // Assurer l'authentification automatique en dev
  useAutoAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [rightsSummary, setRightsSummary] = useState<RightsSummary | null>(null);
  const [organizationModules, setOrganizationModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data (users and organizations)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingData(true);
      setError(null);
      console.log("[UserRightsSummaryPage] Fetching initial data (users and orgs)...");
      console.log("[UserRightsSummaryPage] Current user:", user);
      console.log("[UserRightsSummaryPage] Is Super Admin:", isSuperAdmin);
      
      try {
        // Utilisation du paramètre all=true pour s'assurer d'obtenir tous les utilisateurs
        const [usersResponse, orgsResponse] = await Promise.all([
          api.get('/api/users?all=true'),
          api.get('/api/organizations')
        ]);

        console.log("[UserRightsSummaryPage] Users response:", usersResponse);
        if (usersResponse.success) {
          // Traiter correctement le format de réponse pour les utilisateurs
          let userData = [];
          if (Array.isArray(usersResponse.data)) {
            userData = usersResponse.data;
          } else if (usersResponse.data && Array.isArray(usersResponse.data.data)) {
            userData = usersResponse.data.data;
          } else if (usersResponse.data && typeof usersResponse.data === 'object') {
            userData = [usersResponse.data]; // Si c'est un seul objet
          }
          console.log("[UserRightsSummaryPage] Processed user data:", userData);
          setUsers(userData);
        } else {
          throw new Error(usersResponse.message || 'Erreur lors du chargement des utilisateurs.');
        }

        console.log("[UserRightsSummaryPage] Orgs response:", orgsResponse);
        if (orgsResponse.success && Array.isArray(orgsResponse.data)) {
          setOrganizations(orgsResponse.data);
        } else {
          throw new Error(orgsResponse.message || 'Erreur lors du chargement des organisations.');
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Une erreur est survenue lors du chargement des données.';
        console.error("[UserRightsSummaryPage] Error fetching initial data:", err);
        setError(errorMessage);
        NotificationManager.error(errorMessage);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchInitialData();
  }, [api]);

  // Fetch permissions summary when selection changes
  useEffect(() => {
    if (selectedUserId && selectedOrgId) {
      const fetchRightsAndModules = async () => {
        setIsLoading(true);
        setError(null);
        setRightsSummary(null);
        setOrganizationModules([]);
        console.log(`[UserRightsSummaryPage] Fetching rights and modules for user: ${selectedUserId}, org: ${selectedOrgId}`);
        try {
          const [rightsResponse, modulesResponse] = await Promise.all([
            api.get(`/api/users/${selectedUserId}/rights-summary?organizationId=${selectedOrgId}`),
            api.get(`/api/modules?organizationId=${selectedOrgId}`)
          ]);
          
          console.log("[UserRightsSummaryPage] API Response for rights summary:", rightsResponse);

          if (rightsResponse.success && rightsResponse.data) {
            console.log("[UserRightsSummaryPage] Received rights summary data:", rightsResponse.data);
            // Data validation
            if (typeof rightsResponse.data.permissions !== 'object' || rightsResponse.data.permissions === null) {
                console.error("[UserRightsSummaryPage] Permissions data is not a valid object:", rightsResponse.data.permissions);
                throw new Error("Format de données de permissions invalide.");
            }
            setRightsSummary(rightsResponse.data);
          } else {
            throw new Error(rightsResponse.message || "Impossible de charger la synthèse des droits.");
          }

          console.log("[UserRightsSummaryPage] API Response for org modules:", modulesResponse);
          if (modulesResponse.success && Array.isArray(modulesResponse.data)) {
            setOrganizationModules(modulesResponse.data);
          } else {
            console.warn('Could not load organization modules:', modulesResponse.message);
            NotificationManager.warning(modulesResponse.message || "Les modules de l'organisation n'ont pas pu être chargés.");
          }
        } catch (err: any) {
          const errorMessage = err.message || "Une erreur est survenue lors de la récupération des données.";
          console.error("[UserRightsSummaryPage] Error fetching summary data:", err);
          setError(errorMessage);
          NotificationManager.error(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      fetchRightsAndModules();
    } else {
      setRightsSummary(null);
      setOrganizationModules([]);
    }
  }, [selectedUserId, selectedOrgId, api]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Synthèse des Droits par Utilisateur</h1>
      
      {process.env.NODE_ENV === 'development' && <DebugAuth />}
      
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <h3 className="text-yellow-700 font-bold">Actions de développement</h3>
          <div className="mt-2 flex gap-2">
            <button 
              className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
              onClick={() => {
                localStorage.removeItem('token');
                sessionStorage.clear();
                window.location.reload();
              }}
            >
              Effacer token et recharger
            </button>
            <button 
              className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
              onClick={async () => {
                try {
                  await api.post('/login', { email: 'admin@example.com', password: 'admin123' });
                  window.location.reload();
                } catch (e) {
                  NotificationManager.error('Échec de la reconnexion');
                }
              }}
            >
              Forcer reconnexion
            </button>
          </div>
        </div>
      )}
      
      {isFetchingData ? (
        <p className="text-center text-gray-500">Chargement des utilisateurs et organisations...</p>
      ) : error && !users.length ? (
        <div className="bg-red-50 border border-red-300 rounded-xl p-6 mb-6">
          <p className="text-red-600 font-medium">{error}</p>
          
          <div className="mt-4">
            <details>
              <summary className="cursor-pointer text-sm text-red-500 font-medium">Informations de débogage</summary>
              <div className="mt-2 p-3 bg-gray-100 rounded overflow-auto max-h-80">
                <p>Token: {localStorage.getItem('token') ? '✅ Présent' : '❌ Absent'}</p>
                <p>Utilisateur: {user ? '✅ Authentifié' : '❌ Non authentifié'}</p>
                <p>Super Admin: {isSuperAdmin ? '✅ Oui' : '❌ Non'}</p>
                <p>URL API users: /api/users?all=true</p>
              </div>
            </details>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              onClick={() => {
                localStorage.removeItem('token');
                sessionStorage.clear();
                window.location.href = '/login';
              }}
            >
              Aller à la page de connexion
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
                Choisir un utilisateur
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Sélectionner --</option>
                {users.map(user => {
                  const displayName = (user.firstName && user.lastName) 
                    ? `${user.firstName} ${user.lastName} (${user.email})` 
                    : user.email;
                  return <option key={user.id} value={user.id}>{displayName}</option>
                })}
              </select>
            </div>
            <div>
              <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 mb-1">
                Choisir une organisation
              </label>
              <select
                id="org-select"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Sélectionner --</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">Synthèse des Droits Effectifs</h2>
        <div className="bg-white p-6 rounded-xl shadow-md">
          {isLoading ? (
            <p className="text-center text-gray-500">Chargement de la synthèse...</p>
          ) : error && !rightsSummary ? (
            <p className="text-center text-red-500">{error}</p>
          ) : rightsSummary ? (
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-800 border-b pb-2">Rôles de l'utilisateur dans l'organisation</h3>
                {rightsSummary.roles.length > 0 ? (
                  <ul className="space-y-2 pt-2">
                    {rightsSummary.roles.map(role => (
                      <li key={role} className="p-3 bg-blue-50 rounded-md text-blue-800">{role}</li>
                    ))}
                  </ul>
                ) : <p className="text-gray-500">Aucun rôle assigné pour cette organisation.</p>}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-800 border-b pb-2">Modules Actifs pour l'Organisation (limite définie par le Super Admin)</h3>
                {organizationModules.length > 0 ? (
                  <ul className="space-y-2 pt-2">
                    {organizationModules.map((module) => (
                      <li key={module.key} className="p-3 bg-green-50 rounded-md text-green-800">{module.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Aucun module actif pour cette organisation ou information non disponible.</p>
                )}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800 border-b pb-2">Permissions Effectives de l'Utilisateur (basées sur ses rôles)</h3>
                {Object.keys(rightsSummary.permissions).length > 0 ? (
                  Object.entries(rightsSummary.permissions).map(([moduleKey, permData]) => (
                    <div key={moduleKey} className="mb-4">
                      <h4 className="font-bold capitalize text-indigo-600">{permData.label}</h4>
                      <ul className="space-y-1 mt-2">
                        {Array.isArray(permData.actions) && permData.actions.length > 0 ? (
                          permData.actions.map(permission => (
                            <li key={permission} className="p-2 pl-4 border-l-2 border-gray-200 bg-gray-50 text-gray-700 font-mono text-sm">
                              {permission}
                            </li>
                          ))
                        ) : (
                          <li className="p-2 pl-4 text-gray-500 italic">Aucune action spécifique.</li>
                        )}
                      </ul>
                    </div>
                  ))
                ) : <p className="text-gray-500">Aucune permission spécifique trouvée.</p>}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Veuillez sélectionner un utilisateur et une organisation pour voir la synthèse.</p>
          )}
        </div>
      </div>

      {/* Debug component - only visible to admins */}
      <DebugAuth />
    </div>
  );
};

export default UserRightsSummaryPage;
