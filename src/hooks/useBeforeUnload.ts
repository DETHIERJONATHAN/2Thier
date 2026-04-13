/**
 * 🛡️ useBeforeUnload - Protection contre perte de données
 * 
 * Hook React qui avertit l'utilisateur lorsqu'il tente de quitter la page
 * avec des modifications non enregistrées.
 * 
 * Utilisation:
 * ```tsx
 * const { dirty, commitToExisting } = useTblSubmission(...);
 * useBeforeUnload(dirty, commitToExisting);
 * ```
 * 
 * Fonctionnalités:
 * - Détection fermeture navigateur/onglet
 * - Détection navigation vers autre page
 * - Message personnalisé selon navigateur
 * - Auto-désactivation après sauvegarde
 */

import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { logger } from '../lib/logger';

export interface UseBeforeUnloadOptions {
  /** Active la protection (ex: dirty === true) */
  enabled: boolean;
  
  /** Message personnalisé (certains navigateurs l'ignorent) */
  message?: string;
  
  /** Fonction de sauvegarde automatique optionnelle */
  onAutoSave?: () => Promise<void>;
  
  /** Activer la sauvegarde auto avant déchargement (expérimental) */
  autoSave?: boolean;
}

/**
 * Hook principal pour protéger contre perte de données
 * 
 * @param enabled - Active la protection si true (ex: quand dirty === true)
 * @param options - Options supplémentaires
 */
export function useBeforeUnload(
  enabled: boolean,
  options?: Omit<UseBeforeUnloadOptions, 'enabled'>
) {
  const message = options?.message || 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?';
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🌐 PROTECTION FERMETURE NAVIGATEUR / ONGLET
  // ═══════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Tentative de sauvegarde automatique (expérimental, peut échouer)
      if (options?.autoSave && options?.onAutoSave) {
        try {
          // Note: Les appels async dans beforeunload sont souvent annulés
          // Utilisez plutôt navigator.sendBeacon pour garantir l'envoi
          options.onAutoSave().catch(err => {
            logger.error('[useBeforeUnload] Échec sauvegarde auto:', err);
          });
        } catch (error) {
          logger.error('[useBeforeUnload] Erreur sauvegarde auto:', error);
        }
      }

      // Standard moderne (Chrome, Firefox, Edge)
      event.preventDefault();
      
      // Standard ancien (Safari, IE)
      event.returnValue = message;
      
      // Certains navigateurs utilisent la valeur de retour
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, message, options]);

  // ═══════════════════════════════════════════════════════════════════════
  // 🧭 PROTECTION NAVIGATION REACT ROUTER
  // ═══════════════════════════════════════════════════════════════════════
  // Bloque la navigation interne (React Router) si des modifications existent
  useBlocker(() => {
    if (!enabled) return false;
    
    // Demander confirmation avant de naviguer
    const shouldBlock = window.confirm(message);
    
    // Si l'utilisateur annule, bloquer la navigation
    return !shouldBlock;
  });
}

/**
 * Hook simplifié avec juste le flag dirty
 * 
 * @param dirty - Indique si des modifications non sauvegardées existent
 * @param customMessage - Message optionnel personnalisé
 */
export function useBeforeUnloadSimple(dirty: boolean, customMessage?: string) {
  useBeforeUnload(dirty, { message: customMessage });
}

/**
 * Hook avec sauvegarde automatique
 * 
 * @param dirty - Indique si des modifications non sauvegardées existent
 * @param onSave - Fonction de sauvegarde à appeler
 */
export function useBeforeUnloadWithAutoSave(
  dirty: boolean, 
  onSave: () => Promise<void>
) {
  useBeforeUnload(dirty, {
    message: 'Sauvegarde en cours... Veuillez patienter.',
    autoSave: true,
    onAutoSave: onSave
  });
}

export default useBeforeUnload;
