import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeOutlined, UnorderedListOutlined, AppstoreOutlined, ContactsOutlined, SettingOutlined, ApiOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/useAuth';

const LeadsSubSidebar = () => {
  const { can } = useAuth();

  // Vérification des permissions pour chaque lien
  const canViewDashboard = can('leads_dashboard:read');
  const canViewLeads = can('leads:read');

  // Configuration des liens avec conditions
  const subMenuLinks = [
    { to: '/leads/dashboard', icon: <HomeOutlined />, label: 'Tableau de bord', condition: canViewDashboard },
    { to: '/leads/list', icon: <UnorderedListOutlined />, label: 'Liste des leads', condition: canViewLeads },
    { to: '/leads/kanban', icon: <AppstoreOutlined />, label: 'Vue Kanban', condition: canViewLeads },
    { to: '/leads/contacts', icon: <ContactsOutlined />, label: 'Contacts', condition: true },
    { to: '/leads/integrations', icon: <ApiOutlined />, label: 'Intégrations', condition: true },
    { to: '/leads/settings', icon: <SettingOutlined />, label: 'Paramètres', condition: true },
  ];

  const filteredLinks = subMenuLinks.filter(link => link.condition);

  return (
    <aside className="w-56 bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Gestion des Leads
      </h2>
      <ul className="space-y-2">
        {filteredLinks.map(link => {
          return (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default LeadsSubSidebar;
