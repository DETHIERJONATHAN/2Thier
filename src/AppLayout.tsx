import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import MainLayoutNew from './pages/page2thier/MainLayoutNew';
import StoreInitializer from './components/StoreInitializer';
import { NotificationsContainer } from './components/Notifications';
import FreeUserPage from './pages/FreeUserPage';

// 🚀 LAZY IMPORTS POUR RÉDUIRE LE BUNDLE INITIAL
// Pages principales (chargement à la demande)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const GestionSAVPage = lazy(() => import('./pages/GestionSAVPage'));
const LeadsPage = lazy(() => import('./pages/Leads/LeadsPage'));
const AgendaWrapper = lazy(() => import('./pages/AgendaWrapper'));
const MailPage = lazy(() => import('./pages/UnifiedMailPage'));  // ✅ Redirigé vers page mail unifiée
const GestionTableauxPage = lazy(() => import('./pages/GestionTableauxPage'));
const PremiumTestPage = lazy(() => import('./pages/PremiumTestPage'));
const TailwindTestPage = lazy(() => import('./pages/TailwindTestPage'));
const DiagnosticCompletPage = lazy(() => import('./pages/DiagnosticCompletPage'));
const FullScreenDemoPage = lazy(() => import('./pages/FullScreenDemoPage'));

// Pages modules métier
const FacturePage = lazy(() => import('./pages/FacturePage'));
const TechniquePage = lazy(() => import('./pages/TechniquePage'));
const FormulairePage = lazy(() => import('./pages/FormulairePage'));
const DevisPage = lazy(() => import('./pages/DevisPage'));
const ProductDocumentsPage = lazy(() => import('./pages/ProductDocumentsPage'));
// Rendu utilisateur TBL centralisé – import direct pour éviter toute divergence
// UserRenderer components supprimés

// TreeBranchLeaf System - Système 3-colonnes parfait
// const TreeBranchLeafLayoutV2 = lazy(() => import('./pages/Formulaire/TreeBranchLeafLayoutV2'));

// TBL - Nouveau système de formulaires connectés
const TBLPage = lazy(() => import('./components/TreeBranchLeaf/treebranchleaf-new/TBL/TBL.tsx'));

// TreeBranchLeaf Wrapper - Interface 3 colonnes complète
const TreeBranchLeafWrapper = lazy(() => import('./components/TreeBranchLeaf/treebranchleaf-new/TreeBranchLeafWrapper'));

// Test TBL Tooltips
const TestTBLTooltips = lazy(() => import('./pages/TestTBLTooltips'));

// Admin - Gestion des sites web
const WebsitesAdminPage = lazy(() => import('./pages/admin/WebsitesAdminPage'));

// Pages Devis1Minute
const MarketplacePage = lazy(() => import('./pages/devis1minute/MarketplacePage'));
const PartnerPortalPage = lazy(() => import('./pages/devis1minute/PartnerPortalPage'));
const PartnerLeadsPage = lazy(() => import('./pages/devis1minute/PartnerLeadsPage'));
const PartnerBillingPage = lazy(() => import('./pages/devis1minute/PartnerBillingPage'));
const LeadGenerationPage = lazy(() => import('./pages/devis1minute/LeadGenerationPage'));

// Gestion des formulaires publics
const PublicFormsManagementPage = lazy(() => import('./pages/PublicFormsManagementPage'));
const CampaignAnalyticsPage = lazy(() => import('./pages/devis1minute/CampaignAnalyticsPage'));
const PublicFormsPage = lazy(() => import('./pages/devis1minute/PublicFormsPage'));
const LandingPagesPage = lazy(() => import('./pages/devis1minute/LandingPagesPage'));
const EspaceProPage = lazy(() => import('./pages/devis1minute/EspaceProPage'));
// D1M Admin pages (nouvelles)
const Devis1minuteAdminDashboard = lazy(() => import('./pages/devis1minute/admin/Devis1minuteAdminDashboard'));
const Devis1minuteAdminIntake = lazy(() => import('./pages/devis1minute/admin/Devis1minuteAdminIntake'));
const Devis1minuteAdminDispatch = lazy(() => import('./pages/devis1minute/admin/Devis1minuteAdminDispatch'));
const Devis1minuteAdminIntegrations = lazy(() => import('./pages/devis1minute/admin/Devis1minuteAdminIntegrations'));
const Devis1minuteAdminSite = lazy(() => import('./pages/devis1minute/admin/Devis1minuteAdminSite'));

