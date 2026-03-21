import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { Layout, Dropdown, Input, Avatar } from 'antd';
import NotificationsBell from '../../components/NotificationsBell';
import type { MenuProps } from 'antd';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  SearchOutlined,
  DownOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  CloseOutlined,
  CompassOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import Icon from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useSpaceFlowNav, SpaceFlowNavProvider } from '../../contexts/SpaceFlowNavContext';

const { Header, Content } = Layout;

const DESKTOP_HEADER_HEIGHT = 48;
const MOBILE_HEADER_HEIGHT = 52;

interface MainLayoutProps {
  children: React.ReactNode;
}

// ── Custom SVG icons ──
const ClapperboardSvg = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h16a1 1 0 001-1V7H3v12a1 1 0 001 1z" />
    <path d="M3 7l1.5-4h15L21 7H3z" />
    <path d="M7 3l-1.5 4M12 3l-1.5 4M17 3l-1.5 4" />
  </svg>
);

const WallSvg = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="12" y1="3" x2="12" y2="9" />
    <line x1="7" y1="9" x2="7" y2="15" />
    <line x1="17" y1="9" x2="17" y2="15" />
    <line x1="12" y1="15" x2="12" y2="21" />
  </svg>
);

const FlowWaveSvg = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    <path d="M2 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    <path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
  </svg>
);

const UniverseSvg = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <ellipse cx="12" cy="12" rx="10" ry="4" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
  </svg>
);

const ClapperboardIcon = (props: any) => <Icon component={ClapperboardSvg} {...props} />;
const WallIcon = (props: any) => <Icon component={WallSvg} {...props} />;
const FlowWaveIcon = (props: any) => <Icon component={FlowWaveSvg} {...props} />;
const UniverseIcon = (props: any) => <Icon component={UniverseSvg} {...props} />;

// ── SpaceFlow Header Tabs Component ──
const SF_TAB_CONFIG: { id: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }[] = [
  { id: 'explore', label: 'Explore', icon: CompassOutlined, color: '#00CEC9' },
  { id: 'flow', label: 'Flow', icon: FlowWaveIcon, color: '#6C5CE7' },
  { id: 'reels', label: 'Reels', icon: ClapperboardIcon, color: '#e84393' },
  { id: 'mur', label: 'Mur', icon: WallIcon, color: '#1877F2' },
  { id: 'universe', label: 'Universe', icon: UniverseIcon, color: '#FD79A8' },
  { id: 'stats', label: 'Stats', icon: BarChartOutlined, color: '#FDCB6E' },
];

