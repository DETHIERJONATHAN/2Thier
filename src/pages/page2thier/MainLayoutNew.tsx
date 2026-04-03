import React, { useCallback, useMemo, useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Layout, Dropdown, Avatar, Spin } from 'antd';
import GlobalSearch from '../../components/GlobalSearch';
import NotificationsBell from '../../components/NotificationsBell';
const MessengerChat = lazy(() => import('../../components/MessengerChat'));
const WebBrowserPanel = lazy(() => import('../../components/WebBrowserPanel'));
import type { MenuProps } from 'antd';
import { NavLink, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  SearchOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  CompassOutlined,
  BarChartOutlined,
  TeamOutlined,
  MailOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import Icon from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useZhiiveNav, ZhiiveNavProvider, FeedMode } from '../../contexts/ZhiiveNavContext';
import { ActiveIdentityProvider, useActiveIdentity } from '../../contexts/ActiveIdentityContext';
import { SocialIdentityProvider } from '../../contexts/SocialIdentityContext';

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

// ── Zhiive Header Tabs Component ──
const SF_TAB_CONFIG: { id: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; color: string }[] = [
  { id: 'mur', label: 'Hive', icon: WallIcon, color: '#F5A623' },
  { id: 'explore', label: 'Scout', icon: CompassOutlined, color: '#00CEC9' },
  { id: 'reels', label: 'Reels', icon: ClapperboardIcon, color: '#e84393' },
  { id: 'flow', label: 'Flow', icon: FlowWaveIcon, color: '#6C5CE7' },
  { id: 'universe', label: 'Universe', icon: UniverseIcon, color: '#FD79A8' },
  { id: 'mail', label: 'Mail', icon: MailOutlined, color: '#00B894' },
  { id: 'agenda', label: 'Agenda', icon: CalendarOutlined, color: '#0984E3' },
  { id: 'stats', label: 'Stats', icon: BarChartOutlined, color: '#FDCB6E' },
];

