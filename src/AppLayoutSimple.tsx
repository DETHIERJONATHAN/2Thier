import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import './styles/global-premium.css';

// Composant de chargement simple
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-gray-600">Chargement en cours...</p>
    </div>
  </div>
);

export default function AppLayoutClean() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      
      {/* SIDEBAR PREMIUM FIXE À GAUCHE */}
      <div className="sidebar-premium" style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: '280px',
        zIndex: 1000,
        background: 'linear-gradient(180deg, #1e40af 0%, #1d4ed8 50%, #1e3a8a 100%)',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.15)',
        overflowY: 'auto'
      }}>
        <div className="p-6 text-white">
          <h2 className="text-xl font-bold mb-4">2THIER CRM</h2>
          <nav>
            <a href="/dashboard" className="block py-2 px-4 text-white hover:bg-blue-600 rounded">Dashboard</a>
            <a href="/clients" className="block py-2 px-4 text-white hover:bg-blue-600 rounded">Clients</a>
            <a href="/leads" className="block py-2 px-4 text-white hover:bg-blue-600 rounded">Leads</a>
            <a href="/premium-test" className="block py-2 px-4 text-white hover:bg-blue-600 rounded">⭐ Test Premium</a>
          </nav>
        </div>
      </div>

      {/* HEADER PREMIUM FIXE EN HAUT AVEC DÉCALAGE SIDEBAR */}
      <div className="header-premium" style={{
        position: 'fixed',
        top: 0,
        left: '280px',
        right: 0,
        height: isImpersonating ? '120px' : '80px',
        zIndex: 999,
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease'
      }}>
        
        {/* Banner d'usurpation premium */}
        {isImpersonating && (
          <div className="usurpation-banner-premium" style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#fbbf24',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <span style={{ fontWeight: '700' }}>
                🎭 MODE USURPATION ACTIVE - Vous agissez en tant qu'autre utilisateur
              </span>
            </div>
            <button
              onClick={clearImpersonation}
              className="transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
              }}
            >
              Arrêter l'usurpation
            </button>
          </div>
        )}
        
        {/* Controles du header */}
        <div className="header-premium-controls" style={{ 
          padding: isImpersonating ? '12px 24px' : '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          height: isImpersonating ? '60px' : '80px'
        }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e40af' }}>
            2THIER CRM Premium ✨
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {user?.prenom} {user?.nom} | {currentOrganization?.nom}
          </div>
        </div>
      </div>

      {/* CONTENU PRINCIPAL AVEC DÉCALAGES */}
      <div className="content-premium" style={{
        marginLeft: '280px',
        marginTop: isImpersonating ? '120px' : '80px',
        minHeight: 'calc(100vh - 80px)',
        padding: '32px',
        background: '#f9fafb'  /* Fond épuré gris très clair */
      }}>
        {/* Carte principale épurée comme CallModule */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              ✨ 2THIER CRM Premium
            </h1>
            <p className="text-lg text-gray-600">
              Interface épurée et professionnelle
            </p>
          </div>
          
          {/* Navigation rapide avec style épuré */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Dashboard */}
            <div className="bg-white border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mb-4 mx-auto">
                <span className="text-2xl text-blue-600">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Dashboard</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Tableau de bord principal</p>
              <a href="/dashboard" className="block text-center text-blue-600 hover:text-blue-800 font-medium">
                Accéder →
              </a>
            </div>
            
            {/* Clients */}
            <div className="bg-white border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg mb-4 mx-auto">
                <span className="text-2xl text-green-600">👥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Clients</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Gestion des clients</p>
              <a href="/clients" className="block text-center text-green-600 hover:text-green-800 font-medium">
                Accéder →
              </a>
            </div>
            
            {/* Test Premium */}
            <div className="bg-white border border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-50 rounded-lg mb-4 mx-auto">
                <span className="text-2xl text-orange-600">�</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Test Premium</h3>
              <p className="text-sm text-gray-600 text-center mb-4">Interface épurée</p>
              <a href="/premium-test" className="block text-center text-orange-600 hover:text-orange-800 font-medium">
                Voir Demo →
              </a>
            </div>
          </div>
          
          {/* Section fonctionnalités avec bordures colorées fines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Fonctionnalités principales */}
            <div className="bg-white border-l-4 border-blue-500 p-6 rounded-r-lg shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-blue-500 mr-3">⚡</span>
                Fonctionnalités Premium
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Interface épurée et professionnelle
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Banner d'usurpation dans le header
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Navigation intuitive
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Design responsive
                </li>
              </ul>
            </div>
            
            {/* Statut système */}
            <div className="bg-white border-l-4 border-green-500 p-6 rounded-r-lg shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-green-500 mr-3">💚</span>
                Statut du Système
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Style Premium</span>
                  <span className="text-green-600 font-medium">✓ Actif</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Interface Utilisateur</span>
                  <span className="text-green-600 font-medium">✓ Optimisée</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Usurpation Banner</span>
                  <span className="text-green-600 font-medium">✓ Fonctionnel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Performances</span>
                  <span className="text-green-600 font-medium">✓ Excellentes</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Message de confirmation discret */}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-500 text-xl mr-3">✅</span>
              <div>
                <p className="text-green-800 font-medium">Interface Premium activée avec succès</p>
                <p className="text-green-700 text-sm">Design épuré, professionnel et optimisé pour le travail quotidien.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
