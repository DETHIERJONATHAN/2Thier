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
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useSpaceFlowNav, SpaceFlowNavProvider } from '../../contexts/SpaceFlowNavContext';

const { Header, Content } = Layout;

const DESKTOP_HEADER_HEIGHT = 48;
const MOBILE_HEADER_HEIGHT = 52;

interface MainLayoutProps {
  children: React.ReactNode;
}

// ── SpaceFlow Header Tabs Component ──
const SF_TAB_CONFIG = [
  { id: 'explore', label: 'Explore', icon: '🔍' },
  { id: 'flow', label: 'Flow', icon: '🌊' },
  { id: 'reels', label: 'Reels', icon: '🎬' },
  { id: 'mur', label: 'Mur', icon: '🏠' },
  { id: 'universe', label: 'Universe', icon: '🌌' },
  { id: 'stats', label: 'Stats', icon: '📊' },
];

const SpaceFlowHeaderTabs: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { centerApp, setCenterApp, tabOrder, reorderTabs } = useSpaceFlowNav();
  const [dragId, setDragId] = useState<string | null>(null);
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const activeModule = searchParams.get('module');
  const navigate = useNavigate();

  // Touch drag state for mobile reorder
  const touchState = useRef<{ id: string; startX: number; startY: number; timer: ReturnType<typeof setTimeout> | null; active: boolean }>({ id: '', startX: 0, startY: 0, timer: null, active: false });
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const orderedTabs = useMemo(() => {
    return tabOrder
      .map(id => SF_TAB_CONFIG.find(t => t.id === id))
      .filter((t): t is typeof SF_TAB_CONFIG[0] => !!t);
  }, [tabOrder]);

  const handleTabClick = useCallback((tabId: string) => {
    if (!isDashboard) {
      navigate('/dashboard');
    }
    if (tabId === 'mur') {
      setCenterApp(null);
      setSearchParams({}, { replace: true });
    } else {
      setCenterApp(tabId as any);
      if (activeModule) setSearchParams({}, { replace: true });
    }
  }, [isDashboard, navigate, setCenterApp, setSearchParams, activeModule]);

  // Mobile: long press to start drag, then slide to reorder
  const onTouchStart = useCallback((tabId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = { id: tabId, startX: touch.clientX, startY: touch.clientY, timer: null, active: false };
    // Long press: 400ms to activate drag mode
    touchState.current.timer = setTimeout(() => {
      touchState.current.active = true;
      setDragId(tabId);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchState.current;
    if (!ts.id) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - ts.startX);
    const dy = Math.abs(touch.clientY - ts.startY);

    // If moved too much before long press, cancel
    if (!ts.active && (dx > 10 || dy > 10)) {
      if (ts.timer) clearTimeout(ts.timer);
      ts.timer = null;
      return;
    }

    if (!ts.active) return;
    e.preventDefault();

    // Find which tab we're over
    for (const [id, el] of tabRefs.current) {
      if (id === ts.id) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        reorderTabs(ts.id, id);
        break;
      }
    }
  }, [reorderTabs]);

  const onTouchEnd = useCallback(() => {
    const ts = touchState.current;
    if (ts.timer) clearTimeout(ts.timer);
    if (ts.active) {
      setDragId(null);
    }
    touchState.current = { id: '', startX: 0, startY: 0, timer: null, active: false };
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2,
      flex: 1, justifyContent: 'center',
      overflow: 'hidden', margin: '0 4px',
    }}>
      {orderedTabs.map(tab => {
        const isActive = isDashboard && (
          tab.id === 'mur'
            ? !activeModule && !centerApp
            : centerApp === tab.id
        );
        return (
          <div
            key={tab.id}
            ref={(el) => { if (el) tabRefs.current.set(tab.id, el); }}
            // Desktop drag
            draggable={!isMobile}
            onDragStart={() => setDragId(tab.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => { e.preventDefault(); if (dragId) reorderTabs(dragId, tab.id); setDragId(null); }}
            // Mobile touch
            onTouchStart={(e) => onTouchStart(tab.id, e)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={() => { if (!touchState.current.active) handleTabClick(tab.id); }}
            style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center', gap: isMobile ? 1 : 5,
              padding: isMobile ? '2px 6px' : '5px 12px', borderRadius: 8,
              cursor: 'pointer',
              fontSize: isMobile ? 9 : 13, fontWeight: 600, whiteSpace: 'nowrap',
              background: isActive ? 'rgba(255,255,255,0.18)' : dragId === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
              transition: 'all 0.2s',
              opacity: dragId === tab.id ? 0.4 : 1,
              userSelect: 'none',
              transform: dragId === tab.id ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <span style={{ fontSize: isMobile ? 16 : 15 }}>{tab.icon}</span>
            <span style={{ fontSize: isMobile ? 8 : 13 }}>{tab.label}</span>
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
          <svg width="28" height="28" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="sf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F8EF7" />
                <stop offset="100%" stopColor="#6C5CE7" />
              </linearGradient>
              <linearGradient id="sf-s" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e0e0ff" />
              </linearGradient>
            </defs>
            <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#sf-bg)" />
            <path d="M65 30C55 30 48 35 48 42C48 52 65 48 65 56C65 61 58 65 48 65" stroke="url(#sf-s)" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M42 28C42 28 35 32 35 38C35 44 50 44 55 35" stroke="#A29BFE" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
          {!isMobile && <span style={{ fontStyle: 'italic', fontWeight: 700 }}>SpaceFlow</span>}
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
