import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

export type SpaceFlowApp = 'explore' | 'flow' | 'reels' | 'universe' | 'stats';

// All SpaceFlow apps grouped by default sidebar position
const LEFT_APPS: SpaceFlowApp[] = ['explore', 'flow', 'reels'];
const RIGHT_APPS: SpaceFlowApp[] = ['universe', 'stats'];

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
  leftSidebarApp: 'explore', rightSidebarApp: 'universe',
  tabOrder: defaultTabOrder, reorderTabs: () => {},
});

export const SpaceFlowNavProvider = ({ children }: { children: ReactNode }) => {
  const [centerApp, setCenterApp] = useState<SpaceFlowApp | null>(null);
  const [tabOrder, setTabOrder] = useState<string[]>(loadTabOrder);

  // Auto-compute sidebar apps based on what's in the center
  const leftSidebarApp = useMemo<SpaceFlowApp>(() => {
    // If center has a left-group app, pick the next available from left group
    if (centerApp && LEFT_APPS.includes(centerApp)) {
      const remaining = LEFT_APPS.filter(a => a !== centerApp);
      return remaining[0] || 'explore';
    }
    return 'explore';
  }, [centerApp]);

  const rightSidebarApp = useMemo<SpaceFlowApp>(() => {
    // If center has a right-group app, pick the next available from right group
    if (centerApp && RIGHT_APPS.includes(centerApp)) {
      const remaining = RIGHT_APPS.filter(a => a !== centerApp);
      return remaining[0] || 'universe';
    }
    return 'universe';
  }, [centerApp]);

  const reorderTabs = useCallback((dragId: string, dropId: string) => {
    if (dragId === 'mur' || dropId === 'mur' || dragId === dropId) return;
    setTabOrder(prev => {
      const arr = [...prev];
      const from = arr.indexOf(dragId);
      const to = arr.indexOf(dropId);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, dragId);
      localStorage.setItem('sf_tab_order', JSON.stringify(arr));
      return arr;
    });
  }, []);

  return (
    <SpaceFlowNavContext.Provider value={{ centerApp, setCenterApp, leftSidebarApp, rightSidebarApp, tabOrder, reorderTabs }}>
      {children}
    </SpaceFlowNavContext.Provider>
  );
};

export const useSpaceFlowNav = () => useContext(SpaceFlowNavContext);
