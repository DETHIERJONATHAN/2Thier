import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { AuthUser } from '../auth/user';
import { AuthOrganization } from '../auth/organization';

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers);
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  if (options.body && !(options.headers && (options.headers as Record<string,string>)['Content-Type'])) {
    headers.append('Content-Type', 'application/json');
  }

  const response = await fetch(url.startsWith('/api') ? url : `/api${url}`, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(errorData.message || 'Erreur API');
  }
  return response.json();
};


const ImpersonationSearch: React.FC = () => {
  const { setImpersonation, user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<AuthOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'select_org' | 'select_user'>('search');

  const resetState = useCallback(() => {
    setQuery('');
    setUsers([]);
    setOrganizations([]);
    setSelectedUser(null);
    setSelectedOrg(null);
    setIsLoading(false);
    setStep('search');
  }, []);

  const handleImpersonate = () => {
    if (selectedUser && selectedOrg) {
      if (currentUser?.id === selectedUser.id) {
        alert("Vous ne pouvez pas usurper votre propre identité.");
        return;
      }
      if (setImpersonation) {
        setImpersonation(selectedUser, selectedOrg);
      }
      resetState();
    }
  };

  useEffect(() => {
    if (step !== 'search') {
      return;
    }

    if (query.length < 1) {
      setUsers([]);
      setOrganizations([]);
      return;
    }

    const handler = setTimeout(() => {
      setIsLoading(true);
      Promise.allSettled([
        fetchWithAuth(`/users?search=${query}`),
        fetchWithAuth(`/organizations?search=${query}`)
      ]).then(([usersResult, orgsResult]) => {
        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value.data || []);
        } else {
          setUsers([]);
          console.error("Erreur lors de la recherche d'utilisateurs:", usersResult.reason);
        }

        if (orgsResult.status === 'fulfilled') {
          setOrganizations(orgsResult.value.data || []);
        } else {
          setOrganizations([]);
           console.error("Erreur lors de la recherche d'organisations:", orgsResult.reason);
        }
      }).finally(() => {
        setIsLoading(false);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [query, step]);

  const handleSelectUserFromSearch = (user: AuthUser) => {
    setSelectedUser(user);
    setSelectedOrg(null);
    setOrganizations([]);
    setUsers([]);
    setStep('select_org');
    setIsLoading(true);
    fetchWithAuth(`/organizations?userId=${user.id}`).then(data => {
      const userOrgs = data?.data || (Array.isArray(data) ? data : []);
      setOrganizations(userOrgs);
      // Auto-select if only one org
      if (userOrgs.length === 1) {
        setSelectedOrg(userOrgs[0]);
      }
    }).catch(err => {
      console.error("Erreur lors de la récupération des organisations de l'utilisateur:", err);
      setOrganizations([]);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const handleSelectOrgFromSearch = (org: AuthOrganization) => {
    setSelectedOrg(org);
    setSelectedUser(null);
    setUsers([]);
    setStep('select_user');
    setIsLoading(true);
    fetchWithAuth(`/users?organizationId=${org.id}`).then(data => {
      const orgUsers = data?.data || (Array.isArray(data) ? data : []);
      setUsers(orgUsers);
    }).catch(err => {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
      setUsers([]);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const renderInitialSearch = () => (
    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
      {isLoading ? (
        <p className="p-4 text-gray-400">Recherche...</p>
      ) : users.length === 0 && organizations.length === 0 ? (
        <p className="p-4 text-gray-400">Aucun résultat trouvé.</p>
      ) : (
        <>
          {organizations.length > 0 && (
            <div className="p-2">
              <h4 className="text-sm font-bold text-gray-400 px-2">Organisations</h4>
              <ul>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => handleSelectOrgFromSearch(org)} className="p-2 hover:bg-gray-600 cursor-pointer rounded-md">
                    {org.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {users.length > 0 && (
            <div className="p-2">
              <h4 className="text-sm font-bold text-gray-400 px-2">Utilisateurs</h4>
              <ul>
                {users.map(user => (
                  <li key={user.id} onClick={() => handleSelectUserFromSearch(user)} className="p-2 hover:bg-gray-600 cursor-pointer rounded-md">
                    {user.firstName} {user.lastName} ({user.email})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderSelectionSummary = () => {
    if (step === 'search') return null;
    return (
      <div className="mt-4 p-3 bg-gray-700/50 rounded-md border border-gray-600 space-y-3">
        {selectedOrg && (
          <div>
            <p className="text-sm font-medium text-gray-400 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
              Organisation
            </p>
            <p className="text-base font-semibold pl-6">{selectedOrg.name}</p>
          </div>
        )}
        {selectedUser && (
          <div>
            <p className="text-sm font-medium text-gray-400 flex items-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
              Utilisateur
            </p>
            <p className="text-base font-semibold pl-6">{selectedUser.firstName} {selectedUser.lastName}</p>
          </div>
        )}
      </div>
    );
  }

  const renderOrgSelector = () => {
    if (isLoading) return <div className="p-2 text-gray-400">Chargement des organisations...</div>;
    if (!selectedUser) return null;

    const orgs = organizations;

    if (orgs.length === 0 && !isLoading) {
        return <div className="mt-2 p-2 text-sm text-gray-400 bg-gray-700/50 rounded-md">Aucune organisation trouvée pour cet utilisateur.</div>;
    }
    
    return (
      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-300 mb-1">Sélectionner une organisation :</label>
        <select
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          value={selectedOrg?.id || ''}
          onChange={(e) => {
              const org = orgs.find(o => o.id === e.target.value);
              setSelectedOrg(org || null);
          }}
        >
          <option value="" disabled>Choisir une organisation...</option>
          {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </div>
    );
  };

  const renderUserSelector = () => {
    if (isLoading) return <div className="p-2 text-gray-400">Chargement des utilisateurs...</div>;
    if (!selectedOrg) return null;

    const orgUsers = users;

    if (orgUsers.length === 0 && !isLoading) {
        return <div className="mt-2 p-2 text-sm text-gray-400 bg-gray-700/50 rounded-md">Aucun utilisateur trouvé pour cette organisation.</div>;
    }

    return (
      <div className="mt-2">
        <label className="block text-sm font-medium text-gray-300 mb-1">Sélectionner un utilisateur :</label>
        <select
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          value={selectedUser?.id || ''}
          onChange={(e) => {
              const user = orgUsers.find(u => u.id === e.target.value);
              setSelectedUser(user || null);
          }}
        >
          <option value="" disabled>Choisir un utilisateur...</option>
          {orgUsers.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
        </select>
      </div>
    );
  };

  return (
    <div className="relative text-white">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (step !== 'search') {
            resetState();
            setQuery(e.target.value);
          }
        }}
        onFocus={() => {
          if (step !== 'search') {
            resetState();
          }
        }}
        placeholder="Usurper (nom, email, entreprise...)"
        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {query.length > 0 && step === 'search' && renderInitialSearch()}
      
      {step !== 'search' && (
        <div className="absolute z-10 w-full mt-1 p-4 bg-gray-800 border border-gray-600 rounded-md shadow-lg">
          <button onClick={resetState} className="absolute top-2 right-2 text-gray-400 hover:text-white">&times;</button>
          {renderSelectionSummary()}
          {step === 'select_org' && renderOrgSelector()}
          {step === 'select_user' && renderUserSelector()}

          {selectedUser && selectedOrg && (
            <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
              <button 
                onClick={handleImpersonate}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-500"
                disabled={!selectedUser || !selectedOrg || isLoading}
              >
                Usurper l'identité
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImpersonationSearch;
