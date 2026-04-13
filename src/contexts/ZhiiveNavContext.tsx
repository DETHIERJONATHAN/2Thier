import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useUserPreference } from '../hooks/useUserPreference';

export type ZhiiveApp = 'explore' | 'nectar' | 'reels' | 'wax' | 'stats' | 'mail' | 'agenda' | 'search' | 'arena';
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
  /** In-app browser: URL to display in iframe (null = not browsing) */
  browseUrl: string | null;
  setBrowseUrl: (url: string | null) => void;
  /** Wall search query: when set, search results appear in the wall feed */
  wallSearchQuery: string | null;
  setWallSearchQuery: (query: string | null) => void;
  /** Wall view URL: when set, site is displayed inline in the wall */
  wallViewUrl: string | null;
  setWallViewUrl: (url: string | null) => void;
}

const defaultTabOrder = ['nectar', 'wax', 'explore', 'reels', 'mur', 'arena', 'mail', 'agenda', 'search', 'stats'];

const ZhiiveNavContext = createContext<ZhiiveNavContextType>({
  centerApp: null, setCenterApp: () => {},
  leftApps: ['nectar', 'wax', 'explore', 'reels'], rightApps: ['arena', 'mail', 'agenda', 'search', 'stats'],
  leftSidebarApp: 'reels', rightSidebarApp: 'mail',
  tabOrder: defaultTabOrder, reorderTabs: () => {},
  mobilePanel: 4, setMobilePanel: () => {},
  registerMobileScroll: () => {}, scrollMobileToPanel: () => {},
  feedMode: 'org', setFeedMode: () => {},
  browseUrl: null, setBrowseUrl: () => {},
  wallSearchQuery: null, setWallSearchQuery: () => {},
  wallViewUrl: null, setWallViewUrl: () => {},
});

interface ZhiiveNavProviderProps {
  children: ReactNode;
  initialFeedMode?: FeedMode;
  onFeedModeChange?: (mode: FeedMode) => void;
}

export const ZhiiveNavProvider = ({ children, initialFeedMode, onFeedModeChange }: ZhiiveNavProviderProps) => {
  const [centerApp, setCenterApp] = useState<ZhiiveApp | null>(null);
  const [savedTabOrder, setSavedTabOrder, { loading: tabOrderLoading }] = useUserPreference<string[]>('sf_tab_order', defaultTabOrder);
  const [savedTabVersion, setSavedTabVersion, { loading: tabVersionLoading }] = useUserPreference<number>('sf_tab_order_v', 0);
  const [tabOrder, setTabOrder] = useState<string[]>(defaultTabOrder);
  const [mobilePanel, setMobilePanel] = useState(() => {
    const idx = defaultTabOrder.indexOf('mur');
    return idx >= 0 ? idx : 0;
  });
  const [feedMode, setFeedModeInternal] = useState<FeedMode>(initialFeedMode || 'org');
  const [browseUrl, setBrowseUrl] = useState<string | null>(null);
  const [wallSearchQuery, setWallSearchQuery] = useState<string | null>(null);
  const [wallViewUrl, setWallViewUrl] = useState<string | null>(null);
  const mobileScrollRef = useRef<((panel: number) => void) | null>(null);

  // Current migration version — bump this when the default order changes
  const TAB_ORDER_VERSION = 2;

  // Sync tabOrder from DB once loaded — merge new tabs that didn't exist before
  // CRITICAL: Wait until BOTH preferences have loaded from DB to avoid race condition
  // where the GET response for one pref overrides the optimistic SET from migration
  useEffect(() => {
    if (tabOrderLoading || tabVersionLoading) return;
    if (Array.isArray(savedTabOrder) && savedTabOrder.includes('mur')) {
      let merged = [...savedTabOrder];

      // ── Migration: replace deprecated 'flow' and 'universe' with 'nectar' ──
      const hasFlow = merged.includes('flow');
      const hasUniverse = merged.includes('universe');
      if (hasFlow || hasUniverse) {
        const insertIdx = hasFlow ? merged.indexOf('flow') : merged.indexOf('universe');
        merged = merged.filter(t => t !== 'flow' && t !== 'universe');
        if (!merged.includes('nectar')) {
          merged.splice(insertIdx, 0, 'nectar');
        }
      }

      // ── Migration v2: Force Hive-centered default order (one-time) ──
      // Only reset if user hasn't been migrated to v2 yet
      if (savedTabVersion < TAB_ORDER_VERSION) {
        merged = [...defaultTabOrder];
        setSavedTabVersion(TAB_ORDER_VERSION);
      }

      // Add any new tabs from defaultTabOrder that are missing from the saved order
      for (const tab of defaultTabOrder) {
        if (!merged.includes(tab)) {
          const statsIdx = merged.indexOf('stats');
          if (statsIdx >= 0) {
            merged.splice(statsIdx, 0, tab);
          } else {
            merged.push(tab);
          }
        }
      }
      setTabOrder(merged);
      // Persist the merged order if it changed
      if (JSON.stringify(merged) !== JSON.stringify(savedTabOrder)) {
        setSavedTabOrder(merged);
      }
    }
  }, [savedTabOrder, savedTabVersion, tabOrderLoading, tabVersionLoading]);

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
      browseUrl, setBrowseUrl,
      wallSearchQuery, setWallSearchQuery,
      wallViewUrl, setWallViewUrl,
      tabOrder, reorderTabs, mobilePanel, setMobilePanel,
      registerMobileScroll, scrollMobileToPanel, feedMode, setFeedMode,
    }}>
      {children}
    </ZhiiveNavContext.Provider>
  );
};

export const useZhiiveNav = () => useContext(ZhiiveNavContext);
