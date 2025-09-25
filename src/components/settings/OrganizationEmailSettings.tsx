import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Modal, message, Spin, Tag } from 'antd';
import { EditOutlined, MailOutlined, SyncOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';

interface UserEmailData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: {
    id: string;
    name: string;
  };
  emailAccount?: {
    emailAddress: string;
    domain: string;
    isConfigured: boolean;
  };
  generatedEmail: string;
}

interface YandexConfig {
  username: string;
  password: string;
  host?: string;
  port?: number;
}

/**
 * Composant de gestion des emails pour les administrateurs d'organisation
 * Version limitée accessible dans les paramètres normaux
 */
const OrganizationEmailSettings: React.FC = () => {
  const [users, setUsers] = useState<UserEmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UserEmailData | null>(null);
  const [isYandexModalVisible, setIsYandexModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserEmailData | null>(null);
  const [yandexConfig, setYandexConfig] = useState<YandexConfig>({
    username: '',
    password: '',
    host: 'imap.yandex.com',
    port: 993
  });

  const { api } = useAuthenticatedApi();
  const { user, selectedOrganization } = useAuth();

  // Seuls les admins peuvent accéder à cette interface
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && selectedOrganization) {
      loadOrganizationUsers();
    }
  }, [isAdmin, selectedOrganization]);

  const loadOrganizationUsers = useCallback(async () => {
    if (!selectedOrganization) {
      message.warning('Aucune organisation sélectionnée');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/api/admin-password/users-emails?organizationId=${selectedOrganization.id}`);
      
      if (response.success && Array.isArray(response.data)) {
        // Filtrer pour ne montrer que les utilisateurs de l'organisation actuelle
        const organizationUsers = response.data.filter((userData: UserEmailData) => 
          userData.organization.id === selectedOrganization.id
        );
        setUsers(organizationUsers);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      message.error('Erreur lors du chargement des utilisateurs de votre organisation');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [api, selectedOrganization]);

  const handleSave = async (record: UserEmailData) => {
    try {
      await api.post('/api/admin-password/update-email-config', {
        userId: record.id,
        generatedEmail: record.generatedEmail
      });
      
      message.success('Configuration email mise à jour');
      setEditingRecord(null);
      loadOrganizationUsers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleYandexConfig = (user: UserEmailData) => {
    setSelectedUser(user);
    setYandexConfig({
      username: user.generatedEmail || '',
      password: '',
      host: 'imap.yandex.com',
      port: 993
    });
    setIsYandexModalVisible(true);
  };

  const handleYandexSave = async () => {
    if (!selectedUser || !yandexConfig.username || !yandexConfig.password) {
      message.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await api.post('/api/yandex/setup', {
        userId: selectedUser.id,
        config: yandexConfig
      });

      message.success('Configuration Yandex sauvegardée');
      setIsYandexModalVisible(false);
      loadOrganizationUsers();
    } catch (error) {
      console.error('Erreur lors de la configuration Yandex:', error);
      message.error('Erreur lors de la configuration Yandex');
    }
  };

  const handleTestConnection = async (user: UserEmailData) => {
    try {
      message.loading('Test de connexion en cours...', 2);
      
      const response = await api.get(`/api/yandex/test?userId=${user.id}`);
      
      if (response.success) {
        message.success('Connexion email réussie !');
      } else {
        message.error('Échec de la connexion : ' + (response.message || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur lors du test:', error);
      message.error('Erreur lors du test de connexion');
    }
  };

  const handleSync = async (user: UserEmailData) => {
    try {
      message.loading('Synchronisation en cours...', 3);
      
      await api.post('/api/yandex/sync', {
        userId: user.id
      });
      
      message.success('Synchronisation terminée');
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      message.error('Erreur lors de la synchronisation');
    }
  };

  const columns = [
    {
      title: 'Utilisateur',
      dataIndex: 'firstName',
      key: 'user',
      render: (_text: string, record: UserEmailData) => (
        <div>
          <div className="font-semibold">{record.firstName} {record.lastName}</div>
          <div className="text-xs text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Email Professionnel',
      dataIndex: 'generatedEmail',
      key: 'generatedEmail',
      render: (text: string, record: UserEmailData) => {
        if (editingRecord?.id === record.id) {
          return (
            <Input
              value={editingRecord.generatedEmail}
              onChange={(e) => setEditingRecord({
                ...editingRecord,
                generatedEmail: e.target.value
              })}
              placeholder="email@organisation.be"
            />
          );
        }
        return (
          <div className="flex items-center">
            <span className={text ? 'text-green-600' : 'text-gray-400'}>
              {text || 'Non configuré'}
            </span>
            {record.emailAccount?.isConfigured && (
              <Tag color="green" className="ml-2">Configuré</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_text: string, record: UserEmailData) => (
        <div className="flex gap-2">
          {editingRecord?.id === record.id ? (
            <>
              <Button 
                type="primary" 
                size="small"
                onClick={() => handleSave(record)}
              >
                Sauvegarder
              </Button>
              <Button 
                size="small"
                onClick={() => setEditingRecord(null)}
              >
                Annuler
              </Button>
            </>
          ) : (
            <>
              <Button
                icon={<EditOutlined />}
                size="small"
                onClick={() => setEditingRecord(record)}
                title="Modifier l'email"
              />
              <Button
                icon={<SettingOutlined />}
                size="small"
                onClick={() => handleYandexConfig(record)}
                title="Configurer Yandex"
                disabled={!record.generatedEmail}
              />
              <Button
                icon={<MailOutlined />}
                size="small"
                onClick={() => handleTestConnection(record)}
                title="Tester la connexion"
                disabled={!record.emailAccount?.isConfigured}
              />
              <Button
                icon={<SyncOutlined />}
                size="small"
                onClick={() => handleSync(record)}
                title="Synchroniser les emails"
                disabled={!record.emailAccount?.isConfigured}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  // Protection d'accès
  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        </p>
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Veuillez sélectionner une organisation pour gérer les emails.
        </p>
      </div>
    );
  }

  return (
    <div className="organization-email-settings">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          📧 Gestion des Emails - {selectedOrganization.name}
        </h2>
        <p className="text-gray-600">
          Gérez les adresses email professionnelles des utilisateurs de votre organisation.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-800 mb-2">ℹ️ Information</h4>
        <p className="text-blue-700 text-sm">
          En tant qu'administrateur d'organisation, vous pouvez configurer les emails de vos utilisateurs.
          Les adresses suivent le format : prénom.nom@{selectedOrganization.name?.toLowerCase()}.be
        </p>
      </div>

      <div className="mb-4">
        <Button
          type="primary"
          onClick={loadOrganizationUsers}
          loading={loading}
          icon={<SyncOutlined />}
        >
          Actualiser
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          locale={{
            emptyText: 'Aucun utilisateur trouvé dans votre organisation'
          }}
        />
      </Spin>

      {/* Modal de configuration Yandex */}
      <Modal
        title="🔧 Configuration Yandex"
        open={isYandexModalVisible}
        onOk={handleYandexSave}
        onCancel={() => setIsYandexModalVisible(false)}
        okText="Sauvegarder"
        cancelText="Annuler"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom d'utilisateur Yandex :</label>
            <Input
              value={yandexConfig.username}
              onChange={(e) => setYandexConfig({ ...yandexConfig, username: e.target.value })}
              placeholder="votre-email@yandex.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mot de passe :</label>
            <Input.Password
              value={yandexConfig.password}
              onChange={(e) => setYandexConfig({ ...yandexConfig, password: e.target.value })}
              placeholder="Votre mot de passe Yandex"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Serveur IMAP :</label>
            <Input
              value={yandexConfig.host}
              onChange={(e) => setYandexConfig({ ...yandexConfig, host: e.target.value })}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Port :</label>
            <Input
              type="number"
              value={yandexConfig.port}
              onChange={(e) => setYandexConfig({ ...yandexConfig, port: parseInt(e.target.value) })}
              disabled
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationEmailSettings;
