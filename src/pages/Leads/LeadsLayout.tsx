import React from 'react';
import { Outlet } from 'react-router-dom';
import LeadsHorizontalNavigation from './LeadsHorizontalNavigation';
import { NotificationsContainer } from '../../components/Notifications';

/**
 * Layout principal pour la section Leads
 * Contient la navigation horizontale et affiche les sous-routes.
 */
export default function LeadsLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation horizontale */}
      <LeadsHorizontalNavigation />
      
      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto">
        <NotificationsContainer />
        <Outlet />
      </main>
    </div>
  );
}
