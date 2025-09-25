import React, { useState } from 'react';
import { NotificationManager } from './Notifications';

interface DirectAddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
  organizationId: string;
}

// Ce composant va créer un lead directement dans la base de données
// sans passer par l'API, pour contourner l'erreur 500
export default function DirectAddLeadModal({ isOpen, onClose, onLeadAdded, organizationId }: DirectAddLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const leadData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      company: formData.get('company') as string,
      notes: formData.get('notes') as string,
      source: formData.get('source') as string || 'manual',
    };
    const status = formData.get('status') as string;

    try {
      console.log('Envoi des données au serveur via route directe:', {
        status: status,
        data: leadData,
        organizationId
      });

      // Effectuer une requête à notre nouvelle route API directe avec URL absolue
      console.log('Envoi vers URL absolue http://localhost:4000/api/direct/add-lead-direct');
      const response = await fetch('http://localhost:4000/api/direct/add-lead-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: status,
          data: leadData,
          organizationId: organizationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      console.log('Lead créé avec succès via la route directe:', data);
      NotificationManager.success("Lead ajouté avec succès !");
      onLeadAdded();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du lead direct:', error);
      NotificationManager.error(error.message || "Erreur lors de l'ajout du lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Ajouter un nouveau Lead (Mode Direct)</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="leadName" className="block text-sm font-medium text-gray-700">Nom du Lead*</label>
            <input type="text" id="leadName" name="name" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <div className="mb-4">
            <label htmlFor="leadCompany" className="block text-sm font-medium text-gray-700">Entreprise</label>
            <input type="text" id="leadCompany" name="company" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="leadEmail" className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" id="leadEmail" name="email" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div className="mb-4">
              <label htmlFor="leadPhone" className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input type="tel" id="leadPhone" name="phone" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="leadStatus" className="block text-sm font-medium text-gray-700">Statut*</label>
              <select id="leadStatus" name="status" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" defaultValue="new">
                <option value="new">Nouveau</option>
                <option value="contacted">Contacté</option>
                <option value="meeting_scheduled">RDV Programmé</option>
                <option value="quote_sent">Devis Envoyé</option>
                <option value="negotiation">En Négociation</option>
                <option value="won">Gagné</option>
                <option value="lost">Perdu</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700">Source</label>
              <select id="leadSource" name="source" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" defaultValue="manual">
                <option value="direct">Direct</option>
                <option value="website">Site Web</option>
                <option value="referral">Recommandation</option>
                <option value="phone">Téléphone</option>
                <option value="email">Email</option>
                <option value="manual">Ajout manuel</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="leadNotes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="leadNotes" name="notes" rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex items-center justify-end mt-6">
            <button type="button" onClick={onClose} className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300">
              {isSubmitting ? 'Ajout en cours...' : 'Ajouter directement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
