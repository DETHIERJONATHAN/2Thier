import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, Card, Form, Input, Spin, Typography, Alert } from 'antd';
import { NotificationManager, NotificationsContainer } from '../components/Notifications';

const { Title, Text } = Typography;

// Ce composant sera utilisé pour finaliser l'inscription d'un utilisateur invité.
export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authenticatedUser } = useAuth();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const verifyToken = useCallback(async () => {
    if (!token) {
      setError("Jeton d'invitation manquant ou invalide.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/invitations/verify?token=${token}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Jeton invalide ou expiré.');
      }
      setInvitation(data.data);
    } catch (err: any) {
      setError(err.message);
      NotificationManager.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleAccept = async (values: any = {}) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...values }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Erreur lors de l'acceptation de l'invitation.");
      }

      NotificationManager.success(responseData.message || 'Opération réussie !');
      
      // Si l'utilisateur était déjà connecté, on le redirige vers le tableau de bord.
      // Sinon, vers la page de connexion pour qu'il puisse se connecter.
      navigate(authenticatedUser ? '/dashboard' : '/login');

    } catch (err: any) {
      setError(err.message);
      NotificationManager.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center"><Spin size="large" /></div>;
    }

    if (error) {
      return <Alert message="Erreur" description={error} type="error" showIcon />;
    }

    if (!invitation) {
      return <Alert message="Erreur" description="Impossible de charger les détails de l'invitation." type="error" showIcon />;
    }

    // Scénario 1: L'utilisateur existe déjà
    if (invitation.isExistingUser) {
      const isWrongUserLoggedIn = !!authenticatedUser && authenticatedUser.email !== invitation.email;
      return (
        <div>
          <Title level={3} className="text-center">Rejoindre {invitation.organization.name}</Title>
          <Text className="block text-center mb-4">
            Vous êtes invité(e) à rejoindre l'organisation en tant que <strong>{invitation.role.label || invitation.role.name}</strong>.
          </Text>
          {isWrongUserLoggedIn && (
             <Alert 
                message="Compte incorrect"
                description={`Cette invitation est pour ${invitation.email}, mais vous êtes connecté(e) en tant que ${authenticatedUser.email}. Veuillez vous déconnecter pour accepter cette invitation.`}
                type="warning"
                showIcon
                className="mb-4"
            />
          )}
          <Button 
            type="primary" 
            onClick={() => handleAccept()} 
            loading={isSubmitting} 
            block
            disabled={isWrongUserLoggedIn}
          >
            Accepter l'invitation
          </Button>
        </div>
      );
    }

    // Scénario 2: Nouvel utilisateur, formulaire d'inscription
    return (
      <div>
        <Title level={3} className="text-center">Finaliser votre inscription</Title>
        <Text className="block text-center mb-4">
          Pour rejoindre <strong>{invitation.organization.name}</strong> en tant que <strong>{invitation.role.label || invitation.role.name}</strong>.
        </Text>
        <Form form={form} layout="vertical" onFinish={handleAccept}>
          <Form.Item label="Prénom" name="firstName" rules={[{ required: true, message: 'Le prénom est requis.' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Nom" name="lastName" rules={[{ required: true, message: 'Le nom est requis.' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email">
            <Input value={invitation.email} disabled />
          </Form.Item>
          <Form.Item label="Mot de passe" name="password" rules={[{ required: true, message: 'Le mot de passe est requis.' }, { min: 8, message: '8 caractères minimum.'}]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isSubmitting} block>
              Créer le compte et rejoindre
            </Button>
          </Form.Item>
        </Form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <NotificationsContainer />
      <Card className="w-full max-w-md shadow-lg">
        {renderContent()}
      </Card>
    </div>
  );
}
