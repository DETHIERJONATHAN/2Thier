import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import useCRMStore from '../store';
import type { CRMState } from '../store/slices/types';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Import des icônes FontAwesome - système unifié
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';

// Système unifié d'icônes - mapping complet
const ICON_MAP: Record<string, IconType> = {
  // Navigation principale
  FaTachometerAlt: FaIcons.FaTachometerAlt,
  FaCog: FaIcons.FaCog,
  
  // Modules principaux
  FaEnvelope: FaIcons.FaEnvelope,          // Mail
  FaTable: FaIcons.FaTable,               // Sheets/Tableaux
  FaMicrophone: FaIcons.FaMicrophone,     // Voice
  FaFile: FaIcons.FaFile,                 // Docs
  FaFolder: FaIcons.FaFolder,             // Drive
  FaVideo: FaIcons.FaVideo,               // Meet
  FaCalendarAlt: FaIcons.FaCalendarAlt,   // Agenda
  FaAddressBook: FaIcons.FaAddressBook,   // Contacts
  FaUsers: FaIcons.FaUsers,               // Groups/Users
  FaMapMarkerAlt: FaIcons.FaMapMarkerAlt, // Maps
  FaRobot: FaIcons.FaRobot,               // AI/Gemini
  FaPhone: FaIcons.FaPhone,               // Phone/Telnyx
  FaChartLine: FaIcons.FaChartLine,       // Analytics
  FaEdit: FaIcons.FaEdit,                 // Forms
  FaHeadset: FaIcons.FaHeadset,           // Support/SAV
  FaCogs: FaIcons.FaCogs,                 // Technique
  FaFileInvoiceDollar: FaIcons.FaFileInvoiceDollar, // Facture
  FaUserFriends: FaIcons.FaUserFriends,   // Leads
  FaUserTie: FaIcons.FaUserTie,           // Clients
  FaFileContract: FaIcons.FaFileContract, // Devis
  
  // Devis1Minute
  FaShoppingCart: FaIcons.FaShoppingCart, // Marketplace
  FaHandshake: FaIcons.FaHandshake,       // Partenaires
  FaBullhorn: FaIcons.FaBullhorn,         // Campagnes
  FaLandmark: FaIcons.FaLandmark,         // Landing Pages
  FaCreditCard: FaIcons.FaCreditCard,     // Billing
  
  // Administration
  FaTools: FaIcons.FaTools,               // Modules admin
  FaKey: FaIcons.FaKey,                   // Rôles
  FaUsersCog: FaIcons.FaUsersCog,         // Utilisateurs
  FaShieldAlt: FaIcons.FaShieldAlt,       // Permissions
  FaBuilding: FaIcons.FaBuilding,         // Organisations
  FaUserShield: FaIcons.FaUserShield,     // Administration
  
  // Sections
  FaPuzzlePiece: FaIcons.FaPuzzlePiece,   // Modules
  FaRocket: FaIcons.FaRocket,             // Devis1Minute
  FaGlobe: FaIcons.FaGlobe,               // Marketplace Global
  FaChartBar: FaIcons.FaChartBar,         // Analytics Plateforme  
  FaUsersCog: FaIcons.FaUsersCog,         // Gestion Partenaires
  FaWrench: FaIcons.FaWrench,             // Outils Techniques
  FaWpforms: FaIcons.FaWpforms,           // Formulaires
  FaChevronDown: FaIcons.FaChevronDown,   // Chevron
  FaFileAlt: FaIcons.FaFileAlt,           // File Alt
  FaTrash: FaIcons.FaTrash,               // Supprimer
  FaSignOutAlt: FaIcons.FaSignOutAlt,     // Déconnexion
  
  // Icônes par défaut et génériques
  FaCube: FaIcons.FaCube,                 // Icône par défaut
  FaHome: FaIcons.FaHome,                 // Accueil/Dashboard
  FaUser: FaIcons.FaUser                  // User
};

// Fonction helper unifiée pour rendre les icônes
const renderIcon = (iconName: string | undefined, fallback: string = '●'): React.ReactNode => {
  if (!iconName) {
    return fallback;
  }
  
  const IconComponent = ICON_MAP[iconName];
  
  if (IconComponent) {
    return <IconComponent className="text-xl" />;
  }
  
  // Si l'icône n'est pas trouvée, essayons de l'importer dynamiquement
  if (iconName.startsWith('Fa') && iconName in FaIcons) {
    const DynamicIcon = FaIcons[iconName as keyof typeof FaIcons] as IconType;
    return <DynamicIcon className="text-xl" />;
  }
  
  return fallback;
};