const SpaceFlowHeaderTabs: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { centerApp, setCenterApp, tabOrder, reorderTabs, mobilePanel, scrollMobileToPanel } = useSpaceFlowNav();
  const [dragId, setDragId] = useState<string | null>(null);
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const activeModule = searchParams.get('module');
  const navigate = useNavigate();

  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Touch drag state for mobile reorder
  const touchState = useRef<{ id: string; startX: number; startY: number; timer: ReturnType<typeof setTimeout> | null; active: boolean }>({ id: '', startX: 0, startY: 0, timer: null, active: false });
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const orderedTabs = useMemo(() => {
    return tabOrder
      .map(id => SF_TAB_CONFIG.find(t => t.id === id))
      .filter((t): t is typeof SF_TAB_CONFIG[0] => !!t);
  }, [tabOrder]);

  const handleTabClick = useCallback((tabId: string) => {
    if (!isDashboard) {
      navigate('/dashboard');
    }
    // On mobile, scroll the carousel to the matching position in tabOrder
    if (isMobile) {
      const panelPosition = tabOrder.indexOf(tabId);
      if (panelPosition >= 0) scrollMobileToPanel(panelPosition);
    }
    if (tabId === 'mur') {
      setCenterApp(null);
      setSearchParams({}, { replace: true });
    } else {
      setCenterApp(tabId as any);
      if (activeModule) setSearchParams({}, { replace: true });
    }
  }, [isDashboard, navigate, setCenterApp, setSearchParams, activeModule, isMobile, scrollMobileToPanel, tabOrder]);

  // Mobile: long press to start drag, then slide to reorder
  const onTouchStart = useCallback((tabId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = { id: tabId, startX: touch.clientX, startY: touch.clientY, timer: null, active: false };
    touchState.current.timer = setTimeout(() => {
      touchState.current.active = true;
      setDragId(tabId);
      try { navigator.vibrate?.(30); } catch { /* ignore */ }
    }, 400);
  }, []);

  // Register native (non-passive) touchmove/touchend on the container to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      const ts = touchState.current;
      if (!ts.id) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - ts.startX);
      const dy = Math.abs(touch.clientY - ts.startY);
      if (!ts.active && (dx > 10 || dy > 10)) {
        if (ts.timer) clearTimeout(ts.timer);
        ts.timer = null;
        return;
      }
      if (!ts.active) return;
      e.preventDefault();
      e.stopPropagation();
      for (const [id, el] of tabRefs.current) {
        if (id === ts.id) continue;
        const rect = el.getBoundingClientRect();
        if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
          reorderTabs(ts.id, id);
          break;
        }
      }
    };

    const handleTouchEnd = () => {
      const ts = touchState.current;
      if (ts.timer) clearTimeout(ts.timer);
      if (ts.active) setDragId(null);
      touchState.current = { id: '', startX: 0, startY: 0, timer: null, active: false };
    };

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [reorderTabs]);

  return (
    <div ref={containerRef} style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 2,
      flex: 1, justifyContent: 'center',
      overflow: 'hidden', margin: '0 4px',
      touchAction: dragId ? 'none' : 'auto',
    }}>
      {orderedTabs.map(tab => {
        // Desktop: active via centerApp context. Mobile: active via position in tabOrder.
        const isActive = isDashboard && (
          isMobile
            ? mobilePanel === tabOrder.indexOf(tab.id)
            : tab.id === 'mur'
              ? !activeModule && !centerApp
              : centerApp === tab.id
        );
        return (
          <div
            key={tab.id}
            ref={(el) => { if (el) tabRefs.current.set(tab.id, el); }}
            draggable={!isMobile}
            onDragStart={() => setDragId(tab.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => { e.preventDefault(); if (dragId) reorderTabs(dragId, tab.id); setDragId(null); }}
            onTouchStart={(e) => onTouchStart(tab.id, e)}
            onClick={() => { if (!touchState.current.active) handleTabClick(tab.id); }}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center', gap: isMobile ? 0 : 5,
              padding: isMobile ? '4px 6px' : '5px 12px', borderRadius: 8,
              cursor: 'pointer',
              fontSize: isMobile ? 9 : 13, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
              background: (isActive || hoveredTab === tab.id) ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.2s',
              opacity: dragId === tab.id ? 0.4 : 1,
              userSelect: 'none',
              transform: dragId === tab.id ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <tab.icon style={{ fontSize: isMobile ? 20 : 17, color: (isActive || hoveredTab === tab.id) ? tab.color : '#ffffff', transition: 'color 0.2s' }} />
            {!isMobile && <span style={{ fontSize: 13, color: isActive ? '#fff' : hoveredTab === tab.id ? '#fff' : 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}>{tab.label}</span>}
          </div>
        );
      })}
    </div>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCenterApp } = useSpaceFlowNav();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<any>(null);
  const isMobile = windowWidth < 768;
  const headerHeight = isMobile ? MOBILE_HEADER_HEIGHT : DESKTOP_HEADER_HEIGHT;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { logout, user, currentOrganization } = useAuth();

  const userInitial = useMemo(() => {
    const source = user?.firstName || (user as any)?.firstname || user?.email || currentOrganization?.name || 'C';
    return (source?.charAt?.(0) || 'C').toUpperCase();
  }, [user?.firstName, (user as any)?.firstname, user?.email, currentOrganization?.name]);

  const handleLogout = useCallback(() => { 
    logout(); 
    navigate('/login'); 
  }, [logout, navigate]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [showSearch]);

  // Close search with Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSearch) setShowSearch(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showSearch]);

  // Menu profil utilisateur
  const userProfileMenu = useMemo<MenuProps>(() => ({
    className: 'dropdown-2thier-menu',
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <NavLink to="/profile">Mon Profil</NavLink>
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <NavLink to="/settings">Paramètres</NavLink>
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Déconnexion',
        onClick: handleLogout
      }
    ]
  }), [handleLogout]);

  return (
    <Layout className="min-h-screen">
      <Header 
        style={{ 
          background: 'linear-gradient(135deg, #0B0E2A 0%, #1a1e4e 50%, #0B0E2A 100%)', 
          height: `${headerHeight}px`,
          minHeight: `${headerHeight}px`,
          padding: isMobile ? '0 10px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap',
          gap: isMobile ? '8px' : '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}
      >
        {/* Logo SpaceFlow */}
        <div 
          className="header-2thier-item" 
          style={{ 
            fontWeight: 'bold', 
            fontSize: isMobile ? '15px' : '17px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            color: 'white',
            letterSpacing: '0.5px'
          }}
          onClick={() => { navigate('/dashboard'); setCenterApp(null); setSearchParams({}, { replace: true }); }}
        >
          <img src="/zhivv-logo.png" alt="Zhivv" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
          {!isMobile && <span style={{ fontStyle: 'italic', fontWeight: 700 }}>Zhivv</span>}
        </div>

        {/* Loupe — ouvre la barre de recherche */}
        <div
          className="header-2thier-item"
          onClick={() => setShowSearch(!showSearch)}
          style={{ 
            border: 'none',
            padding: '6px',
            height: '36px',
            minWidth: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '6px',
            backgroundColor: showSearch ? 'rgba(255,255,255,0.16)' : 'transparent',
          }}
        >
          <SearchOutlined style={{ fontSize: '18px', color: 'white' }} />
        </div>

        {/* ── SpaceFlow Navigation Tabs (centré dans header) ── */}
        <SpaceFlowHeaderTabs isMobile={isMobile} />

        {/* Icônes à droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', marginLeft: isMobile ? '8px' : 'auto', flexShrink: 0 }}>
          {/* Notifications */}
          <NotificationsBell />

          {/* Profil utilisateur — avatar avec photo */}
          <Dropdown menu={userProfileMenu} trigger={['click']}>
            <div
              className="header-2thier-item"
              style={{ 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Avatar 
                size={isMobile ? 30 : 32} 
                src={user?.avatarUrl || undefined}
                style={{ 
                  backgroundColor: user?.avatarUrl ? 'transparent' : '#1890ff',
                  cursor: 'pointer',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {!user?.avatarUrl && userInitial}
              </Avatar>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Barre de recherche — overlay qui apparaît au clic sur la loupe */}
      {showSearch && (
        <div style={{
          position: 'fixed',
          top: `${headerHeight}px`,
          left: 0,
          right: 0,
          zIndex: 999,
          background: 'linear-gradient(135deg, #0B0E2A 0%, #1a1e4e 100%)',
          padding: '8px 16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Input
            ref={searchInputRef}
            placeholder="Rechercher..."
            prefix={<SearchOutlined style={{ color: '#93a3aa' }} />}
            className="search-2thier"
            allowClear
            aria-label="Recherche globale"
            style={{ flex: 1, height: 36 }}
          />
          <CloseOutlined 
            onClick={() => setShowSearch(false)} 
            style={{ color: 'white', fontSize: 16, cursor: 'pointer', padding: 4 }} 
          />
        </div>
      )}

      <Content style={{ 
        backgroundColor: 'white',
        minHeight: '100vh',
        paddingTop: `${headerHeight}px`,
        overflow: 'auto'
      }}>
        {children}
      </Content>
    </Layout>
  );
};

// Wrap with SpaceFlowNavProvider so Header tabs & Dashboard share state
const MainLayoutWithNav: React.FC<MainLayoutProps> = (props) => (
  <SpaceFlowNavProvider>
    <MainLayout {...props} />
  </SpaceFlowNavProvider>
);

export default MainLayoutWithNav;
