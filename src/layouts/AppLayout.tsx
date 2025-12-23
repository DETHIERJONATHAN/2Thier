import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useSharedSections } from '../hooks/useSharedSections';
import { organizeModulesInSections } from '../utils/modulesSections';
import StoreInitializer from '../components/StoreInitializer';
import { NotificationsContainer } from '../components/Notifications';
import MainLayoutNew from '../pages/page2thier/MainLayoutNew';
import LoadingSpinner from './components/LoadingSpinner';
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

// Pages TreeBranchLeaf (système 3 colonnes)
const TreeBranchLeafLayoutV2 = React.lazy(() => import('../pages/Formulaire/TreeBranchLeafWrapper-Fixed'));

// Pages Google Workspace
const GoogleGmailPageV2 = React.lazy(() => import('../google-workspace/pages/GoogleGmailPageV2'));
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
const ProfileSettings = React.lazy(() => import('../pages/Settings/ProfileSettings'));
const OrganizationSettings = React.lazy(() => import('../pages/Settings/OrganizationSettings'));
const EmailSettings = React.lazy(() => import('../pages/Settings/EmailSettings'));

// Pages Marketing & Ventes
const SiteVitrinePage = React.lazy(() => import('../pages/SiteVitrinePage'));
const SiteVitrine2Thier = React.lazy(() => import('../pages/SiteVitrine2Thier'));
const Devis1minuteVitrinePage = React.lazy(() => import('../pages/Devis1minuteVitrinePage'));
const PublicitesIntegrationPage = React.lazy(() => import('../pages/devis1minute/PublicitesIntegrationPage'));
const EcommerceIntegrationPage = React.lazy(() => import('../pages/EcommerceIntegrationPage'));
const AdvancedAnalyticsPage = React.lazy(() => import('../pages/AdvancedAnalyticsPage'));
const LeadGenerationPage = React.lazy(() => import('../pages/LeadGenerationPage'));

export const AppLayout: React.FC = () => {
  const { 
    user, 
    isSuperAdmin, 
    currentOrganization,
    modules, 
    hasFeature,
    can,
    loading
  } = useAuth();

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
      
      <MainLayoutNew
        sectionsWithModules={sectionsWithModules}
        hasFeature={hasFeature}
        isSuperAdmin={isSuperAdmin}
      >
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
                  <Route path="/formulaire/treebranchleaf" element={<TreeBranchLeafLayoutV2 />} />
                  {hasFeature('formulaire') && <Route path="/formulaire/treebranchleaf-v2/:id" element={<TreeBranchLeafLayoutV2 />} />}
                  {hasFeature('Agenda') && <Route path="/agenda" element={<AgendaWrapper />} />}
                  {(hasFeature('devis') || isSuperAdmin) && <Route path="/devis" element={<DevisPage />} />}

                  {/* Routes Google Workspace */}
                  {hasFeature('google_gmail_access') && <Route path="/google-gmail" element={<GoogleGmailPageV2 />} />}
                  {hasFeature('google_agenda_access') && <Route path="/google-agenda" element={<GoogleAgendaPage />} />}
                  {hasFeature('google_contacts_access') && <Route path="/google-contacts" element={<GoogleContactsPage />} />}

                  {/* Routes Marketing & Ventes */}
                  <Route path="/site-vitrine-2thier" element={<SiteVitrine2Thier />} />
                  {hasFeature('site_vitrine_energetique') && <Route path="/site-vitrine" element={<SiteVitrinePage />} />}
                  {hasFeature('devis1minute_vitrine') && <Route path="/devis1minute-vitrine" element={<Devis1minuteVitrinePage />} />}
                  {hasFeature('integrations_publicitaires') && <Route path="/publicites" element={<PublicitesIntegrationPage />} />}
                  {hasFeature('integrations_ecommerce') && <Route path="/ecommerce" element={<EcommerceIntegrationPage />} />}
                  {hasFeature('analytics_avances') && <Route path="/analytics" element={<AdvancedAnalyticsPage />} />}
                  {hasFeature('generation_leads_avancee') && <Route path="/lead-generation" element={<LeadGenerationPage />} />}
                  
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
      </MainLayoutNew>
    </>
  );
};
