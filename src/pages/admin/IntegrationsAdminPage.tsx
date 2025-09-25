import { useEffect, useState, useCallback, FC, FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { NotificationManager } from '../../components/Notifications';

// Interface for a single integration setting
interface IntegrationSetting {
  type: string;
  enabled: boolean;
  config: any;
}

// Interface for the modal props
interface IntegrationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: IntegrationSetting) => void;
  integrationType: 'mail' | 'telnyx' | null;
  initialConfig: any;
}

// Simplified Modal for Mail and Telnyx
const IntegrationSettingsModal: FC<IntegrationSettingsModalProps> = ({ isOpen, onClose, onSave, integrationType, initialConfig }) => {
  const [mailConfig, setMailConfig] = useState({ host: '', port: 587, login: '', password: '' });
  const [telnyxConfig, setTelnyxConfig] = useState({ apiKey: '' });

  useEffect(() => {
    if (integrationType === 'mail') {
      setMailConfig({ ...{ host: '', port: 587, login: '', password: '' }, ...initialConfig });
    }
    if (integrationType === 'telnyx') {
      setTelnyxConfig({ ...{ apiKey: '' }, ...initialConfig });
    }
  }, [initialConfig, integrationType]);

  if (!isOpen || !integrationType) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    let settings: IntegrationSetting;
    if (integrationType === 'mail') {
        const configToSave = { ...mailConfig };
        if (!(configToSave as any).password) {
            delete (configToSave as any).password;
        }
      settings = { type: 'mail', config: configToSave, enabled: true };
    } else { // telnyx
      const configToSave = { ...telnyxConfig };
      if (!configToSave.apiKey) {
        delete (configToSave as any).apiKey;
      }
      settings = { type: 'telnyx', config: configToSave, enabled: true };
    }
    onSave(settings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Configurer l'intégration {integrationType}</h2>
        <form onSubmit={handleSubmit}>
          {integrationType === 'mail' && (
            <div className="mb-6 border p-4 rounded">
              <h3 className="font-semibold mb-2">Paramètres de la boîte mail (SMTP)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Hôte SMTP</label>
                  <input type="text" value={mailConfig.host} onChange={e => setMailConfig({...mailConfig, host: e.target.value})} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port SMTP</label>
                  <input type="number" value={mailConfig.port} onChange={e => setMailConfig({...mailConfig, port: parseInt(e.target.value)})} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Login/Email</label>
                  <input type="text" value={mailConfig.login} onChange={e => setMailConfig({...mailConfig, login: e.target.value})} className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe</label>
                  <input type="password" placeholder="Laisser vide pour ne pas changer" onChange={e => setMailConfig({...mailConfig, password: e.target.value})} className="w-full border rounded px-2 py-1" />
                </div>
              </div>
            </div>
          )}

          {integrationType === 'telnyx' && (
            <div className="mb-6 border p-4 rounded">
              <h3 className="font-semibold mb-2">Paramètres Telnyx</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Clé API Telnyx</label>
                <input type="password" value={telnyxConfig.apiKey} placeholder="Laisser vide pour ne pas changer" onChange={e => setTelnyxConfig({apiKey: e.target.value})} className="w-full border rounded px-2 py-1" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const IntegrationsAdminPage: FC = () => {
  const { api, user, can } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIntegration, setCurrentIntegration] = useState<'mail' | 'telnyx' | null>(null);
  const [initialConfig, setInitialConfig] = useState<any>({});

  const organizationId = user?.currentOrganization?.id;

  const fetchIntegrations = useCallback(async () => {
    if (!organizationId || !api) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(`/organizations/${organizationId}/integrations`);
      if (data.success) {
        setIntegrations(data.data || []);
      } else {
        NotificationManager.error(data.message || "Erreur lors de la récupération des intégrations.");
      }
    } catch (error) {
      console.error(error);
      NotificationManager.error("Impossible de charger les intégrations.");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, api]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleOpenModal = (type: 'mail' | 'telnyx') => {
    const existingIntegration = integrations.find(int => int.type === type);
    setInitialConfig(existingIntegration?.config || {});
    setCurrentIntegration(type);
    setIsModalOpen(true);
  };

  const handleSave = async (settings: IntegrationSetting) => {
    if (!organizationId || !api) return;

    const existing = integrations.find(int => int.type === settings.type);
    const url = `/organizations/${organizationId}/integrations/${settings.type}`;
    const method = existing ? 'put' : 'post';

    try {
      const { data } = await api[method](url, { config: settings.config });
      if (data.success) {
        NotificationManager.success(`Intégration ${settings.type} mise à jour.`);
        fetchIntegrations(); // Refresh list
      } else {
        NotificationManager.error(data.message || "Erreur lors de la sauvegarde.");
      }
    } catch (error) {
      console.error(error);
      NotificationManager.error("Une erreur est survenue.");
    }
    setIsModalOpen(false);
  };

  const handleToggle = async (type: string, enabled: boolean) => {
    if (!organizationId || !api) return;
    try {
      const { data } = await api.put(`/organizations/${organizationId}/integrations/${type}/toggle`, { enabled });
      if (data.success) {
        NotificationManager.success(`Intégration ${type} ${enabled ? 'activée' : 'désactivée'}.`);
        fetchIntegrations();
      } else {
        NotificationManager.error(data.message || "Erreur lors du changement de statut.");
      }
    } catch (error) {
      console.error(error);
      NotificationManager.error("Une erreur est survenue.");
    }
  };

  if (isLoading) {
    return <div>Chargement des intégrations...</div>;
  }

  const canManageIntegrations = can && can('integration:manage');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Gestion des Intégrations</h1>
      
      <div className="bg-white p-8 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mail Integration Card */}
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Intégration Email</h3>
              <p className="text-sm text-gray-600">Connectez une boîte mail pour envoyer des emails depuis le CRM.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenModal('mail')}
                disabled={!canManageIntegrations}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                Configurer
              </button>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={integrations.find(i => i.type === 'mail')?.enabled || false}
                  onChange={(e) => handleToggle('mail', e.target.checked)}
                  disabled={!canManageIntegrations}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* Telnyx Integration Card */}
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Intégration Telnyx</h3>
              <p className="text-sm text-gray-600">Connectez Telnyx pour les fonctionnalités SMS et téléphonie.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleOpenModal('telnyx')}
                disabled={!canManageIntegrations}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                Configurer
              </button>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={integrations.find(i => i.type === 'telnyx')?.enabled || false}
                  onChange={(e) => handleToggle('telnyx', e.target.checked)}
                  disabled={!canManageIntegrations}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <IntegrationSettingsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        integrationType={currentIntegration}
        initialConfig={initialConfig}
      />
    </div>
  );
};

export default IntegrationsAdminPage;