// Pages Google Workspace (très lourdes)
const GoogleGmailPageV2 = lazy(() => import('./pages/UnifiedMailPage'));  // ✅ Page mail unifiée Gmail + Yandex
const GoogleAgendaPage = lazy(() => import('./pages/GoogleAgendaPage'));
const GoogleDrivePage = lazy(() => import('./google-workspace/pages/GoogleDrivePageV2'));
const GoogleMeetPage = lazy(() => import('./pages/GoogleMeetPage'));
const TelnyxPage = lazy(() => import('./pages/TelnyxPage'));
const GoogleGroupsPage = lazy(() => import('./pages/GoogleGroupsPage'));
const GoogleFormsPage = lazy(() => import('./pages/GoogleFormsPage'));
const GoogleMapsPage = lazy(() => import('./pages/GoogleMapsPage'));
const GoogleAnalyticsPage = lazy(() => import('./pages/GoogleAnalyticsPage'));
const GoogleGeminiPage = lazy(() => import('./pages/GoogleGeminiPage'));
const GoogleContactsPage = lazy(() => import('./pages/GoogleContactsPage'));

// Pages Admin (chargées uniquement si nécessaire)
const ModulesAdminPage = lazy(() => import('./pages/admin/ModulesAdminPage'));
const RolesAdminPage = lazy(() => import('./pages/admin/RolesAdminPage'));
const UsersAdminPage = lazy(() => import('./pages/admin/UsersAdminPageNew'));
const OrganizationsAdminPage = lazy(() => import('./pages/admin/OrganizationsAdminPageNew'));
const PermissionsAdminPage = lazy(() => import('./pages/admin/PermissionsAdminPageNew'));
const IntegrationsAdminPage = lazy(() => import('./pages/admin/IntegrationsAdminPage'));
const UserRightsSummaryPage = lazy(() => import('./pages/admin/UserRightsSummaryPage'));
const TreesAdminPage = lazy(() => import('./pages/admin/TreesAdminPage'));
const AuthDebugPage = lazy(() => import('./pages/admin/AuthDebugPage'));
const ArchitectIAPanel = lazy(() => import('./components/ArchitectIAPanel'));

// Pages settings et profil
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrganizationSettings = lazy(() => import('./pages/settings/OrganizationSettings'));
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const EmailSettings = lazy(() => import('./pages/settings/EmailSettings'));
const AIMeasureSettings = lazy(() => import('./pages/settings/AIMeasureSettings'));

// Pages Documents (Admin)
const DocumentTemplatesPage = lazy(() => import('./pages/DocumentTemplatesPage'));

// Pages diagnostics
const FormulaDiagnosticPage = lazy(() => import('./pages/Diagnostics/FormulaDiagnosticPage'));
const FormulaTestPage = lazy(() => import('./pages/Diagnostics/FormulaTestPage'));
const AdvancedSelectTestPage = lazy(() => import('./pages/AdvancedSelectTestPage'));

// Formulaire Layout
const FormulaireLayout = lazy(() => import('./pages/Formulaire/FormulaireLayout'));

// Composants UI
const AIBadge = lazy(() => import('./components/AIBadge'));

// Composant de chargement optimisé (maintenant utilisé directement inline)

