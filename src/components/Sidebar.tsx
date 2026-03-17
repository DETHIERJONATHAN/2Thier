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

type ModuleNav = { key?: string; id?: string; route?: string; icon?: string; label?: string; name?: string; feature?: string; isActiveInOrg?: boolean };
const Sidebar = ({ modules }: { modules: Array<ModuleNav> }) => {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isFormulairesMenuOpen, setIsFormulairesMenuOpen] = useState(true);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(true);
  const [isDevis1MinuteMenuOpen, setIsDevis1MinuteMenuOpen] = useState(true);
  const [isDevis1MinuteAdminMenuOpen, setIsDevis1MinuteAdminMenuOpen] = useState(true);

  
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
  ], []);



  const visibleAdminPages = useMemo(() => adminPages.filter(p => {
    // 👑 Pages admin réservées au Super Admin uniquement (développeur)
    // Les autres utilisateurs accèdent à ces fonctionnalités via /settings
    if (!isSuperAdmin) return false;
    return true;
  }), [adminPages, isSuperAdmin]);

  // Séparer les modules Devis1Minute par type
  // Petit utilitaire pour dédupliquer par feature/route (sécurité UI)
  const uniqBy = <T, K extends string | number | symbol | undefined>(arr: T[], keyFn: (x: T) => K) => {
    const seen = new Set<K>();
    const out: T[] = [];
    for (const item of arr) {
      const k = keyFn(item);
      if (k === undefined) {
        out.push(item);
        continue;
      }
      if (!seen.has(k)) {
        seen.add(k);
        out.push(item);
      }
    }
    return out;
  };

  const partnerModules = useMemo(() => {
    const list: ModuleNav[] = modules.filter(mod => mod.key && mod.key.startsWith('devis1minute_') && !mod.key.includes('admin'));
    // On restreint aux routes partenaires utiles pour éviter l'encombrement du menu
    const allowedRoutes = new Set<string>([
      '/marketplace',
      '/espace-pro',
      '/partner/portal',
      '/partner/leads',
      '/partner/billing',
      '/lead-generation',
      '/campaign-analytics',
      '/public-forms',
      '/forms',
      '/landing-pages',
      '/mes-liens-commerciaux',  // 🎯 Liens commerciaux pour tracking
    ]);
  const filtered = list.filter((m: ModuleNav) => !!m.route && allowedRoutes.has(m.route as string));
    // Dédupliquer par feature puis route
    return uniqBy(uniqBy(filtered, (m: ModuleNav) => m.feature), (m: ModuleNav) => m.route);
  }, [modules]);
  
  // Liens curatés et stables pour Devis1Minute-ADMIN (ne dépendent pas des modules dynamiques)
  const d1mAdminLinks = useMemo(() => ([
    { key: 'd1m-admin-dashboard', label: 'Dashboard', icon: 'FaTachometerAlt', route: '/devis1minute/admin/dashboard' },
    { key: 'd1m-admin-intake', label: 'Intake', icon: 'FaInbox', route: '/devis1minute/admin/intake' },
    { key: 'd1m-admin-dispatch', label: 'Dispatch', icon: 'FaProjectDiagram', route: '/devis1minute/admin/dispatch' },
    { key: 'd1m-admin-integrations', label: 'Intégrations', icon: 'FaPlug', route: '/devis1minute/admin/integrations' },
    { key: 'd1m-admin-site', label: 'Site', icon: 'FaGlobe', route: '/devis1minute/admin/site' },
  ]), []);
  
  const otherModules = useMemo(() => {
    const list: ModuleNav[] = modules.filter(mod => !mod.key || (!mod.key.startsWith('devis1minute_')));
    return uniqBy(uniqBy(list, (m: ModuleNav) => m.feature), (m: ModuleNav) => m.route);
  }, [modules]);

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
          {/* Section Modules Généraux - Dropdown */}
          {otherModules.length > 0 && (
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
                  {otherModules.map(mod => (
                    <li key={mod.key || mod.id}>
                      <NavLink
                        to={('route' in mod && mod.route) ? mod.route : `/${mod.id}`}
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

          {/* Section Devis1Minute (Partenaires) - Dropdown */}
          {partnerModules.length > 0 && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsDevis1MinuteMenuOpen(!isDevis1MinuteMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isDevis1MinuteMenuOpen}
                aria-controls="devis1minute-menu"
                aria-label="Afficher/masquer Devis1Minute"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaHandshake', '🤝')}
                  <span>Devis1Minute</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isDevis1MinuteMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDevis1MinuteMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="devis1minute-menu" role="menu">
                  {partnerModules.map(mod => (
                    <li key={mod.key || mod.id}>
                      <NavLink
                        to={('route' in mod && mod.route) ? mod.route : `/${mod.id}`}
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

          {/* Section Devis1Minute-ADMIN - SEULEMENT POUR SUPERADMINS */}
          {d1mAdminLinks.length > 0 && isSuperAdmin && (
            <li className="border-t border-gray-200 mt-2 pt-2">
              <button
                onClick={() => setIsDevis1MinuteAdminMenuOpen(!isDevis1MinuteAdminMenuOpen)}
                className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isDevis1MinuteAdminMenuOpen}
                aria-controls="devis1minute-admin-menu"
                aria-label="Afficher/masquer Devis1Minute Admin"
              >
                <div className="flex items-center space-x-3">
                  {renderIcon('FaCrown', '👑')}
                  <span>Devis1Minute-ADMIN</span>
                </div>
                <FaIcons.FaChevronDown className={`transition-transform duration-200 ${isDevis1MinuteAdminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDevis1MinuteAdminMenuOpen && (
                <ul className="pl-4 border-l border-gray-200 ml-5" id="devis1minute-admin-menu" role="menu">
                  {d1mAdminLinks.map(mod => (
                    <li key={mod.key}>
                      <NavLink
                        to={mod.route as string}
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
