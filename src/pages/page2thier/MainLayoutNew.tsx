import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { Layout, Dropdown, Button, Input } from 'antd';
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
import { useSharedSections } from '../../hooks/useSharedSections';
import { organizeModulesInSections } from '../../utils/modulesSections';

const { Header, Content } = Layout;

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
  google_calendar: '/google-calendar',
  google_docs: '/google-docs',
  google_sheets: '/google-sheets',
  google_voice: '/google-voice',
  google_chat: '/google-chat',
  google_keep: '/google-keep',
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

  // État des favoris
  const [favoriteModules, setFavoriteModules] = useState<string[]>([]);
  
  // Charger les favoris depuis le localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(`favorites_${user?.id || 'guest'}`);
    if (savedFavorites) {
      setFavoriteModules(JSON.parse(savedFavorites));
    }
  }, [user?.id]);

  // Fonction pour toggler un module en favori
  const toggleFavorite = useCallback((moduleKey: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Empêcher la navigation
    }
    
    setFavoriteModules(prev => {
      const newFavorites = prev.includes(moduleKey) 
        ? prev.filter(key => key !== moduleKey)
        : [...prev, moduleKey];
      
      // Sauvegarder dans localStorage
      localStorage.setItem(`favorites_${user?.id || 'guest'}`, JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, [user?.id]);

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

    return (
      <div style={{
        position: 'fixed',
        top: '48px',
        left: '0',
        right: '0',
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 999,
        borderBottom: '1px solid #e8e8e8'
      }}>
        {/* Sections principales horizontalement avec dropdowns individuels - RESPONSIVE */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          padding: '4px 12px',
          borderBottom: '1px solid #f5f5f5',
          backgroundColor: '#fafafa',
          position: 'relative',
          gap: '4px',
          minHeight: '36px',
          alignItems: 'flex-start'
        }}>
          {/* Navigation rapide - Dashboard - RESPONSIVE */}
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
              <span style={{ 
                display: windowWidth < 768 ? 'none' : 'inline'
              }}>Dashboard</span>
            </Button>
          </div>
          
          {/* Sections dynamiques avec dropdowns sous chaque section - RESPONSIVE */}
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
                  maxWidth: windowWidth < 576 ? '80px' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={section.title} // Tooltip pour les écrans petits
              >
                <span style={{
                  display: 'inline',
                  fontSize: windowWidth < 576 ? '11px' : '12px'
                }}>
                  {windowWidth < 576 && section.title.length > 8 
                    ? section.title.substring(0, 6) + '...'
                    : section.title
                  }
                </span>
                <DownOutlined style={{ 
                  fontSize: '10px', 
                  marginLeft: '4px',
                  transform: openSections.includes(section.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </Button>
              
              {/* Dropdown sous cette section spécifique - RESPONSIVE */}
              {openSections.includes(section.id) && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: windowWidth < 768 ? '-50px' : '0',
                  minWidth: windowWidth < 576 ? '180px' : '200px',
                  maxWidth: windowWidth < 768 ? '250px' : '300px',
                  backgroundColor: 'white',
                  border: '1px solid #e8e8e8',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1001,
                  maxHeight: windowWidth < 576 ? '250px' : '300px',
                  overflowY: 'auto'
                }}>
                  {section.modules.map(module => (
                    <div
                      key={module.id || module.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: windowWidth < 576 ? '6px 8px' : '8px 12px',
                        fontSize: windowWidth < 576 ? '12px' : '13px',
                        color: '#333',
                        transition: 'background-color 0.2s ease',
                        borderBottom: '1px solid #f5f5f5',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Module cliquable */}
                      <div
                        onClick={() => { 
                          navigate(getModuleRoute(module)); 
                          setIsMenuOpen(false); 
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flex: 1,
                          cursor: 'pointer'
                        }}
                      >
                        {getModuleIcon(module)}
                        <span style={{ 
                          marginLeft: '8px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: module.iconColor || module.categoryColor || '#333'
                        }}>
                          {module.label || module.name}
                        </span>
                      </div>
                      
                      {/* Étoile pour favoris */}
                      <StarOutlined
                        onClick={(e) => toggleFavorite(module.key || module.id || '', e)}
                        style={{
                          cursor: 'pointer',
                          color: favoriteModules.includes(module.key || module.id || '') ? '#faad14' : '#d9d9d9',
                          fontSize: '14px',
                          padding: '4px',
                          marginLeft: '8px',
                          transition: 'color 0.2s ease'
                        }}
                        title={favoriteModules.includes(module.key || module.id || '') ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }, [isMenuOpen, sectionsWithModules, openSections, navigate, toggleSection, getModuleIcon, windowWidth, toggleFavorite, favoriteModules]);

  // Menu des sites vitrines (drapeau)
  const sitesMenu = useMemo(() => ({
    items: [
      {
        key: '2thier-vitrine',
        label: '🏢 2Thier Énergétique',
        onClick: () => navigate('/site-vitrine')
      },
      {
        key: 'devis1minute-vitrine',
        label: '🚀 Devis1minute Vitrine',
        onClick: () => navigate('/devis1minute-vitrine')
      },
      { type: 'divider' },
      {
        key: 'devis1minute-public',
        label: '🌐 Devis1minute Public',
        onClick: () => window.open('/devis1minute', '_blank')
      },
      {
        key: 'admin-sites',
        label: '⚙️ Gestion Sites',
        onClick: () => navigate('/admin/sites')
      }
    ]
  }), [navigate]);

  // Menu des favoris (étoile) - à partir des modules favoris de l'utilisateur
  const favoritesMenu = useMemo(() => {
    const favoriteItems = sectionsWithModules
      .flatMap(section => section.modules)
      .filter(module => favoriteModules.includes(module.key))
      .map(module => ({
        key: module.key,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getModuleIcon(module)}
            <span style={{ color: module.iconColor || module.categoryColor || '#333' }}>{module.label || module.name}</span>
          </div>
        ),
        onClick: () => navigate(getModuleRoute(module))
      }));

    return {
      items: favoriteItems.length > 0 
        ? [
            ...favoriteItems,
            { type: 'divider' },
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
  }, [favoriteModules, sectionsWithModules, navigate, getModuleIcon]);

  // Menu profil utilisateur
  const userProfileMenu = useMemo(() => ({
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
          height: '48px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
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
            padding: '8px',
            height: '40px',
            minWidth: '40px',
            borderRadius: '4px',
            backgroundColor: isMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent'
          }}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />

        {/* Logo 2THIER CRM */}
        <div 
          className="header-2thier-item" 
          style={{ 
            fontWeight: 'bold', 
            fontSize: '18px', 
            marginLeft: '16px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <img 
            src="/2thier-logo.png" 
            alt="2Thier Logo" 
            style={{ 
              height: '24px', 
              width: 'auto'
            }}
          />
          2THIER CRM
        </div>

        {/* Icône Home */}
        <Button 
          type="text" 
          icon={<HomeOutlined style={{ fontSize: '16px' }} />}
          className="header-2thier-item"
          style={{ 
            border: 'none',
            padding: '8px',
            height: '40px',
            minWidth: '40px',
            marginLeft: '16px'
          }}
          onClick={() => navigate('/dashboard')}
        />

        {/* Barre de recherche */}
        <Input
          placeholder="Search"
          prefix={<SearchOutlined style={{ color: '#999' }} />}
          style={{ 
            marginLeft: '16px',
            marginRight: 'auto',
            maxWidth: '300px',
            borderRadius: '4px'
          }}
        />

        {/* Icônes à droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Favoris */}
          <Dropdown menu={favoritesMenu} trigger={['click']} placement="bottomRight">
            <Button 
              type="text" 
              icon={<StarOutlined style={{ fontSize: '16px' }} />}
              className="header-2thier-item"
              style={{ 
                border: 'none',
                padding: '8px',
                height: '40px',
                minWidth: '40px'
              }}
            />
          </Dropdown>

          {/* Sites Vitrines */}
          <Dropdown menu={sitesMenu} trigger={['click']} placement="bottomRight">
            <Button 
              type="text" 
              icon={<FlagOutlined style={{ fontSize: '16px' }} />}
              className="header-2thier-item"
              style={{ 
                border: 'none',
                padding: '8px',
                height: '40px',
                minWidth: '40px'
              }}
            />
          </Dropdown>

          {/* Notifications avec Badge */}
          <div style={{ position: 'relative' }}>
            <Button 
              type="text" 
              icon={<BellOutlined style={{ fontSize: '16px' }} />}
              className="header-2thier-item"
              style={{ 
                border: 'none',
                padding: '8px',
                height: '40px',
                minWidth: '40px'
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
              padding: '8px',
              height: '40px',
              minWidth: '40px'
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
                height: '40px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {user ? `${currentOrganization?.name || 'CRM'} (${user.firstName || 'User'})` : 'CRM'}
              </span>
              <DownOutlined style={{ fontSize: '12px' }} />
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
        backgroundColor: 'white',  /* CHANGÉ: blanc au lieu de #004445 */
        minHeight: '100vh',
        marginTop: '48px',
        overflow: 'auto'
      }}>
        {children}
      </Content>
    </Layout>
  );
};

export default MainLayout;
