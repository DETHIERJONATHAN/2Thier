// 📧 Interface de gestion complète des emails - Style Excel
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Typography, 
  Space, 
  Input, 
  Select, 
  message, 
  Modal, 
  Form,
  Tooltip,
  Tag
} from 'antd';
import { 
  MailOutlined, 
  SettingOutlined, 
  SyncOutlined,
  CheckCircleOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { Option } = Select;

interface UserEmailData {
  id: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  organizationId: string;
  emailDomain: string;
  emailExtension: string;
  generatedEmail: string;
  hasEmailAccount: boolean;
  isValidated: boolean;
  canSync: boolean;
}

interface YandexConfigModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentEmail: string;
}

// Modal de configuration Yandex pour un utilisateur
const YandexConfigModal: React.FC<YandexConfigModalProps> = ({ 
  open, 
  onClose, 
  userId, 
  userName,
  currentEmail 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { api } = useAuthenticatedApi();

  const handleConfigureYandex = async (values: { password: string }) => {
    setLoading(true);
    try {
      await api.post('/yandex/setup', {
        email: currentEmail,
        password: values.password,
        userId: userId
      });
      message.success('Configuration Yandex réussie !');
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Erreur configuration Yandex:', error);
      message.error('Erreur lors de la configuration Yandex');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`🔧 Configuration Yandex - ${userName}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="mb-4">
        <Text strong>Email: </Text>
        <Text code>{currentEmail}</Text>
      </div>
      
      <Form form={form} layout="vertical" onFinish={handleConfigureYandex}>
        <Form.Item 
          name="password" 
          label="Mot de passe d'application Yandex" 
          rules={[{ required: true, message: 'Le mot de passe est requis' }]}
        >
          <Input.Password placeholder="Mot de passe d'application" />
        </Form.Item>
        
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <Text type="warning" className="text-sm">
            ⚠️ Utilisez un <strong>mot de passe d'application</strong> Yandex, pas votre mot de passe principal.
          </Text>
        </div>
        
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Configurer
            </Button>
            <Button onClick={onClose}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// Composant principal - Table de gestion des emails
const EmailManagementTable: React.FC = () => {
  const [users, setUsers] = useState<UserEmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string>('');
  const [yandexModalVisible, setYandexModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserEmailData | null>(null);
  const { api } = useAuthenticatedApi();

  // Extensions disponibles
  const availableExtensions = ['.be', '.com', '.fr', '.eu', '.net', '.org'];

  // Charger les données utilisateurs
  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin-password/users-emails');
      setUsers(response || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      message.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Générer l'email automatiquement
  const generateEmail = (user: UserEmailData) => {
    const firstName = (user.firstName || '').toLowerCase().trim();
    const lastName = (user.lastName || '').toLowerCase().trim();
    const domain = user.emailDomain || user.organizationName?.toLowerCase().replace(/\s/g, '');
    const extension = user.emailExtension || '.be';
    
    if (firstName && lastName && domain) {
      return `${firstName}.${lastName}@${domain}${extension}`;
    }
    return '';
  };

  // Sauvegarder les modifications d'un utilisateur
  const handleSave = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const dataToSend = {
        userId,
        emailDomain: user.emailDomain,
        emailExtension: user.emailExtension,
        firstName: user.firstName,
        lastName: user.lastName,
        generatedEmail: generateEmail(user)
      };

      console.log('=== DEBUG Frontend - Données envoyées à l\'API ===');
      console.log('User trouvé:', user);
      console.log('Données à envoyer:', dataToSend);

      await api.post('/api/admin-password/update-email-config', dataToSend);

      message.success('Configuration email mise à jour');
      setEditingKey('');
      loadUsers(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Tester la connexion email
  const handleTestConnection = async (user: UserEmailData) => {
    try {
      await api.post('/yandex/test', { email: user.generatedEmail });
      message.success('Test de connexion réussi !');
    } catch (err) {
      console.error('Test connexion error:', err);
      message.error('Échec du test de connexion');
    }
  };

  // Synchroniser les emails
  const handleSync = async (user: UserEmailData) => {
    try {
      await api.post('/yandex/sync', { userId: user.id });
      message.success('Synchronisation réussie !');
    } catch (err) {
      console.error('Sync error:', err);
      message.error('Erreur lors de la synchronisation');
    }
  };

  // Valider la configuration email
  const handleValidate = async (user: UserEmailData) => {
    setSelectedUser(user);
    setYandexModalVisible(true);
  };

  // Modifier une cellule
  const handleEdit = (record: UserEmailData, field: string, value: string) => {
    const newUsers = users.map(user => {
      if (user.id === record.id) {
        const updatedUser = { ...user, [field]: value };
        // Régénérer l'email si domaine ou extension change
        if (field === 'emailDomain' || field === 'emailExtension') {
          updatedUser.generatedEmail = generateEmail(updatedUser);
        }
        return updatedUser;
      }
      return user;
    });
    setUsers(newUsers);
  };

  // Colonnes de la table
  const columns = [
    {
      title: 'Organisation',
      dataIndex: 'organizationName',
      key: 'organizationName',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Utilisateur',
      key: 'user',
      width: 200,
      render: (_: unknown, record: UserEmailData) => (
        <Space direction="vertical" size="small">
          <Text strong>{`${record.firstName || ''} ${record.lastName || ''}`}</Text>
          <Text type="secondary" className="text-xs">{record.id}</Text>
        </Space>
      )
    },
    {
      title: 'Domaine Email',
      dataIndex: 'emailDomain',
      key: 'emailDomain',
      width: 200,
      render: (text: string, record: UserEmailData) => {
        const isEditing = editingKey === record.id;
        return isEditing ? (
          <Input
            value={text}
            onChange={(e) => handleEdit(record, 'emailDomain', e.target.value)}
            placeholder="Ex: monentreprise"
          />
        ) : (
          <Text code>{text}</Text>
        );
      }
    },
    {
      title: 'Extension',
      dataIndex: 'emailExtension',
      key: 'emailExtension',
      width: 120,
      render: (text: string, record: UserEmailData) => {
        const isEditing = editingKey === record.id;
        return isEditing ? (
          <Select
            value={text}
            onChange={(value) => handleEdit(record, 'emailExtension', value)}
            style={{ width: '100%' }}
          >
            {availableExtensions.map(ext => (
              <Option key={ext} value={ext}>{ext}</Option>
            ))}
          </Select>
        ) : (
          <Tag color="blue">{text}</Tag>
        );
      }
    },
    {
      title: 'Email Final',
      dataIndex: 'generatedEmail',
      key: 'generatedEmail',
      width: 250,
      render: (text: string, record: UserEmailData) => (
        <Space direction="vertical" size="small">
          <Text strong>{text || 'Non généré'}</Text>
          {record.hasEmailAccount && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Compte créé
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_: unknown, record: UserEmailData) => {
        const isEditing = editingKey === record.id;
        
        if (isEditing) {
          return (
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                size="small"
                onClick={() => handleSave(record.id)}
              >
                Sauver
              </Button>
              <Button 
                icon={<CloseOutlined />} 
                size="small"
                onClick={() => setEditingKey('')}
              >
                Annuler
              </Button>
            </Space>
          );
        }

        return (
          <Space wrap>
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => setEditingKey(record.id)}
            >
              Modifier
            </Button>
            
            <Tooltip title="Configurer Yandex">
              <Button 
                type="primary"
                icon={<SettingOutlined />} 
                size="small"
                onClick={() => handleValidate(record)}
                disabled={!record.generatedEmail}
              >
                Config
              </Button>
            </Tooltip>
            
            <Tooltip title="Tester la connexion">
              <Button 
                icon={<ExperimentOutlined />} 
                size="small"
                onClick={() => handleTestConnection(record)}
                disabled={!record.hasEmailAccount}
              >
                Test
              </Button>
            </Tooltip>
            
            <Tooltip title="Synchroniser les emails">
              <Button 
                icon={<SyncOutlined />} 
                size="small"
                onClick={() => handleSync(record)}
                disabled={!record.canSync}
              >
                Sync
              </Button>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>📧 Gestion des Emails Utilisateurs</Title>
        <Text type="secondary">
          Interface de configuration complète des adresses email par utilisateur et organisation.
        </Text>
      </div>

      <div className="mb-4">
        <Space>
          <Button 
            type="primary" 
            icon={<SyncOutlined />}
            onClick={loadUsers}
            loading={loading}
          >
            Actualiser
          </Button>
          
          <Button 
            icon={<MailOutlined />}
            onClick={() => {
              // Synchroniser tous les utilisateurs validés
              users.filter(u => u.canSync).forEach(user => handleSync(user));
            }}
          >
            Sync Globale
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total: ${total} utilisateurs`
        }}
        scroll={{ x: 1200 }}
        bordered
        size="middle"
      />

      {selectedUser && (
        <YandexConfigModal
          open={yandexModalVisible}
          onClose={() => {
            setYandexModalVisible(false);
            setSelectedUser(null);
            loadUsers(); // Recharger après configuration
          }}
          userId={selectedUser.id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
          currentEmail={selectedUser.generatedEmail}
        />
      )}
    </div>
  );
};

export default EmailManagementTable;
