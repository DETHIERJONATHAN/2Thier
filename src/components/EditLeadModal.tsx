import { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { NotificationManager } from './Notifications';
import { Lead } from '../types/leads';
import { useLeadStatuses } from '../hooks/useLeadStatuses';

interface EditLeadModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onLeadUpdated: () => void;
}

export default function EditLeadModal({ isOpen, lead, onClose, onLeadUpdated }: EditLeadModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { api } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();
  
  // État initial du formulaire
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
    source: '',
    status: ''
  });

  // Mettre à jour le formulaire quand un lead est sélectionné
  useEffect(() => {
    if (lead && lead.data) {
      setFormData({
        name: lead.data.name || '',
        email: lead.data.email || '',
        phone: lead.data.phone || '',
        company: lead.data.company || '',
        notes: lead.data.notes || '',
        source: lead.source || 'manual',
        status: lead.status || 'new'
      });
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // Construire l'objet de mise à jour
      const updateData = {
        status: formData.status,
        data: {
          name: formData.name,
          email: formData.email, 
          phone: formData.phone,
          company: formData.company,
          notes: formData.notes
        },
        source: formData.source
      };

      // Appel API pour mettre à jour
      const response = await api.put(`/api/leads/${lead.id}`, updateData);
      
      if (response.success) {
        NotificationManager.success('Lead mis à jour avec succès !');
        onLeadUpdated();
        onClose();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du lead:', error);
      NotificationManager.error(error.message || 'Erreur lors de la mise à jour du lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Modifier le Lead</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="leadName" className="block text-sm font-medium text-gray-700">Nom du Lead*</label>
            <input 
              type="text" 
              id="leadName" 
              name="name" 
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              required 
            />
          </div>
          <div className="mb-4">
            <label htmlFor="leadCompany" className="block text-sm font-medium text-gray-700">Entreprise</label>
            <input 
              type="text" 
              id="leadCompany" 
              name="company" 
              value={formData.company}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="leadEmail" className="block text-sm font-medium text-gray-700">Email</label>
              <input 
                type="email" 
                id="leadEmail" 
                name="email" 
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
            <div className="mb-4">
              <label htmlFor="leadPhone" className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input 
                type="tel" 
                id="leadPhone" 
                name="phone" 
                value={formData.phone}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="leadStatus" className="block text-sm font-medium text-gray-700">Statut*</label>
              <select 
                id="leadStatus" 
                name="status" 
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {leadStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700">Source</label>
              <select 
                id="leadSource" 
                name="source" 
                value={formData.source}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
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
            <textarea 
              id="leadNotes" 
              name="notes" 
              value={formData.notes}
              onChange={handleInputChange}
              rows={3} 
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
            />
          </div>
          <div className="flex items-center justify-end mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
