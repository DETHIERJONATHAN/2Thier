import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Layout, Dropdown, Button, Input, Drawer, Collapse, Avatar } from 'antd';
import type { CollapseProps, MenuProps } from 'antd';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  MenuOutlined, 
  SearchOutlined,
  StarOutlined,
  FlagOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  HomeOutlined,
  DownOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
  // Icônes pour les modules
  DashboardOutlined,
  ContactsOutlined,
  FileTextOutlined,
  MailOutlined,
  CalendarOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  FormOutlined,
  TableOutlined,
  FileSearchOutlined,
  CloudOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  RobotOutlined,
  ShopOutlined,
  UsergroupAddOutlined,
  FunnelPlotOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  KeyOutlined,
  SafetyOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useSharedSections } from '../../hooks/useSharedSections';
import { organizeModulesInSections } from '../../utils/modulesSections';

const { Header, Content } = Layout;

const DESKTOP_HEADER_HEIGHT = 48;
const MOBILE_HEADER_HEIGHT = 52;
const DESKTOP_ICON_BUTTON_SIZE = 36;
const MOBILE_ICON_BUTTON_SIZE = 34;
const DESKTOP_SEARCH_MAX_WIDTH = 220;
const SUBNAV_HEIGHT = 44;

// Types pour les sections modulaires
type SectionWithModules = {
  id: string;
  title: string;
  description?: string;
  iconName?: string;
  iconColor?: string;
  order?: number;
  active?: boolean;
  modules: Array<{
    key?: string;
    id?: string;
    route?: string;
    icon?: string;
    iconColor?: string;
    categoryColor?: string;
    categoryIcon?: string;
    label?: string;
    name?: string;
    feature?: string;
    active?: boolean;
    isActiveForOrg?: boolean;
    order?: number;
  }>;
};

type ModuleItem = SectionWithModules['modules'][number];

interface MainLayoutProps {
  children: React.ReactNode;
}

// Mapping des routes modules
const MODULE_ROUTES: Record<string, string> = {
  google_gmail: '/google-gmail',
  analytics: '/analytics',
  Facture: '/facture',
  leads: '/leads',
  google_groups: '/google-groups',
  google_maps: '/google-maps',
  google_meet: '/google-meet',
  gemini: '/gemini',
  dashboard: '/dashboard',
  Technique: '/technique',
  telnyx_communications: '/telnyx-communications',
  mail: '/mail',
  gestion_sav: '/gestion_sav',
  Agenda: '/agenda',
  google_contacts: '/google-contacts',
  clients: '/clients',
  google_forms: '/google-forms',
  formulaire: '/formulaire',
  google_agenda: '/google-agenda',
  google_drive: '/google-drive',
  fiches_techniques: '/fiches-techniques',
};

