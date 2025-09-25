import { useState } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { NotificationManager } from './Notifications';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: () => void;
}

export default function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);  const { api } = useAuthenticatedApi();

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
      console.log('Envoi des données au serveur:', {
        status: status,
        data: leadData,
      });
      
      // Utiliser l'API authentifiée pour envoyer au serveur principal
      console.log('[FRONTEND] Tentative d\'envoi du lead avec:', {
        status: status,
        data: leadData,
      });
      
      try {
        const response = await api.post('/api/leads', {
          status: status,
          data: leadData,
        });
        
        console.log('[FRONTEND] Réponse API après création du lead:', response);
      } catch (apiError: any) {
        console.error('[FRONTEND] Erreur API détaillée:', apiError);
        throw new Error(apiError.message || "Erreur lors de l'ajout du lead");
      }
      NotificationManager.success("Lead ajouté avec succès !");
      onLeadAdded();
      onClose();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du lead:', error);
      NotificationManager.error(error.message || "Erreur lors de l'ajout du lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Ajouter un nouveau Lead</h2>
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
            <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300">
              {isSubmitting ? 'Ajout en cours...' : 'Ajouter le Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
