import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, message, Radio, Space, Select } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined, BankOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  const [registrationType, setRegistrationType] = useState<'freelance' | 'createOrg' | 'joinOrg'>('freelance');
  const [organizations, setOrganizations] = useState<{ id: string; name: string; description?: string }[]>([]);

  // Charger les organisations publiques pour le type "joinOrg"
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (registrationType !== 'joinOrg') return;
      
      try {
        const response = await api.get('/api/organizations/public');
        if (response.success) {
          setOrganizations(response.data || []);
        }
      } catch (error) {
        console.error('Erreur chargement organisations:', error);
      }
    };
    
    fetchOrganizations();
  }, [registrationType, api]);

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    organizationName?: string;
    domain?: string;
    organizationId?: string;
    message?: string;
  }) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        registrationType, // Envoyer le type d'inscription
      };
      
      const response = await api.post('/register', payload);

      if (response.success !== false) {
        // Messages différents selon le type
        if (registrationType === 'createOrg') {
          message.success('Organisation créée ! Vous pouvez maintenant vous connecter.');
        } else if (registrationType === 'joinOrg') {
          message.success('Demande envoyée ! En attente d\'approbation de l\'organisation.');
        } else {
          message.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        }
        navigate('/login');
      } else {
        throw new Error(response.error || 'Erreur lors de l\'inscription');
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <Title level={2}>Inscription</Title>
          <Text className="text-gray-600">
            Choisissez comment vous souhaitez commencer
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* TYPE D'INSCRIPTION */}
          <Form.Item label={<Text strong>Comment souhaitez-vous vous inscrire ?</Text>}>
            <Radio.Group 
              value={registrationType} 
              onChange={(e) => setRegistrationType(e.target.value)}
              className="w-full"
            >
              <Space direction="vertical" className="w-full">
                <Radio value="freelance">
                  <Space direction="vertical" size={0}>
                    <Text strong>Utilisateur libre</Text>
                    <Text type="secondary" className="text-xs">
                      Créer un compte et attendre une invitation d'une organisation
                    </Text>
                  </Space>
                </Radio>
                <Radio value="createOrg">
                  <Space direction="vertical" size={0}>
                    <Text strong><BankOutlined /> Créer mon organisation</Text>
                    <Text type="secondary" className="text-xs">
                      Devenir administrateur de votre propre organisation
                    </Text>
                  </Space>
                </Radio>
                <Radio value="joinOrg">
                  <Space direction="vertical" size={0}>
                    <Text strong>Rejoindre une organisation</Text>
                    <Text type="secondary" className="text-xs">
                      Faire une demande pour rejoindre une organisation existante
                    </Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {/* INFORMATIONS PERSONNELLES */}
          <Form.Item
            label="Prénom"
            name="firstName"
            rules={[{ required: true, message: 'Le prénom est requis' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Votre prénom" 
            />
          </Form.Item>

          <Form.Item
            label="Nom"
            name="lastName"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Votre nom" 
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'L\'email est requis' },
              { type: 'email', message: 'Format d\'email invalide' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="votre.email@exemple.com" 
            />
          </Form.Item>

          <Form.Item
            label="Mot de passe"
            name="password"
            rules={[
              { required: true, message: 'Le mot de passe est requis' },
              { min: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="Votre mot de passe" 
            />
          </Form.Item>

          {/* CHAMPS CONDITIONNELS POUR "CRÉER ORGANISATION" */}
          {registrationType === 'createOrg' && (
            <>
              <Alert
                type="info"
                message="Vous allez créer votre organisation"
                description="Vous serez automatiquement administrateur de cette organisation"
                showIcon
                className="mb-4"
              />
              
              <Form.Item
                label="Nom de l'organisation"
                name="organizationName"
                rules={[{ required: true, message: 'Le nom de l\'organisation est requis' }]}
              >
                <Input 
                  prefix={<BankOutlined />} 
                  placeholder="Mon Entreprise SPRL" 
                />
              </Form.Item>

              <Form.Item
                label="Domaine (optionnel)"
                name="domain"
                tooltip="Utilisé pour la création automatique d'adresses email Google Workspace"
              >
                <Input 
                  placeholder="mon-entreprise.be" 
                />
              </Form.Item>
            </>
          )}

          {/* CHAMPS CONDITIONNELS POUR "REJOINDRE ORGANISATION" */}
          {registrationType === 'joinOrg' && (
            <>
              <Alert
                type="info"
                message="Demande d'adhésion"
                description="Votre demande sera examinée par un administrateur de l'organisation"
                showIcon
                className="mb-4"
              />
              
              <Form.Item
                label="Sélectionner une organisation"
                name="organizationId"
                rules={[{ required: true, message: 'Veuillez sélectionner une organisation' }]}
              >
                <Select 
                  placeholder="Choisir une organisation"
                  loading={loading}
                  showSearch
                  optionFilterProp="children"
                >
                  {organizations.map(org => (
                    <Select.Option key={org.id} value={org.id}>
                      <div>
                        <div><Text strong>{org.name}</Text></div>
                        {org.description && (
                          <div><Text type="secondary" className="text-xs">{org.description}</Text></div>
                        )}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Message de motivation (optionnel)"
                name="message"
                tooltip="Expliquez pourquoi vous souhaitez rejoindre cette organisation"
              >
                <TextArea 
                  placeholder="Pourquoi voulez-vous rejoindre cette organisation ?" 
                  rows={3}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </>
          )}

          {/* ALERTE POUR UTILISATEUR LIBRE */}
          {registrationType === 'freelance' && (
            <Alert
              message="Information importante"
              description="Après inscription, vous devrez attendre qu'une organisation vous invite pour accéder au CRM complet."
              type="info"
              showIcon
              className="mb-4"
            />
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              S'inscrire
            </Button>
          </Form.Item>

          <div className="text-center">
            <Button 
              type="link" 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/login')}
            >
              Retour à la connexion
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
