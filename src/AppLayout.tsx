import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { useAuth } from './auth/useAuth';
import Sidebar from './components/Sidebar_new';
import StoreInitializer from './components/StoreInitializer';
import DashboardPage from './pages/DashboardPage';
import CRMPage from './pages/CRMPage';
import GestionSAVPage from './pages/GestionSAVPage';
import ModulesAdminPage from './pages/admin/ModulesAdminPage';
import RolesAdminPage from './pages/admin/RolesAdminPage';
import UsersAdminPage from './pages/admin/UsersAdminPageNew';
import OrganizationsAdminPage from './pages/admin/OrganizationsAdminPageNew';
import PermissionsAdminPage from './pages/admin/PermissionsAdminPageNew';
import IntegrationsAdminPage from './pages/admin/IntegrationsAdminPage';

import FormulaireLayout from './pages/Formulaire/FormulaireLayout';
import LeadsPage from './pages/Leads/LeadsPage';
import AgendaWrapper from './pages/AgendaWrapper';
import { NotificationsContainer } from './components/Notifications';
import ImpersonationBanner from './components/ImpersonationBanner';
import UserRightsSummaryPage from './pages/admin/UserRightsSummaryPage';
import AuthDebugPage from './pages/admin/AuthDebugPage';
import Header from './components/Header';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OrganizationSettings from './pages/settings/OrganizationSettings';
import ProfileSettings from './pages/settings/ProfileSettings';
import EmailSettings from './pages/settings/EmailSettings';
import FreeUserPage from './pages/FreeUserPage'; // 🆕 Import de la page utilisateur libre
import './App.css'; // Import des styles CSS

import { ModuleAccess } from './auth/modules';
import FormulaDiagnosticPage from './pages/Diagnostics/FormulaDiagnosticPage';
import FormulaTestPage from './pages/Diagnostics/FormulaTestPage';
import MailPage from './pages/MailPage';
// 📊 ANALYTICS & AUDIT - FUTURES FONCTIONNALITÉS SUPER-ADMIN
// import AnalyticsPage from './pages/AnalyticsPage'; // TODO: À activer plus tard
// import AuditPage from './pages/AuditPage'; // TODO: À activer plus tard
// import GoogleWorkspaceIntegratedPage from './pages/GoogleWorkspaceIntegratedPage'; // Fichier manquant

// Import des pages Google Workspace - TOUTES DISPONIBLES
import GoogleMailPageFixed from './pages/GoogleMailPageFixed';
import GoogleAgendaPage from './pages/GoogleAgendaPage';
import GoogleDrivePage from './pages/GoogleDrivePage';
import GoogleMeetPage from './pages/GoogleMeetPage';
import TelnyxPage from './pages/TelnyxPage';
import GoogleGroupsPage from './pages/GoogleGroupsPage';
import GoogleFormsPage from './pages/GoogleFormsPage';
import GoogleMapsPage from './pages/GoogleMapsPage';
import GoogleAnalyticsPage from './pages/GoogleAnalyticsPage';
import GoogleGeminiPage from './pages/GoogleGeminiPage';
import GoogleContactsPage from './pages/GoogleContactsPage';
import AIBadge from './components/AIBadge';

// Import des nouvelles pages modules
import FacturePage from './pages/FacturePage';
import TechniquePage from './pages/TechniquePage';
import FormulairePage from './pages/FormulairePage';
import ArchitectIAPanel from './components/ArchitectIAPanel';

