/**
 * HOOK POUR LA GESTION DES BROUILLONS
 * 
 * Gestion complète des brouillons : auto-sauvegarde, récupération, envoi
 * FONCTIONNALITÉ ESSENTIELLE : Ne jamais perdre un email en cours de rédaction
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';
import { message } from 'antd';

export interface DraftData {
  draftId: string;
  messageId: string;
  subject: string;
  to: string;
  cc?: string;
  bcc?: string;
  body: string;
  isHtml?: boolean;
  date: Date;
}

export interface CreateDraftData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
  draftId?: string; // Pour mise à jour
  attachments?: File[]; // Pièces jointes
}

export const useDrafts = () => {
  const { api } = useAuthenticatedApi();
  const [drafts, setDrafts] = useState<DraftData[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // Timer pour l'auto-sauvegarde
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Récupère tous les brouillons
   */
  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/google-auth/gmail/drafts');
      console.log('[useDrafts] 📋 Réponse complète API:', response);
      
      // Gérer différents formats de réponse
      let draftsData = null;
      if (response?.drafts) {
        draftsData = response.drafts;
      } else if (response?.data?.drafts) {
        draftsData = response.data.drafts;
      } else if (Array.isArray(response)) {
        draftsData = response;
      }
      
      console.log('[useDrafts] 📋 Données brouillons extraites:', draftsData);
      
      if (draftsData && Array.isArray(draftsData)) {
        // Convertir les dates
        const formattedDrafts = draftsData.map((draft: DraftData) => ({
          ...draft,
          date: new Date(draft.date)
        }));
        console.log('[useDrafts] ✅ Brouillons formatés:', formattedDrafts);
        setDrafts(formattedDrafts);
      } else {
        console.log('[useDrafts] ⚠️ Aucun brouillon trouvé ou format invalide');
        setDrafts([]);
      }
    } catch (error) {
      console.error('[useDrafts] Erreur lors de la récupération des brouillons:', error);
      message.error('Erreur lors de la récupération des brouillons');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Sauvegarde un brouillon (création ou mise à jour)
   */
  const saveDraft = useCallback(async (draftData: CreateDraftData): Promise<{ draftId: string; messageId: string } | null> => {
    try {
      setAutoSaving(true);
      
      // Si on a des pièces jointes, utiliser FormData
      if (draftData.attachments && draftData.attachments.length > 0) {
        const formData = new FormData();
        
        // Vérifier que les champs obligatoires sont présents
        if (!draftData.to || !draftData.subject) {
          console.error('[useDrafts] ❌ Destinataire ou sujet manquant:', { to: draftData.to, subject: draftData.subject });
          throw new Error('Destinataire et sujet requis');
        }
        
        formData.append('to', draftData.to);
        formData.append('subject', draftData.subject);
        formData.append('body', draftData.body);
        formData.append('isHtml', String(draftData.isHtml || false));
        
        if (draftData.cc) formData.append('cc', draftData.cc);
        if (draftData.bcc) formData.append('bcc', draftData.bcc);
        if (draftData.draftId) formData.append('draftId', draftData.draftId);
        
        // Ajouter les pièces jointes
        draftData.attachments.forEach((file) => {
          formData.append(`attachments`, file);
        });
        
        console.log('[useDrafts] 📎 Sauvegarde avec pièces jointes:', draftData.attachments.length);
        console.log('[useDrafts] 📄 Données FormData:', {
          to: draftData.to,
          subject: draftData.subject,
          body: draftData.body.substring(0, 50) + '...'
        });
        console.log('[useDrafts] 🔧 FormData instance check:', formData instanceof FormData);
        console.log('[useDrafts] 🔧 FormData entries:', Array.from(formData.entries()).map(([key, value]) => 
          `${key}: ${value instanceof File ? `File(${value.name})` : value}`
        ));
        
        // Utiliser le hook api mais avec FormData et headers spéciaux
        const response = await api.post('/api/google-auth/gmail/drafts', formData, {
          headers: {
            // Ne pas spécifier Content-Type - laissez le navigateur le faire automatiquement
            // pour que la boundary soit correctement définie
          },
        });
        
        if (response?.success || response?.data?.success) {
          const data = response?.data?.data || response?.data;
          console.log('[useDrafts] ✅ Brouillon avec PJ sauvegardé:', data);
          
          // Rafraîchir la liste des brouillons si c'est un nouveau brouillon
          if (!draftData.draftId) {
            await fetchDrafts();
          }
          
          return {
            draftId: data?.draftId || data?.id,
            messageId: data?.messageId
          };
        } else {
          console.error('[useDrafts] ❌ Échec sauvegarde avec PJ:', response);
          return null;
        }
      } else {
        // Pas de pièces jointes, utiliser JSON classique
        console.log('[useDrafts] 💾 Auto-sauvegarde en cours...');
        const response = await api.post('/api/google-auth/gmail/drafts', draftData);
        
        if (response?.success || response?.data?.success) {
          const data = response?.data?.data || response?.data;
          console.log('[useDrafts] ✅ Brouillon sauvegardé:', data);
          
          // Rafraîchir la liste des brouillons si c'est un nouveau brouillon
          if (!draftData.draftId) {
            await fetchDrafts();
          }
          
          return {
            draftId: data?.draftId || data?.id,
            messageId: data?.messageId
          };
        } else {
          console.error('[useDrafts] ❌ Échec sauvegarde:', response);
          return null;
        }
      }
    } catch (error) {
      console.error('[useDrafts] Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde du brouillon');
      return null;
    } finally {
      setAutoSaving(false);
    }
  }, [api, fetchDrafts]);

  /**
   * Auto-sauvegarde avec délai (évite les sauvegardes trop fréquentes)
   */
  const autoSaveDraft = useCallback((draftData: CreateDraftData, delayMs: number = 3000) => {
    // Annuler le timer précédent
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Programmer une nouvelle sauvegarde
    autoSaveTimerRef.current = setTimeout(async () => {
      console.log('[useDrafts] 💾 Auto-sauvegarde en cours...');
      await saveDraft(draftData);
    }, delayMs);
  }, [saveDraft]);

  /**
   * Sauvegarde immédiate (lors de la fermeture par exemple)
   */
  const saveDraftImmediately = useCallback(async (draftData: CreateDraftData) => {
    // Annuler l'auto-sauvegarde en cours
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    console.log('[useDrafts] 🚨 Sauvegarde immédiate (fermeture)...');
    return await saveDraft(draftData);
  }, [saveDraft]);

  /**
   * Supprime un brouillon
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/google-auth/gmail/drafts/${draftId}`);
      console.log('[useDrafts] 🗑️ Réponse suppression:', response);
      
      // Gérer différents formats de réponse
      const success = response?.success || response?.data?.success;
      
      if (success) {
        message.success('Brouillon supprimé');
        await fetchDrafts(); // Rafraîchir
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useDrafts] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression du brouillon');
      return false;
    }
  }, [api, fetchDrafts]);

  /**
   * Envoie un email directement (avec pièces jointes si présentes)
   */
  const sendEmail = useCallback(async (emailData: CreateDraftData): Promise<boolean> => {
    try {
      console.log('[useDrafts] 📤 Envoi direct email avec pièces jointes:', emailData.attachments?.length || 0);
      
      // Validation des champs obligatoires
      if (!emailData.to?.trim()) {
        throw new Error('Le destinataire est requis');
      }
      if (!emailData.subject?.trim()) {
        throw new Error('Le sujet est requis');
      }

      let response;
      
      if (emailData.attachments && emailData.attachments.length > 0) {
        // Avec pièces jointes : utiliser FormData
        const formData = new FormData();
        formData.append('to', emailData.to);
        formData.append('subject', emailData.subject);
        formData.append('body', emailData.body || '');
        formData.append('isHtml', String(emailData.isHtml || false));
        if (emailData.cc) formData.append('cc', emailData.cc);
        if (emailData.bcc) formData.append('bcc', emailData.bcc);
        
        // Ajouter les pièces jointes
        emailData.attachments.forEach((file) => {
          formData.append(`attachments`, file);
        });
        
        console.log('[useDrafts] 📎 Envoi avec FormData et', emailData.attachments.length, 'pièces jointes');
        
        // Envoyer à l'endpoint d'envoi direct avec pièces jointes
        response = await api.post('/api/google-auth/gmail/send', formData);
      } else {
        // Sans pièces jointes : utiliser JSON classique
        const jsonData = {
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body || '',
          isHtml: emailData.isHtml || false,
          cc: emailData.cc,
          bcc: emailData.bcc
        };
        
        console.log('[useDrafts] 📧 Envoi JSON sans pièces jointes');
        response = await api.post('/api/google-auth/gmail/send', jsonData);
      }
      
      console.log('[useDrafts] 📤 Réponse envoi direct:', response);
      
      // Gérer différents formats de réponse
      const success = response?.success || response?.data?.success;
      
      if (success) {
        message.success('Email envoyé avec succès');
        await fetchDrafts(); // Rafraîchir la liste
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useDrafts] Erreur lors de l\'envoi direct:', error);
      message.error('Erreur lors de l\'envoi de l\'email');
      return false;
    }
  }, [api, fetchDrafts]);

  /**
   * Envoie un brouillon existant
   */
  const sendDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      const response = await api.post(`/api/google-auth/gmail/drafts/${draftId}/send`);
      console.log('[useDrafts] 📤 Réponse envoi:', response);
      
      // Gérer différents formats de réponse
      const success = response?.success || response?.data?.success;
      
      if (success) {
        message.success('Email envoyé avec succès');
        await fetchDrafts(); // Rafraîchir (le brouillon disparaît)
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useDrafts] Erreur lors de l\'envoi:', error);
      message.error('Erreur lors de l\'envoi de l\'email');
      return false;
    }
  }, [api, fetchDrafts]);

  /**
   * Nettoie les timers lors du démontage
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    // État
    drafts,
    loading,
    autoSaving,

    // Actions
    fetchDrafts,
    saveDraft,
    autoSaveDraft,
    saveDraftImmediately,
    deleteDraft,
    sendDraft,
    sendEmail // 🆕 Nouvelle fonction d'envoi direct avec pièces jointes
  };
};
