import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spin, Tag, Space, Typography, Divider } from 'antd';
import { GoogleOutlined, DisconnectOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { logger } from '../lib/logger';

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
    userInfo?: unknown;
  };
  userInfo?: unknown;
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
    logger.debug('[GoogleConnectionCard] 🔍 Début checkConnectionStatus');
    logger.debug('[GoogleConnectionCard] 🏢 OrganizationId:', organizationId);
    
    if (!organizationId) {
      logger.debug('[GoogleConnectionCard] ⚠️ Pas d\'organizationId, impossible de vérifier le statut');
      setConnectionStatus({ isConnected: false });
      setError('Organization ID requis pour vérifier la connexion Google');
      return;
    }
    
    try {
      setLoading(true);
      // Passer l'organizationId dans la requête
      const statusUrl = `/api/google-auth/status?organizationId=${organizationId}`;
      logger.debug('[GoogleConnectionCard] 📡 Appel API:', statusUrl);
      
      const responseData = await api.get(statusUrl);
      logger.debug('[GoogleConnectionCard] ✅ Données status reçues:', responseData);
      logger.debug('[GoogleConnectionCard] 📊 Structure responseData:', JSON.stringify(responseData, null, 2));
      logger.debug('[GoogleConnectionCard] 🔍 responseData.data:', responseData.data);
      logger.debug('[GoogleConnectionCard] 🔍 responseData.connected:', responseData.connected);
      logger.debug('[GoogleConnectionCard] 🔍 responseData.data?.connected:', responseData.data?.connected);
      
      // L'API retourne { success: true, data: { connected: true/false, ... } }
      const statusData = responseData.data || responseData;
      setConnectionStatus({ isConnected: statusData.connected, ...statusData });
      setError(null);
      logger.debug('[GoogleConnectionCard] 📊 ConnectionStatus mis à jour:', { isConnected: statusData.connected, ...statusData });
    } catch (err: unknown) {
      logger.debug('[GoogleConnectionCard] ❌ Erreur dans checkConnectionStatus:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification du statut';
      logger.debug('[GoogleConnectionCard] 📝 Message erreur status:', errorMessage);
      setError(errorMessage);
      setConnectionStatus({ isConnected: false });
    } finally {
      logger.debug('[GoogleConnectionCard] 🏁 Fin checkConnectionStatus');
      setLoading(false);
    }
  }, [api, organizationId]);

  const handleConnect = async () => {
    logger.debug('[GoogleConnectionCard] 🚀 Début handleConnect');
    logger.debug('[GoogleConnectionCard] État loading avant:', loading);
    
    try {
      setLoading(true);
      logger.debug('[GoogleConnectionCard] 📡 Appel API /api/google-auth/connect...');
      logger.debug('[GoogleConnectionCard] 🏢 Avec organizationId:', organizationId);
      
      // Construire l'URL avec organizationId si fourni
      const connectUrl = organizationId 
        ? `/api/google-auth/connect?organizationId=${organizationId}`
        : '/api/google-auth/connect';
        
      logger.debug('[GoogleConnectionCard] 🔗 URL de connexion:', connectUrl);
      
      const responseData = await api.get(connectUrl);
      logger.debug('[GoogleConnectionCard] ✅ Données API reçues:', responseData);
      logger.debug('[GoogleConnectionCard] 📊 Structure complète responseData:', JSON.stringify(responseData, null, 2));
      logger.debug('[GoogleConnectionCard] 🔍 Type des données:', typeof responseData);
      logger.debug('[GoogleConnectionCard] 🔍 Clés des données:', Object.keys(responseData || {}));
      
      if (!responseData) {
        logger.debug('[GoogleConnectionCard] ❌ responseData est undefined/null');
        setError('Réponse vide du serveur');
        return;
      }
      
      logger.debug('[GoogleConnectionCard] 🔑 Recherche authUrl dans:', responseData);
      const authUrl = responseData?.data?.authUrl || responseData?.authUrl;
      logger.debug('[GoogleConnectionCard] 🔗 authUrl extrait:', authUrl);
      
      if (!authUrl) {
        logger.debug('[GoogleConnectionCard] ❌ authUrl manquant dans la réponse');
        logger.debug('[GoogleConnectionCard] 📋 Contenu complet des données:', JSON.stringify(responseData, null, 2));
        setError('URL d\'authentification manquante');
        return;
      }
      
      logger.debug('[GoogleConnectionCard] 🪟 Ouverture popup avec URL:', authUrl);
      
      // Ouvrir la fenêtre d'authentification Google
      const popup = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      logger.debug('[GoogleConnectionCard] 🪟 Popup créée:', popup ? 'Succès' : 'Échec');

      // Écouter la fermeture de la popup
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          logger.debug('[GoogleConnectionCard] 🪟 Popup fermée, vérification du statut...');
          // Attendre un peu puis vérifier le statut
          setTimeout(() => {
            checkConnectionStatus();
          }, 1000);
        }
      }, 1000);

    } catch (err: unknown) {
      logger.debug('[GoogleConnectionCard] ❌ Erreur dans handleConnect:', err);
      logger.debug('[GoogleConnectionCard] 🔍 Type erreur:', typeof err);
      logger.debug('[GoogleConnectionCard] 📋 Détails erreur:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la connexion';
      logger.debug('[GoogleConnectionCard] 📝 Message erreur final:', errorMessage);
      setError(errorMessage);
    } finally {
      logger.debug('[GoogleConnectionCard] 🏁 Fin handleConnect, setLoading(false)');
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
      'https://mail.google.com/': 'Zhiive Mail (accès complet)',
      'https://www.googleapis.com/auth/gmail.readonly': 'Zhiive Mail (lecture)',
      'https://www.googleapis.com/auth/gmail.send': 'Zhiive Mail (envoi)',
      'https://www.googleapis.com/auth/gmail.modify': 'Zhiive Mail (modification)',
      'https://www.googleapis.com/auth/gmail.labels': 'Zhiive Mail (étiquettes)',
      
      // Calendar COMPLET
      'https://www.googleapis.com/auth/calendar': 'Agenda',
      'https://www.googleapis.com/auth/calendar.events': 'Agenda (événements)',
      
      // Google Workspace Apps
      'https://www.googleapis.com/auth/drive': 'Stockage',
      'https://www.googleapis.com/auth/documents': 'Documents',
      'https://www.googleapis.com/auth/spreadsheets': 'Tableurs',
      'https://www.googleapis.com/auth/presentations': 'Présentations',
      
      // Communication
      'https://www.googleapis.com/auth/meetings': 'Conférences',
      'https://www.googleapis.com/auth/contacts': 'Contacts',
      
      // Formulaires et automation
      'https://www.googleapis.com/auth/forms': 'Formulaires',
      'https://www.googleapis.com/auth/script.projects': 'Scripts',
      
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
                    <Tag key={`item-${index}`} color="blue">
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
                  ? "Votre compte Google personnel est connecté. Vous pouvez utiliser toutes les fonctionnalités Google dans le Hive."
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
            description="Connectez votre compte professionnel pour utiliser Zhiive Mail, Agenda, Stockage et Conférences directement dans la Ruche."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Title level={5}>Fonctionnalités disponibles après connexion :</Title>
          <ul>
            <li>📧 <strong>Zhiive Mail :</strong> Gestion des emails, envoi, réception et organisation</li>
            <li>📅 <strong>Agenda :</strong> Synchronisation des événements et création de réunions</li>
            <li>💾 <strong>Stockage :</strong> Stockage et partage de fichiers</li>
            <li>📹 <strong>Conférences :</strong> Création et gestion des visioconférences</li>
          </ul>
        </div>
      )}
    </Card>
  );
};
