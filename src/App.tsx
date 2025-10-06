import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { useAuth } from './auth/useAuth';
import { useFormulasVersionWatcher, onFormulasVersionChange } from './hooks/useFormulasVersionWatcher';
import { DomainRouter } from './hooks/useDomainRouter';

// TreeBranchLeaf System V2 - AVEC DRAG & DROP FONCTIONNEL DE PALETTE À STRUCTURE !
import TreeBranchLeafWrapper from './components/TreeBranchLeaf/treebranchleaf-new/TreeBranchLeafWrapper';

// Lazy imports
const Connexion = lazy(() => import('./components/Connexion'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const InscriptionMultiEtapes = lazy(() => import('./components/InscriptionMultiEtapes'));
const AppLayout = lazy(() => import('./AppLayout'));
const GoogleAuthCallback = lazy(() => import('./pages/GoogleAuthCallback'));
const TestPage = lazy(() => import('./pages/TestPage'));
const TestPage2Thier = lazy(() => import('./pages/page2thier/TestPage'));
const AcceptInvitationPage = lazy(() => import('./pages/AcceptInvitationPage'));
const OracleNewStandalonePage = lazy(() => import('./pages/OracleNewStandalonePage'));
const TblNew = lazy(() => import('./components/TreeBranchLeaf/treebranchleaf-new/TblNew'));
// const TBL = lazy(() => import('./components/TreeBranchLeaf/treebranchleaf-new/TBL/TBL')); // laissé en commentaire (non utilisé)

// Pages publiques Devis1Minute
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const PublicLeadForm = lazy(() => import('./pages/public/PublicLeadForm'));
const ThankYouPage = lazy(() => import('./pages/public/ThankYouPage'));
const DevenirPartenaireePage = lazy(() => import('./pages/devis1minute/DevenirPartenaireePage'));
const LandingRenderer = lazy(() => import('./pages/public/LandingRenderer'));

// Pages publiques Site Vitrine 2Thier
const SiteVitrine2Thier = lazy(() => import('./pages/SiteVitrine2Thier'));

// Composant Loading
const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

// Composant pour les routes publiques
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Si l'utilisateur est connecté, rediriger vers le dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Composant pour les routes protégées
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  return children;
};

const App: React.FC = () => {
  // Active la surveillance de la version des formules (invalidation automatique)
  useFormulasVersionWatcher({ intervalMs: 60_000 });

  // Exemple: écoute globale (on pourrait déplacer vers un provider context si besoin)
  useEffect(() => {
    const off = onFormulasVersionChange(() => { /* hook d'écoute prêt pour actions futures */ });
    return () => off();
  }, []);
  
  return (
    <DomainRouter>
      <Routes>
      {/* Page de test Oracle */}
      <Route 
        path="/test" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <TestPage />
          </Suspense>
        } 
      />
      
      {/* 🌟 ROUTE TREEBRANCHLEAF NOUVEAU SYSTÈME - INTERFACE COMPLÈTE 3 COLONNES */}
      <Route 
        path="/formulaire/treebranchleaf" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <ProtectedRoute>
                <TreeBranchLeafWrapper />
              </ProtectedRoute>
            </div>
          </Suspense>
        } 
      />
      
      {/* 🚀 DEMO PUBLIQUE: TBL-New (UI uniquement, données mock si non authentifié) */}
      <Route 
        path="/demo/tbl-new" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <TblNew />
            </div>
          </Suspense>
        } 
      />
      {/* Variante: DEMO avec id explicite de l'arbre */}
      <Route 
        path="/demo/tbl-new/:id" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <TblNew />
            </div>
          </Suspense>
        } 
      />
      
      {/* 🌟 ROUTE TREEBRANCHLEAF ÉDITEUR AVEC ID - NOUVEAU SYSTÈME + LEAD */}
      <Route 
        path="/formulaire/treebranchleaf/:id" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <ProtectedRoute>
                <TreeBranchLeafWrapper />
              </ProtectedRoute>
            </div>
          </Suspense>
        } 
      />
      <Route 
        path="/formulaire/treebranchleaf/:id/:leadId" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
              <ProtectedRoute>
                <TreeBranchLeafWrapper />
              </ProtectedRoute>
            </div>
          </Suspense>
        } 
      />
      
      <Route 
        path="/test-layout" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <TestPage2Thier />
          </Suspense>
        } 
      />

      {/* Routes publiques Devis1Minute */}
      <Route 
        path="/oraclenew" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <OracleNewStandalonePage />
          </Suspense>
        } 
      />
      <Route 
        path="/devis1minute" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <LandingPage />
          </Suspense>
        } 
      />
      <Route 
        path="/site-vitrine-2thier" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <SiteVitrine2Thier />
          </Suspense>
        } 
      />
      <Route 
        path="/devis1minute/devenir-partenaire" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <DevenirPartenaireePage />
          </Suspense>
        } 
      />
      <Route 
        path="/devis1minute/leads" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <PublicLeadForm />
          </Suspense>
        } 
      />
      {/* Rendu public simplifié d'une landing par slug */}
      <Route 
        path="/lp/:slug" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <LandingRenderer />
          </Suspense>
        } 
      />
      <Route 
        path="/devis1minute/merci" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ThankYouPage />
          </Suspense>
        } 
      />

      {/* Routes publiques d'authentification */}
      <Route 
        path="/connexion" 
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <Connexion />
            </Suspense>
          </PublicRoute>
        } 
      />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <Connexion />
            </Suspense>
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <RegisterPage />
            </Suspense>
          </PublicRoute>
        } 
      />
      <Route 
        path="/register-steps" 
        element={
          <PublicRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <InscriptionMultiEtapes />
            </Suspense>
          </PublicRoute>
        } 
      />
      <Route 
        path="/accept-invitation" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <AcceptInvitationPage />
          </Suspense>
        } 
      />
      
      {/* Route callback Google OAuth (principal) */}
      <Route 
        path="/google-auth/callback" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GoogleAuthCallback />
          </Suspense>
        } 
      />
      {/* Alias pour compat avec les redirections actuelles du backend */}
      <Route 
        path="/google-auth-callback" 
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <GoogleAuthCallback />
          </Suspense>
        } 
      />

      {/* Routes protégées CRM - AVEC SIDEBAR ET HEADER */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <AppLayout />
            </Suspense>
          </ProtectedRoute>
        } 
      />
      
      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </DomainRouter>
  );
};

export default App;