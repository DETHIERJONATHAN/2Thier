import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';

// Pages lazy loading
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientPage = lazy(() => import('./pages/ClientPage'));
const LeadsPage = lazy(() => import('./pages/Leads/LeadsPage'));
const PremiumTestPageClean = lazy(() => import('./pages/PremiumTestPageClean'));

// Composant de chargement épuré
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p className="text-gray-600 text-sm">Chargement...</p>
    </div>
  </div>
);

export default function AppLayoutEpure() {
  const { 
    user, 
    isSuperAdmin, 
    currentOrganization,
    loading,
    isImpersonating,
    clearImpersonation
  } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-lg text-gray-500">Chargement de l'application...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center h-screen text-red-600 font-bold">Erreur de session. Veuillez vous reconnecter.</div>;
  }

  if (!currentOrganization && !isSuperAdmin) {
    return <div className="flex items-center justify-center h-screen">Utilisateur libre détecté</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* SIDEBAR ÉPURÉE FIXE À GAUCHE */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-50">
        
        {/* Logo/Header sidebar */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">2THIER CRM</h2>
          <p className="text-sm text-gray-600 mt-1">Interface épurée</p>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <a 
            href="/dashboard" 
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
          >
            <span className="mr-3">📊</span>
            Dashboard
          </a>
          <a 
            href="/clients" 
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
          >
            <span className="mr-3">👥</span>
            Clients
          </a>
          <a 
            href="/leads" 
            className="flex items-center px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-lg transition-colors"
          >
            <span className="mr-3">🎯</span>
            Leads
          </a>
          <div className="border-t border-gray-200 pt-2 mt-4">
            <a 
              href="/premium-test" 
              className="flex items-center px-3 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors"
            >
              <span className="mr-3">🎨</span>
              Test Interface
            </a>
          </div>
        </nav>
        
        {/* User info en bas */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-900">{user?.prenom} {user?.nom}</div>
            <div className="truncate">{currentOrganization?.nom}</div>
          </div>
        </div>
      </div>

      {/* HEADER ÉPURÉ FIXE EN HAUT */}
      <div 
        className="fixed top-0 right-0 bg-white border-b border-gray-200 shadow-sm z-40"
        style={{
          left: '256px',
          height: isImpersonating ? '120px' : '70px',
          transition: 'height 0.3s ease'
        }}
      >
        
        {/* Banner d'usurpation épuré */}
        {isImpersonating && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-800 font-medium text-sm">
                  🎭 Mode usurpation actif - Vous agissez en tant qu'autre utilisateur
                </span>
              </div>
              <button
                onClick={clearImpersonation}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Arrêter
              </button>
            </div>
          </div>
        )}
        
        {/* Contrôles header */}
        <div 
          className="px-6 flex items-center justify-between"
          style={{ height: isImpersonating ? '70px' : '70px' }}
        >
          <div>
            <h1 className="text-lg font-semibold text-gray-900">CRM Professionnel</h1>
          </div>
          <div className="text-sm text-gray-600">
            Interface épurée activée ✨
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div 
        className="pt-6"
        style={{
          marginLeft: '256px',
          marginTop: isImpersonating ? '120px' : '70px',
          minHeight: 'calc(100vh - 70px)'
        }}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <div className="p-6">
                <DashboardPage />
              </div>
            } />
            <Route path="/clients" element={
              <div className="p-6">
                <ClientPage />
              </div>
            } />
            <Route path="/leads" element={
              <div className="p-6">
                <LeadsPage />
              </div>
            } />
            <Route path="/premium-test" element={<PremiumTestPageClean />} />
            <Route path="*" element={
              <div className="p-6">
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Page non trouvée</h2>
                  <p className="text-gray-600 mb-4">La page demandée n'existe pas.</p>
                  <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                    Retour au dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </Suspense>
      </div>
      
    </div>
  );
}
