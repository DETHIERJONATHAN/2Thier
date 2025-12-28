import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { Link } from 'react-router-dom';
import { GoogleAutoConnectionStatus } from '../components/GoogleAutoConnectionStatus';
import { GoogleConnectionCard } from '../components/GoogleConnectionCard';

const OrganizationDetails = () => {
    const { currentOrganization, can, isSuperAdmin, organizations, selectOrganization } = useAuth();
    const [changingOrg, setChangingOrg] = useState(false);

    const handleOrgChange = async (orgId: string) => {
        setChangingOrg(true);
        try {
            await selectOrganization(orgId);
        } catch (error) {
            console.error('Erreur lors du changement d\'organisation:', error);
        } finally {
            setChangingOrg(false);
        }
    };

    if (!currentOrganization) return <div>Chargement des informations de l'organisation...</div>;

    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Mon Organisation</h2>
            <p><strong>Nom :</strong> {currentOrganization.name}</p>
            <p><strong>Statut :</strong> {currentOrganization.status || 'Indéfini'}</p>
            
            {/* Sélecteur d'organisation pour Super Admin */}
            {isSuperAdmin && organizations && organizations.length > 1 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Changer d'organisation</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        En tant que Super Admin, vous pouvez basculer entre vos organisations.
                    </p>
                    <div className="space-y-2">
                        {organizations.map(org => (
                            <button
                                key={org.id}
                                onClick={() => handleOrgChange(org.id)}
                                disabled={changingOrg || currentOrganization.id === org.id}
                                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                    currentOrganization.id === org.id
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                                        : 'bg-white border-gray-300 hover:bg-gray-50'
                                } ${changingOrg ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{org.name}</span>
                                    {currentOrganization.id === org.id && (
                                        <svg className="h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="mt-4">
                {can('organization:read') && (
                    <Link to="/settings/organization" className="text-indigo-600 hover:text-indigo-800">
                        Gérer l'organisation
                    </Link>
                )}
            </div>
        </div>
    );
};

const GoogleIntegration = () => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-6">Intégration Google Workspace</h2>
            
            {/* Statut de connexion automatique */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Connexion automatique</h3>
                <GoogleAutoConnectionStatus 
                    showManualActions={true}
                />
            </div>

            {/* Détails de connexion Google */}
            <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Détails de connexion</h3>
                <GoogleConnectionCard />
            </div>
        </div>
    );
};

const RoleAndPermissions = () => {
    const { user, isSuperAdmin, currentOrganization, can } = useAuth();
    const [roleDetails, setRoleDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSuperAdmin) {
            setLoading(false);
            return;
        }

        if (currentOrganization && currentOrganization.role) {
            setRoleDetails(currentOrganization.role);
            setLoading(false);
        } else {
            console.error("Role details not found in currentOrganization context.");
            setLoading(false);
        }
    }, [isSuperAdmin, currentOrganization]);

    if (loading) return <div>Chargement du rôle et des permissions...</div>;
    if (!user) return <div>Utilisateur non chargé.</div>;

    if (isSuperAdmin) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Mon Rôle : Super Administrateur</h2>
                <p className="mb-6 text-gray-600">Vous disposez de toutes les permissions sur l'ensemble de la plateforme.</p>
                <div className="mt-6">
                    <Link to="/admin/roles" className="text-indigo-600 hover:text-indigo-800">
                        Gérer les rôles globaux
                    </Link>
                </div>
            </div>
        );
    }

    if (!roleDetails) return <div>Impossible de charger les informations du rôle ou aucun rôle n'est assigné dans cette organisation.</div>;

    return (
        <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Mon Rôle : {roleDetails.label || roleDetails.name}</h2>
            <p className="mb-6 text-gray-600">{roleDetails.description}</p>

            <h3 className="text-lg font-bold mb-4">Permissions associées :</h3>
            <p>Informations de permissions disponibles prochainement.</p>
            <div className="mt-6">
                {can('role:read') && (
                    <Link to="/settings/roles" className="text-indigo-600 hover:text-indigo-800">
                        Gérer les rôles de l'organisation
                    </Link>
                )}
            </div>
        </div>
    );
};


const ProfilePage = () => {
  const { user, loading: userLoading, refetchUser } = useAuth();
  const { api } = useAuthenticatedApi();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    address: '',
    vatNumber: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('profile');


  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get('/api/profile').then((response: any) => {
        console.log("Données de profil reçues:", response);
        setProfile(response);
        setLoading(false);
      }).catch((err: any) => {
        console.error("Erreur lors de la récupération du profil:", err);
        setError('Impossible de charger les informations du profil.');
        setLoading(false);
      });
    }
  }, [user, api]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const response = await api.post('/api/profile/avatar', formData);
      setProfile(prev => ({ ...prev, avatarUrl: response.avatarUrl }));
      setAvatarFile(null); // Reset avatar file
    } catch (err) {
      console.error("Erreur lors du téléversement de l'avatar:", err);
      throw new Error("Erreur lors du téléversement de l'avatar.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (avatarFile) {
        await handleAvatarUpload();
      }

      const updatedProfile = await api.put('/api/profile', profile);
      setProfile(updatedProfile);
      setSuccess('Profil mis à jour avec succès !');

      if(refetchUser) {
        refetchUser();
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour du profil:", err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la mise à jour.';
      setError(errorMessage);
    }
  };

  if (userLoading || loading) {
    return <div className="p-4">Chargement du profil...</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
        case 'profile':
            return (
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
                    {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{success}</div>}
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
                    
                    <div className="flex items-center space-x-6 mb-6">
                        <img src={profile.avatarUrl || 'https://placehold.co/100x100'} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                        <input type="file" onChange={handleAvatarChange} ref={fileInputRef} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Changer l'avatar</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Prénom</label>
                            <input type="text" name="firstName" id="firstName" value={profile.firstName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nom</label>
                            <input type="text" name="lastName" id="lastName" value={profile.lastName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse</label>
                            <input type="text" name="address" id="address" value={profile.address || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">Numéro de TVA</label>
                            <input type="text" name="vatNumber" id="vatNumber" value={profile.vatNumber || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Téléphone</label>
                            <input type="text" name="phoneNumber" id="phoneNumber" value={profile.phoneNumber || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Enregistrer les modifications
                        </button>
                    </div>
                </form>
            );
        case 'organization':
            return <OrganizationDetails />;
        case 'permissions':
            return <RoleAndPermissions />;
        case 'google':
            return <GoogleIntegration />;
        default:
            return null;
    }
};

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Mon Compte</h1>
      
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('profile')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
            Profil
          </button>
          <button onClick={() => setActiveTab('organization')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'organization' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
            Organisation
          </button>
          <button onClick={() => setActiveTab('permissions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'permissions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
            Rôle & Permissions
          </button>
          <button onClick={() => setActiveTab('google')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'google' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
            Google Workspace
          </button>
        </nav>
      </div>

      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default ProfilePage;