const getModuleRoute = (mod: { key?: string; id?: string; route?: string; name?: string; label?: string }) => {
  if (mod.route) return mod.route;
  if (mod.key && MODULE_ROUTES[mod.key]) return MODULE_ROUTES[mod.key];
  const moduleKey = mod.name || mod.label;
  if (moduleKey && MODULE_ROUTES[moduleKey]) return MODULE_ROUTES[moduleKey];
  return `/${mod.id || mod.key || 'unknown'}`;
};

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const headerHeight = isMobile ? MOBILE_HEADER_HEIGHT : DESKTOP_HEADER_HEIGHT;
  const iconButtonSize = isMobile ? MOBILE_ICON_BUTTON_SIZE : DESKTOP_ICON_BUTTON_SIZE;

  // Gérer le redimensionnement de la fenêtre pour la responsivité
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Utiliser useAuth() en premier pour éviter les erreurs d'initialisation
  const { 
    currentOrganization,
    logout,
    user,
    modules
  } = useAuth();

  const userInitial = useMemo(() => {
    const source = user?.firstName || user?.firstname || user?.email || currentOrganization?.name || 'C';
    return (source?.charAt?.(0) || 'C').toUpperCase();
  }, [user?.firstName, user?.firstname, user?.email, currentOrganization?.name]);

  const userLabel = useMemo(() => {
    const orgName = currentOrganization?.name || 'CRM';
    if (!user) return orgName;
    const name = user.firstName || user.firstname || user.email || 'Utilisateur';
    return `${orgName} (${name})`;
  }, [currentOrganization?.name, user]);

  // État des favoris
  const [favoriteModules, setFavoriteModules] = useState<string[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  
  // Hook pour l'API authentifiée
  const { api } = useAuthenticatedApi();
  
  // Charger les favoris depuis l'API (lié à l'utilisateur et l'organisation)
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user?.id) {
        setLoadingFavorites(false);
        return;
      }

      try {
        // redirectOnAuth: false pour ne pas déconnecter si 401 (évite la boucle de déconnexion)
        const response = await api.get('/user/favorites', { redirectOnAuth: false });
        if (response && response.favorites) {
          setFavoriteModules(response.favorites);
          console.log('⭐ [Favoris] Chargés:', response.favorites);
        }
      } catch (error) {
        // Silencieux si 401 - l'utilisateur n'est juste pas encore authentifié
        if (!(error instanceof Error && error.message.includes('401'))) {
          console.error('❌ [Favoris] Erreur chargement:', error);
        }
        // En cas d'erreur, utiliser un fallback du localStorage pour ne pas bloquer l'UX
        const savedFavorites = localStorage.getItem(`favorites_${user?.id || 'guest'}`);
        if (savedFavorites) {
          setFavoriteModules(JSON.parse(savedFavorites));
        }
      } finally {
        setLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [user?.id, api]);

  // Fonction pour toggler un module en favori
  const toggleFavorite = useCallback(async (moduleKey: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Empêcher la navigation
    }
    
    const isFavorite = favoriteModules.includes(moduleKey);
    
    try {
      if (isFavorite) {
        // Supprimer des favoris
        await api.delete(`/user/favorites/${moduleKey}`, { redirectOnAuth: false });
        setFavoriteModules(prev => prev.filter(key => key !== moduleKey));
        console.log(`⭐ [Favoris] Supprimé: ${moduleKey}`);
      } else {
        // Ajouter aux favoris
        await api.post('/user/favorites', { moduleKey }, { redirectOnAuth: false });
        setFavoriteModules(prev => [...prev, moduleKey]);
        console.log(`⭐ [Favoris] Ajouté: ${moduleKey}`);
      }
    } catch (error) {
      console.error('❌ [Favoris] Erreur toggle:', error);
      // Notification d'erreur optionnelle
    }
  }, [favoriteModules, api]);

  // Utiliser directement useSharedSections pour la synchronisation en temps réel
  const { sections: sharedSections } = useSharedSections();

  // Organiser les modules dans les sections
  const sectionsWithModules = useMemo(() => {
    // Ne garder que les sections actives pour la navigation
    const activeSections = sharedSections.filter(section => section.active);
    const organized = organizeModulesInSections(activeSections, modules || []);
    return organized;
  }, [sharedSections, modules]);

  // Fermer le menu avec la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        setOpenSections([]);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const handleLogout = useCallback(() => { 
    logout(); 
    navigate('/login'); 
  }, [logout, navigate]);

  // Fonction pour basculer l'état d'une section
  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, []);

  const getModuleKey = useCallback((module: ModuleItem | undefined | null) => {
    if (!module) return null;
    return module.key || module.id || module.route || module.name || module.label || null;
  }, []);

  const modulesByKey = useMemo(() => {
    const map = new Map<string, ModuleItem>();
    sectionsWithModules.forEach(section => {
      section.modules.forEach(module => {
        const key = getModuleKey(module);
        if (key) {
          map.set(key, module);
        }
      });
    });
    return map;
  }, [sectionsWithModules, getModuleKey]);

  const favoriteModuleDetails = useMemo(() => (
    favoriteModules
      .map(key => modulesByKey.get(key))
      .filter((module): module is ModuleItem => Boolean(module))
  ), [favoriteModules, modulesByKey]);

  // Fonction pour obtenir l'icône d'un module avec sa couleur
  const getModuleIcon = useCallback((module: { key?: string; name?: string; label?: string; icon?: string; iconColor?: string; categoryColor?: string; categoryIcon?: string }) => {
    // Utiliser la couleur du module si elle existe, sinon la couleur de la catégorie, sinon couleur par défaut
    const iconColor = module.iconColor || module.categoryColor || '#1a4951';
    const iconStyle = { color: iconColor, fontSize: '14px' };
    
    // Pour les modules, utilisons les icônes de la base de données ou une icône par défaut
    const iconName = module.icon;
    const iconMap: Record<string, React.ReactNode> = {
      'DashboardOutlined': <DashboardOutlined style={iconStyle} />,
      'ContactsOutlined': <ContactsOutlined style={iconStyle} />,
      'UserOutlined': <UserOutlined style={iconStyle} />,
      'MailOutlined': <MailOutlined style={iconStyle} />,
      'CalendarOutlined': <CalendarOutlined style={iconStyle} />,
      'CustomerServiceOutlined': <CustomerServiceOutlined style={iconStyle} />,
      'ToolOutlined': <ToolOutlined style={iconStyle} />,
      'FormOutlined': <FormOutlined style={iconStyle} />,
      'TableOutlined': <TableOutlined style={iconStyle} />,
      'FileSearchOutlined': <FileSearchOutlined style={iconStyle} />,
      'FileTextOutlined': <FileTextOutlined style={iconStyle} />,
      'CloudOutlined': <CloudOutlined style={iconStyle} />,
      'VideoCameraOutlined': <VideoCameraOutlined style={iconStyle} />,
      'PhoneOutlined': <PhoneOutlined style={iconStyle} />,
      'TeamOutlined': <TeamOutlined style={iconStyle} />,
      'EnvironmentOutlined': <EnvironmentOutlined style={iconStyle} />,
      'BarChartOutlined': <BarChartOutlined style={iconStyle} />,
      'RobotOutlined': <RobotOutlined style={iconStyle} />,
      'ShopOutlined': <ShopOutlined style={iconStyle} />,
      'UsergroupAddOutlined': <UsergroupAddOutlined style={iconStyle} />,
      'FunnelPlotOutlined': <FunnelPlotOutlined style={iconStyle} />,
      'GlobalOutlined': <GlobalOutlined style={iconStyle} />,
      // Icônes pour les modules d'administration
      'FaTools': <ToolOutlined style={iconStyle} />,
      'FaKey': <KeyOutlined style={iconStyle} />,
      'FaUsersCog': <TeamOutlined style={iconStyle} />,
      'FaShieldAlt': <SafetyOutlined style={iconStyle} />,
      'FaFileContract': <FileTextOutlined style={iconStyle} />,
      'FaBuilding': <BankOutlined style={iconStyle} />,
      'FaWpforms': <FormOutlined style={iconStyle} />
    };

    return iconMap[iconName] || <AppstoreOutlined style={iconStyle} />;
  }, []);

  // Composant du menu hamburger personnalisé
  const CustomHamburgerMenu = useMemo(() => {
    if (!isMenuOpen) return null;

    if (isMobile) {
      const collapseItems: CollapseProps['items'] = sectionsWithModules.map(section => {
        const sectionKey = section.id || section.title;
        return {
          key: sectionKey,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{section.title}</span>
              <span style={{ fontSize: '12px', color: '#86919a' }}>{section.modules.length}</span>
            </div>
          ),
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {section.modules.map((module, index) => {
                const moduleKey = getModuleKey(module);
                const isFavorite = moduleKey ? favoriteModules.includes(moduleKey) : false;
                const compositeKey = moduleKey || `${sectionKey}-module-${index}`;

                return (
                  <div
                    key={compositeKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <div
                      onClick={() => {
                        navigate(getModuleRoute(module));
                        setIsMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {getModuleIcon(module)}
                      <span style={{
                        fontSize: '14px',
                        color: '#1f2933',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {module.label || module.name}
                      </span>
                    </div>
                    {moduleKey && (
                      <StarOutlined
                        onClick={(e) => toggleFavorite(moduleKey, e)}
                        style={{
                          cursor: 'pointer',
                          color: isFavorite ? '#faad14' : '#d9d9d9',
                          fontSize: '16px',
                          marginLeft: '12px'
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )
        };
      });

      return (
        <Drawer
          open={isMenuOpen}
          placement="left"
          width={Math.min(windowWidth, 360)}
          onClose={() => setIsMenuOpen(false)}
          styles={{
            body: { padding: '0 16px 24px' },
            header: { borderBottom: '1px solid #f0f0f0' }
          }}
          title="Navigation"
        >
          <div style={{ marginBottom: '16px' }}>
            <Input
              placeholder="Recherche"
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              allowClear
            />
          </div>

          {favoriteModuleDetails.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#1a4951' }}>Favoris</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {favoriteModuleDetails.map(module => {
                  const moduleKey = getModuleKey(module);
                  if (!moduleKey) return null;
                  return (
                    <Button
                      key={`fav-${moduleKey}`}
                      type="text"
                      onClick={() => {
                        navigate(getModuleRoute(module));
                        setIsMenuOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 4px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1f2933' }}>
                        {getModuleIcon(module)}
                        {module.label || module.name}
                      </span>
                      <StarOutlined style={{ color: '#faad14' }} />
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <Collapse
            bordered={false}
            defaultActiveKey={collapseItems.length ? [collapseItems[0]?.key || ''] : undefined}
            items={collapseItems}
          />
        </Drawer>
      );
    }

    return (
      <div style={{
        position: 'fixed',
        top: `${headerHeight}px`,
        left: '0',
        right: '0',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 999,
        borderBottom: '1px solid #e8e8e8'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          padding: '4px 12px',
          borderBottom: '1px solid #f5f5f5',
          backgroundColor: '#fafafa',
          position: 'relative',
          gap: '4px',
          minHeight: `${SUBNAV_HEIGHT}px`,
          alignItems: 'flex-start'
        }}>
          <div style={{ 
            position: 'relative', 
            marginRight: '4px',
            marginBottom: '2px',
            flexShrink: 0
          }}>
            <Button 
              type="text" 
              icon={<HomeOutlined />}
              onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}
              style={{ 
                fontSize: '12px',
                height: '28px',
                padding: '4px 8px',
                whiteSpace: 'nowrap',
                minWidth: 'auto'
              }}
            >
              <span>Dashboard</span>
            </Button>
          </div>

          {sectionsWithModules.map(section => (
            <div key={section.id} style={{ 
              position: 'relative', 
              marginRight: '4px',
              marginBottom: '2px',
              flexShrink: 0
            }}>
              <Button
                type={openSections.includes(section.id) ? "primary" : "text"}
                onClick={() => toggleSection(section.id)}
                style={{ 
                  fontSize: '12px',
                  height: '28px',
                  padding: '4px 8px',
                  backgroundColor: openSections.includes(section.id) 
                    ? (section.iconColor || '#1a4951')
                    : 'transparent',
                  color: openSections.includes(section.id) ? 'white' : (section.iconColor || '#1a4951'),
                  borderColor: openSections.includes(section.id) 
                    ? (section.iconColor || '#1a4951') 
                    : 'transparent',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={section.title}
              >
                <span>{section.title}</span>
                <DownOutlined style={{ 
                  fontSize: '10px', 
                  marginLeft: '4px',
                  transform: openSections.includes(section.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </Button>

              {openSections.includes(section.id) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  minWidth: '220px',
                  backgroundColor: 'white',
                  border: '1px solid #e8e8e8',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1001,
                  maxHeight: '320px',
                  overflowY: 'auto'
                }}>
                  {section.modules.map((module, index) => {
                    const moduleKey = getModuleKey(module);
                    const isFavorite = moduleKey ? favoriteModules.includes(moduleKey) : false;
                    const compositeKey = moduleKey || `${section.id}-module-${index}`;

                    return (
                      <div
                        key={compositeKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#333',
                          borderBottom: '1px solid #f5f5f5',
                          justifyContent: 'space-between'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div
                          onClick={() => {
                            navigate(getModuleRoute(module));
                            setIsMenuOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flex: 1,
                            cursor: 'pointer',
                            gap: '8px'
                          }}
                        >
                          {getModuleIcon(module)}
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: module.iconColor || module.categoryColor || '#333'
                          }}>
                            {module.label || module.name}
                          </span>
                        </div>
                        {moduleKey && (
                          <StarOutlined
                            onClick={(e) => toggleFavorite(moduleKey, e)}
                            style={{
                              cursor: 'pointer',
                              color: isFavorite ? '#faad14' : '#d9d9d9',
                              fontSize: '14px',
                              padding: '4px',
                              marginLeft: '8px',
                              transition: 'color 0.2s ease'
                            }}
                            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    isMenuOpen,
    isMobile,
    sectionsWithModules,
    favoriteModules,
    favoriteModuleDetails,
    windowWidth,
    navigate,
    getModuleIcon,
    toggleFavorite,
    toggleSection,
    openSections,
    getModuleKey,
    headerHeight
  ]);

  // Menu des sites vitrines (drapeau)
  const sitesMenu = useMemo<MenuProps>(() => ({
    className: 'dropdown-2thier-menu',
    items: [
      {
        key: '2thier-vitrine',
        label: '🏢 Site Vitrine 2Thier',
        onClick: () => navigate('/site-vitrine-2thier')
      },
      { type: 'divider' },
      {
        key: 'devis1minute-public',
        label: '🌐 Devis1minute Public',
        onClick: () => window.open('/devis1minute', '_blank')
      },
      { type: 'divider' },
      {
        key: 'admin-sites',
        label: '⚙️ Gérer les sites web',
        onClick: () => navigate('/admin/sites-web')
      },
      {
        key: 'admin-documents',
        label: '📄 Gérer les documents',
        onClick: () => navigate('/admin/documents')
      }
    ]
  }), [navigate]);

  // Menu des favoris (étoile) - à partir des modules favoris de l'utilisateur
  const favoritesMenu = useMemo<MenuProps>(() => {
    const favoriteItems = favoriteModuleDetails
      .map(module => {
        const moduleKey = getModuleKey(module);
        if (!moduleKey) return null;
        return {
          key: moduleKey,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getModuleIcon(module)}
              <span style={{ color: module.iconColor || module.categoryColor || '#333' }}>{module.label || module.name}</span>
            </div>
          ),
          onClick: () => navigate(getModuleRoute(module))
        };
      })
      .filter(Boolean) as Array<{ key: string; label: React.ReactNode; onClick: () => void }>;

    return {
      className: 'dropdown-2thier-menu',
      items: favoriteItems.length > 0 
        ? [
            ...favoriteItems,
            { type: 'divider' as const },
            {
              key: 'manage-favorites',
              label: '⚙️ Gérer les favoris',
              onClick: () => navigate('/settings/favorites')
            }
          ]
        : [
            {
              key: 'no-favorites',
              label: 'Aucun favori - Cliquez sur ⭐ près des modules',
              disabled: true
            }
          ]
    };
  }, [favoriteModuleDetails, getModuleIcon, getModuleKey, navigate]);

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
      {
        type: 'divider'
      },
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
          backgroundColor: '#1a4951', 
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
        {/* Menu Hamburger Personnalisé */}
        <Button 
          type="text" 
          icon={<MenuOutlined style={{ fontSize: '16px' }} />}
          className="header-2thier-item"
          style={{ 
            border: 'none',
            padding: '6px',
            height: `${iconButtonSize}px`,
            minWidth: `${iconButtonSize}px`,
            borderRadius: '6px',
            backgroundColor: isMenuOpen ? 'rgba(255,255,255,0.16)' : 'transparent'
          }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Logo 2THIER CRM */}
        <div 
          className="header-2thier-item" 
          style={{ 
            fontWeight: 'bold', 
            fontSize: isMobile ? '16px' : '18px', 
            marginLeft: isMobile ? '4px' : '16px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: isMobile ? '1 1 auto' : '0 0 auto',
            minWidth: 0
          }}
          onClick={() => navigate('/dashboard')}
        >
          <img 
            src="/2thier-logo.png" 
            alt="2Thier Logo" 
            style={{ 
              height: '22px', 
              width: 'auto'
            }}
          />
          {!isMobile && '2THIER CRM'}
        </div>

        {/* Icône Home */}
        <Button 
          type="text" 
          icon={<HomeOutlined style={{ fontSize: '16px' }} />}
          className="header-2thier-item"
          style={{ 
            border: 'none',
            padding: '6px',
            height: `${iconButtonSize}px`,
            minWidth: `${iconButtonSize}px`,
            marginLeft: isMobile ? '0' : '12px'
          }}
          onClick={() => navigate('/dashboard')}
        />

        {/* Barre de recherche */}
        <Input
          placeholder="Rechercher"
          prefix={<SearchOutlined style={{ color: '#93a3aa', fontSize: '14px' }} />}
          className="search-2thier"
          allowClear
          aria-label="Recherche globale"
          size={isMobile ? 'middle' : 'large'}
          style={{ 
            marginLeft: isMobile ? '0' : '12px',
            marginRight: isMobile ? '0' : 'auto',
            maxWidth: isMobile ? '100%' : `${DESKTOP_SEARCH_MAX_WIDTH}px`,
            height: `${headerHeight - 14}px`,
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center'
          }}
        />

    {/* Icônes à droite */}
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', marginLeft: isMobile ? '8px' : 'auto', flexShrink: 0 }}>
          {/* Favoris */}
          <div style={{ display: 'inline-flex' }}>
            <Dropdown menu={favoritesMenu} trigger={['click']} placement="bottomRight">
              <Button 
                type="text" 
                icon={<StarOutlined style={{ fontSize: '16px' }} />}
                className="header-2thier-item"
                style={{ 
                  border: 'none',
                  padding: '6px',
                  height: `${iconButtonSize}px`,
                  minWidth: `${iconButtonSize}px`
                }}
              />
            </Dropdown>
          </div>

          {/* Sites Vitrines */}
          <div style={{ display: 'inline-flex' }}>
            <Dropdown menu={sitesMenu} trigger={['click']} placement="bottomRight">
              <Button 
                type="text" 
                icon={<FlagOutlined style={{ fontSize: '16px' }} />}
                className="header-2thier-item"
                style={{ 
                  border: 'none',
                  padding: '6px',
                  height: `${iconButtonSize}px`,
                  minWidth: `${iconButtonSize}px`
                }}
              />
            </Dropdown>
          </div>

          {/* Notifications avec Badge */}
          <div style={{ position: 'relative' }}>
            <Button 
              type="text" 
              icon={<BellOutlined style={{ fontSize: '16px' }} />}
              className="header-2thier-item"
              style={{ 
                border: 'none',
                padding: '6px',
                height: `${iconButtonSize}px`,
                minWidth: `${iconButtonSize}px`
              }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>
              3
            </div>
          </div>

          {/* Aide */}
          <Button 
            type="text" 
            icon={<QuestionCircleOutlined style={{ fontSize: '16px' }} />}
            className="header-2thier-item"
            style={{ 
              border: 'none',
              padding: '6px',
              height: `${iconButtonSize}px`,
              minWidth: `${iconButtonSize}px`,
              display: isMobile ? 'none' : 'inline-flex'
            }}
          />

          {/* Profil utilisateur */}
          <Dropdown menu={userProfileMenu} trigger={['click']}>
            <Button 
              type="text" 
              className="header-2thier-item"
              style={{ 
                border: 'none',
                color: 'white',
                height: `${iconButtonSize}px`,
                padding: isMobile ? '0 8px' : '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '8px'
              }}
            >
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                {userInitial}
              </Avatar>
              {!isMobile && (
                <>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      maxWidth: '160px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {userLabel}
                  </span>
                  <DownOutlined style={{ fontSize: '12px' }} />
                </>
              )}
            </Button>
          </Dropdown>
        </div>
      </Header>

      {/* Overlay pour fermer le menu */}
      {isMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 998
          }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Menu Hamburger Personnalisé */}
      {CustomHamburgerMenu}

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

export default MainLayout;
