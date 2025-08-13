import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

/**
 * Composant de navigation latérale pour la section Leads
 * Affiche les différentes sous-sections disponibles
 */
export default function LeadsNavigation() {
  const { hasPermission } = useAuth();
  
  // Classes pour les liens de navigation
  const navLinkClasses = "flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 w-full";
  const activeNavLinkClasses = "flex items-center px-4 py-2 text-blue-600 bg-blue-50 font-medium w-full";
  
  // Vérifier les permissions
  const canViewDashboard = true; // À remplacer par hasPermission('access', 'leads_dashboard')
  const canViewContacts = true;  // À remplacer par hasPermission('access', 'leads_contacts')
  const canViewIntegrations = true; // À remplacer par hasPermission('access', 'leads_integrations')
  const canViewSettings = true;  // À remplacer par hasPermission('access', 'leads_settings')

  return (
    <nav className="bg-white w-64 border-r shrink-0 hidden md:block">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Gestion des Leads</h2>
      </div>
      <ul className="mt-2">
        {canViewDashboard && (
          <li>
            <NavLink 
              to="/leads/dashboard" 
              className={({ isActive }) => 
                isActive ? activeNavLinkClasses : navLinkClasses
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Tableau de bord
            </NavLink>
          </li>
        )}
        <li>
          <NavLink 
            to="/leads/list" 
            className={({ isActive }) => 
              isActive ? activeNavLinkClasses : navLinkClasses
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Liste des leads
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/leads/kanban" 
            className={({ isActive }) => 
              isActive ? activeNavLinkClasses : navLinkClasses
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Vue Kanban
          </NavLink>
        </li>
        {canViewContacts && (
          <li>
            <NavLink 
              to="/leads/contacts" 
              className={({ isActive }) => 
                isActive ? activeNavLinkClasses : navLinkClasses
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Contacts
            </NavLink>
          </li>
        )}
        {canViewIntegrations && (
          <li>
            <NavLink 
              to="/leads/integrations" 
              className={({ isActive }) => 
                isActive ? activeNavLinkClasses : navLinkClasses
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
              Intégrations
            </NavLink>
          </li>
        )}
        {canViewSettings && (
          <li>
            <NavLink 
              to="/leads/settings" 
              className={({ isActive }) => 
                isActive ? activeNavLinkClasses : navLinkClasses
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
}
