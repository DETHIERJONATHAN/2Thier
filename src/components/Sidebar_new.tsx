import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import useCRMStore from '../store';
import type { CRMState } from '../store/slices/types';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Import des bibliothèques d'icônes
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import type { IconType } from 'react-icons';

// Fonction helper pour rendre les icônes
const renderIcon = (iconName: string | undefined, fallback: string = '') => {
  // Si pas d'icône, retourner le fallback
  if (!iconName) return fallback;
  
  // Collection des bibliothèques d'icônes disponibles
  const iconLibraries = {
    fa: FaIcons,
    ai: AiIcons,
    bs: BsIcons,
    bi: BiIcons,
    md: MdIcons,
    io: IoIcons,
    ri: RiIcons
  };
  
  // Chercher l'icône dans toutes les bibliothèques
  for (const libKey in iconLibraries) {
    const lib = iconLibraries[libKey as keyof typeof iconLibraries];
    const IconComponent = lib[iconName as keyof typeof lib] as IconType | undefined;
    if (IconComponent) {
      return <IconComponent className="text-xl" />;
    }
  }
  
  // Si l'icône n'est pas trouvée, retourner le nom comme fallback
  return iconName || fallback;
};

const Sidebar = ({ modules }: { modules: Array<{ key?: string; id?: string; route?: string; icon?: string; label?: string; name?: string; feature?: string; isActiveInOrg?: boolean; }> }) => {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isFormulairesMenuOpen, setIsFormulairesMenuOpen] = useState(true);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(true);
  
  // 🔗 MAPPING DES MODULES VERS LEURS ROUTES
  const moduleRoutes: Record<string, string> = {
  // ⚙️ Mapping unifié : utiliser les mêmes routes que dans AppLayout (tirets, pas d'underscores)
  'google_gmail': '/google-gmail',
  'analytics': '/analytics', 
  'Facture': '/facture',
  'leads': '/leads',
  'google_groups': '/google-groups',
  'google_maps': '/google-maps',
  'google_meet': '/google-meet',
  'gemini': '/gemini',
  'dashboard': '/dashboard',
  'Technique': '/technique',
  'telnyx_communications': '/telnyx-communications',
  'mail': '/mail',
  'gestion_sav': '/gestion_sav',
  'Agenda': '/agenda',
  'google_contacts': '/google-contacts',
  'clients': '/clients',
  'google_forms': '/google-forms',
  'formulaire': '/formulaire',
  'google_agenda': '/google-agenda',
  'google_drive': '/google-drive'
  ,
  // Modules potentiels non encore montés dans AppLayout mais pages existantes / futures
  'google_calendar': '/google-calendar',
  'google_docs': '/google-docs',
  'google_sheets': '/google-sheets',
  'google_voice': '/google-voice',
  'google_chat': '/google-chat',
  'google_keep': '/google-keep'
  };

  // 🔗 FONCTION POUR OBTENIR LA ROUTE D'UN MODULE
  const getModuleRoute = (mod: { key?: string; id?: string; route?: string; name?: string; label?: string }) => {
    // Priorité 1: Route définie explicitement
    if (mod.route) {
      console.log('[Sidebar] Route explicite trouvée pour', mod.label || mod.name, ':', mod.route);
      return mod.route;
    }
    
    // Priorité 2: Mapping basé sur la clé
    if (mod.key && moduleRoutes[mod.key]) {
      console.log('[Sidebar] Route mappée par clé pour', mod.label || mod.name, '(', mod.key, ') :', moduleRoutes[mod.key]);
      return moduleRoutes[mod.key];
    }
    
    // Priorité 3: Mapping basé sur le nom/label
    const moduleKey = mod.name || mod.label;
    if (moduleKey && moduleRoutes[moduleKey]) {
      console.log('[Sidebar] Route mappée par nom/label pour', mod.label || mod.name, '(', moduleKey, ') :', moduleRoutes[moduleKey]);
      return moduleRoutes[moduleKey];
    }
    
    // Fallback: utiliser l'ID (comportement original)
    console.log('[Sidebar] ⚠️ Fallback vers ID pour', mod.label || mod.name, '- Route:', `/${mod.id}`);
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
    { key: 'admin-telnyx', label: 'Telnyx Communications', icon: 'FaPhone', route: '/telnyx', permission: 'admin_panel:view' },
  ], []);

  const visibleAdminPages = useMemo(() => adminPages.filter(p => {
    // 👑 SOLUTION SIMPLIFIÉE: Pour SuperAdmin, donner accès à TOUT !
    if (isSuperAdmin) {
      console.log('[Sidebar] 👑 SuperAdmin - Accès accordé à:', p.label, p.permission);
      return true;
    }
    
    if (p.permission === 'super_admin') {
      return false; // Seuls les SuperAdmins peuvent accéder
    }
    
    const hasPermission = can && can(p.permission);
    console.log('[Sidebar] Permission check for', p.label, ':', p.permission, '=', hasPermission);
    return hasPermission;
  }), [adminPages, isSuperAdmin, can]);

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
                  {renderIcon('FaCubes', '●')}
                  <span>Modules</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isModulesMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isModulesMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="modules-menu" role="menu">
                  {(() => {
                    console.log('[Sidebar] 🎨 RENDU des modules dans la sidebar:', modules.map(m => ({
                      label: m.label || m.name,
                      key: m.key,
                      route: getModuleRoute(m)
                    })));
                    return null;
                  })()}
                  {modules.map(mod => (
                    <li key={mod.key || mod.id}>
                      <NavLink
                        to={getModuleRoute(mod)}
                        className={({ isActive }) =>
                          `flex items-center space-x-3 px-4 py-2 text-sm font-medium ` +
                          (isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-200')
                        }
                      >
                        {renderIcon(mod.icon, '●')}
                        <span>{mod.label || mod.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* Section Formulaires - Conditionnellement rendue */}
          {(isSuperAdmin || can('form:update')) && (
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
                  {renderIcon('FaCogs')}
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
          <BiIcons.BiLogOut className="text-lg" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