const ZhiiveHeaderTabs: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { centerApp, setCenterApp, tabOrder, reorderTabs, mobilePanel, scrollMobileToPanel } = useZhiiveNav();
  const { currentOrganization, isSuperAdmin } = useAuth();
  const isFreeUser = !currentOrganization && !isSuperAdmin;
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
      .filter((t): t is typeof SF_TAB_CONFIG[0] => !!t)
      .filter(t => !(isFreeUser && t.id === 'stats'));
  }, [tabOrder, isFreeUser]);

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
      // Mur = Wall in center — clear centerApp
      setCenterApp(null);
      setSearchParams({}, { replace: true });
    } else {
      // Open the app in the center column
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
    <>
    <style>{`.zhiive-tabs-scroll::-webkit-scrollbar{display:none}`}</style>
    <div ref={containerRef} className="zhiive-tabs-scroll" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 0 : 2,
      flex: 1,
      overflowX: 'auto', overflowY: 'hidden',
      scrollbarWidth: 'none',
      margin: '0 4px',
      touchAction: dragId ? 'none' : 'auto',
    }}>
      {orderedTabs.map(tab => {
        // Desktop: active = Mur if no centerApp and no module, else matches centerApp. Mobile: position.
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
              cursor: 'pointer', flexShrink: 0,
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
    </>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSearch, setShowSearch] = useState(false);
  const isMobile = windowWidth < 768;
  const headerHeight = isMobile ? MOBILE_HEADER_HEIGHT : DESKTOP_HEADER_HEIGHT;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { logout, user, currentOrganization } = useAuth();
  const { feedMode, setFeedMode, setCenterApp, browseUrl, setBrowseUrl, wallViewUrl, setWallViewUrl } = useZhiiveNav();

  // 🐝 Identité centralisée — source unique de vérité pour l'avatar/nom du header
  const identity = useActiveIdentity();

  const userInitial = useMemo(() => {
    const source = user?.firstName || (user as any)?.firstname || user?.email || currentOrganization?.name || 'C';
    return (source?.charAt?.(0) || 'C').toUpperCase();
  }, [user?.firstName, (user as any)?.firstname, user?.email, currentOrganization?.name]);

  const orgLogo = (currentOrganization as any)?.logoUrl || null;
  const orgInitial = useMemo(() => (currentOrganization?.name?.charAt(0) || 'O').toUpperCase(), [currentOrganization?.name]);

  // 🐝 Avatar du header piloté par le système d'identité centralisé
  const showOrgAvatar = identity.isOrgMode;
  const headerAvatarSrc = identity.avatarUrl;
  const headerAvatarFallback = showOrgAvatar ? (!orgLogo && orgInitial) : (!user?.avatarUrl && userInitial);
  const headerAvatarBg = showOrgAvatar
    ? (orgLogo ? 'transparent' : '#6C5CE7')
    : (user?.avatarUrl ? 'transparent' : '#1890ff');
  const headerAvatarBorder = showOrgAvatar ? '2px solid rgba(108,92,231,0.5)' : '2px solid rgba(255,255,255,0.3)';

  const handleLogout = useCallback(() => { 
    logout(); 
    navigate('/login'); 
  }, [logout, navigate]);

  // Ctrl+K shortcut to open global search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Menu profil utilisateur
  const userProfileMenu = useMemo<MenuProps>(() => ({
    className: 'dropdown-2thier-menu',
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: <NavLink to="/profile">Profil</NavLink>
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: <NavLink to="/settings">Paramètres</NavLink>
      },
      ...(currentOrganization ? [
        { type: 'divider' as const },
        {
          key: 'feed-mode',
          label: (
            <div style={{ display: 'flex', gap: 4, padding: '2px 0' }} onClick={e => e.stopPropagation()}>
              {([
                { key: 'personal' as const, label: '👤 Mon Hive', color: '#00CEC9' },
                { key: 'org' as const, label: '🏢 Colony', color: '#6C5CE7' },
              ]).map(m => (
                <div
                  key={m.key}
                  onClick={(e) => { e.stopPropagation(); setFeedMode(m.key); }}
                  style={{
                    padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: feedMode === m.key ? 600 : 400,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: feedMode === m.key ? m.color + '20' : 'transparent',
                    color: feedMode === m.key ? m.color : '#636E72',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          ),
        },
      ] : []),
      { type: 'divider' },
      {
        key: 'zhiive',
        label: <a href="https://www.zhiive.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>www.zhiive.com</a>
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Déconnexion',
        onClick: handleLogout
      }
    ]
  }), [handleLogout, currentOrganization, feedMode, setFeedMode]);

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
        {/* Logo Zhiive */}
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
          <img src="/zhiive-logo.png" alt="Zhiive" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
          {!isMobile && <img src="/zhiive-ecrit.png" alt="Zhiive" style={{ height: 20, objectFit: 'contain' }} />}
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

        {/* ── Zhiive Navigation Tabs (centré dans header) ── */}
        <ZhiiveHeaderTabs isMobile={isMobile} />

        {/* Icônes à droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', marginLeft: isMobile ? '8px' : 'auto', flexShrink: 0 }}>
          {/* Notifications */}
          <NotificationsBell />

          {/* Profil utilisateur — avatar avec photo (ou logo org si feedMode=org) */}
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
                src={headerAvatarSrc}
                style={{ 
                  backgroundColor: headerAvatarBg,
                  cursor: 'pointer',
                  border: headerAvatarBorder,
                }}
              >
                {headerAvatarFallback}
              </Avatar>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* 🔍 Recherche universelle Zhiive — GlobalSearch */}
      <GlobalSearch
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        headerHeight={headerHeight}
        isMobile={isMobile}
      />

      <Content style={{ 
        backgroundColor: 'white',
        height: '100vh',
        paddingTop: `${headerHeight}px`,
        boxSizing: 'border-box' as const,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
      }}>
        {children}
      </Content>
      <Suspense fallback={null}>
        <MessengerChat />
      </Suspense>

      {/* 🌐 In-app browser overlay — plein écran au-dessus de tout */}
      {wallViewUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2000,
          background: '#fff',
        }}>
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>}>
            <WebBrowserPanel url={wallViewUrl} onClose={() => setWallViewUrl(null)} />
          </Suspense>
        </div>
      )}
    </Layout>
  );
};

// Wrap with ZhiiveNavProvider + ActiveIdentityProvider so Header tabs & Dashboard share state
// 🐝 ActiveIdentityProvider = système centralisé d'identité (voir src/contexts/ActiveIdentityContext.tsx)
const MainLayoutWithNav: React.FC<MainLayoutProps> = (props) => {
  const { user } = useAuth();
  const { api } = useAuthenticatedApi();

  const initialFeedMode = (user?.preferredFeedMode === 'personal' ? 'personal' : 'org') as FeedMode;

  // Stabilize api reference to prevent infinite re-render loops
  const apiRef = useRef(api);
  apiRef.current = api;

  const handleFeedModeChange = useCallback((mode: FeedMode) => {
    apiRef.current.patch('/api/me/feed-mode', { feedMode: mode }).catch(() => {});
  }, []);

  return (
    <ZhiiveNavProvider initialFeedMode={initialFeedMode} onFeedModeChange={handleFeedModeChange}>
      <ActiveIdentityProvider>
        <SocialIdentityProvider>
          <MainLayout {...props} />
        </SocialIdentityProvider>
      </ActiveIdentityProvider>
    </ZhiiveNavProvider>
  );
};

export default MainLayoutWithNav;
