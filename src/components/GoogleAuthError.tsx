import React from 'react';
import { Card, Button, Alert, Typography } from 'antd';
import { GoogleOutlined, WarningOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface GoogleAuthErrorProps {
  onReconnect: () => void;
}

const GoogleAuthError: React.FC<GoogleAuthErrorProps> = ({ onReconnect }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '60vh',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          maxWidth: 500, 
          textAlign: 'center',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <WarningOutlined 
            style={{ 
              fontSize: '48px', 
              color: '#faad14',
              marginBottom: '16px'
            }} 
          />
          <Title level={3} style={{ color: '#1f1f1f', marginBottom: '8px' }}>
            Authentification Google requise
          </Title>
        </div>

        <Alert
          message="Connexion Gmail expirée"
          description="Votre connexion à Gmail a expiré. Vous devez vous reconnecter pour accéder à vos emails."
          type="warning"
          showIcon
          style={{ marginBottom: '24px', textAlign: 'left' }}
        />

        <Paragraph style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Cliquez sur le bouton ci-dessous pour vous reconnecter à votre compte Google
          et réactiver l'accès à Gmail.
        </Paragraph>

        <Button
          type="primary"
          size="large"
          icon={<GoogleOutlined />}
          onClick={onReconnect}
          style={{
            background: 'linear-gradient(45deg, #4285f4, #34a853)',
            border: 'none',
            borderRadius: '8px',
            height: '48px',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Reconnecter Google
        </Button>

        <Paragraph style={{ 
          fontSize: '12px', 
          color: '#999', 
          marginTop: '16px',
          marginBottom: 0
        }}>
          🔒 Connexion sécurisée via Google OAuth 2.0
        </Paragraph>
      </Card>
    </div>
  );
};

export default GoogleAuthError;
