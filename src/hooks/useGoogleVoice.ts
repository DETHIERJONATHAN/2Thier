import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { message } from 'antd';

interface GoogleVoiceUser {
  phoneNumber: string;
  displayName: string;
  email: string;
  voiceSettings?: {
    doNotDisturb: boolean;
    voicemailTranscription: boolean;
    callScreening: boolean;
  };
  callForwarding?: string[];
}

interface GoogleVoiceConfig {
  configured: boolean;
  domain?: string;
  delegatedUserEmail?: string;
  isActive?: boolean;
  lastSync?: string;
  createdAt?: string;
}

interface CallRecord {
  id: string;
  fromNumber: string;
  toNumber: string;
  duration: number;
  timestamp: Date;
  type: 'inbound' | 'outbound' | 'missed';
  recordingUrl?: string;
  transcription?: string;
}

interface SMSMessage {
  id: string;
  fromNumber: string;
  toNumber: string;
  message: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'failed';
}

export const useGoogleVoice = () => {
  const [config, setConfig] = useState<GoogleVoiceConfig | null>(null);
  const [users, setUsers] = useState<GoogleVoiceUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const apiHook = useAuthenticatedApi();
  
  // Stabilisation de l'instance API
  const api = useMemo(() => apiHook.api, [apiHook]);

  // Chargement de la configuration
  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const response = await api.get('/google-voice/config');
      setConfig(response);
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement de la config Google Voice:', error);
      throw error;
    } finally {
      setConfigLoading(false);
    }
  }, [api]);

  // Chargement des utilisateurs
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/google-voice/users');
      setUsers(response.users || []);
      return response.users || [];
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs Google Voice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Sauvegarde de la configuration
  const saveConfig = useCallback(async (configData: {
    privateKey: string;
    clientEmail: string;
    domain: string;
    delegatedUserEmail: string;
  }) => {
    try {
      setConfigLoading(true);
      const response = await api.post('/google-voice/config', configData);
      await loadConfig(); // Recharger la config après sauvegarde
      return response;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la config:', error);
      throw error;
    } finally {
      setConfigLoading(false);
    }
  }, [api, loadConfig]);

  // Test de connexion
  const testConnection = useCallback(async () => {
    try {
      setConfigLoading(true);
      const response = await api.post('/google-voice/test-connection', {});
      if (response.success) {
        await loadConfig(); // Recharger la config après test réussi
      }
      return response;
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      throw error;
    } finally {
      setConfigLoading(false);
    }
  }, [api, loadConfig]);

  // Initialisation d'un utilisateur
  const initializeUser = useCallback(async (userEmail: string, displayName: string) => {
    try {
      setLoading(true);
      const response = await api.post('/google-voice/initialize-user', {
        userEmail,
        displayName
      });
      await loadUsers(); // Recharger les utilisateurs
      return response;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'utilisateur:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api, loadUsers]);

  // Passage d'appel
  const makeCall = useCallback(async (fromNumber: string, toNumber: string) => {
    try {
      const response = await api.post('/google-voice/make-call', {
        fromNumber,
        toNumber
      });
      message.success(`Appel initié de ${fromNumber} vers ${toNumber}`);
      return response;
    } catch (error) {
      console.error('Erreur lors de l\'appel:', error);
      message.error('Erreur lors de l\'initiation de l\'appel');
      throw error;
    }
  }, [api]);

  // Envoi de SMS
  const sendSMS = useCallback(async (fromNumber: string, toNumber: string, messageText: string) => {
    try {
      const response = await api.post('/google-voice/send-sms', {
        fromNumber,
        toNumber,
        message: messageText
      });
      message.success(`SMS envoyé de ${fromNumber} vers ${toNumber}`);
      return response;
    } catch (error) {
      console.error('Erreur lors de l\'envoi SMS:', error);
      message.error('Erreur lors de l\'envoi du SMS');
      throw error;
    }
  }, [api]);

  // Mise à jour des paramètres utilisateur
  const updateUserSettings = useCallback(async (
    userEmail: string, 
    settings: {
      voiceSettings?: GoogleVoiceUser['voiceSettings'];
      callForwarding?: string[];
    }
  ) => {
    try {
      setLoading(true);
      const response = await api.put(`/google-voice/settings/${userEmail}`, settings);
      await loadUsers(); // Recharger les utilisateurs
      return response;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api, loadUsers]);

  // Activation/désactivation du mode Ne pas déranger
  const toggleDoNotDisturb = useCallback(async (userEmail: string, enabled: boolean) => {
    try {
      const response = await api.post('/google-voice/do-not-disturb', {
        userEmail,
        enabled
      });
      await loadUsers(); // Recharger les utilisateurs
      return response;
    } catch (error) {
      console.error('Erreur lors de la modification du mode Ne pas déranger:', error);
      throw error;
    }
  }, [api, loadUsers]);

  // Récupération de l'historique des appels
  const getCallHistory = useCallback(async (userEmail: string, limit: number = 50): Promise<CallRecord[]> => {
    try {
      const response = await api.get(`/google-voice/call-history/${userEmail}?limit=${limit}`);
      return response.calls || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des appels:', error);
      throw error;
    }
  }, [api]);

  // Récupération de l'historique des SMS
  const getSMSHistory = useCallback(async (userEmail: string, limit: number = 50): Promise<SMSMessage[]> => {
    try {
      const response = await api.get(`/google-voice/sms-history/${userEmail}?limit=${limit}`);
      return response.messages || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique SMS:', error);
      throw error;
    }
  }, [api]);

  // Chargement initial
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // État de configuration
  const isConfigured = config?.configured && config?.isActive;

  return {
    // État
    config,
    users,
    loading,
    configLoading,
    isConfigured,

    // Actions de configuration
    loadConfig,
    saveConfig,
    testConnection,

    // Actions utilisateurs
    loadUsers,
    initializeUser,
    updateUserSettings,
    toggleDoNotDisturb,

    // Actions téléphonie
    makeCall,
    sendSMS,
    getCallHistory,
    getSMSHistory
  };
};

export default useGoogleVoice;
