import { useEffect, useState, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';
import AdminSwitch from '../../components/admin/AdminSwitch';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface MailSettings {
  id: string;
  login: string;
  host: string;
  port: number;
  isActivated: boolean;
  user: User;
}

const MailAdminPage = () => {
  const [mailSettings, setMailSettings] = useState<MailSettings[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { api, isLoading: apiIsLoading } = useAuthenticatedApi();
  const { currentOrganization: selectedOrganization, isSuperAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<MailSettings | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const fetchMailSettings = useCallback(async () => {
    if (!selectedOrganization) {
      setMailSettings([]);
      setError(null);
      return;
    }

    setError(null);
    try {
      const data = await api.get(`/mail/settings`);
      setMailSettings(data || []);
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors du chargement des paramètres de messagerie.';
      setError(errorMessage);
      NotificationManager.error(errorMessage);
      setMailSettings([]);
    }
  }, [api, selectedOrganization, isSuperAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!selectedOrganization) {
      setUsers([]);
      return;
    }
    try {
      const data = await api.get('/api/users');
      setUsers(data || []);
    } catch (e) {
      NotificationManager.error("Erreur lors du chargement des utilisateurs.");
    }
  }, [api, selectedOrganization]);

  useEffect(() => {
    fetchMailSettings();
    if (selectedOrganization) {
      fetchUsers();
    }
  }, [fetchMailSettings, fetchUsers, selectedOrganization]);

  const toggleActivation = async (settingsId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/mail/settings/${settingsId}/toggle`, { isActivated: !currentStatus });
      NotificationManager.success(`Statut de la messagerie mis à jour.`);
      fetchMailSettings();
    } catch (e: any) {
      const errorMessage = e.message || 'Erreur lors de la modification du statut.';
      NotificationManager.error(errorMessage);
    }
  };

  const handleDelete = async (settingsId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      return;
    }
    try {
      await api.delete(`/mail/settings/${settingsId}`);
      NotificationManager.success('Configuration de messagerie supprimée.');
      fetchMailSettings();
    } catch (e: any) {
      NotificationManager.error(e.message || 'Erreur lors de la suppression.');
    }
  };

  const handleOpenModal = (setting: MailSettings | null = null) => {
    setEditingSetting(setting);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingSetting(null);
    setIsModalOpen(false);
  };

  const handleSave = async (formData: { userId: string, login: string, host: string, port: number }) => {
    const isEditing = !!editingSetting;
    const url = isEditing ? `/api/mail/settings/${editingSetting!.id}` : '/api/mail/settings';
    const method = isEditing ? 'patch' : 'post';
    
    const payload = isEditing 
      ? { login: formData.login, host: formData.host, port: formData.port } 
      : formData;

    try {
      await api[method](url, payload);
      NotificationManager.success(`Configuration ${isEditing ? 'mise à jour' : 'créée'}.`);
      fetchMailSettings();
      handleCloseModal();
    } catch (e: any) {
      NotificationManager.error(e.message || `Erreur lors de la ${isEditing ? 'mise à jour' : 'création'}.`);
    }
  };

  const isLoading = apiIsLoading && !mailSettings.length && !error;

  if (!selectedOrganization && isSuperAdmin) {
    return (
      <div className="p-4 text-center text-gray-500">
        Veuillez sélectionner une organisation pour gérer les paramètres de messagerie.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administration de la Messagerie</h1>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          onClick={() => handleOpenModal()}
        >
          Ajouter une configuration
        </button>
      </div>
      {isLoading ? (
        <p>Chargement...</p>
      ) : error ? (
        <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilisateur</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Login</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hôte</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Port</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mailSettings.length > 0 ? (
                mailSettings.map(setting => (
                  <tr key={setting.id}>
                    <td className="px-5 py-5 bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{`${setting.user.firstName || ''} ${setting.user.lastName || ''}`.trim() || '(Non défini)'}</p>
                      <p className="text-gray-600 whitespace-no-wrap">{setting.user.email}</p>
                    </td>
                    <td className="px-5 py-5 bg-white text-sm">{setting.login}</td>
                    <td className="px-5 py-5 bg-white text-sm">{setting.host}</td>
                    <td className="px-5 py-5 bg-white text-sm text-center">{setting.port}</td>
                    <td className="px-5 py-5 bg-white text-sm text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${setting.isActivated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {setting.isActivated ? 'Activé' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-5 py-5 bg-white text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <AdminSwitch 
                            checked={setting.isActivated}
                            onChange={() => toggleActivation(setting.id, setting.isActivated)}
                        />
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => handleOpenModal(setting)}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(setting.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    {selectedOrganization ? 'Aucun paramètre de messagerie pour cette organisation.' : 'Veuillez sélectionner une organisation.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && (
        <MailSettingsModal
          onClose={handleCloseModal}
          onSave={handleSave}
          setting={editingSetting}
          users={users}
        />
      )}
    </div>
  );
};

interface MailSettingsModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  setting: MailSettings | null;
  users: User[];
}

const MailSettingsModal: React.FC<MailSettingsModalProps> = ({ onClose, onSave, setting, users }) => {
  const [formData, setFormData] = useState({
      userId: setting?.user?.id || '',
      login: setting?.login || '',
      host: setting?.host || '',
      port: setting?.port || 587,
  });
  const [formErrors, setFormErrors] = useState<any>({});

  const validate = () => {
      const errors: any = {};
      if (!formData.userId) errors.userId = "L'utilisateur est requis.";
      if (!formData.login) errors.login = "Le login est requis.";
      if (!formData.host) errors.host = "L'hôte est requis.";
      if (!formData.port) errors.port = "Le port est requis.";
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value, 10) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validate()) {
          onSave(formData);
      }
  };

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">{setting ? 'Modifier' : 'Ajouter'} une configuration</h2>
              <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-4">
                      <label htmlFor="userId" className="block text-sm font-medium text-gray-700">Utilisateur</label>
                      <select
                          id="userId"
                          name="userId"
                          value={formData.userId}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border ${formErrors.userId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                          disabled={!!setting}
                      >
                          <option value="">Sélectionner un utilisateur</option>
                          {users.map(user => (
                              <option key={user.id} value={user.id}>
                                  {`${user.firstName || ''} ${user.lastName || ''} (${user.email})`.trim()}
                              </option>
                          ))}
                      </select>
                      {formErrors.userId && <p className="text-red-500 text-xs mt-1">{formErrors.userId}</p>}
                  </div>

                  <div className="mb-4">
                      <label htmlFor="login" className="block text-sm font-medium text-gray-700">Login (Email)</label>
                      <input
                          type="email"
                          id="login"
                          name="login"
                          value={formData.login}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border ${formErrors.login ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      />
                      {formErrors.login && <p className="text-red-500 text-xs mt-1">{formErrors.login}</p>}
                  </div>

                  <div className="mb-4">
                      <label htmlFor="host" className="block text-sm font-medium text-gray-700">Hôte SMTP</label>
                      <input
                          type="text"
                          id="host"
                          name="host"
                          value={formData.host}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border ${formErrors.host ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      />
                      {formErrors.host && <p className="text-red-500 text-xs mt-1">{formErrors.host}</p>}
                  </div>

                  <div className="mb-4">
                      <label htmlFor="port" className="block text-sm font-medium text-gray-700">Port SMTP</label>
                      <input
                          type="number"
                          id="port"
                          name="port"
                          value={formData.port}
                          onChange={handleChange}
                          className={`mt-1 block w-full px-3 py-2 border ${formErrors.port ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                      />
                      {formErrors.port && <p className="text-red-500 text-xs mt-1">{formErrors.port}</p>}
                  </div>

                  <div className="flex justify-end gap-4 mt-8">
                      <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          Annuler
                      </button>
                      <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                          Enregistrer
                      </button>
                  </div>
              </form>
          </div>
      </div>
  );
};

export default MailAdminPage;
