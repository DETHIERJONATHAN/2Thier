import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { FaBuilding, FaUser, FaExchangeAlt } from 'react-icons/fa';
import { AuthOrganization } from '../auth/organization';
import { AuthUser } from '../auth/user';

interface OrganizationSelectorProps {
  onImpersonateClick?: (user: AuthUser, org: AuthOrganization) => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onImpersonateClick }) => {
  const { 
    organizations, 
    currentOrganization, 
    selectOrganization, 
    isSuperAdmin, 
    user,
    isImpersonating,
    originalUser,
    clearImpersonation
  } = useAuth();
  
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [usersInOrg, setUsersInOrg] = useState<AuthUser[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  
  // Effet pour charger les utilisateurs d'une organisation
  useEffect(() => {
    const loadUsersForOrg = async (orgId: string) => {
      try {
        // Récupérer les vrais utilisateurs depuis l'API
        const response = await fetch(`/api/users?organizationId=${orgId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': orgId
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const users = data.success ? data.data : data;
          
          // Filtrer pour ne garder que les utilisateurs actifs
          const activeUsers = users.filter((user: { status: string }) => 
            user.status === 'active' || user.status === 'ACTIVE'
          ).map((user: { id: string; firstName?: string; lastName?: string; email: string; role?: string }) => ({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            role: user.role || 'user'
          }));
          
          setUsersInOrg(activeUsers);
        } else {
          console.error('Erreur lors du chargement des utilisateurs:', response.statusText);
          setUsersInOrg([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        setUsersInOrg([]);
      }
    };
    
    if (selectedOrgId) {
      loadUsersForOrg(selectedOrgId);
    }
  }, [selectedOrgId]);
  
  const handleOrgChange = async (orgId: string) => {
    try {
      await selectOrganization(orgId);
      setShowOrgDropdown(false);
    } catch (error) {
      console.error('Erreur lors du changement d\'organisation:', error);
    }
  };
  
  const handleViewAsUser = (user: AuthUser, org: AuthOrganization) => {
    if (onImpersonateClick) {
      onImpersonateClick(user, org);
    }
    setShowUserList(false);
    setShowOrgDropdown(false);
  };
  
  const handleShowUsers = (orgId: string) => {
    setSelectedOrgId(orgId);
    setShowUserList(true);
  };
  
  const handleClearImpersonation = () => {
    clearImpersonation();
  };

  if (!isSuperAdmin) return null;
  
  return (
    <div className="relative mr-4">
      {/* Mode usurpation actif */}
      {isImpersonating && originalUser && (
        <div className="flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-md">
          <FaExchangeAlt className="mr-2" />
          <span className="text-sm mr-2">
            Vue: {user?.firstName} {user?.lastName} 
            ({currentOrganization?.name})
          </span>
          <button 
            onClick={handleClearImpersonation}
            className="text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded"
          >
            Quitter
          </button>
        </div>
      )}
      
      {/* Sélecteur standard (visible quand pas en mode usurpation) */}
      {!isImpersonating && (
        <>
          <button
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FaBuilding className="mr-2" />
            {currentOrganization ? currentOrganization.name : 'Toutes les organisations'}
            <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {showOrgDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded-md z-50">
              <div className="p-2">
                <div className="text-sm font-medium text-gray-900 p-2 border-b">
                  Sélectionner une organisation
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleOrgChange('all')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>Toutes les organisations</span>
                    {currentOrganization?.id === 'all' && (
                      <svg className="h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  {organizations.map(org => (
                    <div
                      key={org.id}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 border-t"
                    >
                      <button
                        onClick={() => handleOrgChange(org.id)}
                        className="flex-grow text-left flex items-center"
                      >
                        <span>{org.name}</span>
                        {currentOrganization?.id === org.id && (
                          <svg className="h-4 w-4 text-blue-600 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleShowUsers(org.id)}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-xs bg-blue-100 px-2 py-1 rounded"
                        title="Voir en tant que..."
                      >
                        <FaUser className="inline mr-1" />
                        Usurper
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {showUserList && (
            <div className="absolute right-0 mt-2 w-72 bg-white shadow-lg rounded-md z-50">
              <div className="p-2">
                <div className="flex justify-between text-sm font-medium text-gray-900 p-2 border-b">
                  <span>Utilisateurs de l'organisation</span>
                  <button 
                    onClick={() => setShowUserList(false)} 
                    className="text-gray-500 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {usersInOrg.length > 0 ? (
                    usersInOrg.map(user => {
                      const org = organizations.find(o => o.id === selectedOrgId);
                      if (!org) return null;
                      
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleViewAsUser(user, org)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center border-b"
                        >
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-sm text-gray-500">Aucun utilisateur trouvé</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrganizationSelector;
