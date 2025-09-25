import { useCallback, useEffect, useState } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';
import { message } from 'antd';

interface GoogleConnectionStatus {
  isConnected: boolean;
  connectionType?: 'personal' | 'organization' | 'workspace';
  lastConnected?: Date;
  needsReauth?: boolean;
}

interface AutoGoogleAuthResult {
  success: boolean;
  isConnected: boolean;
  needsManualAuth: boolean;
  authUrl?: string;
  message: string;
}

/**
 * Hook pour gérer la connexion automatique à Google Workspace
 * Fournit des méthodes pour vérifier le statut et initier la connexion
 */
export const useAutoGoogleAuth = () => {
  const { api } = useAuthenticatedApi();
  const { user, currentOrganization } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus>({
    isConnected: false,
    needsReauth: true
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Obtient le statut de connexion Google actuel
   */
  const getConnectionStatus = useCallback(async (): Promise<GoogleConnectionStatus> => {
    if (!user?.id) {
      return {
        isConnected: false,
        needsReauth: true
      };
    }

    try {
      const response = await api.get(`/auto-google-auth/status?userId=${user.id}&organizationId=${currentOrganization?.id || ''}`) as GoogleConnectionStatus;
      return response;
    } catch (error) {
      console.error('Erreur récupération statut Google:', error);
      return {
        isConnected: false,
        needsReauth: true
      };
    }
  }, [api, user?.id, currentOrganization?.id]);

  /**
   * Rafraîchit le statut de connexion
   */
  const refreshConnectionStatus = useCallback(async (): Promise<void> => {
    const status = await getConnectionStatus();
    setConnectionStatus(status);
  }, [getConnectionStatus]);

  /**
   * Force la connexion automatique à Google
   */
  const triggerAutoConnection = useCallback(async (): Promise<AutoGoogleAuthResult> => {
    if (!user?.id) {
      return {
        success: false,
        isConnected: false,
        needsManualAuth: true,
        message: 'Utilisateur non connecté'
      };
    }

    setIsLoading(true);
    try {
      const response = await api.post('/api/auto-google-auth/connect', {
        userId: user.id,
        organizationId: currentOrganization?.id
      }) as AutoGoogleAuthResult;

      if (response.success && response.isConnected) {
        message.success('Connexion Google automatique réussie !');
        // Mettre à jour le statut local
        await refreshConnectionStatus();
      } else if (response.needsManualAuth && response.authUrl) {
        message.info('Première connexion Google requise. Vous allez être redirigé...');
        // Ouvrir l'URL d'autorisation dans un nouvel onglet
        window.open(response.authUrl, '_blank', 'width=600,height=700');
      }

      return response;
    } catch (error) {
      console.error('Erreur connexion automatique Google:', error);
      const errorMsg = 'Erreur lors de la connexion automatique à Google';
      message.error(errorMsg);
      return {
        success: false,
        isConnected: false,
        needsManualAuth: true,
        message: errorMsg
      };
    } finally {
      setIsLoading(false);
    }
  }, [api, user?.id, currentOrganization?.id, refreshConnectionStatus]);

  /**
   * Vérifie si l'utilisateur est connecté à Google
   */
  const checkGoogleConnection = useCallback(async (): Promise<boolean> => {
    const status = await getConnectionStatus();
    return status.isConnected;
  }, [getConnectionStatus]);

  /**
   * Affiche le statut de connexion actuel
   */
  const showConnectionStatus = useCallback(() => {
    if (connectionStatus.isConnected) {
      const typeText = connectionStatus.connectionType === 'workspace' 
        ? 'via Google Workspace' 
        : connectionStatus.connectionType === 'organization'
        ? 'via organisation'
        : 'personnelle';
      
      message.success(`Google connecté (${typeText})`);
    } else {
      message.warning('Google non connecté. Connexion requise.');
    }
  }, [connectionStatus]);

  /**
   * Ouvre manuellement la page de connexion Google
   */
  const openManualConnection = useCallback(() => {
    // Rediriger vers la page de profil où se trouve la connexion Google
    window.location.href = '/profile';
  }, []);

  // Charger le statut initial et écouter les changements d'utilisateur
  useEffect(() => {
    if (user?.id) {
      refreshConnectionStatus();
    } else {
      setConnectionStatus({
        isConnected: false,
        needsReauth: true
      });
    }
  }, [user?.id, currentOrganization?.id, refreshConnectionStatus]);

  // Écouter les événements de connexion Google (si vous implémentez des WebSockets)
  useEffect(() => {
    const handleGoogleConnected = () => {
      console.log('[useAutoGoogleAuth] Google connecté automatiquement détecté');
      refreshConnectionStatus();
      message.success('Google Workspace connecté automatiquement !');
    };

    const handleGoogleAuthRequired = () => {
      console.log('[useAutoGoogleAuth] Autorisation Google manuelle requise détectée');
      message.info('Connexion Google requise. Cliquez ici pour vous connecter.', 5);
    };

    // TODO: Écouter les événements WebSocket ou Server-Sent Events
    // if (window.socketService) {
    //   window.socketService.on('GOOGLE_AUTO_CONNECTED', handleGoogleConnected);
    //   window.socketService.on('GOOGLE_MANUAL_AUTH_REQUIRED', handleGoogleAuthRequired);
    // }

    // Nettoyage
    return () => {
      // TODO: Nettoyer les écouteurs d'événements
      // if (window.socketService) {
      //   window.socketService.off('GOOGLE_AUTO_CONNECTED', handleGoogleConnected);
      //   window.socketService.off('GOOGLE_MANUAL_AUTH_REQUIRED', handleGoogleAuthRequired);
      // }
    };
  }, [refreshConnectionStatus]);

  return {
    connectionStatus,
    isLoading,
    getConnectionStatus,
    triggerAutoConnection,
    refreshConnectionStatus,
    checkGoogleConnection,
    showConnectionStatus,
    openManualConnection,
    
    // Propriétés de convenance
    isConnected: connectionStatus.isConnected,
    needsReauth: connectionStatus.needsReauth,
    connectionType: connectionStatus.connectionType,
    lastConnected: connectionStatus.lastConnected
  };
};
