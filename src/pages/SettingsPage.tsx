import { FB } from '../components/zhiive/ZhiiveTheme';
import React, { useState, useMemo, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Spin } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  MailOutlined,
  GoogleOutlined,
  CameraOutlined,
  SettingOutlined,
  LinkOutlined,
  SearchOutlined,
  IdcardOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  LockOutlined,
  FileTextOutlined,
  ApiOutlined,
  AuditOutlined,
  BankOutlined,
  PhoneOutlined,
  StopOutlined,
  ToolOutlined,
  CrownOutlined,
} from '@ant-design/icons';

/* ═══════════════════════════════════════════════════════════════
   FACEBOOK COLORS — mêmes tokens que ProfilePage
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   RESPONSIVE HOOK (identique à ProfilePage)
   ═══════════════════════════════════════════════════════════════ */
const useScreenSize = () => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { isMobile: width < 768, width };
};

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface MenuItem {
  key: string;
  to: string;
  icon: React.ReactNode;
  label: string;
  requiredPermission: string | null;
}

interface MenuCategory {
  title: string;
  description: string;
  items: MenuItem[];
}

/* ── Quick access cards data ─────────────────────────────────── */
const quickCards = [
  { to: '/settings/profile', emoji: '👤', bg: '#e7f3ff', title: 'Mon Profil', desc: 'Modifiez votre nom, photo et coordonnées.', permission: null as string | null, superAdminOnly: false },
  { to: '/settings/organization', emoji: '🏢', bg: '#fff3e0', title: 'Colony', desc: 'Gérez les paramètres de votre Colony.', permission: 'organization:read', superAdminOnly: false },
  { to: '/settings/users', emoji: '👥', bg: '#e8f5e9', title: 'Utilisateurs', desc: 'Invitez et gérez les membres.', permission: 'user:read', superAdminOnly: false },
  { to: '/settings/roles', emoji: '🛡️', bg: '#fce4ec', title: 'Rôles & Permissions', desc: "Configurez les droits d'accès.", permission: 'role:read', superAdminOnly: false },
  { to: '/settings/emails', emoji: '📧', bg: '#f3e5f5', title: 'Emails', desc: 'Paramètres email et SMTP.', permission: 'user:read', superAdminOnly: false },
  { to: '/settings/ai-measure', emoji: '📐', bg: '#e0f7fa', title: 'IA Mesure', desc: 'Calibration du métré A4 V10.', permission: 'organization:read', superAdminOnly: false },
  { to: '/settings/modules', emoji: '🧩', bg: '#ede7f6', title: 'Modules', desc: 'Gérer les modules et fonctionnalités.', permission: null, superAdminOnly: true },
  { to: '/settings/trees', emoji: '🌳', bg: '#e8f5e9', title: 'Arbres & Formulaires', desc: 'Gérer les arbres de formulaires.', permission: null, superAdminOnly: true },
  { to: '/settings/permissions', emoji: '🔐', bg: '#fff8e1', title: 'Permissions', desc: 'Gestion granulaire des permissions.', permission: null, superAdminOnly: true },
  { to: '/settings/rights-summary', emoji: '📊', bg: '#e3f2fd', title: 'Synthèse des droits', desc: 'Vue matricielle des droits utilisateurs.', permission: 'user:read', superAdminOnly: false },
  { to: '/settings/documents', emoji: '📄', bg: '#fce4ec', title: 'Documents', desc: 'Templates et modèles de documents.', permission: null, superAdminOnly: true },
  { to: '/settings/integrations', emoji: '🔌', bg: '#e0f2f1', title: 'Intégrations', desc: 'Connexions avec services externes.', permission: null, superAdminOnly: true },
  { to: '/settings/zhiivemail', emoji: '🐝', bg: '#f3e5f5', title: 'ZhiiveMail', desc: 'Gestion du système email @zhiive.com.', permission: null, superAdminOnly: true },
];

/* ═══════════════════════════════════════════════════════════════
   Settings Index — page d'accueil (grille de cartes Facebook)
   ═══════════════════════════════════════════════════════════════ */