export default function AppLayout() {
  const { 
    user, 
    isSuperAdmin, 
    currentOrganization,
    modules, 
    can, // Utilisation de la fonction `can` directement depuis le contexte
    loading,
    isImpersonating
  } = useAuth();

  // La logique de `can` est maintenant dans AuthProvider, pas besoin de la redéfinir ici.

  // Logique pour déterminer les modules visibles
  const visibleModules = modules.filter((m: ModuleAccess) => {
    // 🏗️ HIÉRARCHIE DE PERMISSIONS EN 3 NIVEAUX :
    // 1. Le module doit être ACTIF globalement (décision super-admin niveau système)
    if (!m.active) {
      return false;
    }
    
    // 2. Pour TOUS les utilisateurs (y compris super-admin), 
    //    le module doit être disponible ET activé pour l'organisation actuelle
    //    Cela respecte la hiérarchie : Super Admin → Organisation → Utilisateur
    return m.isActiveInOrg;
  });

  // Logique pour vérifier les features (basé sur les modules)
  const hasFeature = (feature: string) => {
    // SIMPLIFICATION: Si le module est dans la liste, c'est qu'on y a accès.
    // La liste `modules` est déjà filtrée par l'AuthProvider.
    return modules.some((m: ModuleAccess) => m.feature === feature);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg text-gray-500">Chargement de l'application...</div>;
  }

  // 🔒 Gestion des utilisateurs non connectés
  if (!user) {
    console.error('[AppLayout] Aucun utilisateur connecté');
    return <div className="flex items-center justify-center h-screen text-red-600 font-bold">Erreur de session. Veuillez vous reconnecter.</div>;
  }

  // 🆓 Gestion des utilisateurs libres (sans organisation)
  if (!currentOrganization && !isSuperAdmin) {
    console.log('[AppLayout] Utilisateur libre détecté - affichage page simplifiée');
    return <FreeUserPage />;
  }

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      <StoreInitializer />
      <ImpersonationBanner />
      
      <Sidebar modules={visibleModules} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className={`flex-1 p-6 overflow-y-auto ${isImpersonating ? 'pt-16' : ''}`}>
          <NotificationsContainer />
          <Routes>
            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Routes principales */}
            <Route path="/dashboard" element={<DashboardPage />} />
            {hasFeature('clients_access') && <Route path="/clients" element={<CRMPage />} />} 
            {hasFeature('gestion_sav') && <Route path="/gestion_sav" element={<GestionSAVPage />} />} 
            {hasFeature('leads_access') && <Route path="/leads" element={<LeadsPage />} />} 
            {hasFeature('MAIL') && <Route path="/mail" element={<MailPage />} />}

            {/* Routes modules métier - CORRESPONDANT EXACTEMENT AUX ROUTES DE LA DB */}
            {hasFeature('dashboard') && <Route path="/dashboard" element={<DashboardPage />} />}
            {hasFeature('facture') && <Route path="/facture" element={<FacturePage />} />}
            {hasFeature('Technique') && <Route path="/technique" element={<TechniquePage />} />}
            {hasFeature('formulaire') && <Route path="/formulaire" element={<FormulairePage />} />}
            {hasFeature('Agenda') && <Route path="/agenda" element={<AgendaWrapper />} />}

            {/* Routes Google Workspace - CORRESPONDANT EXACTEMENT AUX ROUTES DE LA DB */}
            {(hasFeature('google_gmail_access') || hasFeature('google_gmail')) && <Route path="/google-gmail" element={<GoogleMailPageFixed />} />}
            {hasFeature('google_agenda_access') && <Route path="/google-agenda" element={<GoogleAgendaPage />} />}
            {hasFeature('analytics_access') && <Route path="/analytics" element={<GoogleAnalyticsPage />} />}
            {hasFeature('google_contacts_access') && <Route path="/google-contacts" element={<GoogleContactsPage />} />}
            {hasFeature('google_drive_access') && <Route path="/google-drive" element={<GoogleDrivePage />} />}
            {hasFeature('google_forms_access') && <Route path="/google-forms" element={<GoogleFormsPage />} />}
            {hasFeature('google_groups_access') && <Route path="/google-groups" element={<GoogleGroupsPage />} />}
            {hasFeature('google_meet_access') && <Route path="/google-meet" element={<GoogleMeetPage />} />}
            {hasFeature('google_maps_access') && <Route path="/google-maps" element={<GoogleMapsPage />} />}
            {hasFeature('gemini_access') && <Route path="/gemini" element={<GoogleGeminiPage />} />}
            {hasFeature('telnyx_communications_access') && <Route path="/telnyx-communications" element={<TelnyxPage />} />}

            {/* Route agenda interne CRM - SUPPRIMÉE CAR DUPLIQUÉE PLUS HAUT */}
            
            {/* Routes Admin */}
            {isSuperAdmin && <Route path="/admin/modules" element={<ModulesAdminPage />} />}
            {can('role:read') && <Route path="/admin/roles" element={<RolesAdminPage />} />}
            {can('user:read') && <Route path="/admin/users" element={<UsersAdminPage />} />}
            {can('user:read') && <Route path="/admin/rights-summary" element={<UserRightsSummaryPage />} />}
            {can('organization:read') && <Route path="/admin/organizations" element={<OrganizationsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/permissions" element={<PermissionsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/integrations" element={<IntegrationsAdminPage />} />}
            {isSuperAdmin && <Route path="/admin/architect" element={<ArchitectIAPanel />} />}
            
            {/* Telnyx Communications */}
            {(hasFeature('TELNYX') || hasFeature('telnyx') || isSuperAdmin) && <Route path="/telnyx" element={<TelnyxPage />} />}
            
            {/* Debug et Diagnostics */}
            {isSuperAdmin && <Route path="/admin/debug/auth" element={<AuthDebugPage />} />}
            
            {/* 📊 ANALYTICS & AUDIT - FUTURES FONCTIONNALITÉS SUPER-ADMIN */}
            {/* {(isSuperAdmin || can('user:read')) && <Route path="/admin/analytics" element={<AnalyticsPage />} />} */}
            {/* {(isSuperAdmin || can('user:read')) && <Route path="/admin/audit" element={<AuditPage />} />} */}
            
            {/* Routes de diagnostic des formules pour les développeurs */}
            {isSuperAdmin && <Route path="/admin/diagnostics/formulas" element={<Suspense fallback={<div>Chargement...</div>}><FormulaDiagnosticPage /></Suspense>} />}
            {isSuperAdmin && <Route path="/admin/diagnostics/test-formulas" element={<Suspense fallback={<div>Chargement...</div>}><FormulaTestPage /></Suspense>} />}

            {/* Route pour l'éditeur de formulaire, maintenant préfixée par /admin */}
            <Route path="/admin/formulaire/:blockId" element={<FormulaireLayout />} />

            {/* Routes Paramètres */}
            <Route path="/settings" element={<SettingsPage />}>
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="organization" element={<OrganizationSettings />} />
                <Route path="emails" element={<EmailSettings />} />
                <Route path="" element={<Navigate to="/settings/profile" replace />} />
            </Route>
            <Route path="/profile" element={<ProfilePage />} />

            {/* Fallback pour les routes non trouvées */}
            <Route path="*" element={<div>Page non trouvée</div>} />
          </Routes>
        </main>
      </div>
  <AIBadge />
    </div>
  );
}