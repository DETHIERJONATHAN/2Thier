/**
 * 🔄 useTBLSwipeNavigation - Hook pour la navigation par swipe dans TBL Mobile
 * 
 * Permet de naviguer entre onglets et sous-onglets par glissement horizontal :
 * - Swipe gauche → onglet/sous-onglet suivant
 * - Swipe droite → onglet/sous-onglet précédent
 * 
 * Ordre de navigation : parcourt tous les sous-onglets d'un onglet avant de passer au suivant
 */

import { useEffect, useRef, useCallback } from 'react';

interface SubTab {
  key: string;
  label: string;
}

interface Tab {
  id: string;
  label: string;
  subTabs?: SubTab[];
}

interface SwipeNavigationConfig {
  /** Élément HTML sur lequel écouter les événements touch */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Liste des onglets avec leurs sous-onglets */
  tabs: Tab[];
  /** ID de l'onglet actif */
  activeTab: string;
  /** Callback pour changer d'onglet */
  setActiveTab: (tabId: string) => void;
  /** ID du sous-onglet actif (par onglet) */
  activeSubTabs: Record<string, string | undefined>;
  /** Callback pour changer de sous-onglet */
  setActiveSubTab: (tabId: string, subTabKey: string | undefined) => void;
  /** Sous-onglets disponibles pour l'onglet actif (calculés dynamiquement) */
  currentTabSubTabs?: SubTab[];
  /** Activer uniquement sur mobile */
  isMobile: boolean;
  /** Distance minimale du swipe (en pixels) */
  minSwipeDistance?: number;
  /** Distance max verticale tolérée (en pixels) */
  maxVerticalDistance?: number;
}

/**
 * Hook pour activer la navigation par swipe sur les onglets TBL mobile
 */
export function useTBLSwipeNavigation({
  containerRef,
  tabs,
  activeTab,
  setActiveTab,
  activeSubTabs,
  setActiveSubTab,
  currentTabSubTabs = [],
  isMobile,
  minSwipeDistance = 50,
  maxVerticalDistance = 60
}: SwipeNavigationConfig) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isSwipingRef = useRef(false);

  /**
   * Calcule la position aplatie (flat index) de l'état actuel
   * L'index "client-info" est traité comme l'onglet 0
   */
  const getFlatIndex = useCallback((): { flatIndex: number; totalItems: number; flatMap: Array<{ tabId: string; subTabKey?: string }> } => {
    const flatMap: Array<{ tabId: string; subTabKey?: string }> = [];
    
    // Onglet "Client" en premier (pas de sous-onglets)
    flatMap.push({ tabId: 'client-info', subTabKey: undefined });
    
    // Puis les autres onglets avec leurs sous-onglets
    for (const tab of tabs) {
      const tabSubTabs = tab.subTabs || [];
      
      if (tabSubTabs.length === 0) {
        // Onglet sans sous-onglets
        flatMap.push({ tabId: tab.id, subTabKey: undefined });
      } else {
        // Onglet avec sous-onglets : ajouter chaque sous-onglet
        for (const subTab of tabSubTabs) {
          flatMap.push({ tabId: tab.id, subTabKey: subTab.key });
        }
      }
    }
    
    // Trouver l'index actuel
    const currentSubTab = activeSubTabs[activeTab];
    let flatIndex = flatMap.findIndex(item => {
      if (activeTab === 'client-info') {
        return item.tabId === 'client-info';
      }
      if (currentSubTab) {
        return item.tabId === activeTab && item.subTabKey === currentSubTab;
      }
      // Si pas de sous-onglet actif, trouver le premier item de cet onglet
      return item.tabId === activeTab && !item.subTabKey;
    });
    
    // Fallback: si pas trouvé et qu'on a des sous-onglets, prendre le premier du tab
    if (flatIndex === -1 && currentTabSubTabs.length > 0) {
      flatIndex = flatMap.findIndex(item => 
        item.tabId === activeTab && item.subTabKey === currentTabSubTabs[0]?.key
      );
    }
    
    // Dernier recours
    if (flatIndex === -1) {
      flatIndex = flatMap.findIndex(item => item.tabId === activeTab);
    }
    
    return {
      flatIndex: Math.max(0, flatIndex),
      totalItems: flatMap.length,
      flatMap
    };
  }, [tabs, activeTab, activeSubTabs, currentTabSubTabs]);

  /**
   * Navigue vers l'index suivant ou précédent
   */
  const navigateToIndex = useCallback((direction: 'next' | 'prev') => {
    const { flatIndex, totalItems, flatMap } = getFlatIndex();
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = Math.min(flatIndex + 1, totalItems - 1);
    } else {
      newIndex = Math.max(flatIndex - 1, 0);
    }
    
    if (newIndex === flatIndex) return; // Pas de changement
    
    const targetItem = flatMap[newIndex];
    if (!targetItem) return;
    
    // Changer d'onglet si nécessaire
    if (targetItem.tabId !== activeTab) {
      setActiveTab(targetItem.tabId);
    }
    
    // Changer de sous-onglet si nécessaire
    if (targetItem.subTabKey !== undefined) {
      setActiveSubTab(targetItem.tabId, targetItem.subTabKey);
    }
    
    // Feedback visuel optionnel (vibration légère si disponible)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignorer si la vibration échoue
      }
    }
  }, [getFlatIndex, activeTab, setActiveTab, setActiveSubTab]);

  useEffect(() => {
    if (!isMobile) return; // Désactiver sur desktop
    
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isSwipingRef.current = true;
    };

    const onTouchMove = (_e: TouchEvent) => {
      // On pourrait ajouter un indicateur visuel pendant le swipe
      // Pour l'instant, on ne fait rien
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwipingRef.current) return;
      isSwipingRef.current = false;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      
      // Vérifier que c'est un swipe horizontal valide
      if (Math.abs(deltaX) < minSwipeDistance) return;
      if (Math.abs(deltaY) > maxVerticalDistance) return;
      
      // Déterminer la direction
      if (deltaX < 0) {
        // Swipe gauche → suivant
        navigateToIndex('next');
      } else {
        // Swipe droite → précédent
        navigateToIndex('prev');
      }
    };

    const onTouchCancel = () => {
      isSwipingRef.current = false;
    };

    // Options passives pour de meilleures performances
    const passiveOptions = { passive: true } as AddEventListenerOptions;

    container.addEventListener('touchstart', onTouchStart, passiveOptions);
    container.addEventListener('touchmove', onTouchMove, passiveOptions);
    container.addEventListener('touchend', onTouchEnd, passiveOptions);
    container.addEventListener('touchcancel', onTouchCancel, passiveOptions);

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isMobile, navigateToIndex, minSwipeDistance, maxVerticalDistance, containerRef]);

  /**
   * Retourne des infos sur la position actuelle pour l'affichage
   */
  const getNavigationInfo = useCallback(() => {
    const { flatIndex, totalItems, flatMap } = getFlatIndex();
    const currentItem = flatMap[flatIndex];
    
    return {
      currentIndex: flatIndex,
      totalItems,
      canGoNext: flatIndex < totalItems - 1,
      canGoPrev: flatIndex > 0,
      currentTabId: currentItem?.tabId,
      currentSubTabKey: currentItem?.subTabKey,
      progressPercent: totalItems > 1 ? Math.round((flatIndex / (totalItems - 1)) * 100) : 100
    };
  }, [getFlatIndex]);

  return {
    navigateToIndex,
    getNavigationInfo
  };
}

export default useTBLSwipeNavigation;
