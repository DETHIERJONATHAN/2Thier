import React from 'react';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LeadsLayout from './LeadsLayout';
import LeadsHomePage from './LeadsHomePage';
import LeadDetailModule from './LeadDetailModule';
import CallModule from './CallModule';
import EmailModule from './EmailModule';
import LeadsKanbanWrapper from './LeadsKanbanWrapper';
// LeadsDashboard supprimé - Utilisez /dashboard à la place
import LeadsSettingsPage from './LeadsSettingsPage';
import { useAuth } from '../../auth/useAuth';

/**
 * Composant principal pour la gestion des leads
 * Configure les routes et effectue les vérifications de permissions
 */
export default function LeadsPage() {
  const { can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  console.log('[LeadsPage] 🚀 Page chargée, location:', location.pathname);

  // Vérification des permissions
  const canViewLeads = can('leads:read');

  console.log('[LeadsPage] 🔐 Permissions canViewLeads:', canViewLeads);
  // Handlers stables passés à LeadsHomePage (home + list)
  const handleViewLead = React.useCallback((leadId: string) => {
    console.log('[LeadsPage] 👁️ handleViewLead -> details', leadId);
    navigate(`/leads/details/${leadId}`);
  }, [navigate]);

  const handleCallLead = React.useCallback((leadId: string) => {
    console.log('[LeadsPage] 📞 handleCallLead -> call', leadId);
    navigate(`/leads/call/${leadId}`);
  }, [navigate]);

  const handleEmailLead = React.useCallback((leadId: string) => {
    console.log('[LeadsPage] ✉️ handleEmailLead -> email', leadId);
    navigate(`/leads/email/${leadId}`);
  }, [navigate]);

  const handleScheduleLead = React.useCallback((leadId: string) => {
    console.log('[LeadsPage] 🗓️ handleScheduleLead -> agenda', leadId);
    navigate(`/leads/agenda/${leadId}`);
  }, [navigate]);

  // Early returns après l'appel des hooks ci-dessus
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
    console.log('[LeadsPage] 🔄 Redirection /leads -> /leads/home');
    return <Navigate to="/leads/home" replace />;
  }

  console.log('[LeadsPage] 📍 Routing vers:', location.pathname);

  return (
    <Routes>
      <Route path="/" element={<LeadsLayout />}>
        <Route path="home" element={
          <>
            {console.log('[LeadsPage] 🏠 Route HOME déclenchée!')}
            <LeadsHomePage 
              onViewLead={handleViewLead}
              onCallLead={handleCallLead}
              onEmailLead={handleEmailLead}
              onScheduleLead={handleScheduleLead}
            />
          </>
        } />
        {/* Route dashboard supprimée - Redirection vers /dashboard principal */}
        <Route path="list" element={
          <>
            {console.log('[LeadsPage] 📋 Route LIST déclenchée!')}
            <div className="p-6">
              <LeadsHomePage
                onViewLead={handleViewLead}
                onCallLead={handleCallLead}
                onEmailLead={handleEmailLead}
                onScheduleLead={handleScheduleLead}
              />
            </div>
          </>
        } />
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
        
        {/* Routes pour les intégrations et paramètres */}
        <Route path="integrations" element={
          <div className="p-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">🔗 Intégrations</h2>
              <p className="text-blue-700">Cette section permettra de configurer les intégrations avec vos outils externes (CRM, emails, calendriers, etc.).</p>
            </div>
          </div>
        } />
        
        {/* 🔧 Route pour les paramètres - DEBUG AJOUTÉ */}
        <Route path="settings" element={
          <>
            {console.log('[LeadsPage] 🔧 Route SETTINGS déclenchée!')}
            <LeadsSettingsPage />
          </>
        } />
        
        {/* Redirection par défaut */}
        <Route path="*" element={
          <>
            {console.log('[LeadsPage] ❌ Route CATCH-ALL déclenchée pour:', location.pathname)}
            <Navigate to="/leads/list" replace />
          </>
        } />
      </Route>
    </Routes>
  );
}