export default function AppLayout() {
  const { 
    user, 
    isSuperAdmin, 
    currentOrganization,
    modules, 
    can,
    hasFeature,
    loading
  } = useAuth();

  // Les modules sont déjà filtrés dans l'AuthProvider donc pas besoin de les refiltrer ici
  const visibleModules = modules;

  if (loading) {
    console.log('[AppLayout] LOADING: true');
    return <div className="flex items-center justify-center h-screen text-lg text-gray-500">Chargement de l'application...</div>;
  }

  // 🔒 Gestion des utilisateurs non connectés
  if (!user) {
    console.error('[AppLayout] PROBLÈME: Aucun utilisateur connecté');
    return <div className="flex items-center justify-center h-screen text-red-600 font-bold">Erreur de session. Veuillez vous reconnecter.</div>;
  }

  // 🆓 Gestion des utilisateurs libres (sans organisation)
  if (!currentOrganization && !isSuperAdmin) {
    console.log('[AppLayout] PROBLÈME: Utilisateur libre détecté - currentOrganization:', currentOrganization, 'isSuperAdmin:', isSuperAdmin);
    return <FreeUserPage />;
  }

  console.log('[AppLayout] ✅ Layout complet initialisé');
  console.log('[AppLayout] User:', user?.firstName, user?.lastName, 'ID:', user?.id);
  console.log('[AppLayout] Organization:', currentOrganization?.name, 'ID:', currentOrganization?.id);
  console.log('[AppLayout] Modules visibles:', visibleModules.length);
  console.log('[AppLayout] Loading:', loading);
  console.log('[AppLayout] IsSuperAdmin:', isSuperAdmin);
  console.log('[AppLayout] Modules sample:', visibleModules.slice(0, 3).map(m => m.key));

  return (
    <>
      <StoreInitializer />
      
      <MainLayoutNew>
        <NotificationsContainer />
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C5967] mx-auto mb-4"></div>
              <p className="text-[#3C3C3C]">Chargement de la page...</p>
            </div>
          </div>
        }>
          <Routes>
            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 🌟 ROUTE TREEBRANCHLEAF - INTÉGRÉE AVEC HEADER */}
            {/* <Route path="/formulaire/treebranchleaf" element={
              <Suspense fallback={<div>Chargement TreeBranchLeaf...</div>}>
                <TreeBranchLeafLayoutV2 />
              </Suspense>
            } /> */}
            
            {/* Route de test - doit être visible */}
            <Route path="/test-direct" element={
              <div style={{ minHeight: '100vh', padding: '40px', backgroundColor: '#00ff00', color: 'black' }}>
                <h1 style={{ fontSize: '48px' }}>✅ TEST DIRECT RÉUSSI !</h1>
                <p style={{ fontSize: '24px' }}>Cette route fonctionne parfaitement.</p>
              </div>
            } />

            {/* Routes principales */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/premium-test" element={<PremiumTestPage />} />
            <Route path="/tailwind-test" element={<TailwindTestPage />} />
            <Route path="/diagnostic-complet" element={<DiagnosticCompletPage />} />
            <Route path="/full-screen-demo" element={<FullScreenDemoPage />} />
            {hasFeature('clients_access') && <Route path="/clients" element={<CRMPage />} />} 
            {hasFeature('gestion_sav') && <Route path="/gestion_sav" element={<GestionSAVPage />} />} 
            {(hasFeature('leads_access') || isSuperAdmin) && <Route path="/leads/*" element={<LeadsPage />} />} 
            {hasFeature('MAIL') && <Route path="/mail" element={<MailPage />} />}

            {/* Routes modules métier - CORRESPONDANT EXACTEMENT AUX ROUTES DE LA DB */}
            {hasFeature('facture') && <Route path="/facture" element={<FacturePage />} />}
            {hasFeature('Technique') && <Route path="/technique" element={<TechniquePage />} />}
            <Route path="/tableaux" element={<GestionTableauxPage />} />
            <Route path="/gestion-tableaux" element={<GestionTableauxPage />} />
            {hasFeature('formulaire') && <Route path="/formulaire" element={<FormulairePage />} />}
            {/* TBL - Nouveau système de formulaires connectés */}
            <Route path="/tbl" element={<TBLPage />} />
            <Route path="/tbl/:leadId" element={<TBLPage />} />
            <Route path="/test-tooltips" element={<TestTBLTooltips />} />
            {/* Alias pour le module TBL (route définie en BDD: /module-tbl) */}
            <Route path="/module-tbl" element={<TBLPage />} />
            <Route path="/module-tbl/:leadId" element={<TBLPage />} />
            
            {/* 🌟 TreeBranchLeaf Wrapper - Interface complète 3 colonnes */}
            <Route path="/formulaire/treebranchleaf" element={<TreeBranchLeafWrapper />} />
            <Route path="/formulaire/treebranchleaf/:id" element={<TreeBranchLeafWrapper />} />
            <Route path="/formulaire/treebranchleaf/:id/:leadId" element={<TreeBranchLeafWrapper />} />
            {/* TBL routes supprimées - utiliser /demo/tbl-new */}
            
            
            {hasFeature('Agenda') && <Route path="/agenda" element={<AgendaWrapper />} />}
            
            {/* Admin - Gestion des sites web (Super Admin uniquement) */}
            {isSuperAdmin && <Route path="/admin/sites-web" element={<WebsitesAdminPage />} />}
            
            {/* Admin - Gestion des documents (Admin uniquement) */}
            {isSuperAdmin && <Route path="/admin/documents" element={<DocumentTemplatesPage />} />}
            
            {/* Devis - Accessible si module présent ou super admin */}
            {(hasFeature('devis') || isSuperAdmin) && <Route path="/devis" element={<DevisPage />} />}

            {/* Fiches Techniques - Documents produits */}
            {(hasFeature('fiches_techniques') || isSuperAdmin) && <Route path="/fiches-techniques" element={<ProductDocumentsPage />} />}

            {/* Routes Devis1Minute - Lead Generation Marketplace */}
            <Route path="/marketplace" element={<MarketplacePage />} />
            
            {/* ESPACE PROFESSIONNEL DEVIS1MINUTE - DANS LE CRM AUTHENTIFIÉ */}
            <Route path="/espace-pro" element={<EspaceProPage />} />
            
            {(hasFeature('partner_portal') || isSuperAdmin) && <Route path="/partner/portal" element={<PartnerPortalPage />} />}
            {(hasFeature('partner_portal') || isSuperAdmin) && <Route path="/partner/leads" element={<PartnerLeadsPage />} />}
            {(hasFeature('partner_portal') || isSuperAdmin) && <Route path="/partner/billing" element={<PartnerBillingPage />} />}
            
            {/* Routes principales */}
            <Route path="/lead-generation" element={<LeadGenerationPage />} />
            <Route path="/campaign-analytics" element={<CampaignAnalyticsPage />} />
            {(hasFeature('public_forms') || isSuperAdmin) && <Route path="/public-forms" element={<PublicFormsPage />} />}
            {(hasFeature('public_forms') || isSuperAdmin) && <Route path="/forms" element={<PublicFormsPage />} />}
            {(hasFeature('public_forms') || isSuperAdmin) && <Route path="/public-forms-management" element={<PublicFormsManagementPage />} />}
            <Route path="/landing-pages" element={<LandingPagesPage />} />
            
            {/* Routes Devis1Minute avec préfixe */}
            <Route path="/devis1minute/marketplace" element={<MarketplacePage />} />
            <Route path="/devis1minute/partner" element={<LeadGenerationPage />} />
            <Route path="/devis1minute/leads" element={<CampaignAnalyticsPage />} />
            <Route path="/devis1minute/billing" element={<LandingPagesPage />} />

            {/* Routes Google Workspace - CORRESPONDANT EXACTEMENT AUX ROUTES DE LA DB */}
            {(hasFeature('google_gmail_access') || hasFeature('google_gmail')) && <Route path="/google-gmail" element={<GoogleGmailPageV2 />} />}
            {hasFeature('google_agenda_access') && <Route path="/google-agenda" element={<GoogleAgendaPage />} />}
            {(hasFeature('analytics_access') || isSuperAdmin) && <Route path="/analytics" element={<GoogleAnalyticsPage />} />}
            {hasFeature('google_contacts_access') && <Route path="/google-contacts" element={<GoogleContactsPage />} />}
            {hasFeature('google_drive_access') && <Route path="/google-drive" element={<GoogleDrivePage />} />}
            {hasFeature('google_forms_access') && <Route path="/google-forms" element={<GoogleFormsPage />} />}
            {hasFeature('google_groups_access') && <Route path="/google-groups" element={<GoogleGroupsPage />} />}
            {hasFeature('google_meet_access') && <Route path="/google-meet" element={<GoogleMeetPage />} />}
            {hasFeature('google_maps_access') && <Route path="/google-maps" element={<GoogleMapsPage />} />}
            {hasFeature('gemini_access') && <Route path="/gemini" element={<GoogleGeminiPage />} />}
            {hasFeature('telnyx_communications_access') && <Route path="/telnyx-communications" element={<TelnyxPage />} />}

            {/* Routes Admin */}
            {isSuperAdmin && <Route path="/admin/modules" element={<ModulesAdminPage />} />}
            {can('role:read') && <Route path="/admin/roles" element={<RolesAdminPage />} />}
            {can('user:read') && <Route path="/admin/users" element={<UsersAdminPage />} />}
            {can('user:read') && <Route path="/admin/rights-summary" element={<UserRightsSummaryPage />} />}
            {can('organization:read') && <Route path="/admin/organizations" element={<OrganizationsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/permissions" element={<PermissionsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/integrations" element={<IntegrationsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/trees" element={<TreesAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/architect" element={<ArchitectIAPanel />} />}
            
            {/* Routes Admin Devis1Minute (nouvelles) */}
            {isSuperAdmin && <Route path="/devis1minute/admin/dashboard" element={<Devis1minuteAdminDashboard />} />}
            {isSuperAdmin && <Route path="/devis1minute/admin/intake" element={<Devis1minuteAdminIntake />} />}
            {isSuperAdmin && <Route path="/devis1minute/admin/dispatch" element={<Devis1minuteAdminDispatch />} />}
            {isSuperAdmin && <Route path="/devis1minute/admin/integrations" element={<Devis1minuteAdminIntegrations />} />}
            {isSuperAdmin && <Route path="/devis1minute/admin/site" element={<Devis1minuteAdminSite />} />}

            {/* Anciennes routes Admin Devis1Minute -> redirections vers les nouvelles pages Admin */}
            <Route path="/devis1minute-admin/campaigns" element={<Navigate to="/devis1minute/admin/dashboard" replace />} />
            <Route path="/devis1minute-admin/analytics" element={<Navigate to="/devis1minute/admin/intake" replace />} />
            <Route path="/devis1minute-admin/forms" element={<Navigate to="/devis1minute/admin/site" replace />} />
            <Route path="/devis1minute-admin/landing" element={<Navigate to="/devis1minute/admin/site" replace />} />
            
            {/* Telnyx Communications */}
            {(hasFeature('TELNYX') || hasFeature('telnyx') || isSuperAdmin) && <Route path="/telnyx" element={<TelnyxPage />} />}
            
            {/* Debug et Diagnostics */}
            {isSuperAdmin && <Route path="/admin/debug/auth" element={<AuthDebugPage />} />}
            
            {/* Routes de diagnostic des formules pour les développeurs */}
            {isSuperAdmin && <Route path="/admin/diagnostics/formulas" element={<FormulaDiagnosticPage />} />}
            {isSuperAdmin && <Route path="/admin/diagnostics/test-formulas" element={<FormulaTestPage />} />}
            {isSuperAdmin && <Route path="/admin/diagnostics/advanced-select" element={<AdvancedSelectTestPage />} />}

            {/* Route pour l'éditeur de formulaire */}
            <Route path="/admin/formulaire/:blockId" element={<FormulaireLayout />} />

            {/* Routes Paramètres */}
            <Route path="/settings" element={<SettingsPage />}>
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="organization" element={<OrganizationSettings />} />
              <Route path="emails" element={<EmailSettings />} />
              <Route path="ai-measure" element={<AIMeasureSettings />} />
              <Route path="" element={<Navigate to="/settings/profile" replace />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />

            {/* Fallback pour les routes non trouvées */}
            <Route path="*" element={<div>Page non trouvée</div>} />
          </Routes>
        </Suspense>
      </MainLayoutNew>
      
      <Suspense fallback={null}>
        <AIBadge />
      </Suspense>
    </>
  );
}