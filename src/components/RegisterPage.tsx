import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();

  const handleSubmit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      const response = await api.post('/register', values);

      if (response.success !== false) {
        message.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
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
          <Title level={2}>Inscription libre</Title>
          <Text className="text-gray-600">
            Créez votre compte. Une organisation pourra ensuite vous inviter.
          </Text>
        </div>

        <Alert
          message="Information importante"
          description="Après inscription, vous devrez attendre qu'une organisation vous invite pour accéder au CRM."
          type="info"
          showIcon
          className="mb-6"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
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
