import React from 'react';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import LeadsLayout from './Leads/LeadsLayout';
import LeadsHomePage from './Leads/LeadsHomePage';
import LeadDetailModule from './Leads/LeadDetailModule';
import CallModule from './Leads/CallModule';
import EmailModule from './Leads/EmailModule';
import LeadsList from './Leads/LeadsList';
import LeadsKanbanWrapper from './Leads/LeadsKanbanWrapper';
import LeadsDashboard from './Leads/LeadsDashboard';
import LeadsSettingsPage from './Leads/LeadsSettingsPage';
import { useAuth } from '../auth/useAuth';
import LeadDetail from './Leads/LeadDetail';

/**
 * Composant principal pour la gestion des leads
 * Configure les routes et effectue les vérifications de permissions
 */
export default function LeadsPage() {
  const { can } = useAuth();
  const location = useLocation();

  // Vérification des permissions
  const canViewLeads = can('leads:read');

  if (!canViewLeads) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
        </div>
      </div>
    );
  }

  // Rediriger vers la nouvelle page d'accueil par défaut
  if (location.pathname === '/leads') {
    return <Navigate to="/leads/home" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<LeadsLayout />}>
        <Route path="home" element={<LeadsHomePage />} />
        <Route path="dashboard" element={<LeadsDashboard />} />
        <Route path="list" element={<LeadsList />} />
        <Route path="kanban" element={<LeadsKanbanWrapper />} />
        <Route path="details/:leadId" element={<LeadDetailModule />} />
        <Route path="call/:leadId" element={<CallModule />} />
        <Route path="email/:leadId" element={<EmailModule />} />
        <Route path="agenda/:leadId" element={
          <div className="p-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">📅 Module Agenda Google</h2>
              <p className="text-blue-700">Intégration Google Calendar en cours de développement. Redirection vers Google Agenda...</p>
            </div>
          </div>
        } />
        
        {/* Routes pour les contacts, intégrations et paramètres */}
        <Route path="contacts" element={
          <div className="p-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">📞 Gestion des Contacts</h2>
              <p className="text-yellow-700">Cette section est en cours de développement. Elle permettra de gérer tous vos contacts clients et prospects.</p>
            </div>
          </div>
        } />
        <Route path="integrations" element={
          <div className="p-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">🔗 Intégrations</h2>
              <p className="text-blue-700">Cette section permettra de configurer les intégrations avec vos outils externes (CRM, emails, calendriers, etc.).</p>
            </div>
          </div>
        } />
        <Route path="settings" element={<LeadsSettingsPage />} />
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/leads/list" replace />} />
      </Route>
    </Routes>
  );
}
