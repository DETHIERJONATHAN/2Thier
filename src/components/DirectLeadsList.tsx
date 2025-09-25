import React, { useState, useEffect } from 'react';
import { NotificationManager } from './Notifications';
import DirectAddLeadModal from './DirectAddLeadModal';

interface Lead {
  id: string;
  status: string;
  data: any;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface DirectLeadsListProps {
  organizationId: string;
}

export default function DirectLeadsList({ organizationId }: DirectLeadsListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fonction pour récupérer les leads via notre route directe
  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      // Utiliser notre méthode directe pour récupérer les leads
      // Noter que cette fonctionnalité n'est pas encore implémentée côté serveur
      // Il faudra créer une nouvelle route API pour cela
      const response = await fetch(`http://localhost:4000/api/direct/get-leads-direct?organizationId=${organizationId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Leads récupérés avec succès via route directe:', data);
      setLeads(data);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des leads:', err);
      setError(err.message || 'Erreur lors de la récupération des leads');
      // En cas d'erreur, utiliser des données vides
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [organizationId]);

  const handleLeadAdded = () => {
    // Rafraîchir la liste après l'ajout d'un lead
    fetchLeads();
  };

  const statusLabels: { [key: string]: string } = {
    new: 'Nouveau',
    contacted: 'Contacté',
    meeting_scheduled: 'RDV Programmé',
    quote_sent: 'Devis Envoyé',
    negotiation: 'En Négociation',
    won: 'Gagné',
    lost: 'Perdu'
  };

  const statusColors: { [key: string]: string } = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-purple-100 text-purple-800',
    meeting_scheduled: 'bg-amber-100 text-amber-800',
    quote_sent: 'bg-indigo-100 text-indigo-800',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800'
  };

  // Pour l'instant, simuler les données jusqu'à ce que la route API soit mise en place
  useEffect(() => {
    // Temporaire: Si on n'a pas encore d'endpoint direct pour lister les leads
    if (error && error.includes('404')) {
      console.log('Utilisation des données simulées pour la démonstration');
      setLeads([
        {
          id: 'direct-lead-1',
          status: 'new',
          data: {
            name: 'Exemple Direct Lead',
            email: 'exemple@direct-lead.com',
            phone: '0123456789',
            company: 'Société Exemple',
            source: 'manual'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);
      setError(null);
    }
  }, [error]);

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Liste des Leads (Mode Direct)</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Ajouter un Lead
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <svg className="animate-spin h-5 w-5 mr-3 inline-block text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Chargement...
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-600">
          <p>{error}</p>
          <p className="mt-2">Utilisez le bouton "Ajouter un Lead" pour tester la création directe de leads.</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun lead trouvé.</p>
          <p className="mt-2">Utilisez le bouton "Ajouter un Lead" pour créer votre premier lead.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email / Téléphone
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigné à
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lead.data?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lead.data?.email || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{lead.data?.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lead.data?.company || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.assignedTo ? (
                      <span>{lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
                    ) : (
                      <span className="text-gray-400">Non assigné</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal pour ajouter un lead directement */}
      <DirectAddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadAdded={handleLeadAdded}
        organizationId={organizationId}
      />
    </div>
  );
}
