import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo } from 'react';

export type ZhiiveApp = 'explore' | 'flow' | 'reels' | 'universe' | 'stats';
export type FeedMode = 'personal' | 'org';

interface ZhiiveNavContextType {
  /** Which app is displayed in the LEFT column (null = default/first left app) */
  activeLeftApp: ZhiiveApp | null;
  setActiveLeftApp: (app: ZhiiveApp | null) => void;
  /** Which app is displayed in the RIGHT column (null = default/first right app) */
  activeRightApp: ZhiiveApp | null;
  setActiveRightApp: (app: ZhiiveApp | null) => void;
  /** Apps to the LEFT of Mur in the nav bar (ordered left→right, closest to Mur is last) */
  leftApps: ZhiiveApp[];
  /** Apps to the RIGHT of Mur in the nav bar (ordered left→right, closest to Mur is first) */
  rightApps: ZhiiveApp[];
  /** Resolved left sidebar app (always defined) */
  leftSidebarApp: ZhiiveApp;
  /** Resolved right sidebar app (always defined) */
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
  // Legacy compat — centerApp is always null (Wall always center)
  centerApp: ZhiiveApp | null;
  setCenterApp: (app: ZhiiveApp | null) => void;
}

const defaultTabOrder = ['explore', 'flow', 'reels', 'mur', 'universe', 'stats'];

function loadTabOrder(): string[] {
  try {
    const s = localStorage.getItem('sf_tab_order');
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.includes('mur')) return parsed;
    }
  } catch { /* ignore */ }
  return defaultTabOrder;
}

const ZhiiveNavContext = createContext<ZhiiveNavContextType>({
  activeLeftApp: null, setActiveLeftApp: () => {},
  activeRightApp: null, setActiveRightApp: () => {},
  leftApps: ['explore', 'flow', 'reels'], rightApps: ['universe', 'stats'],
  leftSidebarApp: 'reels', rightSidebarApp: 'universe',
  tabOrder: defaultTabOrder, reorderTabs: () => {},
  mobilePanel: 3, setMobilePanel: () => {},
  registerMobileScroll: () => {}, scrollMobileToPanel: () => {},
  feedMode: 'org', setFeedMode: () => {},
  centerApp: null, setCenterApp: () => {},
});

export const ZhiiveNavProvider = ({ children }: { children: ReactNode }) => {
  const [activeLeftApp, setActiveLeftApp] = useState<ZhiiveApp | null>(null);
  const [activeRightApp, setActiveRightApp] = useState<ZhiiveApp | null>(null);
  const [tabOrder, setTabOrder] = useState<string[]>(loadTabOrder);
  const [mobilePanel, setMobilePanel] = useState(0);
  const [feedMode, setFeedMode] = useState<FeedMode>('org');
  const mobileScrollRef = useRef<((panel: number) => void) | null>(null);

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

  // Resolved left sidebar: activeLeftApp if valid, else the closest to Mur (last in leftApps)
  const leftSidebarApp = useMemo<ZhiiveApp>(() => {
    if (activeLeftApp && leftApps.includes(activeLeftApp)) return activeLeftApp;
    return leftApps.length > 0 ? leftApps[leftApps.length - 1] : 'reels';
  }, [activeLeftApp, leftApps]);

  // Resolved right sidebar: activeRightApp if valid, else the closest to Mur (first in rightApps)
  const rightSidebarApp = useMemo<ZhiiveApp>(() => {
    if (activeRightApp && rightApps.includes(activeRightApp)) return activeRightApp;
    return rightApps.length > 0 ? rightApps[0] : 'universe';
  }, [activeRightApp, rightApps]);

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
      localStorage.setItem('sf_tab_order', JSON.stringify(arr));
      return arr;
    });
  }, []);

  // Legacy compat: centerApp is always null (Wall is always center now)
  const centerApp = null;
  const setCenterApp = useCallback((app: ZhiiveApp | null) => {
    if (!app) return; // clicking Mur — no-op, Wall is already center
    // Route to the correct sidebar based on position relative to Mur
    const murIndex = tabOrder.indexOf('mur');
    const appIndex = tabOrder.indexOf(app);
    if (appIndex < murIndex) {
      setActiveLeftApp(app);
    } else {
      setActiveRightApp(app);
    }
  }, [tabOrder]);

  return (
    <ZhiiveNavContext.Provider value={{
      activeLeftApp, setActiveLeftApp, activeRightApp, setActiveRightApp,
      leftApps, rightApps, leftSidebarApp, rightSidebarApp,
      tabOrder, reorderTabs, mobilePanel, setMobilePanel,
      registerMobileScroll, scrollMobileToPanel, feedMode, setFeedMode,
      centerApp, setCenterApp,
    }}>
      {children}
    </ZhiiveNavContext.Provider>
  );
};

export const useZhiiveNav = () => useContext(ZhiiveNavContext);
