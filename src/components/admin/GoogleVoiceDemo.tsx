import React, { useState } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  message, 
  Input,
  Form,
  Alert,
  Divider
} from 'antd';
import { 
  PhoneOutlined, 
  MessageOutlined, 
  PlayCircleOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { logger } from '../../lib/logger';

const { Title, Paragraph } = Typography;

const GoogleVoiceDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const api = useAuthenticatedApi();

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      message.loading('Test de connexion Google Voice...', 0);
      
      const response = await api.api.post('/google-voice/test-connection', {});
      
      message.destroy();
      if (response.success) {
        message.success('✅ Connexion Google Voice réussie !');
      } else {
        message.error(`❌ Échec: ${response.message}`);
      }
    } catch (error: unknown) {
      message.destroy();
      logger.error('Erreur test connexion:', error);
      message.error('❌ Erreur lors du test de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeUser = async (values: unknown) => {
    try {
      setLoading(true);
      message.loading('Initialisation Google Voice...', 0);
      
      const response = await api.api.post('/google-voice/initialize-user', {
        userEmail: values.userEmail,
        displayName: values.displayName
      });
      
      message.destroy();
      message.success(`✅ Google Voice initialisé pour ${values.userEmail}`);
      message.info(`📞 Numéro attribué: ${response.voiceUser?.phoneNumber || 'En cours...'}`);
      form.resetFields();
    } catch (error: unknown) {
      message.destroy();
      logger.error('Erreur initialisation:', error);
      message.error(`❌ ${error.response?.data?.error || 'Erreur lors de l\'initialisation'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMakeTestCall = async () => {
    try {
      setLoading(true);
      message.loading('Initiation d\'un appel de test...', 0);
      
      const response = await api.api.post('/google-voice/make-call', {
        fromNumber: '+32123456789',
        toNumber: '+32987654321'
      });
      
      message.destroy();
      message.success(`📞 Appel de test initié - ID: ${response.callRecord?.id}`);
    } catch (error: unknown) {
      message.destroy();
      logger.error('Erreur appel:', error);
      message.error('❌ Erreur lors de l\'appel de test');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestSMS = async () => {
    try {
      setLoading(true);
      message.loading('Envoi SMS de test...', 0);
      
      const response = await api.api.post('/google-voice/send-sms', {
        fromNumber: '+32123456789',
        toNumber: '+32987654321',
        message: 'Test SMS depuis Google Voice CRM'
      });
      
      message.destroy();
      message.success(`💬 SMS de test envoyé - ID: ${response.smsMessage?.id}`);
    } catch (error: unknown) {
      message.destroy();
      logger.error('Erreur SMS:', error);
      message.error('❌ Erreur lors du SMS de test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Title level={2}>
        <PlayCircleOutlined className="mr-2" />
        Démonstration Google Voice
      </Title>
      
      <Alert
        message="Zone de test Google Voice"
        description="Testez rapidement les fonctionnalités Google Voice avant la mise en production. Assurez-vous que la configuration est correcte dans l'onglet Configuration."
        type="info"
        className="mb-6"
        showIcon
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tests de connexion */}
        <Card title="🔗 Test de connexion" className="h-fit">
          <Paragraph>
            Vérifiez que votre configuration Google Voice fonctionne correctement.
          </Paragraph>
          
          <Button 
            type="primary" 
            icon={<PhoneOutlined />}
            onClick={handleTestConnection}
            loading={loading}
            block
          >
            Tester la connexion Google Voice
          </Button>
        </Card>

        {/* Initialisation utilisateur */}
        <Card title="👤 Initialiser un utilisateur" className="h-fit">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleInitializeUser}
          >
            <Form.Item
              name="userEmail"
              label="Email utilisateur"
              rules={[
                { required: true, message: 'Email requis' },
                { type: 'email', message: 'Format invalide' }
              ]}
            >
              <Input placeholder="jean.dupont@monentreprise.be" />
            </Form.Item>
            
            <Form.Item
              name="displayName"
              label="Nom d'affichage"
              rules={[{ required: true, message: 'Nom requis' }]}
            >
              <Input placeholder="Jean Dupont" />
            </Form.Item>
            
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<UserAddOutlined />}
              loading={loading}
              block
            >
              Initialiser Google Voice
            </Button>
          </Form>
        </Card>

        {/* Tests fonctionnels */}
        <Card title="📞 Tests fonctionnels" className="h-fit">
          <Space direction="vertical" className="w-full">
            <Paragraph>
              Testez les fonctionnalités principales de Google Voice.
            </Paragraph>
            
            <Button 
              icon={<PhoneOutlined />}
              onClick={handleMakeTestCall}
              loading={loading}
              block
            >
              Test d'appel (simulation)
            </Button>
            
            <Button 
              icon={<MessageOutlined />}
              onClick={handleSendTestSMS}
              loading={loading}
              block
            >
              Test SMS (simulation)
            </Button>
          </Space>
        </Card>

        {/* Informations */}
        <Card title="ℹ️ Informations" className="h-fit">
          <Paragraph>
            <strong>Fonctionnalités Google Voice :</strong>
          </Paragraph>
          <ul className="text-sm space-y-1">
            <li>📞 Numéro dédié par utilisateur</li>
            <li>💬 SMS bidirectionnels</li>
            <li>🎙️ Messagerie vocale avec transcription IA</li>
            <li>🔄 Renvoi d'appel intelligent</li>
            <li>🚫 Mode Ne pas déranger</li>
            <li>📊 Historique centralisé</li>
            <li>🌐 Intégration Gmail/Workspace</li>
          </ul>
          
          <Divider />
          
          <Paragraph type="secondary" className="text-xs">
            ⚠️ Mode simulation : Les appels et SMS réels nécessitent une configuration Google Voice complète.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default GoogleVoiceDemo;
