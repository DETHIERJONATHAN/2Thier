import { useCallback } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { message } from 'antd';

interface CallActivity {
  leadId: string;
  type: 'call' | 'sms' | 'voicemail';
  phoneNumber: string;
  timestamp: Date;
  duration?: number;
  message?: string;
  transcription?: string;
  callId?: string;
  status: string;
}

export const useGoogleVoiceIntegration = () => {
  const api = useAuthenticatedApi();

  // Initier un appel vers un lead
  const makeCallToLead = useCallback(async (leadId: string, phoneNumber: string) => {
    try {
      const response = await api.api.post('/google-voice/make-call', {
        fromNumber: 'auto', // Le système utilisera le numéro de l'utilisateur connecté
        toNumber: phoneNumber,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      // Enregistrer l'activité dans l'historique du lead
      await api.api.post(`/leads/${leadId}/activities`, {
        type: 'google_voice_call',
        description: `Appel initié vers ${phoneNumber}`,
        metadata: {
          callId: response.callRecord?.id,
          phoneNumber,
          direction: 'outbound',
          timestamp: new Date().toISOString()
        }
      });

      message.success('Appel initié avec succès');
      return response.callRecord;
    } catch (error) {
      console.error('Erreur lors de l\'appel:', error);
      message.error('Erreur lors de l\'initiation de l\'appel');
      throw error;
    }
  }, [api]);

  // Envoyer un SMS à un lead
  const sendSMSToLead = useCallback(async (leadId: string, phoneNumber: string, messageText: string) => {
    try {
      const response = await api.api.post('/google-voice/send-sms', {
        fromNumber: 'auto',
        toNumber: phoneNumber,
        message: messageText,
        context: {
          leadId,
          source: 'crm_lead'
        }
      });

      // Enregistrer l'activité dans l'historique du lead
      await api.api.post(`/leads/${leadId}/activities`, {
        type: 'google_voice_sms',
        description: `SMS envoyé à ${phoneNumber}`,
        metadata: {
          messageId: response.smsMessage?.id,
          phoneNumber,
          message: messageText,
          direction: 'outbound',
          timestamp: new Date().toISOString()
        }
      });

      message.success('SMS envoyé avec succès');
      return response.smsMessage;
    } catch (error) {
      console.error('Erreur lors de l\'envoi SMS:', error);
      message.error('Erreur lors de l\'envoi du SMS');
      throw error;
    }
  }, [api]);

  // Récupérer l'historique des communications Google Voice pour un lead
  const getLeadVoiceHistory = useCallback(async (leadId: string) => {
    try {
      const response = await api.api.get(`/leads/${leadId}/voice-history`);
      return response.activities || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  }, [api]);

  // Obtenir le statut Google Voice de l'utilisateur connecté
  const getUserVoiceStatus = useCallback(async () => {
    try {
      const response = await api.api.get('/google-voice/my-status');
      return {
        hasVoiceNumber: response.hasVoiceNumber,
        voiceNumber: response.voiceNumber,
        isConfigured: response.isConfigured
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du statut Voice:', error);
      return {
        hasVoiceNumber: false,
        voiceNumber: null,
        isConfigured: false
      };
    }
  }, [api]);

  // Marquer un appel comme terminé avec des détails
  const completeCall = useCallback(async (callId: string, duration: number, notes?: string) => {
    try {
      await api.api.put(`/google-voice/calls/${callId}/complete`, {
        duration,
        notes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'appel:', error);
    }
  }, [api]);

  // Ajouter des notes post-appel à un lead
  const addCallNotes = useCallback(async (leadId: string, callId: string, notes: string) => {
    try {
      await api.api.post(`/leads/${leadId}/call-notes`, {
        callId,
        notes,
        timestamp: new Date().toISOString()
      });

      message.success('Notes d\'appel sauvegardées');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      message.error('Erreur lors de la sauvegarde des notes');
    }
  }, [api]);

  return {
    makeCallToLead,
    sendSMSToLead,
    getLeadVoiceHistory,
    getUserVoiceStatus,
    completeCall,
    addCallNotes
  };
};

export default useGoogleVoiceIntegration;