const SettingsIndex: React.FC<{ can: (p: string) => boolean; isMobile: boolean; isSuperAdmin: boolean }> = ({ can, isMobile, isSuperAdmin }) => {
  const navigate = useNavigate();
  const [hoverCard, setHoverCard] = useState<string | null>(null);

  const visibleCards = quickCards.filter(card => {
    if (card.superAdminOnly && !isSuperAdmin) return false;
    if (!card.permission) return true;
    return can(card.permission);
  });

  return (
    <div>
      {/* Search header */}
      <div style={{
        background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
        padding: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 24,
      }}>
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: FB.text, margin: '0 0 12px' }}>
          Trouvez le paramètre dont vous avez besoin
        </h2>
        <div style={{ position: 'relative' }}>
          <SearchOutlined style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: FB.textSecondary, fontSize: 14,
          }} />
          <input
            type="text"
            placeholder="Rechercher dans les paramètres"
            style={{
              width: '100%', height: 40, paddingLeft: 36, paddingRight: 16,
              borderRadius: 20, border: 'none', background: FB.bg,
              fontSize: 15, color: FB.text, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Quick access title + grid */}
      <h3 style={{ fontSize: isMobile ? 16 : 17, fontWeight: 700, color: FB.text, margin: '0 0 12px' }}>
        Paramètres les plus consultés
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
        gap: isMobile ? 12 : 16,
      }}>
        {visibleCards.map(card => (
          <div
            key={card.to}
            onClick={() => navigate(card.to)}
            onMouseEnter={() => setHoverCard(card.to)}
            onMouseLeave={() => setHoverCard(null)}
            style={{
              background: FB.white, borderRadius: FB.radius,
              boxShadow: hoverCard === card.to ? '0 2px 8px rgba(0,0,0,0.12)' : FB.shadow,
              padding: isMobile ? 16 : 20, cursor: 'pointer',
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{
              width: isMobile ? 48 : 64, height: isMobile ? 48 : 64,
              borderRadius: '50%', background: card.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: isMobile ? 24 : 30, margin: '0 auto 12px',
            }}>
              {card.emoji}
            </div>
            <div style={{
              fontSize: isMobile ? 13 : 15, fontWeight: 600,
              color: hoverCard === card.to ? FB.blue : FB.text,
              textAlign: 'center', marginBottom: 4, transition: 'color 0.15s',
            }}>
              {card.title}
            </div>
            {!isMobile && (
              <div style={{ fontSize: 13, color: FB.textSecondary, textAlign: 'center', lineHeight: 1.4 }}>
                {card.desc}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Sidebar Item (inline styles)
   ═══════════════════════════════════════════════════════════════ */
const SidebarItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}> = ({ to, icon, label, active }) => {
  const [hover, setHover] = useState(false);
  return (
    <NavLink to={to} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
          background: active ? FB.activeBlue : hover ? FB.bg : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 18, color: active ? FB.blue : FB.text, flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontSize: 15, color: active ? FB.blue : FB.text,
          fontWeight: active ? 600 : 400,
        }}>{label}</span>
      </div>
    </NavLink>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Mobile pill nav item
   ═══════════════════════════════════════════════════════════════ */
const MobilePill: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}> = ({ to, icon, label, active }) => (
  <NavLink to={to} style={{ textDecoration: 'none', flexShrink: 0 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 20, whiteSpace: 'nowrap',
      fontSize: 13, fontWeight: active ? 600 : 400,
      background: active ? FB.blue : FB.btnGray,
      color: active ? '#fff' : FB.text,
      transition: 'all 0.15s',
    }}>
      {icon} {label}
    </div>
  </NavLink>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════ */
const SettingsPage = () => {
  const { can, loading, isSuperAdmin, user, currentOrganization } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useScreenSize();
  const [search, setSearch] = useState('');

  const isIndex = location.pathname === '/settings' || location.pathname === '/settings/';

  const categories = useMemo<MenuCategory[]>(() => {
    const userRole = user?.role || 'user';
    const isAdmin = isSuperAdmin || userRole === 'admin';
    const isInternal = isAdmin || ['manager', 'commercial', 'support'].includes(userRole);

    const cats: MenuCategory[] = [];
    const filterItems = (items: MenuItem[]) => items.filter(i => !i.requiredPermission || can(i.requiredPermission));

    // Category 1: Espace Compte
    const accountItems: MenuItem[] = [
      { key: 'profile', to: '/settings/profile', icon: <IdcardOutlined />, label: 'Informations personnelles', requiredPermission: null },
    ];
    if (isInternal) {
      accountItems.push({ key: 'commercial', to: '/settings/commercial', icon: <LinkOutlined />, label: 'Liens commerciaux', requiredPermission: null });
    }

    // Category 2: Outils et ressources
    const toolItems: MenuItem[] = [
      { key: 'organization', to: '/settings/organization', icon: <TeamOutlined />, label: 'Organisation', requiredPermission: 'organization:read' },
      { key: 'users', to: '/settings/users', icon: <UserOutlined />, label: 'Utilisateurs', requiredPermission: 'user:read' },
      { key: 'roles', to: '/settings/roles', icon: <SafetyCertificateOutlined />, label: 'Rôles & Permissions', requiredPermission: 'role:read' },
      { key: 'emails', to: '/settings/emails', icon: <MailOutlined />, label: 'Emails', requiredPermission: 'user:read' },
      { key: 'peppol', to: '/settings/peppol', icon: <FileTextOutlined />, label: 'e-Facturation Peppol', requiredPermission: 'organization:read' },
      { key: 'rights-summary', to: '/settings/rights-summary', icon: <AuditOutlined />, label: 'Synthèse des droits', requiredPermission: 'user:read' },
    ];
    if (isAdmin) {
      toolItems.push({ key: 'google', to: '/settings/google', icon: <GoogleOutlined />, label: 'Google Workspace', requiredPermission: 'organization:read' });
      toolItems.push({ key: 'organizations', to: '/settings/organizations', icon: <BankOutlined />, label: 'Organisations', requiredPermission: 'organization:read' });
    }

    // Category 3: Préférences
    const prefItems: MenuItem[] = [
      { key: 'ai-measure', to: '/settings/ai-measure', icon: <CameraOutlined />, label: 'IA Mesure', requiredPermission: 'organization:read' },
      { key: 'blocked', to: '/settings/blocked', icon: <StopOutlined />, label: 'Blocages', requiredPermission: null },
      { key: 'notifications', to: '/settings/notifications', icon: <SettingOutlined />, label: 'Notifications', requiredPermission: null },
      { key: 'privacy', to: '/settings/privacy', icon: <LockOutlined />, label: 'Confidentialité & RGPD', requiredPermission: null },
    ];

    // Category 4: Administration (Super Admin + Admin avancé)
    const adminItems: MenuItem[] = [];
    if (isSuperAdmin) {
      adminItems.push(
        { key: 'modules', to: '/settings/modules', icon: <AppstoreOutlined />, label: 'Modules', requiredPermission: null },
        { key: 'permissions', to: '/settings/permissions', icon: <LockOutlined />, label: 'Permissions', requiredPermission: null },
        { key: 'trees', to: '/settings/trees', icon: <ApartmentOutlined />, label: 'Arbres & Formulaires', requiredPermission: null },
        { key: 'documents', to: '/settings/documents', icon: <FileTextOutlined />, label: 'Documents', requiredPermission: null },
        { key: 'integrations', to: '/settings/integrations', icon: <ApiOutlined />, label: 'Intégrations', requiredPermission: null },
        { key: 'zhiivemail', to: '/settings/zhiivemail', icon: <MailOutlined />, label: 'ZhiiveMail', requiredPermission: null },
      );
    }

    cats.push({ title: '', description: '', items: filterItems(accountItems) });
    cats.push({ title: 'Outils et ressources', description: 'Gérez votre Colony et vos Crews.', items: filterItems(toolItems) });
    cats.push({ title: 'Préférences', description: 'Personnalisez votre expérience.', items: filterItems(prefItems) });
    if (adminItems.length > 0) {
      cats.push({ title: 'Administration', description: 'Configuration avancée.', items: filterItems(adminItems) });
    }

    return cats.filter(c => c.items.length > 0);
  }, [can, isSuperAdmin, user?.role]);

  const allItems = categories.flatMap(c => c.items);
  const filteredItems = search.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  /* ═══ MOBILE LAYOUT ═══ */
  if (isMobile) {
    return (
      <div style={{ background: FB.bg, height: '100%', overflowY: 'auto' }}>
        {/* Mobile top bar */}
        <div style={{
          background: FB.white, boxShadow: FB.shadow,
          padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {!isIndex && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                style={{
                  width: 36, height: 36, borderRadius: '50%', background: FB.btnGray,
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <ArrowLeftOutlined style={{ fontSize: 14, color: FB.text }} />
              </button>
            )}
            <h1 style={{ fontSize: 20, fontWeight: 700, color: FB.text, margin: 0 }}>Paramètres</h1>
          </div>

          {/* Scrollable pills */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto',
            WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
            paddingBottom: 4,
          }}>
            {allItems.map(item => (
              <MobilePill
                key={item.key}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={location.pathname === item.to}
              />
            ))}
          </div>
        </div>

        {/* Mobile content */}
        <div style={{ padding: '12px 12px 32px' }}>
          {isIndex ? (
            <SettingsIndex can={can} isMobile={isMobile} isSuperAdmin={isSuperAdmin} />
          ) : (
            <div style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: 16, minHeight: 300,
            }}>
              <Outlet />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══ DESKTOP LAYOUT ═══ */
  return (
    <div style={{ background: FB.bg, height: '100%', overflowY: 'auto' }}>
      <div style={{ width: '100%', display: 'flex', padding: isMobile ? 0 : '0 16px', minHeight: '100%' }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width: 360, flexShrink: 0, padding: '24px 16px 24px 0' }}>
          <div style={{ position: 'sticky', top: 64, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            {/* Title */}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: FB.text, margin: '0 0 16px 8px' }}>
              Paramètres et confidentialité
            </h1>

            {/* Search */}
            <div style={{ position: 'relative', margin: '0 8px 16px' }}>
              <SearchOutlined style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: FB.textSecondary, fontSize: 14,
              }} />
              <input
                type="text"
                placeholder="Rechercher dans les paramètres"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', height: 36, paddingLeft: 36, paddingRight: 16,
                  borderRadius: 20, border: `1px solid ${FB.border}`, background: FB.bg,
                  fontSize: 15, color: FB.text, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Organisation card (meta-style) */}
            <div style={{
              margin: '0 8px 16px', border: `1px solid ${FB.border}`,
              borderRadius: FB.radius, padding: 16, background: FB.white,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <SettingOutlined style={{ color: FB.blue, fontSize: 18 }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: FB.text }}>
                  {currentOrganization?.name || 'Mon Espace'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: FB.textSecondary, margin: '0 0 12px', lineHeight: 1.4 }}>
                Gérez vos paramètres personnels et ceux de votre organisation.
              </p>

              {categories[0] && categories[0].items.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <SidebarItem key={item.key} to={item.to} icon={item.icon} label={item.label} active={isActive} />
                );
              })}
            </div>

            {/* Categorized sections */}
            {search.trim() ? (
              <div style={{ padding: '0 8px' }}>
                {filteredItems && filteredItems.length > 0 ? filteredItems.map(item => (
                  <SidebarItem key={item.key} to={item.to} icon={item.icon} label={item.label} active={location.pathname === item.to} />
                )) : (
                  <p style={{ fontSize: 13, color: FB.textSecondary, padding: '8px 12px' }}>Aucun résultat.</p>
                )}
              </div>
            ) : (
              categories.slice(1).map((cat, idx) => (
                <div key={idx} style={{ padding: '0 8px', marginBottom: 16 }}>
                  {cat.title && (
                    <>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: FB.text, margin: '0 0 2px 8px' }}>{cat.title}</h3>
                      <p style={{ fontSize: 13, color: FB.textSecondary, margin: '0 0 8px 8px' }}>{cat.description}</p>
                    </>
                  )}
                  {cat.items.map(item => (
                    <SidebarItem key={item.key} to={item.to} icon={item.icon} label={item.label} active={location.pathname === item.to} />
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, minWidth: 0, padding: '24px 0' }}>
          {isIndex ? (
            <SettingsIndex can={can} isMobile={false} isSuperAdmin={isSuperAdmin} />
          ) : (
            <div style={{
              background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow,
              padding: 24, minHeight: 500,
            }}>
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
