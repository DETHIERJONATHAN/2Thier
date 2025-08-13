import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Connexion from './components/Connexion';
import RegisterPage from './components/RegisterPage';
import InscriptionMultiEtapes from './components/InscriptionMultiEtapes';
import AppLayout from './AppLayout';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import './App.css'; // Import des styles CSS
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import { useAuth } from './auth/useAuth';

// Composant pour les routes publiques (login, register)
// Redirige vers le tableau de bord si l'utilisateur est déjà connecté.
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen w-screen items-center justify-center">Chargement...</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// Composant pour les routes protégées
// Redirige vers la page de connexion si l'utilisateur n'est pas authentifié.
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  
  // Pour les autres routes, on a besoin d'AuthProvider
  return <AuthBasedRoute>{children}</AuthBasedRoute>;
};

const AuthBasedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen w-screen items-center justify-center">Chargement de la session...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

// Le composant App principal, maintenant sans état local de connexion.
function App() {
  // 🧹 Détecter si on vient du nettoyage des cookies
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cleared') === '1') {
      console.log('🧹 Cookies nettoyés par le serveur - localStorage et sessionStorage aussi nettoyés');
      
      // Nettoyer aussi localStorage et sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Supprimer le paramètre de l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Afficher un message de succès
      alert('✅ Cache complètement nettoyé ! Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.');
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Connexion /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/register-steps" element={<PublicRoute><InscriptionMultiEtapes /></PublicRoute>} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      
      {/* Route pour le callback Google OAuth - publique mais spécialisée */}
      <Route path="/google-auth-callback" element={<GoogleAuthCallback />} />

      {/* Toutes les routes protégées sont encapsulées par AppLayout */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />

      {/* Redirection par défaut vers le dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;