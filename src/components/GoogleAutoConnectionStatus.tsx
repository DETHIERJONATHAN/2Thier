import React, { useEffect, useState } from 'react';
import { Card, Button, Alert, Tag, Tooltip, Space } from 'antd';
import { 
  GoogleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ReloadOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useAutoGoogleAuth } from '../hooks/useAutoGoogleAuth';

interface GoogleAutoConnectionStatusProps {
  showManualActions?: boolean;
  compact?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

/**
 * Composant d'affichage du statut de connexion automatique Google Workspace
 * Affiche l'état actuel et permet la connexion manuelle si nécessaire
 */
export const GoogleAutoConnectionStatus: React.FC<GoogleAutoConnectionStatusProps> = ({
  showManualActions = true,
  compact = false,
  onConnectionChange
}) => {
  const {
    connectionStatus,
    isLoading,
    triggerAutoConnection,
    refreshConnectionStatus,
    showConnectionStatus,
    openManualConnection
  } = useAutoGoogleAuth();

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Notifier les changements de connexion
  useEffect(() => {
    onConnectionChange?.(connectionStatus.isConnected);
  }, [connectionStatus.isConnected, onConnectionChange]);

  // Rafraîchir automatiquement le statut toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshConnectionStatus();
      setLastRefresh(new Date());
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [refreshConnectionStatus]);

  const handleRefresh = async () => {
    await refreshConnectionStatus();
    setLastRefresh(new Date());
  };

  const handleTriggerConnection = async () => {
    await triggerAutoConnection();
    setLastRefresh(new Date());
  };

  const getStatusColor = () => {
    if (connectionStatus.isConnected) return 'success';
    if (connectionStatus.needsReauth) return 'warning';
    return 'default';
  };

  const getStatusIcon = () => {
    if (connectionStatus.isConnected) {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if (connectionStatus.needsReauth) {
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
    return <GoogleOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getStatusText = () => {
    if (connectionStatus.isConnected) {
      const typeText = connectionStatus.connectionType === 'workspace' 
        ? 'Google Workspace' 
        : connectionStatus.connectionType === 'organization'
        ? 'Organisation'
        : 'Personnel';
      return `Connecté (${typeText})`;
    }
    if (connectionStatus.needsReauth) {
      return 'Connexion requise';
    }
    return 'Non connecté';
  };

  const getLastConnectedText = () => {
    if (connectionStatus.lastConnected) {
      const date = new Date(connectionStatus.lastConnected);
      return `Dernière connexion: ${date.toLocaleDateString()} à ${date.toLocaleTimeString()}`;
    }
    return null;
  };

  if (compact) {
    return (
      <Space size="middle">
        {getStatusIcon()}
        <Tag color={getStatusColor()}>
          Google: {getStatusText()}
        </Tag>
        
        {showManualActions && (
          <Space size="small">
            <Tooltip title="Rafraîchir le statut">
              <Button 
                type="text" 
                size="small"
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={handleRefresh}
              />
            </Tooltip>
            
            {!connectionStatus.isConnected && (
              <Tooltip title="Connecter Google">
                <Button 
                  type="text" 
                  size="small"
                  icon={<LinkOutlined />}
                  loading={isLoading}
                  onClick={handleTriggerConnection}
                />
              </Tooltip>
            )}
          </Space>
        )}
      </Space>
    );
  }

  return (
    <Card
      title={
        <Space>
          <GoogleOutlined />
          Connexion Automatique Google Workspace
        </Space>
      }
      extra={
        showManualActions && (
          <Space>
            <Tooltip title="Rafraîchir le statut">
              <Button 
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={handleRefresh}
              />
            </Tooltip>
            
            <Button 
              type="primary"
              icon={<GoogleOutlined />}
              loading={isLoading}
              onClick={showConnectionStatus}
            >
              Statut
            </Button>
          </Space>
        )
      }
      style={{ marginBottom: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Statut principal */}
        <Alert
          type={connectionStatus.isConnected ? 'success' : connectionStatus.needsReauth ? 'warning' : 'info'}
          icon={getStatusIcon()}
          message={
            <Space>
              <strong>{getStatusText()}</strong>
              {connectionStatus.isConnected && (
                <Tag color="green">Actif</Tag>
              )}
            </Space>
          }
          description={
            <div>
              {connectionStatus.isConnected ? (
                <div>
                  <p>✅ Votre compte Google Workspace est connecté automatiquement.</p>
                  <p>Vous avez accès à Gmail, Calendar, Drive et toutes les applications Google.</p>
                  {getLastConnectedText() && (
                    <small style={{ color: '#8c8c8c' }}>{getLastConnectedText()}</small>
                  )}
                </div>
              ) : connectionStatus.needsReauth ? (
                <div>
                  <p>⚠️ Une connexion Google est requise pour accéder aux fonctionnalités.</p>
                  <p>Cliquez sur "Connecter" pour autoriser l'accès automatique.</p>
                </div>
              ) : (
                <div>
                  <p>ℹ️ Connexion Google non configurée.</p>
                  <p>Configurez votre compte Google pour bénéficier de l'intégration complète.</p>
                </div>
              )}
            </div>
          }
          showIcon
        />

        {/* Actions */}
        {showManualActions && (
          <Space wrap>
            {!connectionStatus.isConnected && (
              <>
                <Button 
                  type="primary"
                  icon={<GoogleOutlined />}
                  loading={isLoading}
                  onClick={handleTriggerConnection}
                >
                  Connecter Automatiquement
                </Button>
                
                <Button 
                  icon={<LinkOutlined />}
                  onClick={openManualConnection}
                >
                  Connexion Manuelle
                </Button>
              </>
            )}
            
            <Button 
              icon={<ReloadOutlined />}
              loading={isLoading}
              onClick={handleRefresh}
            >
              Actualiser
            </Button>
          </Space>
        )}

        {/* Informations supplémentaires */}
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
          <p>Dernière vérification: {lastRefresh.toLocaleTimeString()}</p>
          <p>
            💡 <strong>Astuce:</strong> La connexion se fait automatiquement lors de votre connexion au CRM.
            {connectionStatus.isConnected 
              ? ' Vous n\'avez plus besoin de vous connecter manuellement à Google !' 
              : ' Une fois configurée, vous n\'aurez plus à vous soucier de la connexion Google.'}
          </p>
        </div>
      </Space>
    </Card>
  );
};

export default GoogleAutoConnectionStatus;
