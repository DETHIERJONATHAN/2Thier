import React, { useState, useEffect, useContext } from 'react';
import { OrganizationContext } from '../../context/OrganizationContext';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { UserContext } from '../../context/UserContext';
import { toast } from 'react-toastify';

// Cette interface correspond à la structure de la réponse de l'API pour un utilisateur
interface UserFromApi {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  organizations: {
    id: string;
    name: string;
    role: { id: string; name: string; label: string } | null;
  }[];
  invitationId?: string | null;
  invitationStatus?: string | null;
}

const UserImpersonationSwitcher = () => {
  const orgContext = useContext(OrganizationContext);
  const userContext = useContext(UserContext);

  const [users, setUsers] = useState<UserFromApi[]>([]);
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();

  const selectedOrganization = orgContext?.selectedOrganization;
  const orgIsLoading = orgContext?.loading;
  const setImpersonatedUser = userContext?.setImpersonatedUser;
  const currentUser = userContext?.user;

  useEffect(() => {
    // On vide systématiquement les utilisateurs et l'impersonation
    // dès que l'organisation change ou que son contexte charge.
    setUsers([]);
    if (setImpersonatedUser) {
        setImpersonatedUser(null);
    }

    // Si le contexte de l'organisation est en train de charger, on s'arrête là.
    // L'effet sera ré-exécuté une fois le chargement terminé.
    if (orgIsLoading) {
      return;
    }

    // Ne charge les utilisateurs que si une organisation spécifique est sélectionnée
    // et que le contexte n'est plus en chargement.
    if (selectedOrganization && selectedOrganization.id !== 'all' && currentUser) {
      api.get(`/users?organizationId=${selectedOrganization.id}`)
        .then(response => {
          if (response && response.success) {
            const usersFromApi: UserFromApi[] = Array.isArray(response.data) ? response.data : [];
            // On ne peut impersonner que des utilisateurs actifs et qui ne sont pas l'utilisateur courant
            const filteredUsers = usersFromApi.filter(
              (user: UserFromApi) => user.status === 'active' && user.id !== currentUser.id
            );
            setUsers(filteredUsers);
          } else {
            toast.error(response?.message || 'Échec de la récupération des utilisateurs.');
            setUsers([]);
          }
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des utilisateurs pour l\'impersonation:', error);
          toast.error('Échec de la récupération des utilisateurs.');
          setUsers([]);
        });
    }
  }, [selectedOrganization, orgIsLoading, api, setImpersonatedUser, currentUser]);

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!userContext || !setImpersonatedUser || !selectedOrganization) return;

    const userId = event.target.value;
    if (userId) {
      const userFromList = users.find(u => u.id === userId);
      if (userFromList) {
        const roleInOrg = userFromList.organizations.find(
          (org) => org.id === selectedOrganization.id
        )?.role;

        if (roleInOrg?.name) {
            const userToImpersonate = {
                id: userFromList.id,
                email: userFromList.email,
                firstName: userFromList.firstName || '',
                lastName: userFromList.lastName || '',
                role: roleInOrg.name,
                status: userFromList.status,
            };
            setImpersonatedUser(userToImpersonate);
            toast.success(`Vous impersonnez maintenant ${userFromList.firstName} ${userFromList.lastName}`);
        } else {
            toast.error(`Impossible d'impersonner: rôle de l'utilisateur introuvable.`);
            setImpersonatedUser(null);
        }
      }
    } else {
      if (userContext.impersonatedUser) {
        setImpersonatedUser(null);
        toast.info("Vous n'impersonnez plus d'utilisateur.");
      }
    }
  };

  const stopImpersonating = () => {
    if (setImpersonatedUser) {
      setImpersonatedUser(null);
      toast.info("Vous n'impersonnez plus d'utilisateur.");
    }
  };

  // Ne pas afficher le sélecteur si aucune organisation spécifique n'est choisie ou s'il n'y a personne à impersonner
  if (!selectedOrganization || selectedOrganization.id === 'all' || users.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <div>
        <label htmlFor="user-impersonation-select" className="block text-sm font-medium text-gray-700 mb-1">
          Impersonner un utilisateur
        </label>
        <select
          id="user-impersonation-select"
          value={userContext?.impersonatedUser?.id || ''}
          onChange={handleUserChange}
          disabled={apiIsLoading || orgIsLoading}
          className="w-full border rounded px-2 py-1 text-sm bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">-- Super Admin (vous) --</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.email})
            </option>
          ))}
        </select>
      </div>
      {userContext?.impersonatedUser && (
        <button 
          onClick={stopImpersonating}
          className="w-full text-left text-sm text-red-600 hover:text-red-800 mt-2"
        >
          Arrêter l'impersonation
        </button>
      )}
    </div>
  );
};

export default UserImpersonationSwitcher;
