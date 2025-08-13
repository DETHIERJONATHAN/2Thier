import React from 'react';
import { Outlet } from 'react-router-dom';
import LeadsSubSidebar from './LeadsSubSidebar';
import { NotificationsContainer } from '../../components/Notifications';

/**
 * Layout principal pour la section Leads
 * Contient la navigation latérale spécifique aux leads et affiche les sous-routes.
 */
export default function LeadsLayout() {
  return (
    <div className="flex gap-6">
      <LeadsSubSidebar />
      <main className="flex-1">
        <NotificationsContainer />
        <Outlet />
      </main>
    </div>
  );
}
