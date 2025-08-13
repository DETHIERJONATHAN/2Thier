import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { toast } from 'react-toastify';

const OrganizationSettings = () => {
  const { currentOrganization, user, refetchUser } = useAuth();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userRole = user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name);
    }
  }, [currentOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!currentOrganization) {
        toast.error("Impossible de trouver les informations de l'organisation.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Le nom de l'organisation a été mis à jour.");
        // Rafraîchir les données utilisateur pour refléter le changement
        if (refetchUser) {
            await refetchUser();
        }
      } else {
        throw new Error(data.message || "Une erreur est survenue.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour de l'organisation.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentOrganization) {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Paramètres de l'organisation</h2>
            <p>Chargement des informations de l'organisation ou aucune organisation associée.</p>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paramètres de l'organisation</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
            Nom de l'organisation
          </label>
          <input
            type="text"
            id="orgName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
            disabled={!isAdmin}
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading || name === currentOrganization.name || !isAdmin}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationSettings;