// Fonction pour attribuer une icône par défaut basée sur le nom/clé du module
const getDefaultIcon = (moduleName: string, moduleKey?: string): string => {
  const name = (moduleName || moduleKey || '').toLowerCase();
  
  // Correspondances exactes pour les modules courants
  if (name === 'mail') return 'FaEnvelope';
  if (name === 'sheets') return 'FaTable';
  if (name === 'voice') return 'FaMicrophone';
  if (name === 'docs') return 'FaFile';
  if (name === 'drive') return 'FaFolder';
  if (name === 'meet') return 'FaVideo';
  if (name === 'marketplace') return 'FaShoppingCart';
  if (name === 'analytics') return 'FaChartLine';
  if (name === 'lead generation') return 'FaBullhorn';
  if (name === 'landing pages') return 'FaLandmark';
  if (name === 'formulaires publics') return 'FaWpforms';
  if (name === 'espace partenaire') return 'FaHandshake';
  if (name === 'portail partenaire') return 'FaUserTie';
  if (name === 'gestion des tableaux') return 'FaTable';
  if (name === 'mes leads') return 'FaUsers';
  
  // Correspondances par patterns (includes)
  if (name.includes('gmail') || name.includes('mail')) return 'FaEnvelope';
  if (name.includes('agenda') || name.includes('calendar')) return 'FaCalendarAlt';
  if (name.includes('analytics') || name.includes('analytic')) return 'FaChartLine';
  if (name.includes('drive')) return 'FaFolder';
  if (name.includes('forms') || name.includes('formulaire')) return 'FaWpforms';
  if (name.includes('contacts') || name.includes('contact')) return 'FaAddressBook';
  if (name.includes('meet') || name.includes('video')) return 'FaVideo';
  if (name.includes('maps') || name.includes('map')) return 'FaMapMarkerAlt';
  if (name.includes('groups') || name.includes('group')) return 'FaUsers';
  if (name.includes('gemini') || name.includes('ai')) return 'FaRobot';
  if (name.includes('telnyx') || name.includes('phone') || name.includes('communications')) return 'FaPhone';
  if (name.includes('dashboard') || name.includes('tableau')) return 'FaTachometerAlt';
  if (name.includes('technique') || name.includes('technical')) return 'FaCogs';
  if (name.includes('facture') || name.includes('billing') || name.includes('invoice')) return 'FaFileInvoiceDollar';
  if (name.includes('leads') || name.includes('lead')) return 'FaUserFriends';
  if (name.includes('clients') || name.includes('client') || name.includes('customers')) return 'FaUserTie';
  if (name.includes('sav') || name.includes('support')) return 'FaHeadset';
  if (name.includes('devis') || name.includes('quote')) return 'FaFileContract';
  if (name.includes('marketplace') || name.includes('shopping')) return 'FaShoppingCart';
  if (name.includes('partenaire') || name.includes('partner')) return 'FaHandshake';
  if (name.includes('campaign') || name.includes('campagne')) return 'FaBullhorn';
  if (name.includes('landing')) return 'FaLandmark';
  if (name.includes('table') || name.includes('tableaux')) return 'FaTable';
  if (name.includes('voice') || name.includes('vocal')) return 'FaMicrophone';
  if (name.includes('sheets') || name.includes('spreadsheet')) return 'FaTable';
  if (name.includes('docs') || name.includes('document')) return 'FaFile';
  
  // CRM et gestion
  if (name.includes('crm')) return 'FaUserTie';
  if (name.includes('gestion')) return 'FaCogs';
  
  // Icône par défaut
  return 'FaCube';
};

