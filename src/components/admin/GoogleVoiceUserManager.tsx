import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Typography, 
  Table, 
  Input, 
  Form, 
  Modal, 
  Space, 
  Tag, 
  message,
  Switch,
  Divider,
  Tooltip,
  Alert
} from 'antd';
import { 
  PhoneOutlined, 
  UserOutlined, 
  PlusOutlined,
  SettingOutlined,
  MessageOutlined,
  AudioOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface GoogleVoiceUser {
  phoneNumber: string;
  displayName: string;
  email: string;
  voiceSettings?: {
    doNotDisturb: boolean;
    voicemailTranscription: boolean;
    callScreening: boolean;
  };
  callForwarding?: string[];
}

interface GoogleVoiceUserManagerProps {
  onUserCreated?: () => void;
}

const GoogleVoiceUserManager: React.FC<GoogleVoiceUserManagerProps> = ({ onUserCreated }) => {
  const [users, setUsers] = useState<GoogleVoiceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GoogleVoiceUser | null>(null);
  const [form] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const api = useAuthenticatedApi();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.api.get('/google-voice/users');
      setUsers(response.users || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      message.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeUser = async (values: any) => {
    try {
      setLoading(true);
      
      await api.api.post('/google-voice/initialize-user', {
        userEmail: values.userEmail,
        displayName: values.displayName
      });

      message.success(`Google Voice initialisé pour ${values.userEmail}`);
      setModalVisible(false);
      form.resetFields();
      await loadUsers();
      
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'initialisation:', error);
      message.error(
        error.response?.data?.error || 
        'Erreur lors de l\'initialisation de l\'utilisateur'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      await api.api.put(`/google-voice/settings/${selectedUser.email}`, {
        voiceSettings: {
          doNotDisturb: values.doNotDisturb,
          voicemailTranscription: values.voicemailTranscription,
          callScreening: values.callScreening
        },
        callForwarding: values.callForwarding?.split(',').map((num: string) => num.trim()).filter(Boolean)
      });

      message.success(`Paramètres mis à jour pour ${selectedUser.displayName}`);
      setSettingsModalVisible(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      message.error(
        error.response?.data?.error || 
        'Erreur lors de la mise à jour des paramètres'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDoNotDisturb = async (user: GoogleVoiceUser, enabled: boolean) => {
    try {
      await api.api.post('/google-voice/do-not-disturb', {
        userEmail: user.email,
        enabled
      });

      message.success(`Mode Ne pas déranger ${enabled ? 'activé' : 'désactivé'} pour ${user.displayName}`);
      await loadUsers();
    } catch (error: any) {
      console.error('Erreur lors de la modification du mode Ne pas déranger:', error);
      message.error('Erreur lors de la modification du mode Ne pas déranger');
    }
  };

  const handleMakeCall = async (user: GoogleVoiceUser) => {
    Modal.confirm({
      title: 'Passer un appel',
      content: (
        <Form layout="vertical">
          <Form.Item label="Numéro à appeler" name="toNumber">
            <Input placeholder="+32..." />
          </Form.Item>
        </Form>
      ),
      okText: 'Appeler',
      cancelText: 'Annuler',
      onOk: async () => {
        // Récupérer la valeur du formulaire dans le modal
        const toNumber = '+32123456789'; // Placeholder
        
        try {
          await api.api.post('/google-voice/make-call', {
            fromNumber: user.phoneNumber,
            toNumber
          });
          
          message.success(`Appel initié de ${user.phoneNumber} vers ${toNumber}`);
        } catch (error: any) {
          console.error('Erreur lors de l\'appel:', error);
          message.error('Erreur lors de l\'initiation de l\'appel');
        }
      }
    });
  };

  const handleSendSMS = async (user: GoogleVoiceUser) => {
    Modal.confirm({
      title: 'Envoyer un SMS',
      content: (
        <Form layout="vertical">
          <Form.Item label="Numéro de destination" name="toNumber">
            <Input placeholder="+32..." />
          </Form.Item>
          <Form.Item label="Message" name="message">
            <Input.TextArea rows={3} placeholder="Votre message..." />
          </Form.Item>
        </Form>
      ),
      okText: 'Envoyer',
      cancelText: 'Annuler',
      width: 500,
      onOk: async () => {
        // Récupérer les valeurs du formulaire dans le modal
        const toNumber = '+32123456789'; // Placeholder
        const message = 'Message de test'; // Placeholder
        
        try {
          await api.api.post('/google-voice/send-sms', {
            fromNumber: user.phoneNumber,
            toNumber,
            message
          });
          
          message.success(`SMS envoyé de ${user.phoneNumber} vers ${toNumber}`);
        } catch (error: any) {
          console.error('Erreur lors de l\'envoi SMS:', error);
          message.error('Erreur lors de l\'envoi du SMS');
        }
      }
    });
  };

  const openSettingsModal = (user: GoogleVoiceUser) => {
    setSelectedUser(user);
    settingsForm.setFieldsValue({
      doNotDisturb: user.voiceSettings?.doNotDisturb || false,
      voicemailTranscription: user.voiceSettings?.voicemailTranscription || true,
      callScreening: user.voiceSettings?.callScreening || false,
      callForwarding: user.callForwarding?.join(', ') || ''
    });
    setSettingsModalVisible(true);
  };

  const columns = [
    {
      title: 'Utilisateur',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (_: string, record: GoogleVoiceUser) => (
        <Space>
          <UserOutlined />
          <div>
            <div className="font-medium">{record.displayName}</div>
            <div className="text-gray-500 text-sm">{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Numéro de téléphone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (phoneNumber: string) => (
        <Tag color="blue" icon={<PhoneOutlined />}>
          {phoneNumber}
        </Tag>
      ),
    },
    {
      title: 'Paramètres Voice',
      key: 'voiceSettings',
      render: (_: any, record: GoogleVoiceUser) => (
        <Space direction="vertical" size="small">
          <Tag color={record.voiceSettings?.doNotDisturb ? 'red' : 'green'}>
            {record.voiceSettings?.doNotDisturb ? 'Ne pas déranger' : 'Disponible'}
          </Tag>
          <Tag color={record.voiceSettings?.voicemailTranscription ? 'green' : 'orange'}>
            {record.voiceSettings?.voicemailTranscription ? 'Transcription activée' : 'Transcription désactivée'}
          </Tag>
          {record.voiceSettings?.callScreening && (
            <Tag color="purple">Filtrage d'appels</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GoogleVoiceUser) => (
        <Space>
          <Tooltip title="Passer un appel">
            <Button 
              size="small" 
              icon={<PhoneOutlined />} 
              onClick={() => handleMakeCall(record)}
            />
          </Tooltip>
          
          <Tooltip title="Envoyer un SMS">
            <Button 
              size="small" 
              icon={<MessageOutlined />} 
              onClick={() => handleSendSMS(record)}
            />
          </Tooltip>
          
          <Tooltip title="Paramètres Voice">
            <Button 
              size="small" 
              icon={<SettingOutlined />} 
              onClick={() => openSettingsModal(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.voiceSettings?.doNotDisturb ? 'Désactiver Ne pas déranger' : 'Activer Ne pas déranger'}>
            <Switch
              size="small"
              checked={record.voiceSettings?.doNotDisturb || false}
              onChange={(checked) => handleToggleDoNotDisturb(record, checked)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>
          <PhoneOutlined className="mr-2" />
          Utilisateurs Google Voice
        </Title>
        
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadUsers}
            loading={loading}
          >
            Actualiser
          </Button>
          
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setModalVisible(true)}
          >
            Initialiser un utilisateur
          </Button>
        </Space>
      </div>

      <Alert
        message="Gestion des utilisateurs Google Voice"
        description="Gérez les numéros Google Voice, paramètres vocaux et fonctionnalités téléphoniques de vos utilisateurs. Chaque utilisateur peut avoir un numéro Google Voice dédié avec messagerie vocale, SMS et appels."
        type="info"
        className="mb-6"
        showIcon
      />

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="email"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: users.length === 0 ? 'Aucun utilisateur Google Voice configuré' : 'Aucune donnée'
          }}
        />
      </Card>

      {/* Modal d'initialisation d'utilisateur */}
      <Modal
        title="Initialiser Google Voice pour un utilisateur"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInitializeUser}
        >
          <Form.Item
            name="userEmail"
            label="Email de l'utilisateur"
            rules={[
              { required: true, message: 'Email requis' },
              { type: 'email', message: 'Format email invalide' }
            ]}
          >
            <Input placeholder="utilisateur@monentreprise.com" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Nom d'affichage"
            rules={[{ required: true, message: 'Nom d\'affichage requis' }]}
          >
            <Input placeholder="Prénom Nom" />
          </Form.Item>

          <Divider />

          <Space>
            <Button onClick={() => setModalVisible(false)}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Initialiser Google Voice
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal des paramètres utilisateur */}
      <Modal
        title={`Paramètres Google Voice - ${selectedUser?.displayName}`}
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleUpdateSettings}
        >
          <Title level={4}>Paramètres vocaux</Title>
          
          <Form.Item name="doNotDisturb" valuePropName="checked">
            <Switch /> Ne pas déranger
          </Form.Item>

          <Form.Item name="voicemailTranscription" valuePropName="checked">
            <Switch /> Transcription automatique de la messagerie vocale
          </Form.Item>

          <Form.Item name="callScreening" valuePropName="checked">
            <Switch /> Filtrage d'appels
          </Form.Item>

          <Form.Item
            name="callForwarding"
            label="Renvoi d'appel (numéros séparés par des virgules)"
          >
            <Input.TextArea 
              rows={2} 
              placeholder="+32123456789, +32987654321"
            />
          </Form.Item>

          <Divider />

          <Space>
            <Button onClick={() => setSettingsModalVisible(false)}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Mettre à jour les paramètres
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default GoogleVoiceUserManager;
