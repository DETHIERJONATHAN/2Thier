import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Typography, 
  Form, 
  Input, 
  Switch, 
  message, 
  Space,
  Divider,
  Alert,
  Steps,
  Collapse
} from 'antd';
import { 
  PhoneOutlined, 
  CloudOutlined, 
  KeyOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface GoogleVoiceConfigProps {
  onConfigurationComplete?: () => void;
}

interface GoogleVoiceConfig {
  configured: boolean;
  domain?: string;
  delegatedUserEmail?: string;
  isActive?: boolean;
  lastSync?: string;
  createdAt?: string;
}

const GoogleVoiceConfig: React.FC<GoogleVoiceConfigProps> = ({ onConfigurationComplete }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<GoogleVoiceConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const api = useAuthenticatedApi();

  // Chargement de la configuration existante
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await api.api.get('/google-voice/config');
      setConfig(response);
      
      if (response.configured) {
        setCurrentStep(2); // Configuration terminée
        form.setFieldsValue({
          domain: response.domain,
          delegatedUserEmail: response.delegatedUserEmail,
          isActive: response.isActive
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de la configuration:', error);
      message.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      await api.api.post('/google-voice/config', {
        privateKey: values.privateKey,
        clientEmail: values.clientEmail,
        domain: values.domain,
        delegatedUserEmail: values.delegatedUserEmail
      });

      message.success('Configuration Google Voice sauvegardée avec succès');
      setCurrentStep(1); // Passer à l'étape de test
      
      // Recharger la configuration
      await loadConfiguration();
      
      if (onConfigurationComplete) {
        onConfigurationComplete();
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error(
        error.response?.data?.error || 
        'Erreur lors de la sauvegarde de la configuration'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      
      const response = await api.api.post('/google-voice/test-connection');
      
      if (response.success) {
        message.success('Connexion Google Voice réussie !');
        setCurrentStep(2); // Configuration terminée
        await loadConfiguration();
      } else {
        message.error(`Échec de la connexion: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Erreur lors du test de connexion:', error);
      message.error(
        error.response?.data?.error || 
        'Erreur lors du test de connexion'
      );
    } finally {
      setTesting(false);
    }
  };

  const steps = [
    {
      title: 'Configuration',
      description: 'Saisir les informations d\'authentification',
      icon: <KeyOutlined />
    },
    {
      title: 'Test de connexion',
      description: 'Vérifier la connectivité',
      icon: <CloudOutlined />
    },
    {
      title: 'Terminé',
      description: 'Google Voice configuré',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div className="p-6">
      <Title level={2}>
        <PhoneOutlined className="mr-2" />
        Configuration Google Voice
      </Title>
      
      <Alert
        message="Intégration Google Voice"
        description="Google Voice remplace Telnyx pour fournir une téléphonie d'entreprise complète avec appels, SMS, messagerie vocale et intégration Google Workspace native."
        type="info"
        icon={<InfoCircleOutlined />}
        className="mb-6"
      />

      <Steps current={currentStep} className="mb-8">
        {steps.map((step, index) => (
          <Step 
            key={index}
            title={step.title}
            description={step.description}
            icon={step.icon}
          />
        ))}
      </Steps>

      {config?.configured && config.isActive ? (
        <Card className="mb-6">
          <Title level={4} className="text-green-600">
            <CheckCircleOutlined className="mr-2" />
            Google Voice configuré et actif
          </Title>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <Text strong>Domaine:</Text>
              <div>{config.domain}</div>
            </div>
            <div>
              <Text strong>Utilisateur délégué:</Text>
              <div>{config.delegatedUserEmail}</div>
            </div>
            <div>
              <Text strong>Dernière synchronisation:</Text>
              <div>{config.lastSync ? new Date(config.lastSync).toLocaleString() : 'Jamais'}</div>
            </div>
            <div>
              <Text strong>Configuré le:</Text>
              <div>{config.createdAt ? new Date(config.createdAt).toLocaleString() : '-'}</div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <Collapse 
            defaultActiveKey={['1']}
            items={[
              {
                key: '1',
                label: '1. Informations Service Account',
                children: (
                  <>
                    <Alert
                      message="Service Account Google"
                      description="Ces informations proviennent du fichier JSON du Service Account créé dans Google Cloud Console avec les permissions Voice et Admin SDK."
                      type="info"
                      className="mb-4"
                    />
                    
                    <Form.Item
                      name="clientEmail"
                      label="Email du Service Account"
                      rules={[
                        { required: true, message: 'Email du service account requis' },
                        { type: 'email', message: 'Format email invalide' }
                      ]}
                    >
                      <Input 
                        placeholder="exemple-service@projet-123456.iam.gserviceaccount.com"
                        prefix={<KeyOutlined />}
                      />
                    </Form.Item>

                    <Form.Item
                      name="privateKey"
                      label="Clé privée"
                      rules={[{ required: true, message: 'Clé privée requise' }]}
                    >
                      <Input.TextArea
                        rows={6}
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                      />
                    </Form.Item>
                  </>
                )
              },
              {
                key: '2',
                label: '2. Configuration Domaine',
                children: (
                  <>
                    <Alert
                      message="Configuration du domaine Google Workspace"
                      description="Le domaine doit avoir Google Voice activé et l'utilisateur délégué doit avoir les droits d'administration."
                      type="info"
                      className="mb-4"
                    />
                    
                    <Form.Item
                      name="domain"
                      label="Domaine Google Workspace"
                      rules={[{ required: true, message: 'Domaine requis' }]}
                    >
                      <Input 
                        placeholder="monentreprise.com"
                        prefix={<CloudOutlined />}
                      />
                    </Form.Item>

                    <Form.Item
                      name="delegatedUserEmail"
                      label="Email administrateur délégué"
                      rules={[
                        { required: true, message: 'Email administrateur requis' },
                        { type: 'email', message: 'Format email invalide' }
                      ]}
                    >
                      <Input 
                        placeholder="admin@monentreprise.com"
                        prefix={<SettingOutlined />}
                      />
                    </Form.Item>
                  </>
                )
              }
            ]}
          />

          <Divider />

          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<KeyOutlined />}
              disabled={currentStep >= 1}
            >
              Sauvegarder la configuration
            </Button>
            
            {currentStep >= 1 && (
              <Button
                type="primary"
                onClick={handleTestConnection}
                loading={testing}
                icon={<CloudOutlined />}
                disabled={currentStep >= 2}
              >
                Tester la connexion
              </Button>
            )}
            
            {config?.configured && (
              <Button
                onClick={loadConfiguration}
                icon={<InfoCircleOutlined />}
              >
                Actualiser le statut
              </Button>
            )}
          </Space>
        </Form>
      </Card>

      {config?.configured && (
        <Card className="mt-6" title="Instructions post-configuration">
          <Paragraph>
            <Text strong>Configuration terminée !</Text> Votre Google Voice est maintenant prêt.
          </Paragraph>
          <ul>
            <li>Les utilisateurs peuvent maintenant recevoir des numéros Google Voice automatiquement</li>
            <li>Les appels et SMS sont routés via Google Voice au lieu de Telnyx</li>
            <li>La messagerie vocale est transcrite automatiquement par l'IA Google</li>
            <li>Intégration native avec Gmail, Calendar et Google Meet</li>
            <li>Gestion centralisée via la console d'administration Google Voice</li>
          </ul>
        </Card>
      )}
    </div>
  );
};

export default GoogleVoiceConfig;
