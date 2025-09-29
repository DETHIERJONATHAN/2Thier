import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useSharedSections } from '../hooks/useSharedSections';
import { organizeModulesInSections } from '../utils/modulesSections';
import { useSidebar } from '../hooks/useSidebar';
import StoreInitializer from '../components/StoreInitializer';
import { NotificationsContainer } from '../components/Notifications';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import SidebarModal from './components/SidebarModal';
import FreeUserPage from '../pages/FreeUserPage';

// Pages principales
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'));
const CRMPage = React.lazy(() => import('../pages/CRMPage'));
const GestionSAVPage = React.lazy(() => import('../pages/GestionSAVPage'));
const LeadsPage = React.lazy(() => import('../pages/Leads/LeadsPage'));
const MailPage = React.lazy(() => import('../pages/MailPage'));
const PremiumTestPage = React.lazy(() => import('../pages/PremiumTestPage'));
const DiagnosticCompletPage = React.lazy(() => import('../pages/DiagnosticCompletPage'));

// Pages modules métier
const FacturePage = React.lazy(() => import('../pages/FacturePage'));
const TechniquePage = React.lazy(() => import('../pages/TechniquePage'));
const GestionTableauxPage = React.lazy(() => import('../pages/GestionTableauxPage'));
const FormulairePage = React.lazy(() => import('../pages/FormulairePage'));
const AgendaWrapper = React.lazy(() => import('../pages/AgendaWrapper'));
const DevisPage = React.lazy(() => import('../pages/DevisPage'));

// Pages Google Workspace
const GoogleMailPageFixed = React.lazy(() => import('../pages/GoogleMailPageFixed_New'));
const GoogleAgendaPage = React.lazy(() => import('../pages/GoogleAgendaPage'));
const GoogleContactsPage = React.lazy(() => import('../pages/GoogleContactsPage'));

// Pages Admin
const ModulesAdminPage = React.lazy(() => import('../pages/admin/ModulesAdminPage'));
const RolesAdminPage = React.lazy(() => import('../pages/admin/RolesAdminPage'));
const UsersAdminPage = React.lazy(() => import('../pages/admin/UsersAdminPageNew'));
const OrganizationsAdminPage = React.lazy(() => import('../pages/admin/OrganizationsAdminPageNew'));
const PermissionsAdminPage = React.lazy(() => import('../pages/admin/PermissionsAdminPageNew'));
const IntegrationsAdminPage = React.lazy(() => import('../pages/admin/IntegrationsAdminPage'));
const UserRightsSummaryPage = React.lazy(() => import('../pages/admin/UserRightsSummaryPage'));

// Pages Paramètres
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const ProfileSettings = React.lazy(() => import('../pages/settings/ProfileSettings'));
const OrganizationSettings = React.lazy(() => import('../pages/settings/OrganizationSettings'));
const EmailSettings = React.lazy(() => import('../pages/settings/EmailSettings'));

export const AppLayout: React.FC = () => {
  const { 
    user, 
    isSuperAdmin, 
    currentOrganization,
    modules, 
    hasFeature,
    loading
  } = useAuth();

  const { sidebarOpen: _sidebarOpen } = useSidebar(); // Utilisé dans le template

  // Organisation des modules en sections
  const sections = useSharedSections();
  const sectionsWithModules = organizeModulesInSections(sections.sections, modules);

  if (loading) {
    return <LoadingSpinner message="Chargement de l'application..." />;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen text-red-600 font-bold">
      Erreur de session. Veuillez vous reconnecter.
    </div>;
  }

  if (!currentOrganization && !isSuperAdmin) {
    return <FreeUserPage />;
  }

  return (
    <>
      <StoreInitializer />
      
      <div className="min-h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <Suspense fallback={
          <div className="w-full h-16 bg-[#1F3B53] flex items-center justify-center">
            <div className="animate-pulse text-white/60">Chargement header...</div>
          </div>
        }>
          <Header />
        </Suspense>

        {/* Contenu principal avec sidebar modal */}
        <div className="flex-1 relative">
          {/* Sidebar Modal */}
          <SidebarModal 
            sectionsWithModules={sectionsWithModules}
            hasFeature={hasFeature}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Contenu principal */}
          <main className="flex-1 min-w-0 bg-gray-100 overflow-y-auto">
            <div className="p-6">
              <NotificationsContainer />
              <Suspense fallback={<LoadingSpinner message="Chargement de la page..." />}>
                <Routes>
                  {/* Redirection par défaut */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {/* Routes principales */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/premium-test" element={<PremiumTestPage />} />
                  <Route path="/diagnostic-complet" element={<DiagnosticCompletPage />} />
                  {hasFeature('clients_access') && <Route path="/clients" element={<CRMPage />} />}
                  {hasFeature('gestion_sav') && <Route path="/gestion_sav" element={<GestionSAVPage />} />}
                  {hasFeature('leads_access') && <Route path="/leads" element={<LeadsPage />} />}
                  {hasFeature('MAIL') && <Route path="/mail" element={<MailPage />} />}

                  {/* Routes modules métier */}
                  {hasFeature('facture') && <Route path="/facture" element={<FacturePage />} />}
                  {hasFeature('Technique') && <Route path="/technique" element={<TechniquePage />} />}
                  <Route path="/tableaux" element={<GestionTableauxPage />} />
                  {hasFeature('formulaire') && <Route path="/formulaire" element={<FormulairePage />} />}
                  {hasFeature('Agenda') && <Route path="/agenda" element={<AgendaWrapper />} />}
                  {(hasFeature('devis') || isSuperAdmin) && <Route path="/devis" element={<DevisPage />} />}

                  {/* Routes Google Workspace */}
                  {hasFeature('google_gmail_access') && <Route path="/google-gmail" element={<GoogleMailPageFixed />} />}
                  {hasFeature('google_agenda_access') && <Route path="/google-agenda" element={<GoogleAgendaPage />} />}
                  {hasFeature('google_contacts_access') && <Route path="/google-contacts" element={<GoogleContactsPage />} />}
                  
                  {/* Routes Admin */}
                  {isSuperAdmin && (
                    <>
                      <Route path="/admin/modules" element={<ModulesAdminPage />} />
                      <Route path="/admin/permissions" element={<PermissionsAdminPage />} />
                      <Route path="/admin/integrations" element={<IntegrationsAdminPage />} />
                    </>
                  )}
                  {can('role:read') && <Route path="/admin/roles" element={<RolesAdminPage />} />}
                  {can('user:read') && (
                    <>
                      <Route path="/admin/users" element={<UsersAdminPage />} />
                      <Route path="/admin/rights-summary" element={<UserRightsSummaryPage />} />
                    </>
                  )}
                  {can('organization:read') && 
                    <Route path="/admin/organizations" element={<OrganizationsAdminPage />} />
                  }

                  {/* Routes Paramètres */}
                  <Route path="/settings" element={<SettingsPage />}>
                    <Route path="profile" element={<ProfileSettings />} />
                    <Route path="organization" element={<OrganizationSettings />} />
                    <Route path="emails" element={<EmailSettings />} />
                    <Route path="" element={<Navigate to="/settings/profile" replace />} />
                  </Route>

                  {/* Fallback pour les routes non trouvées */}
                  <Route path="*" element={<div>Page non trouvée</div>} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

// Export des composants individuels
export { default as Header } from './components/Header';
export { default as LoadingSpinner } from './components/LoadingSpinner';
export { default as SidebarModal } from './components/SidebarModal';
