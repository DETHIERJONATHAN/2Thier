import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spin, Tag, Space, Typography, Divider } from 'antd';
import { GoogleOutlined, DisconnectOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;

interface GoogleConnectionStatus {
  isConnected: boolean;
  email?: string;
  scopes?: string[];
  connectedAt?: string;
  lastSync?: string;
  // Nouvelles propriétés pour la gestion organisation
  hasPersonalConnection?: boolean;
  hasOrganizationAccess?: boolean;
  accessType?: 'personal' | 'organization' | 'none';
  organizationInfo?: {
    isConnected: boolean;
    connectedUsers: number;
    primaryUser?: {
      email: string;
      role: string;
      connectedAt: string;
      lastSync: string;
    };
    scopes: string[];
    userInfo?: any;
  };
  userInfo?: any;
}

interface GoogleConnectionCardProps {
  organizationId?: string;
}

export const GoogleConnectionCard: React.FC<GoogleConnectionCardProps> = ({ organizationId }) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnectionStatus = useCallback(async () => {
    console.log('[GoogleConnectionCard] 🔍 Début checkConnectionStatus');
    console.log('[GoogleConnectionCard] 🏢 OrganizationId:', organizationId);
    try {
      setLoading(true);
      console.log('[GoogleConnectionCard] 📡 Appel API /google-auth/status...');
      
      const responseData = await api.get('/api/google-auth/status');
      console.log('[GoogleConnectionCard] ✅ Données status reçues:', responseData);
      console.log('[GoogleConnectionCard] 📊 Structure responseData:', JSON.stringify(responseData, null, 2));
      console.log('[GoogleConnectionCard] 🔍 responseData.data:', responseData.data);
      console.log('[GoogleConnectionCard] 🔍 responseData.connected:', responseData.connected);
      console.log('[GoogleConnectionCard] 🔍 responseData.data?.connected:', responseData.data?.connected);
      
      // L'API retourne { success: true, data: { connected: true/false, ... } }
      const statusData = responseData.data || responseData;
      setConnectionStatus({ isConnected: statusData.connected, ...statusData });
      setError(null);
      console.log('[GoogleConnectionCard] 📊 ConnectionStatus mis à jour:', { isConnected: statusData.connected, ...statusData });
    } catch (err: unknown) {
      console.log('[GoogleConnectionCard] ❌ Erreur dans checkConnectionStatus:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du statut';
      console.log('[GoogleConnectionCard] 📝 Message erreur status:', errorMessage);
      setError(errorMessage);
      setConnectionStatus({ isConnected: false });
    } finally {
      console.log('[GoogleConnectionCard] 🏁 Fin checkConnectionStatus');
      setLoading(false);
    }
  }, [api, organizationId]);

  const handleConnect = async () => {
    console.log('[GoogleConnectionCard] 🚀 Début handleConnect');
    console.log('[GoogleConnectionCard] État loading avant:', loading);
    
    try {
      setLoading(true);
      console.log('[GoogleConnectionCard] 📡 Appel API /api/google-auth/connect...');
      console.log('[GoogleConnectionCard] 🏢 Avec organizationId:', organizationId);
      
      // Construire l'URL avec organizationId si fourni
      const connectUrl = organizationId 
        ? `/api/google-auth/connect?organizationId=${organizationId}`
        : '/api/google-auth/connect';
        
      console.log('[GoogleConnectionCard] 🔗 URL de connexion:', connectUrl);
      
      const responseData = await api.get(connectUrl);
      console.log('[GoogleConnectionCard] ✅ Données API reçues:', responseData);
      console.log('[GoogleConnectionCard] 📊 Structure complète responseData:', JSON.stringify(responseData, null, 2));
      console.log('[GoogleConnectionCard] 🔍 Type des données:', typeof responseData);
      console.log('[GoogleConnectionCard] 🔍 Clés des données:', Object.keys(responseData || {}));
      
      if (!responseData) {
        console.log('[GoogleConnectionCard] ❌ responseData est undefined/null');
        setError('Réponse vide du serveur');
        return;
      }
      
      console.log('[GoogleConnectionCard] 🔑 Recherche authUrl dans:', responseData);
      const authUrl = responseData?.data?.authUrl || responseData?.authUrl;
      console.log('[GoogleConnectionCard] 🔗 authUrl extrait:', authUrl);
      
      if (!authUrl) {
        console.log('[GoogleConnectionCard] ❌ authUrl manquant dans la réponse');
        console.log('[GoogleConnectionCard] 📋 Contenu complet des données:', JSON.stringify(responseData, null, 2));
        setError('URL d\'authentification manquante');
        return;
      }
      
      console.log('[GoogleConnectionCard] 🪟 Ouverture popup avec URL:', authUrl);
      
      // Ouvrir la fenêtre d'authentification Google
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      console.log('[GoogleConnectionCard] 🪟 Popup créée:', popup ? 'Succès' : 'Échec');

      // Écouter la fermeture de la popup
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          console.log('[GoogleConnectionCard] 🪟 Popup fermée, vérification du statut...');
          // Attendre un peu puis vérifier le statut
          setTimeout(() => {
            checkConnectionStatus();
          }, 1000);
        }
      }, 1000);

    } catch (err: unknown) {
      console.log('[GoogleConnectionCard] ❌ Erreur dans handleConnect:', err);
      console.log('[GoogleConnectionCard] 🔍 Type erreur:', typeof err);
      console.log('[GoogleConnectionCard] 📋 Détails erreur:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la connexion';
      console.log('[GoogleConnectionCard] 📝 Message erreur final:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('[GoogleConnectionCard] 🏁 Fin handleConnect, setLoading(false)');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await api.post('/api/google-auth/disconnect', { organizationId });
      setConnectionStatus({ isConnected: false });
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la déconnexion';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const getScopeLabel = (scope: string) => {
    const scopeLabels: Record<string, string> = {
      // Authentification
      'https://www.googleapis.com/auth/userinfo.email': 'Profil (email)',
      'https://www.googleapis.com/auth/userinfo.profile': 'Profil (informations)',
      
      // Gmail COMPLET
      'https://mail.google.com/': 'Gmail (accès complet)',
      'https://www.googleapis.com/auth/gmail.readonly': 'Gmail (lecture)',
      'https://www.googleapis.com/auth/gmail.send': 'Gmail (envoi)',
      'https://www.googleapis.com/auth/gmail.modify': 'Gmail (modification)',
      'https://www.googleapis.com/auth/gmail.labels': 'Gmail (étiquettes)',
      
      // Calendar COMPLET
      'https://www.googleapis.com/auth/calendar': 'Calendrier',
      'https://www.googleapis.com/auth/calendar.events': 'Calendrier (événements)',
      
      // Google Workspace Apps
      'https://www.googleapis.com/auth/drive': 'Google Drive',
      'https://www.googleapis.com/auth/documents': 'Google Docs',
      'https://www.googleapis.com/auth/spreadsheets': 'Google Sheets',
      'https://www.googleapis.com/auth/presentations': 'Google Slides',
      
      // Communication
      'https://www.googleapis.com/auth/meetings': 'Google Meet',
      'https://www.googleapis.com/auth/contacts': 'Google Contacts',
      
      // Formulaires et automation
      'https://www.googleapis.com/auth/forms': 'Google Forms',
      'https://www.googleapis.com/auth/script.projects': 'Apps Script',
      
      // Administration
      'https://www.googleapis.com/auth/admin.directory.user': 'Admin Utilisateurs',
      'https://www.googleapis.com/auth/admin.directory.group': 'Admin Groupes',
      'https://www.googleapis.com/auth/admin.directory.orgunit': 'Admin Unités',
      'https://www.googleapis.com/auth/admin.directory.resource.calendar': 'Admin Ressources'
    };
    return scopeLabels[scope] || scope;
  };

  if (loading && !connectionStatus) {
    return (
      <Card title="Connexion Google Workspace">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Vérification du statut de connexion...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <GoogleOutlined style={{ color: '#4285f4' }} />
          <span>Connexion Google Workspace</span>
          {connectionStatus?.isConnected && (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Connecté
            </Tag>
          )}
          {connectionStatus?.isConnected === false && (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Non connecté
            </Tag>
          )}
        </Space>
      }
      extra={
        connectionStatus?.isConnected ? (
          <Button
            type="default"
            danger
            icon={<DisconnectOutlined />}
            loading={loading}
            onClick={handleDisconnect}
          >
            Déconnecter
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            loading={loading}
            onClick={handleConnect}
          >
            Connecter Google
          </Button>
        )
      }
    >
      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {connectionStatus?.isConnected ? (
        <div>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Informations de base */}
            <div>
              <Text strong>Statut de connexion :</Text>
              <div style={{ marginTop: 4 }}>
                {connectionStatus.accessType === 'personal' && (
                  <Tag color="blue" icon={<CheckCircleOutlined />}>
                    Connexion personnelle
                  </Tag>
                )}
                {connectionStatus.accessType === 'organization' && (
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    Connexion via organisation
                  </Tag>
                )}
              </div>
            </div>

            {/* Informations sur le compte connecté */}
            <div>
              <Text strong>Compte Google utilisé :</Text>
              <div style={{ marginTop: 4 }}>
                <Text>
                  {connectionStatus.userInfo?.email || 
                   connectionStatus.organizationInfo?.userInfo?.email || 
                   connectionStatus.email || 'Email non disponible'}
                </Text>
                {connectionStatus.organizationInfo?.primaryUser && connectionStatus.accessType === 'organization' && (
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    Connecté par {connectionStatus.organizationInfo.primaryUser.email} 
                    ({connectionStatus.organizationInfo.primaryUser.role})
                  </div>
                )}
              </div>
            </div>

            {/* Dates de connexion */}
            {(connectionStatus.connectedAt || connectionStatus.organizationInfo?.primaryUser?.connectedAt) && (
              <div>
                <Text strong>Connecté depuis :</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>
                    {new Date(
                      connectionStatus.connectedAt || 
                      connectionStatus.organizationInfo?.primaryUser?.connectedAt || ''
                    ).toLocaleString()}
                  </Text>
                </div>
              </div>
            )}

            {/* Dernière synchronisation */}
            {(connectionStatus.lastSync || connectionStatus.organizationInfo?.primaryUser?.lastSync) && (
              <div>
                <Text strong>Dernière synchronisation :</Text>
                <div style={{ marginTop: 4 }}>
                  <Text>
                    {new Date(
                      connectionStatus.lastSync || 
                      connectionStatus.organizationInfo?.primaryUser?.lastSync || ''
                    ).toLocaleString()}
                  </Text>
                </div>
              </div>
            )}

            <Divider />

            {/* Permissions accordées */}
            <div>
              <Text strong>Permissions accordées :</Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {(connectionStatus.scopes || connectionStatus.organizationInfo?.scopes || []).map((scope, index) => (
                    <Tag key={index} color="blue">
                      {getScopeLabel(scope)}
                    </Tag>
                  )) || (
                    <Text type="secondary">Aucune information sur les permissions</Text>
                  )}
                </Space>
              </div>
            </div>

            {/* Statistiques organisation (si applicable) */}
            {connectionStatus.organizationInfo && connectionStatus.accessType === 'organization' && (
              <div>
                <Text strong>Utilisateurs connectés dans l'organisation :</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="cyan">
                    {connectionStatus.organizationInfo.connectedUsers} utilisateur(s)
                  </Tag>
                </div>
              </div>
            )}

            <Alert
              message="Connexion active"
              description={
                connectionStatus.accessType === 'personal' 
                  ? "Votre compte Google personnel est connecté. Vous pouvez utiliser toutes les fonctionnalités Google dans le CRM."
                  : "Vous utilisez la connexion Google de votre organisation. Toutes les fonctionnalités Google sont disponibles."
              }
              type="success"
              showIcon
            />
          </Space>
        </div>
      ) : (
        <div>
          <Alert
            message="Connexion requise"
            description="Connectez votre compte Google Workspace pour utiliser Gmail, Calendar, Drive et Meet directement dans le CRM."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Title level={5}>Fonctionnalités disponibles après connexion :</Title>
          <ul>
            <li>📧 <strong>Gmail :</strong> Gestion des emails, envoi, réception et organisation</li>
            <li>📅 <strong>Calendar :</strong> Synchronisation des événements et création de réunions</li>
            <li>💾 <strong>Drive :</strong> Stockage et partage de fichiers</li>
            <li>📹 <strong>Meet :</strong> Création et gestion des visioconférences</li>
          </ul>
        </div>
      )}
    </Card>
  );
};
