/**
 * 🎣 useCallLogic - Hook principal pour la gestion des appels
 * 
 * Centralise toute la logique métier des appels Telnyx
 * avec intégration IA et sauvegarde intelligente
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { CALL_STATUSES, CallStatusType } from '../../../constants/callStatuses';
import { NotificationManager } from '../../../components/Notifications';
import type { 
  UseCallLogicReturn, 
  CallState, 
  CallStatusType,
  TelnyxResponse,
  CallSaveResponse,
  Lead
} from '../types/CallTypes';

export const useCallLogic = (
  leadId: string, 
  lead: Lead | null,
  onCallComplete?: () => void
): UseCallLogicReturn => {
  
  const { api } = useAuthenticatedApi();
  
  // 📞 États principaux du call
  const [callState, setCallState] = useState<CallState>({
    isInProgress: false,
    startTime: null,
    duration: 0,
    status: '',
    notes: '',
    isFormValid: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  
  // ⏱️ Timer pour la durée d'appel en temps réel
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callState.isInProgress && callState.startTime) {
      interval = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - prev.startTime!.getTime()) / 1000)
        }));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isInProgress, callState.startTime]);

  // 📝 Validation du formulaire en temps réel (protégée + sans rerender inutile)
  useEffect(() => {
    // Sécuriser le type des notes (évite TypeError si un objet est passé par erreur)
    const notesValue = typeof callState.notes === 'string' ? callState.notes : (callState.notes == null ? '' : String(callState.notes));
    const hasNotes = notesValue.trim().length > 0;
    const hasStatus = (callState.status || '').length > 0;
    const newValid = hasNotes || hasStatus;

    setCallState(prev => prev.isFormValid === newValid ? prev : { ...prev, isFormValid: newValid });
  }, [callState.notes, callState.status]);

  // 🎯 Formatage de la durée d'appel
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 📞 Démarrer l'appel via Telnyx
  const startCall = useCallback(async (): Promise<void> => {
    if (!lead?.data?.phone) {
      setError('Numéro de téléphone manquant');
      NotificationManager.error('Numéro de téléphone manquant');
      return;
    }
    
    setIsLoading(true);
    setError(undefined);
    
    try {
      console.log('[useCallLogic] 🚀 Démarrage appel vers:', lead.data.phone);
      
      // 🤖 API Telnyx - Appel réel
      const response = await api.post<TelnyxResponse>('/api/telnyx/calls', {
        to: lead.data.phone,
        from: process.env.REACT_APP_TELNYX_PHONE_NUMBER || '+3228086660',
        leadId: leadId,
        metadata: {
          leadName: lead.data.name,
          company: lead.data.company,
          source: lead.source
        }
      });
      
      if (response.success) {
        // ✅ Appel démarré avec succès
        setCallState(prev => ({
          ...prev,
          isInProgress: true,
          startTime: new Date(),
          duration: 0
        }));
        
        console.log('[useCallLogic] ✅ Appel démarré - ID:', response.callId);
        NotificationManager.success('Appel en cours...');
        
        // 🤖 Déclencher analyse IA en arrière-plan
        api.post('/api/ai/start-call-analysis', {
          callId: response.callId,
          leadId: leadId,
          prospectProfile: {
            name: lead.data.name,
            company: lead.data.company,
            industry: lead.data.industry,
            previousInteractions: lead.notes
          }
        }).catch(err => {
          console.warn('[useCallLogic] ⚠️ Erreur démarrage analyse IA:', err);
        });
        
      } else {
        throw new Error(response.error || 'Erreur lors du démarrage de l\'appel');
      }
      
    } catch (error: unknown) {
      console.error('[useCallLogic] ❌ Erreur démarrage appel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du démarrage de l\'appel';
      setError(errorMessage);
      NotificationManager.error('Erreur lors du démarrage de l\'appel');
      
      // Reset état en cas d'erreur
      setCallState(prev => ({
        ...prev,
        isInProgress: false,
        startTime: null,
        duration: 0
      }));
      
    } finally {
      setIsLoading(false);
    }
  }, [lead, leadId, api]);

  // 📞 Terminer l'appel avec sauvegarde intelligente
  const endCall = useCallback(async (): Promise<void> => {
    if (!callState.isFormValid) {
      NotificationManager.warning('Veuillez choisir un statut d\'appel OU rédiger une note avant de terminer');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[useCallLogic] 🏁 Fin d\'appel - Sauvegarde...');
      
      // 💾 Sauvegarder les informations de l'appel
      const callData = {
        leadId: leadId,
        status: callState.status,
        notes: callState.notes,
        duration: callState.duration,
        timestamp: new Date().toISOString(),
        startTime: callState.startTime?.toISOString(),
        endTime: new Date().toISOString()
      };
      
      const response = await api.post<CallSaveResponse>(`/api/leads/${leadId}/calls`, callData);
      
      if (response.success) {
        console.log('[useCallLogic] ✅ Appel sauvegardé - ID:', response.callId);
        
        // 🔄 Mise à jour du statut lead selon le résultat d'appel
        const leadStatusUpdate = getLeadStatusFromCallResult(callState.status as CallStatusType);
        
        if (leadStatusUpdate) {
          await api.put(`/api/leads/${leadId}`, leadStatusUpdate);
          console.log('[useCallLogic] ✅ Statut lead mis à jour:', leadStatusUpdate);
        }
        
        // 🎉 Notification de succès
        const successMessage = getSuccessMessage(callState.status as CallStatusType, response);
        NotificationManager.success(successMessage);
        
        // 🔄 Reset état
        setCallState({
          isInProgress: false,
          startTime: null,
          duration: 0,
          status: '',
          notes: '',
          isFormValid: false
        });
        
        // 📊 Callback de fin d'appel
        onCallComplete?.();
        
      } else {
        throw new Error('Erreur lors de la sauvegarde de l\'appel');
      }
      
    } catch (error: unknown) {
      console.error('[useCallLogic] ❌ Erreur sauvegarde appel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';
      setError(errorMessage);
      NotificationManager.error('Erreur lors de la sauvegarde de l\'appel');
      
    } finally {
      setIsLoading(false);
    }
  }, [callState, leadId, api, onCallComplete]);

  // 📝 Mise à jour des notes
  const updateNotes = useCallback((notes: string | ((prev: string) => string)): void => {
    setCallState(prev => {
      const prevNotes = typeof prev.notes === 'string' ? prev.notes : '';
      const nextNotes = typeof notes === 'function' ? (notes as (p:string)=>string)(prevNotes) : notes;
      return { ...prev, notes: nextNotes };
    });
  }, []);

  // 🏷️ Mise à jour du statut avec gestion Smart Agenda
  const updateStatus = useCallback((status: CallStatusType): void => {
    setCallState(prev => ({
      ...prev,
      status
    }));

    // 🎯 Mise à jour automatique du statut de lead
    if (leadId && status) {
      const leadUpdate = getLeadStatusFromCallResult(status);
      if (leadUpdate) {
        api.put(`/api/leads/${leadId}`, leadUpdate).catch(err => {
          console.error('Erreur mise à jour statut lead:', err);
        });
      }
    }
  }, [api, leadId]);

  // 🎯 Retour du hook avec toutes les fonctionnalités
  const returnValue: UseCallLogicReturn = useMemo(() => ({
    callState,
    startCall,
    endCall,
    updateNotes,
    updateStatus,
    formatDuration,
    isLoading,
    error
  }), [
    callState,
    startCall,
    endCall,
    updateNotes,
    updateStatus,
    formatDuration,
    isLoading,
    error
  ]);

  return returnValue;
};

// 🎯 FONCTIONS UTILITAIRES

/**
 * Détermine le statut lead à partir du résultat d'appel
 */
