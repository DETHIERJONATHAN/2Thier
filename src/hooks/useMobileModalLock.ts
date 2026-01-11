/**
 * 🔒 useMobileModalLock - Empêche la sortie accidentelle des modaux sur mobile
 * 
 * Ce hook bloque :
 * - Le swipe arrière (navigation)
 * - Le clic sur l'overlay/backdrop du modal
 * - Le bouton retour du navigateur (hardware back button)
 * - Les gestes de fermeture accidentels
 * 
 * La seule façon de fermer est de cliquer sur un bouton explicite (croix, annuler, valider)
 * 
 * IMPORTANT: Ce hook est compatible avec l'ouverture de la caméra native mobile
 * qui peut mettre le navigateur en arrière-plan temporairement.
 * 
 * @author 2Thier CRM Team
 * @date 11/01/2026
 */

import { useEffect, useRef } from 'react';

interface UseMobileModalLockOptions {
  /** Si le modal est ouvert */
  isOpen: boolean;
  /** Callback optionnel quand l'utilisateur tente de sortir (pour afficher un message) */
  onAttemptClose?: () => void;
  /** Désactiver le lock (pour permettre la fermeture normale) */
  disabled?: boolean;
}

/**
 * Hook pour verrouiller un modal sur mobile
 * Empêche toute sortie accidentelle (swipe, tap outside, back button)
 */
export function useMobileModalLock({
  isOpen,
  onAttemptClose,
  disabled = false
}: UseMobileModalLockOptions) {
  const historyPushedRef = useRef<boolean>(false);
  const isMobileRef = useRef<boolean>(false);
  const isOpenRef = useRef<boolean>(isOpen);
  
  // Garder une ref à jour de isOpen pour les event handlers
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Détecter si on est sur mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 1024;
    isMobileRef.current = hasTouch || isSmallScreen;
  }, []);

  // Bloquer le bouton retour du navigateur
  useEffect(() => {
    if (!isOpen || disabled || typeof window === 'undefined') return;

    // Ajouter une entrée dans l'historique pour capturer le "back"
    // Utiliser un ID unique pour cette instance
    const lockId = `modal-lock-${Date.now()}`;
    const state = { modalLocked: true, lockId };
    
    // Ne pas ajouter si déjà ajouté
    if (!historyPushedRef.current) {
      window.history.pushState(state, '', window.location.href);
      historyPushedRef.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      // Vérifier que le modal est toujours ouvert (utiliser la ref pour éviter les closures stale)
      if (!isOpenRef.current) return;
      
      // L'utilisateur a appuyé sur retour
      event.preventDefault();
      
      // Remettre l'entrée dans l'historique (bloquer la navigation)
      window.history.pushState(state, '', window.location.href);
      
      // Notifier l'utilisateur
      if (onAttemptClose) {
        onAttemptClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // IMPORTANT: NE PAS appeler history.back() ici !
      // Cela cause des problèmes quand la caméra native s'ouvre
      // L'entrée dans l'historique sera nettoyée naturellement
      historyPushedRef.current = false;
    };
  }, [isOpen, disabled, onAttemptClose]);

  // Bloquer les gestes de swipe sur les bords (iOS Safari)
  useEffect(() => {
    if (!isOpen || disabled || typeof window === 'undefined') return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobileRef.current) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = Math.abs(currentY - startY);

      // Détecter un swipe depuis le bord gauche (geste retour iOS/Android)
      if (startX < 30 && deltaX > 50 && deltaX > deltaY * 2) {
        e.preventDefault();
        e.stopPropagation();
        if (onAttemptClose) {
          onAttemptClose();
        }
      }

      // Détecter un swipe depuis le bord droit (geste navigation avant)
      if (startX > window.innerWidth - 30 && deltaX < -50 && Math.abs(deltaX) > deltaY * 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Ajouter les listeners sur document (capture phase)
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, disabled, onAttemptClose]);

  // Bloquer le clic sur l'overlay (backdrop) du modal
  useEffect(() => {
    if (!isOpen || disabled || typeof window === 'undefined') return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Détecter clic sur l'overlay Ant Design Modal
      if (
        target.classList.contains('ant-modal-wrap') ||
        target.classList.contains('ant-modal-mask') ||
        target.closest('.ant-modal-wrap')?.querySelector('.ant-modal-content')?.contains(target) === false
      ) {
        // Vérifier si le clic est vraiment sur le backdrop (pas sur le contenu)
        const modalContent = target.closest('.ant-modal-wrap')?.querySelector('.ant-modal-content');
        if (modalContent && !modalContent.contains(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          if (onAttemptClose) {
            onAttemptClose();
          }
        }
      }
    };

    // Utiliser capture phase pour intercepter avant Ant Design
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('mousedown', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('mousedown', handleClick, { capture: true });
    };
  }, [isOpen, disabled, onAttemptClose]);

  // Bloquer le scroll du body pendant que le modal est ouvert
  useEffect(() => {
    if (!isOpen || disabled || typeof window === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Verrouiller le scroll du body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      // Restaurer
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, disabled]);

  return {
    /** Props à passer au Modal Ant Design pour désactiver sa fermeture automatique */
    modalProps: {
      // Désactiver la fermeture sur clic du mask
      maskClosable: false,
      // Désactiver la fermeture sur Escape
      keyboard: false,
      // Désactiver le bouton X par défaut (utiliser notre propre bouton)
      closable: false,
    },
    /** Indique si on est sur mobile */
    isMobile: isMobileRef.current
  };
}

export default useMobileModalLock;
