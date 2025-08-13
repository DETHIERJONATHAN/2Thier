import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { Button, Spin, Result, message, Typography, Alert } from 'antd';
import GmailLayout from '../mail-system/components/shared/GmailLayout';

const { Text } = Typography;

interface EmailAccount {
  id: string;
  emailAddress: string;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
}

const MailPage: React.FC = () => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const checkConfiguration = useCallback(async () => {
    if (!user) { 
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/email-accounts/me');
      if (response.success && response.hasAccount) {
        setEmailAccount(response.emailAccount);
      }
    } catch (error) {
      if ((error as any).response && (error as any).response.status === 404) {
        setEmailAccount(null);
      } else {
        console.error("Erreur lors de la vérification de la configuration mail:", error);
        setActionError("Impossible de vérifier la configuration de votre boîte mail.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  const handleActivateAccount = useCallback(async () => {
    setCreating(true);
    setActionError(null);
    try {
      const response = await api.post('/api/email-accounts', {});
      if (response.success) {
        setEmailAccount(response.emailAccount);
        message.success('Votre boîte mail a été activée avec succès !');
      }
    } catch (error) {
      console.error("Erreur lors de l'activation du compte mail:", error);
      const errorMessage = (error as any).response?.data?.error || "Une erreur est survenue lors de l'activation.";
      setActionError(errorMessage);
      message.error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, [api]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" tip="Vérification de la configuration..." />
      </div>
    );
  }

  if (emailAccount) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          background: '#001529', 
          color: 'white', 
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            📧 {emailAccount.emailAddress}
          </Text>
          {emailAccount.organization && (
            <Text style={{ color: '#87d068', fontSize: '12px' }}>
              {emailAccount.organization.name}
            </Text>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          <GmailLayout />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div style={{ maxWidth: '600px', width: '100%', padding: '20px' }}>
        {actionError && (
          <Alert 
            message="Erreur" 
            description={actionError}
            type="error" 
            style={{ marginBottom: '24px' }}
            showIcon
          />
        )}
        
        <Result
          status="info"
          title="🚀 Votre Boîte Mail Professionnelle"
          subTitle="Activez votre compte pour commencer à envoyer et recevoir des emails directement depuis le CRM avec votre adresse professionnelle."
          extra={[
            <Button 
              type="primary" 
              key="activate" 
              onClick={handleActivateAccount}
              loading={creating}
              size="large"
              style={{ 
                height: '48px',
                paddingLeft: '32px',
                paddingRight: '32px',
                fontSize: '16px'
              }}
            >
              {creating ? 'Création en cours...' : 'Activer ma boîte mail'}
            </Button>,
          ]}
        />
        
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Un compte email professionnel sera créé automatiquement avec votre nom et prénom.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default MailPage;