function getLeadStatusFromCallResult(callStatus: CallStatusType): Record<string, unknown> | null {
  const baseUpdate = {
    lastContact: new Date().toISOString(),
    lastContactType: 'call'
  };
  
  switch (callStatus) {
    case CALL_STATUSES.MEETING_SCHEDULED:
      return {
        ...baseUpdate,
        status: 'rdv_scheduled',
        priority: 'high'
      };
      
    case CALL_STATUSES.ANSWERED:
      return {
        ...baseUpdate,
        status: 'contacted',
        priority: 'medium'
      };
      
    case CALL_STATUSES.CALLBACK:
      return {
        ...baseUpdate,
        status: 'callback_requested',
        priority: 'medium',
        nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +1 jour
      };
      
    case CALL_STATUSES.REFUSED:
      return {
        ...baseUpdate,
        status: 'not_interested',
        priority: 'low'
      };
      
    case CALL_STATUSES.NO_ANSWER:
    case CALL_STATUSES.BUSY:
    case CALL_STATUSES.VOICEMAIL:
      return {
        ...baseUpdate,
        status: 'to_callback',
        priority: 'medium',
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // +3 jours
      };
      
    default:
      return baseUpdate;
  }
}

/**
 * Message de succès personnalisé selon le résultat
 */
function getSuccessMessage(callStatus: CallStatusType, response: CallSaveResponse): string {
  switch (callStatus) {
    case 'meeting_scheduled':
      return response.calendarEventId && response.emailSent
        ? '🎉 Appel terminé ! RDV programmé avec confirmation email envoyée'
        : '✅ Appel terminé et RDV programmé';
        
    case 'answered':
      return '✅ Appel terminé avec contact établi';
      
    case 'callback':
      return '🔄 Appel terminé - Rappel programmé';
      
    case 'refused':
      return '📝 Appel terminé - Refus noté';
      
    default:
      return '✅ Appel terminé et sauvegardé';
  }
}

export default useCallLogic;
