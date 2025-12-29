import React, { useEffect } from 'react';
import { Spin, Result } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { emergencyGoogleAuthReset, isInGoogleAuthLoop } from '../utils/googleAuthReset';

const GoogleAuthCallback: React.FC = () => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  useEffect(() => {
    const processCallback = async () => {
      // Vérification de sécurité : détection de boucle
      if (isInGoogleAuthLoop()) {
        console.warn('[GoogleAuthCallback] 🚨 BOUCLE DÉTECTÉE - Application du reset d\'urgence');
        emergencyGoogleAuthReset();
        return;
      }

      // Récupérer les paramètres de l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const googleSuccess = urlParams.get('google_success');
      const googleError = urlParams.get('google_error');
      const organizationId = urlParams.get('organizationId');
      const userEmail = urlParams.get('user') || urlParams.get('admin_email');

      console.log('[GoogleAuthCallback] Paramètres reçus:', {
        hasCode: !!code,
        hasState: !!state,
        googleSuccess,
        googleError,
        organizationId,
        userEmail
      });

      // CAS 1: Callback initial de Google (avec code et state)
      if (code && state && !googleSuccess && !googleError) {
        console.log('[GoogleAuthCallback] 🔄 Traitement du code OAuth...');
        setIsProcessing(true);
        
        try {
          // Envoyer le code au backend pour l'échanger contre des tokens
          const response = await fetch('/api/google-auth/callback?' + urlParams.toString(), {
            method: 'GET',
            credentials: 'include'
          });

          // Le backend va rediriger, suivre la redirection
          if (response.redirected) {
            window.location.href = response.url;
            return;
          }

          // Si pas de redirection, vérifier la réponse
          if (response.ok) {
            const data = await response.json();
            console.log('[GoogleAuthCallback] ✅ Tokens échangés avec succès');
            
            // Marquer comme complété
            sessionStorage.setItem('google_auth_just_completed', JSON.stringify({
              ts: Date.now(),
              organizationId: data.organizationId || null,
              email: data.email || null,
            }));

            // Rediriger vers la page principale
            window.location.replace('/');
          } else {
            throw new Error(`Erreur serveur: ${response.status}`);
          }
        } catch (error) {
          console.error('[GoogleAuthCallback] ❌ Erreur lors de l\'échange du code:', error);
          sessionStorage.setItem('google_auth_error', JSON.stringify({
            ts: Date.now(),
            error: 'callback_error',
          }));
          setTimeout(() => window.location.replace('/'), 3000);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // CAS 2: Retour du backend avec résultat (google_success ou google_error)
      // CAS 2: Retour du backend avec résultat (google_success ou google_error)
      // Si succès: marquer l'auth Google comme « tout juste complétée » pour éviter un auto-connect immédiat
      if (googleSuccess === '1') {
      try {
        const now = Date.now();
        const payload = {
          ts: now,
          organizationId: organizationId || null,
          email: userEmail || null,
        };
        sessionStorage.setItem('google_auth_just_completed', JSON.stringify(payload));
      } catch {
        // ignore
      }
    }

    // Si erreur: marquer l'erreur Google pour éviter les tentatives automatiques répétées
    if (googleError) {
      try {
        const now = Date.now();
        const payload = {
          ts: now,
          error: googleError,
          organizationId: organizationId || null,
        };
        sessionStorage.setItem('google_auth_error', JSON.stringify(payload));
      } catch {
        // ignore
      }
    }

    // Communiquer avec la fenêtre parent (popup -> main window)
    if (window.opener && !window.opener.closed) {
      if (googleSuccess === '1') {
        console.log('[GoogleAuthCallback] ✅ Succès - envoi message au parent');
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          organizationId,
          userEmail
        }, window.location.origin);
      } else if (googleError) {
        console.log('[GoogleAuthCallback] ❌ Erreur - envoi message au parent:', googleError);
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: googleError
        }, window.location.origin);
      }
      
      // Fermer la popup après un court délai
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      // Mode redirection complète (pas de popup) - cas de Codespaces
      console.log('[GoogleAuthCallback] Mode redirection complète (pas de popup)');
      
      // Nettoyer le flag OAuth pending
      localStorage.removeItem('google_oauth_pending');
      
      // Si c'est une erreur, attendre plus longtemps pour laisser le temps à l'utilisateur de voir
      const delay = googleError ? 4000 : 1500;
      
      setTimeout(() => {
        // Vérifier si on a un organizationId pour rediriger vers la bonne page
        const savedOrgId = localStorage.getItem('google_oauth_org_id');
        localStorage.removeItem('google_oauth_org_id');
        
        if (googleSuccess === '1' && (organizationId || savedOrgId)) {
          // Rediriger vers la page des organisations avec l'ID
          const targetOrgId = organizationId || savedOrgId;
          console.log('[GoogleAuthCallback] ✅ Redirection vers la page organisations avec orgId:', targetOrgId);
          window.location.replace(`/super-admin/organizations?selected=${targetOrgId}&tab=workspace`);
        } else if (googleError) {
          // En cas d'erreur, rediriger vers la page principale avec un message
          console.log('[GoogleAuthCallback] ❌ Redirection avec erreur vers la page principale');
          window.location.replace('/');
        } else {
          // Redirection par défaut vers la page principale
          console.log('[GoogleAuthCallback] Redirection vers la page principale...');
          window.location.replace('/');
        }
      }, delay);
    }
    
    // Nettoyer l'URL pour retirer les query params après traitement
    try {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    } catch {
      // ignore
    }
    };

    processCallback();
  }, []);

  // Déterminer l'état d'affichage
  const urlParams = new URLSearchParams(window.location.search);
  const googleSuccess = urlParams.get('google_success');
  const googleError = urlParams.get('google_error');
  const userEmail = urlParams.get('user');

  // Affichage pendant le traitement du code OAuth
  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Échange des tokens OAuth en cours...</p>
        </div>
      </div>
    );
  }

  if (googleSuccess === '1') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Authentification Google réussie !"
          subTitle={userEmail ? `Connecté en tant que ${decodeURIComponent(userEmail)}` : 'Connexion établie avec succès'}
          extra={
            <div className="text-center">
              <Spin size="small" />
              <p className="mt-2 text-gray-600">Fermeture automatique de cette fenêtre...</p>
            </div>
          }
        />
      </div>
    );
  }

  if (googleError) {
    const errorMessages: Record<string, string> = {
      'token_exchange_failed': 'Erreur lors de l\'échange des tokens OAuth',
      'invalid_client_config': 'Configuration OAuth invalide (Client ID/Secret incorrect)',
      'invalid_authorization_code': 'Code d\'autorisation invalide ou expiré',
      'unauthorized_client': 'Client non autorisé',
      'config_not_found': 'Configuration Google Workspace introuvable',
      'user_not_found': 'Utilisateur non trouvé dans l\'organisation',
      'missing_params': 'Paramètres OAuth manquants',
      'callback_error': 'Erreur générale lors du callback',
      'access_denied': 'Accès refusé par l\'utilisateur'
    };

    const userFriendlyError = errorMessages[googleError] || 'Erreur inconnue';
    const details = urlParams.get('details');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Result
          icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="Erreur d'authentification Google"
          subTitle={
            <div>
              <p>{userFriendlyError}</p>
              {details && (
                <p className="text-sm text-gray-600 mt-2">
                  Détails: {decodeURIComponent(details)}
                </p>
              )}
            </div>
          }
          extra={
            <div className="text-center">
              <p className="text-gray-600">Cette fenêtre va se fermer automatiquement...</p>
              <p className="text-sm text-gray-500 mt-2">
                Code d'erreur: <code>{googleError}</code>
              </p>
              {googleError === 'invalid_client_config' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Conseil:</strong> Vérifiez votre configuration OAuth dans Google Cloud Console
                  </p>
                </div>
              )}
              {googleError === 'invalid_authorization_code' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Conseil:</strong> Réessayez la connexion, le code a peut-être expiré
                  </p>
                </div>
              )}
            </div>
          }
        />
      </div>
    );
  }

  // État de chargement par défaut
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">Traitement de l'authentification Google...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
