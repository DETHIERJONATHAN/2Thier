import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo } from 'react';

export type SpaceFlowApp = 'explore' | 'flow' | 'reels' | 'universe' | 'stats';

// Sequence ordered by proximity to Mur (closest first)
// Header order: Explore ← Flow ← Reels ← MUR → Universe → Stats
const LEFT_SEQUENCE: SpaceFlowApp[] = ['reels', 'flow', 'explore'];
const RIGHT_SEQUENCE: SpaceFlowApp[] = ['universe', 'stats'];

interface SpaceFlowNavContextType {
  /** Which SpaceFlow app is currently displayed in the CENTER column (null = Wall/Mur) */
  centerApp: SpaceFlowApp | null;
  setCenterApp: (app: SpaceFlowApp | null) => void;
  /** Which SpaceFlow app to show in the LEFT sidebar (auto-rotates when centerApp takes one) */
  leftSidebarApp: SpaceFlowApp;
  /** Which SpaceFlow app to show in the RIGHT sidebar (auto-rotates when centerApp takes one) */
  rightSidebarApp: SpaceFlowApp;
  tabOrder: string[];
  reorderTabs: (dragId: string, dropId: string) => void;
  /** Active mobile panel index (syncs with header tabs) */
  mobilePanel: number;
  setMobilePanel: (panel: number) => void;
  /** Scroll callback registered by DashboardPageUnified for mobile carousel */
  registerMobileScroll: (fn: ((panel: number) => void) | null) => void;
  scrollMobileToPanel: (panel: number) => void;
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

const SpaceFlowNavContext = createContext<SpaceFlowNavContextType>({
  centerApp: null, setCenterApp: () => {},
  leftSidebarApp: 'reels', rightSidebarApp: 'universe',
  tabOrder: defaultTabOrder, reorderTabs: () => {},
  mobilePanel: 2, setMobilePanel: () => {},
  registerMobileScroll: () => {}, scrollMobileToPanel: () => {},
});

export const SpaceFlowNavProvider = ({ children }: { children: ReactNode }) => {
  const [centerApp, setCenterApp] = useState<SpaceFlowApp | null>(null);
  const [tabOrder, setTabOrder] = useState<string[]>(loadTabOrder);
  const [mobilePanel, setMobilePanel] = useState(2); // default: Mur (index 2)
  const mobileScrollRef = useRef<((panel: number) => void) | null>(null);

  const registerMobileScroll = useCallback((fn: ((panel: number) => void) | null) => {
    mobileScrollRef.current = fn;
  }, []);

  const scrollMobileToPanel = useCallback((panel: number) => {
    setMobilePanel(panel);
    if (mobileScrollRef.current) mobileScrollRef.current(panel);
  }, []);

  // Left sidebar: by default shows Reels (closest to Mur).
  // If a left-group app moves to center, show the NEXT one outward.
  // Reels→center: show Flow. Flow→center: show Explore. Explore→center: show Reels (wrap).
  const leftSidebarApp = useMemo<SpaceFlowApp>(() => {
    if (centerApp && LEFT_SEQUENCE.includes(centerApp)) {
      const idx = LEFT_SEQUENCE.indexOf(centerApp);
      return LEFT_SEQUENCE[(idx + 1) % LEFT_SEQUENCE.length];
    }
    return 'reels'; // default: closest to Mur
  }, [centerApp]);

  // Right sidebar: by default shows Universe (closest to Mur).
  // If a right-group app moves to center, show the OTHER one.
  // Universe→center: show Stats. Stats→center: show Universe.
  const rightSidebarApp = useMemo<SpaceFlowApp>(() => {
    if (centerApp && RIGHT_SEQUENCE.includes(centerApp)) {
      const idx = RIGHT_SEQUENCE.indexOf(centerApp);
      return RIGHT_SEQUENCE[(idx + 1) % RIGHT_SEQUENCE.length];
    }
    return 'universe'; // default: closest to Mur
  }, [centerApp]);

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

  return (
    <SpaceFlowNavContext.Provider value={{ centerApp, setCenterApp, leftSidebarApp, rightSidebarApp, tabOrder, reorderTabs, mobilePanel, setMobilePanel, registerMobileScroll, scrollMobileToPanel }}>
      {children}
    </SpaceFlowNavContext.Provider>
  );
};

export const useSpaceFlowNav = () => useContext(SpaceFlowNavContext);