const Sidebar = ({ modules, hasFeature }: { modules: Array<{ key?: string; id?: string; route?: string; icon?: string; label?: string; name?: string; feature?: string; isActiveInOrg?: boolean; }>; hasFeature: (feature: string) => boolean; }) => {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isFormulairesMenuOpen, setIsFormulairesMenuOpen] = useState(true);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(true);
  const [isDevis1minuteMenuOpen, setIsDevis1minuteMenuOpen] = useState(true);
  const [isDevis1minuteOrgMenuOpen, setIsDevis1minuteOrgMenuOpen] = useState(true);
  const [isTechnicalMenuOpen, setIsTechnicalMenuOpen] = useState(true);
  
  // 🔗 MAPPING DES MODULES VERS LEURS ROUTES
  const moduleRoutes: Record<string, string> = {
  // ⚙️ Mapping unifié : utiliser les mêmes routes que dans AppLayout (tirets, pas d'underscores)
  // 🔄 AUTRES (modules de base du CRM)
  'dashboard': '/dashboard',
  'settings': '/settings',
  'modules': '/modules',
  'gestion_sav': '/gestion_sav',
  'Technique': '/technique',
  'Client': '/client',
  'formulaire': '/formulaire',     // ⚠️ GARDER (différent de "Formulaires")
  'devis': '/devis',
  'agenda': '/agenda',             // Agenda du CRM
  'leads': '/leads',
  'mail': '/mail',                 // Boite mail interne au CRM
  
  // 🔧 OUTILS TECHNIQUES
  'tableaux': '/tableaux',         // Gestion des Tableaux
  'treebranchleaf': '/formulaire/treebranchleaf', // Module TreeBranchLeaf
  
  // 📋 FORMULAIRES
  'bloc': '/bloc',                 // Bloc
  
  // 🏢 GOOGLE WORKSPACE (7 modules activables)
  'google_gmail': '/google-gmail',          // Page activable dans Google Workspace
  'google_drive': '/google-drive',          // Page activable dans Google Workspace
  'google_meet': '/google-meet',            // Transformé depuis "Meet"
  'google_docs': '/google-docs',            // Transformé depuis "Docs"
  'google_sheets': '/google-sheets',        // Transformé depuis "Sheets"
  'google_voice': '/google-voice',          // Transformé depuis "Voice"
  'google_agenda': '/google-agenda',        // Page activable dans Google Workspace
  
  // 👑 ADMINISTRATION (7 modules)
  'admin_modules': '/admin/modules',        // Dans administration
  'admin_roles': '/admin/roles',            // Dans administration
  'admin_users': '/admin/users',            // Dans administration
  'admin_permissions': '/admin/permissions', // Dans administration
  'admin_rights_summary': '/admin/rights-summary', // Dans administration
  'admin_organizations': '/admin/organizations', // Dans administration
  'admin_telnyx': '/admin/telnyx',          // Dans administration
  
  // ⚡ DEVIS1MINUTE – ADMIN (4 modules)
  'devis1minute_admin_campaigns': '/devis1minute-admin/campaigns',     // Dans devis1minute - Admin
  'devis1minute_admin_analytics': '/devis1minute-admin/analytics',     // Dans devis1minute - Admin
  'devis1minute_admin_forms': '/devis1minute-admin/forms',             // Dans devis1minute - Admin
  'devis1minute_admin_landing': '/devis1minute-admin/landing',         // Dans devis1minute - Admin
  
  // 💼 DEVIS1MINUTE (4 modules)
  'devis1minute_marketplace': '/devis1minute/marketplace',             // Dans devis1minute
  'devis1minute_partner': '/devis1minute/partner',                     // Dans devis1minute
  'devis1minute_leads': '/devis1minute/leads',                         // Dans devis1minute
  'devis1minute_billing': '/devis1minute/billing'                      // Dans devis1minute
  };

  // 🔗 FONCTION POUR OBTENIR LA ROUTE D'UN MODULE
  const debugOnceRef = useRef<{routes:Set<string>; perms:Set<string>; renderLogged:boolean}>({ routes: new Set(), perms: new Set(), renderLogged:false });
  const SIDEBAR_DEBUG = false; // activer ponctuellement si besoin
  const getModuleRoute = (mod: { key?: string; id?: string; route?: string; name?: string; label?: string }) => {
    const log = (msg: string, ...rest: unknown[]) => { if (SIDEBAR_DEBUG) console.log(msg, ...rest); };
    if (mod.route) { log('[Sidebar] route explicite', mod.label||mod.name, mod.route); return mod.route; }
    if (mod.key && moduleRoutes[mod.key]) { log('[Sidebar] route par clé', mod.key); return moduleRoutes[mod.key]; }
    const moduleKey = mod.name || mod.label;
    if (moduleKey && moduleRoutes[moduleKey]) { log('[Sidebar] route par label', moduleKey); return moduleRoutes[moduleKey]; }
    log('[Sidebar] fallback id', mod.label||mod.name, mod.id);
    return `/${mod.id}`;
  };
  
  const { 
    can, 
    isSuperAdmin, 
    userRole, 
    currentOrganization, 
    logout, 
    user, 
    originalUser, 
    isImpersonating,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();

  const blocks = useCRMStore((state: CRMState) => state.blocks);
  const fetchBlocks = useCRMStore((state: CRMState) => state.fetchBlocks);
  const removeBlock = useCRMStore((state: CRMState) => state.removeBlock);

  // Récupérer les blocs seulement si l'utilisateur est authentifié
  useEffect(() => {
    if (!authLoading && user) {
      fetchBlocks();
    }
  }, [user, authLoading, fetchBlocks]);

  // Stabilisation des fonctions avec useCallback
  const handleRemoveBlock = useCallback((e: React.MouseEvent, blockId: number | string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce formulaire ? Cette action est irréversible.')) {
      removeBlock(blockId).then(() => {
        // Optionnel: naviguer ailleurs si le block supprimé était celui affiché
        // navigate('/admin/formulaire');
      });
    }
  }, [removeBlock]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Memoïzation des pages d'administration
  const adminPages = useMemo(() => [
    { key: 'admin-modules', label: 'Modules', icon: 'FaTools', route: '/admin/modules', permission: 'admin_panel:view' },
    { key: 'admin-roles', label: 'Rôles', icon: 'FaKey', route: '/admin/roles', permission: 'admin_panel:view' },
    { key: 'admin-users', label: 'Utilisateurs', icon: 'FaUsersCog', route: '/admin/users', permission: 'admin_panel:view' },
    { key: 'admin-permissions', label: 'Permissions', icon: 'FaShieldAlt', route: '/admin/permissions', permission: 'admin_panel:view' },
    { key: 'admin-rights-summary', label: 'Synthèse des droits', icon: 'FaFileContract', route: '/admin/rights-summary', permission: 'admin_panel:view' },
    { key: 'admin-orgs', label: 'Organisations', icon: 'FaBuilding', route: '/admin/organizations', permission: 'super_admin' },
    { key: 'admin-trees', label: 'Gestion des Arbres', icon: 'FaCodeBranch', route: '/admin/trees', permission: 'super_admin' },
    { key: 'admin-telnyx', label: 'Telnyx Communications', icon: 'FaPhone', route: '/telnyx', permission: 'admin_panel:view' },
  ], []);

  // 🚀 MODULES DEVIS1MINUTE - SÉPARATION INTELLIGENTE SUPER ADMIN vs ORGANISATIONS
  
  // 👑 Pages SUPER ADMIN (gestion globale de la plateforme - PAGES FONCTIONNELLES)
  const devis1minuteSuperAdminPages = useMemo(() => [
    { key: 'devis1minute-lead-generation', label: 'Campagnes', icon: 'FaBullhorn', route: '/lead-generation', feature: 'campaigns' },
    { key: 'devis1minute-analytics', label: 'Analytics', icon: 'FaChartLine', route: '/campaign-analytics', feature: 'analytics' },
    { key: 'devis1minute-forms', label: 'Formulaires Publics', icon: 'FaWpforms', route: '/public-forms', feature: 'campaigns' },
    { key: 'devis1minute-landing', label: 'Landing Pages', icon: 'FaLandmark', route: '/landing-pages', feature: 'campaigns' },
  ], []);

  // 🏢 Pages PRESTATAIRES (ceux qui achètent les leads)
  const devis1minuteOrganizationPages = useMemo(() => [
    { key: 'devis1minute-marketplace', label: 'Marketplace', icon: 'FaShoppingCart', route: '/marketplace', feature: 'marketplace' },
    { key: 'devis1minute-partner-portal', label: 'Portail Partenaire', icon: 'FaUserTie', route: '/partner', feature: 'partner_portal' },
    { key: 'devis1minute-partner-leads', label: 'Mes Leads', icon: 'FaUsers', route: '/partner/leads', feature: 'my_leads' },
    { key: 'devis1minute-partner-billing', label: 'Facturation', icon: 'FaCreditCard', route: '/partner/billing', feature: 'devis1minute_billing' },
  ], []);

  // Filtres de visibilité pour les pages Devis1Minute
  const visibleDevis1minuteSuperAdminPages = useMemo(() => 
    isSuperAdmin ? devis1minuteSuperAdminPages.filter(page => 
      hasFeature(page.feature) // ✅ NOUVEAU: Respect de l'activation modulaire
    ) : []
  , [devis1minuteSuperAdminPages, isSuperAdmin, hasFeature]);

  const visibleDevis1minuteOrganizationPages = useMemo(() => devis1minuteOrganizationPages.filter(page => 
    hasFeature(page.feature)
  ), [devis1minuteOrganizationPages, hasFeature]);

  // ❌ SUPPRIMÉ : Les modules devis1minute sont maintenant gérés par le système de modules standard
  // Ils apparaissent automatiquement dans la sidebar via AppLayout.tsx et ne nécessitent plus de code dédié ici

  // Memoïzation des outils techniques
  const technicalModules = useMemo(() => [
    { key: 'technique-tableaux', label: 'Gestion des Tableaux', icon: 'FaTable', route: '/tableaux', feature: 'Technique' },
  ], []);

  const visibleTechnicalModules = useMemo(() => technicalModules.filter(mod => 
    isSuperAdmin || hasFeature(mod.feature)
  ), [technicalModules, isSuperAdmin, hasFeature]);

  const visibleAdminPages = useMemo(() => adminPages.filter(p => {
    // 👑 NOUVELLE LOGIQUE: SuperAdmin respecte l'activation des modules
    if (isSuperAdmin) {
      // Si la page a une feature, vérifier qu'elle est activée
      if (p.feature) {
        return hasFeature(p.feature);
      }
      // Sinon, accès par défaut
      return true;
    }
    
    if (p.permission === 'super_admin') {
      return false; // Seuls les SuperAdmins peuvent accéder
    }
    
    return can && can(p.permission);
  }), [adminPages, isSuperAdmin, can, hasFeature]);

  // Les modules sont déjà filtrés par AppLayout, il suffit de les utiliser directement.

  return (
    <aside className="w-64 bg-gray-100 h-screen flex flex-col border-r">
      <div className="px-6 py-6 flex items-center space-x-3">
        <img 
          src="/assets/2thier-logo.svg" 
          alt="2Thier Logo" 
          className="h-8 w-8"
        />
        <div className="text-2xl font-bold">2Thier SRL</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {/* Navigation rapide */}
          <li className="px-6 py-4">
            <div className="space-y-2">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-sm font-medium rounded-md ` +
                  (isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-200')
                }
              >
                {renderIcon('FaTachometerAlt')}
                <span>Tableau de bord</span>
              </NavLink>
              
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-sm font-medium rounded-md ` +
                  (isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-200')
                }
              >
                {renderIcon('FaCog')}
                <span>Paramètres</span>
              </NavLink>
            </div>
          </li>

          {/* Section Modules - Dropdown */}
          {modules.length > 0 && (
            <li>
              <button
                onClick={() => setIsModulesMenuOpen(!isModulesMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isModulesMenuOpen}
                aria-controls="modules-menu"
                aria-label="Afficher/masquer les modules"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaPuzzlePiece', '●')}
                  <span>Modules</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isModulesMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isModulesMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="modules-menu" role="menu">
                  {SIDEBAR_DEBUG && !debugOnceRef.current.renderLogged && (()=>{ debugOnceRef.current.renderLogged=true; console.log('[Sidebar] Rendu modules (snapshot unique)', modules.map(m=>({label:m.label||m.name,key:m.key, route:getModuleRoute(m)}))); return null; })()}
                  {modules.map(mod => {
                    const iconToUse = mod.icon || getDefaultIcon(mod.label || mod.name || '', mod.key);
                    
                    return (
                      <li key={mod.key || mod.id}>
                        <NavLink
                          to={getModuleRoute(mod)}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                            (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                          }
                        >
                          {renderIcon(iconToUse, '●')}
                          <span>{mod.label || mod.name}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}

          {/* Section Outils Techniques */}
          {visibleTechnicalModules.length > 0 && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsTechnicalMenuOpen(!isTechnicalMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isTechnicalMenuOpen}
                aria-controls="technical-menu"
                aria-label="Afficher/masquer outils techniques"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaWrench', '⚙️')}
                  <span>Outils Techniques</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isTechnicalMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTechnicalMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="technical-menu" role="menu">
                  {visibleTechnicalModules.map(mod => (
                    <li key={mod.key}>
                      <NavLink
                        to={mod.route}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                          (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                        }
                      >
                        {renderIcon(mod.icon, '●')}
                        <span>{mod.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* Section Formulaires - Conditionnellement rendue */}
          {isSuperAdmin && hasFeature('super_admin_forms') && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsFormulairesMenuOpen(!isFormulairesMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isFormulairesMenuOpen}
                aria-controls="formulaires-menu"
                aria-label="Afficher/masquer les formulaires"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaWpforms', '●')}
                  <span>Formulaires</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isFormulairesMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isFormulairesMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="formulaires-menu" role="menu">
                  {blocks && blocks.length > 0 ? (
                    blocks.map((block) => (
                        <li key={block.id}>
                          <NavLink
                            to={`/admin/formulaire/${block.id}`}
                            className={({ isActive }) =>
                              `flex items-center justify-between space-x-3 px-4 py-2 text-sm font-medium ` +
                              (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                            }
                          >
                            <div className="flex items-center space-x-2">
                              {renderIcon('FaFileAlt', '●')}
                              <span className="truncate">{block.name}</span>
                            </div>
                            <button 
                              onClick={(e) => handleRemoveBlock(e, block.id)}
                              className="p-1 text-gray-500 hover:text-red-600 rounded-full"
                              aria-label="Supprimer le formulaire"
                            >
                              <FaIcons.FaTrash />
                            </button>
                          </NavLink>
                        </li>
                      )
                    )
                  ) : (
                    <li className="px-4 py-2 text-sm text-gray-500 italic">Aucun formulaire trouvé.</li>
                  )}
                </ul>
              )}
            </li>
          )}

          {visibleAdminPages.length > 0 && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isAdminMenuOpen}
                aria-controls="admin-menu"
                aria-label="Afficher/masquer l'administration"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaUserShield')}
                  <span>Administration</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAdminMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="admin-menu" role="menu">
                  {visibleAdminPages.map(page => (
                    <li key={page.key}>
                      <NavLink
                        to={page.route}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                          (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                        }
                      >
                        {renderIcon(page.icon, '●')}
                        <span>{page.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* Section Devis1Minute - Super Admin (Gestion globale plateforme) */}
          {visibleDevis1minuteSuperAdminPages.length > 0 && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsDevis1minuteMenuOpen(!isDevis1minuteMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isDevis1minuteMenuOpen}
                aria-controls="devis1minute-admin-menu"
                aria-label="Afficher/masquer Devis1Minute Gestion"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaRocket', '●')}
                  <span>Devis1Minute - Admin</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isDevis1minuteMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDevis1minuteMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="devis1minute-admin-menu" role="menu">
                  {visibleDevis1minuteSuperAdminPages.map(page => (
                    <li key={page.key}>
                      <NavLink
                        to={page.route}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                          (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                        }
                      >
                        {renderIcon(page.icon, '●')}
                        <span>{page.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* Section Devis1Minute - Organisations (Utilisation par partenaires) */}
          {visibleDevis1minuteOrganizationPages.length > 0 && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsDevis1minuteOrgMenuOpen(!isDevis1minuteOrgMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isDevis1minuteOrgMenuOpen}
                aria-controls="devis1minute-org-menu"
                aria-label="Afficher/masquer Devis1Minute"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaRocket', '●')}
                  <span>Devis1Minute</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isDevis1minuteOrgMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDevis1minuteOrgMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="devis1minute-org-menu" role="menu">
                  {visibleDevis1minuteOrganizationPages.map(page => (
                    <li key={page.key}>
                      <NavLink
                        to={page.route}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                          (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                        }
                      >
                        {renderIcon(page.icon, '●')}
                        <span>{page.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      </div>
      <div className="px-6 py-4 border-t">
        {user && (
          <div className="text-sm text-gray-600 mb-4">
            <p className="font-semibold">{user.firstName} {user.lastName}</p>
            <p className="text-xs">{user.email}</p>
            
            {/* Affichage de l'organisation et du rôle, en utilisant les données de useAuth */}
            {currentOrganization && currentOrganization.id !== 'all' ? (
              <p className="text-xs mt-1">
                <span className="font-semibold">Organisation :</span> {currentOrganization.name}
              </p>
            ) : isSuperAdmin && !isImpersonating ? (
              <p className="text-xs mt-1">
                <span className="font-semibold">Organisation :</span> Vue Globale
              </p>
            ) : null}

            <p className="text-xs mt-1">
              <span className="font-semibold">Rôle :</span> {userRole || 'N/A'}
            </p>

            {isImpersonating && originalUser && (
              <p className="text-xs mt-2 pt-2 border-t border-gray-200">
                <span className="text-gray-500">Connecté via {originalUser.email}</span>
              </p>
            )}
          </div>
        )}
        <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
          <FaIcons.FaSignOutAlt className="text-lg" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
