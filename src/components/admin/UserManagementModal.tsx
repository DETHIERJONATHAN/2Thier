import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../Notifications';
import { AuthUser } from '../../auth/user';
import UserServicesModal from './UserServicesModal';

// 🛡️ SCHÉMAS ZOD ULTRA-STRICTS
// (Schemas retirés car non utilisés directement – réintroduire si validation côté client nécessaire)

// L'interface `User` est remplacée par `AuthUser` pour la cohérence.
// Les types Role et Organization sont conservés pour la gestion interne du modal.
interface Role {
  id: string;
  name: string;
  label: string;
  organizationId?: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface UserManagementModalProps {
  user: AuthUser | null;
  onClose: () => void;
  onUpdate: (updatedUser: AuthUser) => void; // Modifié pour passer l'utilisateur mis à jour
  isSuperAdmin: boolean;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ user, onClose, onUpdate, isSuperAdmin }) => {
  const { api } = useAuthenticatedApi();
  
  // 🎯 TOUS LES HOOKS AVANT LES CONDITIONS
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  // (ancien état editingUserOrg retiré comme non utilisé)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  // ⚠️ On ne fait pas de early return avant l'initialisation des autres hooks—
  const noUser = !user;

  // On utilise directement la nouvelle structure de l'API
  const userOrgs = user.UserOrganization || [];

  // State pour les informations du profil
  const [profileData, setProfileData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phoneNumber: (user as unknown as { phoneNumber?: string })?.phoneNumber || '',
    address: (user as unknown as { address?: string })?.address || '',
    vatNumber: (user as unknown as { vatNumber?: string })?.vatNumber || '',
  });

  // Inline role editing (déjà déclarés plus haut, on conserve ceux existants)
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('');

  // Handler pour la mise à jour des champs du profil
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  // Handler pour sauvegarder le profil
  const handleProfileSave = async () => {
    setLoadingAction('save-profile');
    try {
      const response = await api.patch(`/users/${user.id}`, profileData);
      if (response.success && response.data) {
        NotificationManager.success("Profil mis à jour avec succès.");
        onUpdate(response.data); // Passe l'utilisateur mis à jour à la page parente
        onClose(); // Ferme le modal après la sauvegarde
      } else {
        NotificationManager.error(response.message || "Erreur lors de la mise à jour du profil.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil.';
      NotificationManager.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEditRoleClick = (membershipId: string, currentRoleId: string) => {
    setEditingMembershipId(membershipId);
    setSelectedRoleForEdit(currentRoleId);
  };

  const handleCancelEdit = () => {
    setEditingMembershipId(null);
    setSelectedRoleForEdit('');
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const rolesResponse = await api.get('/api/roles?flat=true');
        if (rolesResponse.success) {
          setAllRoles(rolesResponse.data);
        } else {
          NotificationManager.error('Erreur lors du chargement des rôles.');
        }
        if (isSuperAdmin) {
          const orgsResponse = await api.get('/api/organizations/active');
          if (orgsResponse.success) {
            setAllOrganizations(orgsResponse.data);
          } else {
            NotificationManager.error('Erreur lors du chargement des organisations.');
          }
        }
  } catch {
        NotificationManager.error('Erreur lors du chargement des données initiales.');
      }
    };
    fetchInitialData();
  }, [isSuperAdmin, api]);

  const handleRemoveFromOrg = async (userOrganizationId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir retirer cet utilisateur de l'organisation ?")) {
      setLoadingAction(`remove-${userOrganizationId}`);
      try {
        const response = await api.delete(`/users/user-organizations/${userOrganizationId}`);
        if (response.success) {
            NotificationManager.success("Utilisateur retiré de l'organisation.");
            onUpdate(response.data); // Assumant que l'API renvoie l'utilisateur mis à jour
        } else {
            NotificationManager.error(response.message || "Erreur lors du retrait de l'utilisateur.");
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erreur lors du retrait de l'utilisateur.";
        NotificationManager.error(msg);
      } finally {
        setLoadingAction(null);
      }
    }
  };

  const handleRoleChange = async (userOrganizationId: string, newRoleId: string) => {
    if (!newRoleId) return;
    setLoadingAction(`role-${userOrganizationId}`);
    try {
        const response = await api.patch(`/users/user-organizations/${userOrganizationId}`, { roleId: newRoleId });
        if (response.success && response.data) {
            NotificationManager.success("Rôle mis à jour avec succès.");
            onUpdate(response.data); // Passe les données mises à jour
            handleCancelEdit(); // Close editing UI
        } else {
            NotificationManager.error(response.message || "Erreur lors de la mise à jour du rôle.");
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : "Erreur lors de la mise à jour du rôle.";
        NotificationManager.error(msg);
    } finally {
        setLoadingAction(null);
    }
  };

  const handleAssignToOrg = async () => {
    if (!selectedOrgId || !selectedRoleId) {
      NotificationManager.warning("Veuillez sélectionner une organisation et un rôle.");
      return;
    }
    setLoadingAction('assign');
    try {
      const response = await api.post(`/users/user-organizations`, { userId: user.id, organizationId: selectedOrgId, roleId: selectedRoleId });
      if (response.success && response.data) {
        NotificationManager.success("Utilisateur assigné à l'organisation.");
        setSelectedOrgId('');
        setSelectedRoleId('');
        onUpdate(response.data);
      } else {
        NotificationManager.error(response.message || "Erreur lors de l'assignation.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de l'assignation.";
      NotificationManager.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };
  
  const availableRolesForSelectedOrg = allRoles.filter(r => !r.organizationId || r.organizationId === selectedOrgId);
  
  const assignableOrganizations = allOrganizations.filter(org => 
    !userOrgs.some(userOrg => userOrg && userOrg.Organization.id === org.id)
  );

  if (noUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl relative animate-fade-in-down">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h2 className="text-2xl font-bold">
            Gérer : <span className="text-blue-600 font-semibold">{user.email}</span>
          </h2>
          {isSuperAdmin && (
            <button
              onClick={() => setIsServicesModalOpen(true)}
              className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
            >
              Gérer les services externes
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Section d'informations du profil */}
          <div>
            <h4 className="font-semibold text-gray-700 text-lg mb-3">Informations du Profil</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">Prénom</label>
                <input type="text" name="firstName" value={profileData.firstName} onChange={handleProfileChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Nom</label>
                <input type="text" name="lastName" value={profileData.lastName} onChange={handleProfileChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Téléphone</label>
                <input type="text" name="phoneNumber" value={profileData.phoneNumber} onChange={handleProfileChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">N° TVA</label>
                <input type="text" name="vatNumber" value={profileData.vatNumber} onChange={handleProfileChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600">Adresse</label>
                <textarea name="address" value={profileData.address} onChange={handleProfileChange} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"></textarea>
              </div>
            </div>
            <div className="text-right mt-4">
                <button 
                    onClick={handleProfileSave}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors"
                    disabled={loadingAction === 'save-profile'}
                >
                    {loadingAction === 'save-profile' ? 'Sauvegarde...' : 'Sauvegarder le profil'}
                </button>
            </div>
          </div>

          <div className='border-t pt-6'>
            <h4 className="font-semibold text-gray-700 text-lg mb-3">Adhésions et Rôles</h4>
            <ul className="space-y-3">
              {userOrgs.length > 0 ? (
                userOrgs.filter(mem => mem && mem.id).map(membership => (
                    <li key={membership.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-lg border">
                        <div className="mb-2 sm:mb-0 flex-grow">
                            <span className="font-bold text-gray-800">{membership.Organization.name}</span>
                            {editingMembershipId !== membership.id && (
                                <span className="text-gray-500 ml-2">({membership.Role.label})</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {editingMembershipId === membership.id ? (
                                <>
                                    <select
                                        value={selectedRoleForEdit}
                                        onChange={(e) => setSelectedRoleForEdit(e.target.value)}
                                        className="border p-2 rounded-md bg-white shadow-sm w-full flex-grow"
                                        disabled={loadingAction === `role-${membership.id}`}
                                    >
                                        {allRoles
                                            .filter(r => !r.organizationId || r.organizationId === membership.Organization.id)
                                            .map(role => (
                                                <option key={role.id} value={role.id}>
                                                    {role.label} {role.organizationId ? '' : '(Global)'}
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <button
                                        onClick={() => handleRoleChange(membership.id, selectedRoleForEdit)}
                                        className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-400"
                                        disabled={loadingAction === `role-${membership.id}`}
                                    >
                                        {loadingAction === `role-${membership.id}` ? '...' : 'Sauver'}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="bg-gray-300 text-black px-3 py-2 rounded text-sm hover:bg-gray-400"
                                    >
                                        Annuler
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleEditRoleClick(membership.id, membership.Role.id)}
                                        className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300"
                                    >
                                        Modifier le rôle
                                    </button>
                                    {isSuperAdmin && (
                                        <button
                                            onClick={() => handleRemoveFromOrg(membership.id)}
                                            className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 disabled:bg-red-300 transition-colors"
                                            disabled={loadingAction === `remove-${membership.id}`}
                                        >
                                            {loadingAction === `remove-${membership.id}` ? '...' : 'Dissocier'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </li>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic mt-2">Cet utilisateur n'est membre d'aucune organisation.</p>
              )}
            </ul>
          </div>

          {isSuperAdmin && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Assigner à une nouvelle organisation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <select 
                  value={selectedOrgId} 
                  onChange={e => setSelectedOrgId(e.target.value)}
                  className="col-span-1 border p-2 rounded-md bg-white shadow-sm"
                >
                  <option value="">Choisir une organisation</option>
                  {assignableOrganizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
                <select 
                  value={selectedRoleId} 
                  onChange={e => setSelectedRoleId(e.target.value)}
                  className="col-span-1 border p-2 rounded-md bg-white shadow-sm"
                  disabled={!selectedOrgId}
                >
                  <option value="">Choisir un rôle</option>
                  {availableRolesForSelectedOrg.map(role => <option key={role.id} value={role.id}>{role.label} {role.organizationId ? '' : '(Global)'}</option>)}
                </select>
                <button 
                  onClick={handleAssignToOrg}
                  className="col-span-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                  disabled={loadingAction === 'assign' || !selectedOrgId || !selectedRoleId}
                >
                  {loadingAction === 'assign' ? 'Assignation...' : 'Assigner'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal pour gérer les services externes */}
        {isServicesModalOpen && (
          <UserServicesModal
            user={user}
            onClose={() => setIsServicesModalOpen(false)}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default UserManagementModal;
