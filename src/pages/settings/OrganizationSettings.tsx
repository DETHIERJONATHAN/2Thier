import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { toast } from 'react-toastify';
import { Card, Switch, Button, Space, Spin, Tag, Collapse, Typography, Divider, Alert } from 'antd';
import { SettingOutlined, CheckCircleOutlined, CloseCircleOutlined, GoogleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

// ✅ Composant Section Google Workspace
interface GoogleWorkspaceConfigSectionProps {
  organizationId: string;
}

const GoogleWorkspaceConfigSection: React.FC<GoogleWorkspaceConfigSectionProps> = ({ organizationId }) => {
  const { api } = useAuthenticatedApi();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get(`/api/organizations/${organizationId}/google-workspace/config`);
        if (response.success) {
          setConfig(response.data);
        }
      } catch (error) {
        console.error('Erreur chargement config Google Workspace:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [organizationId, api]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await api.post(`/api/organizations/${organizationId}/google-workspace/test`);
      if (response.success) {
        toast.success('✅ Connexion Google Workspace réussie !');
      } else {
        toast.error(`❌ ${response.message || 'Échec de la connexion'}`);
      }
    } catch (error) {
      toast.error('Erreur lors du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleModule = async (module: string, enabled: boolean) => {
    try {
      const response = await api.post(`/api/organizations/${organizationId}/google-workspace/config`, {
        ...config,
        [`${module}Enabled`]: enabled,
      });
      if (response.success) {
        setConfig(response.data);
        toast.success(`${module} ${enabled ? 'activé' : 'désactivé'}`);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Spin size="large" />
        <p className="mt-2 text-gray-500">Chargement configuration Google Workspace...</p>
      </div>
    );
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <GoogleOutlined className="text-2xl text-blue-500" />
        <h3 className="text-xl font-bold m-0">Configuration Google Workspace</h3>
      </div>

      {/* Statut */}
      <div className="mb-4">
        <Space>
          <Text strong>Statut :</Text>
          {config?.enabled ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Activé</Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="default">Non configuré</Tag>
          )}
        </Space>
      </div>

      {config ? (
        <>
          {/* Détails configuration */}
          <Collapse className="mb-4">
            <Panel header="Configuration Service Account" key="1">
              <div className="space-y-3">
                <div>
                  <Text strong>Domaine :</Text>{' '}
                  <Text>{config.domain || <span className="text-gray-400">Non configuré</span>}</Text>
                </div>
                <div>
                  <Text strong>Email admin :</Text>{' '}
                  <Text>{config.adminEmail || <span className="text-gray-400">Non configuré</span>}</Text>
                </div>
                <div>
                  <Text strong>Service Account :</Text>{' '}
                  <Text className="text-xs">{config.serviceAccountEmail || <span className="text-gray-400">Non configuré</span>}</Text>
                </div>
                <Divider />
                <Button 
                  onClick={handleTestConnection} 
                  loading={testing}
                  type="primary"
                  ghost
                  icon={<ReloadOutlined />}
                >
                  Tester la connexion
                </Button>
              </div>
            </Panel>
          </Collapse>

          {/* Modules Google Workspace */}
          {config.enabled && (
            <div className="mt-4">
              <Text strong className="block mb-3">Modules actifs :</Text>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['gmail', 'calendar', 'drive', 'meet', 'docs', 'sheets'].map(module => (
                  <div key={module} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <Text className="capitalize">{module}</Text>
                    <Switch
                      checked={config[`${module}Enabled`]}
                      onChange={(checked) => handleToggleModule(module, checked)}
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lien configuration avancée */}
          <div className="mt-4 pt-4 border-t">
            <Button type="link" href="/admin/google-workspace" className="p-0">
              <SettingOutlined /> Configuration avancée →
            </Button>
          </div>
        </>
      ) : (
        <Alert
          type="info"
          message="Google Workspace non configuré"
          description="Contactez votre administrateur système pour configurer l'intégration Google Workspace."
          showIcon
        />
      )}
    </Card>
  );
};

const OrganizationSettings = () => {
  const { currentOrganization, user, refetchUser } = useAuth();
  const { api } = useAuthenticatedApi();
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
      const response = await api.patch(`/api/organizations/${currentOrganization.id}`, { name });

      if (response.success) {
        toast.success("Le nom de l'organisation a été mis à jour.");
        // Rafraîchir les données utilisateur pour refléter le changement
        if (refetchUser) {
            await refetchUser();
        }
      } else {
        throw new Error(response.message || "Une erreur est survenue.");
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

      {/* ✅ Section Google Workspace (admin seulement) */}
      {isAdmin && currentOrganization && (
        <GoogleWorkspaceConfigSection organizationId={currentOrganization.id} />
      )}
    </div>
  );
};

export default OrganizationSettings;
