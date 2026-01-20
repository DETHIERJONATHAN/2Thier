import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const SettingsPage = () => {
  const { can, loading } = useAuth();

  // Définition des onglets et des permissions requises pour les voir
  const tabs = [
    { name: 'Profil', to: '/settings/profile', requiredPermission: null },
    { name: 'Utilisateurs', to: '/settings/users', requiredPermission: 'user:read' },
    { name: 'Rôles', to: '/settings/roles', requiredPermission: 'role:read' },
    { name: 'Organisation', to: '/settings/organization', requiredPermission: 'organization:read' },
    { name: 'Emails', to: '/settings/emails', requiredPermission: 'user:read' }, // Accessible aux admins
    { name: 'IA Mesure', to: '/settings/ai-measure', requiredPermission: 'organization:read' }, // Métré A4 V10
  ].filter(tab => {
    if (!tab.requiredPermission) return true;
    return can(tab.requiredPermission);
  });

  if (loading) {
    return <div>Chargement des permissions...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Paramètres</h1>
      <div className="flex border-b mb-6">
        {tabs.map(tab => (
          <NavLink
            key={tab.name}
            to={tab.to}
            className={({ isActive }) =>
              `py-2 px-4 text-sm font-medium ` + 
              (isActive ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700')
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* Le contenu de l'onglet actif sera rendu ici */}
      <Outlet />
    </div>
  );
};

export default SettingsPage;
