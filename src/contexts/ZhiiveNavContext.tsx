import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useUserPreference } from '../hooks/useUserPreference';

export type ZhiiveApp = 'explore' | 'flow' | 'reels' | 'universe' | 'stats';
export type FeedMode = 'personal' | 'org';

interface ZhiiveNavContextType {
  /** Which app is displayed in the CENTER column (null = Wall/Hive) */
  centerApp: ZhiiveApp | null;
  setCenterApp: (app: ZhiiveApp | null) => void;
  /** Apps to the LEFT of Mur in the nav bar (ordered left→right, closest to Mur is last) */
  leftApps: ZhiiveApp[];
  /** Apps to the RIGHT of Mur in the nav bar (ordered left→right, closest to Mur is first) */
  rightApps: ZhiiveApp[];
  /** Resolved left sidebar app (always defined, avoids showing same as center) */
  leftSidebarApp: ZhiiveApp;
  /** Resolved right sidebar app (always defined, avoids showing same as center) */
  rightSidebarApp: ZhiiveApp;
  tabOrder: string[];
  reorderTabs: (dragId: string, dropId: string) => void;
  /** Active mobile panel index (syncs with header tabs) */
  mobilePanel: number;
  setMobilePanel: (panel: number) => void;
  /** Scroll callback registered by DashboardPageUnified for mobile carousel */
  registerMobileScroll: (fn: ((panel: number) => void) | null) => void;
  scrollMobileToPanel: (panel: number) => void;
  /** Feed mode: 'personal' (public network) vs 'org' (internal to organisation) */
  feedMode: FeedMode;
  setFeedMode: (mode: FeedMode) => void;
}

const defaultTabOrder = ['explore', 'flow', 'reels', 'mur', 'universe', 'stats'];

const ZhiiveNavContext = createContext<ZhiiveNavContextType>({
  centerApp: null, setCenterApp: () => {},
  leftApps: ['explore', 'flow', 'reels'], rightApps: ['universe', 'stats'],
  leftSidebarApp: 'reels', rightSidebarApp: 'universe',
  tabOrder: defaultTabOrder, reorderTabs: () => {},
  mobilePanel: 3, setMobilePanel: () => {},
  registerMobileScroll: () => {}, scrollMobileToPanel: () => {},
  feedMode: 'org', setFeedMode: () => {},
});

interface ZhiiveNavProviderProps {
  children: ReactNode;
  initialFeedMode?: FeedMode;
  onFeedModeChange?: (mode: FeedMode) => void;
}

export const ZhiiveNavProvider = ({ children, initialFeedMode, onFeedModeChange }: ZhiiveNavProviderProps) => {
  const [centerApp, setCenterApp] = useState<ZhiiveApp | null>(null);
  const [savedTabOrder, setSavedTabOrder] = useUserPreference<string[]>('sf_tab_order', defaultTabOrder);
  const [tabOrder, setTabOrder] = useState<string[]>(defaultTabOrder);
  const [mobilePanel, setMobilePanel] = useState(0);
  const [feedMode, setFeedModeInternal] = useState<FeedMode>(initialFeedMode || 'org');
  const mobileScrollRef = useRef<((panel: number) => void) | null>(null);

  // Sync tabOrder from DB once loaded
  useEffect(() => {
    if (Array.isArray(savedTabOrder) && savedTabOrder.includes('mur')) {
      setTabOrder(savedTabOrder);
    }
  }, [savedTabOrder]);

  // Sync if initialFeedMode changes (e.g. user data loads async)
  useEffect(() => {
    if (initialFeedMode) setFeedModeInternal(initialFeedMode);
  }, [initialFeedMode]);

  const setFeedMode = useCallback((mode: FeedMode) => {
    setFeedModeInternal(mode);
    onFeedModeChange?.(mode);
  }, [onFeedModeChange]);

  const registerMobileScroll = useCallback((fn: ((panel: number) => void) | null) => {
    mobileScrollRef.current = fn;
  }, []);

  const scrollMobileToPanel = useCallback((panel: number) => {
    setMobilePanel(panel);
    if (mobileScrollRef.current) mobileScrollRef.current(panel);
  }, []);

  // Split tabOrder around 'mur' to get left and right app groups
  const leftApps = useMemo<ZhiiveApp[]>(() => {
    const murIndex = tabOrder.indexOf('mur');
    if (murIndex <= 0) return [];
    return tabOrder.slice(0, murIndex).filter(id => id !== 'mur') as ZhiiveApp[];
  }, [tabOrder]);

  const rightApps = useMemo<ZhiiveApp[]>(() => {
    const murIndex = tabOrder.indexOf('mur');
    if (murIndex < 0) return [];
    return tabOrder.slice(murIndex + 1).filter(id => id !== 'mur') as ZhiiveApp[];
  }, [tabOrder]);

  // Left sidebar: closest left app to Mur that ISN'T the centerApp
  const leftSidebarApp = useMemo<ZhiiveApp>(() => {
    const available = leftApps.filter(a => a !== centerApp);
    return available.length > 0 ? available[available.length - 1] : (leftApps[0] || 'reels');
  }, [centerApp, leftApps]);

  // Right sidebar: closest right app to Mur that ISN'T the centerApp
  const rightSidebarApp = useMemo<ZhiiveApp>(() => {
    const available = rightApps.filter(a => a !== centerApp);
    return available.length > 0 ? available[0] : (rightApps[0] || 'universe');
  }, [centerApp, rightApps]);

  const reorderTabs = useCallback((dragId: string, dropId: string) => {
    if (dragId === 'mur' || dropId === 'mur' || dragId === dropId) return;
    setTabOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragId);
      const to = arr.indexOf(dropId);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      const newTo = from < to ? to - 1 : to;
      arr.splice(newTo, 0, dragId);
      setSavedTabOrder(arr);
      return arr;
    });
  }, [setSavedTabOrder]);

  return (
    <ZhiiveNavContext.Provider value={{
      centerApp, setCenterApp,
      leftApps, rightApps, leftSidebarApp, rightSidebarApp,
      tabOrder, reorderTabs, mobilePanel, setMobilePanel,
      registerMobileScroll, scrollMobileToPanel, feedMode, setFeedMode,
    }}>
      {children}
    </ZhiiveNavContext.Provider>
  );
};

export const useZhiiveNav = () => useContext(ZhiiveNavContext);
