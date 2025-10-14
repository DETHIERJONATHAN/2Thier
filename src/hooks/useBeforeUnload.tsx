/**
 * 🚨 Hook useBeforeUnload
 * 
 * Gère l'alerte avant fermeture de page si modifications non sauvegardées
 * Utilisé pour éviter la perte de données dans les formulaires TBL
 */

import { useEffect, useCallback, useRef } from 'react';
import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export interface UseBeforeUnloadOptions {
  /**
   * Indique si des modifications non sauvegardées existent
   */
  dirty: boolean;
  
  /**
   * Message personnalisé (optionnel)
   * Par défaut: "Vous avez des modifications non enregistrées"
   */
  message?: string;
  
  /**
   * Callback appelé si l'utilisateur choisit de sauvegarder
   * Doit retourner une Promise qui se résout quand la sauvegarde est terminée
   */
  onSave?: () => Promise<void>;
  
  /**
   * Callback appelé si l'utilisateur choisit de quitter sans sauvegarder
   */
  onDiscard?: () => void;
  
  /**
   * Désactiver complètement le hook (pour tests ou cas spéciaux)
   */
  disabled?: boolean;
}

/**
 * Hook personnalisé pour gérer la fermeture de page avec données non sauvegardées
 * 
 * @example
 * ```tsx
 * const MyForm = () => {
 *   const [dirty, setDirty] = useState(false);
 *   
 *   useBeforeUnload({
 *     dirty,
 *     onSave: async () => {
 *       await saveFormData();
 *       setDirty(false);
 *     },
 *     onDiscard: () => {
 *       console.log('Données abandonnées');
 *     }
 *   });
 *   
 *   return <form>...</form>;
 * };
 * ```
 */
export function useBeforeUnload(options: UseBeforeUnloadOptions) {
  const {
    dirty,
    message = 'Vous avez des modifications non enregistrées',
    onSave,
    onDiscard,
    disabled = false
  } = options;

  const modalRef = useRef<ReturnType<typeof Modal.confirm> | null>(null);
  const isNavigatingRef = useRef(false);

  /**
   * Handler pour beforeunload (fermeture navigateur/onglet)
   * Note: Les navigateurs modernes n'affichent plus les messages personnalisés
   * mais montrent un message standard si preventDefault() est appelé
   */
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (disabled || !dirty) return;

    // Standard moderne - empêche la fermeture
    event.preventDefault();
    
    // Chrome nécessite returnValue défini
    event.returnValue = message;
    
    return message;
  }, [dirty, message, disabled]);

  /**
   * Affiche une modal de confirmation personnalisée
   * Utilisée pour la navigation interne React Router
   */
  const showConfirmationModal = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (modalRef.current) {
        // Fermer toute modal existante
        modalRef.current.destroy();
      }

      modalRef.current = Modal.confirm({
        title: '⚠️ Modifications non enregistrées',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>{message}. Souhaitez-vous les sauvegarder avant de quitter ?</p>
          </div>
        ),
        okText: '💾 Enregistrer et quitter',
        cancelText: '❌ Quitter sans enregistrer',
        cancelButtonProps: {
          danger: true
        },
        onOk: async () => {
          if (onSave) {
            try {
              isNavigatingRef.current = true;
              await onSave();
              resolve(true);
            } catch (error) {
              console.error('[useBeforeUnload] Erreur lors de la sauvegarde:', error);
              Modal.error({
                title: 'Erreur de sauvegarde',
                content: 'Impossible de sauvegarder les modifications. Veuillez réessayer.'
              });
              isNavigatingRef.current = false;
              resolve(false);
            }
          } else {
            isNavigatingRef.current = true;
            resolve(true);
          }
        },
        onCancel: () => {
          if (onDiscard) {
            onDiscard();
          }
          isNavigatingRef.current = true;
          resolve(true);
        },
        maskClosable: false,
        keyboard: false
      });
    });
  }, [message, onSave, onDiscard]);

  /**
   * Setup du listener beforeunload
   */
  useEffect(() => {
    if (disabled) return;

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Nettoyer la modal si elle existe encore
      if (modalRef.current) {
        modalRef.current.destroy();
        modalRef.current = null;
      }
    };
  }, [handleBeforeUnload, disabled]);

  /**
   * Méthode exposée pour demander confirmation manuellement
   * Utile pour la navigation programmatique
   */
  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (disabled || !dirty || isNavigatingRef.current) {
      return true;
    }

    return showConfirmationModal();
  }, [dirty, disabled, showConfirmationModal]);

  return {
    /**
     * Fonction à appeler avant toute navigation programmatique
     * Retourne true si la navigation peut continuer, false sinon
     */
    confirmNavigation,
    
    /**
     * Indique si une navigation est en cours (après confirmation)
     */
    isNavigating: isNavigatingRef.current
  };
}

/**
 * Hook simplifié pour les cas où on veut juste bloquer la fermeture
 * sans callbacks personnalisés
 * 
 * @example
 * ```tsx
 * useBeforeUnloadSimple(isDirty, 'Données non sauvegardées');
 * ```
 */
export function useBeforeUnloadSimple(
  dirty: boolean,
  message = 'Vous avez des modifications non enregistrées'
) {
  useEffect(() => {
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handler);

    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [dirty, message]);
}
