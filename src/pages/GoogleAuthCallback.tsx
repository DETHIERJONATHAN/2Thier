import React, { useEffect } from 'react';
import { Spin, Result } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const GoogleAuthCallback: React.FC = () => {
  useEffect(() => {
    // Récupérer les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const googleSuccess = urlParams.get('google_success');
    const googleError = urlParams.get('google_error');
    const organizationId = urlParams.get('organizationId');
    const userEmail = urlParams.get('user');

    console.log('[GoogleAuthCallback] Paramètres reçus:', {
      googleSuccess,
      googleError,
      organizationId,
      userEmail
    });

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
      // Si pas de fenêtre parent, rediriger vers la page principale
      console.log('[GoogleAuthCallback] Pas de fenêtre parent, redirection...');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, []);

  // Déterminer l'état d'affichage
  const urlParams = new URLSearchParams(window.location.search);
  const googleSuccess = urlParams.get('google_success');
  const googleError = urlParams.get('google_error');
  const userEmail = urlParams.get('user');

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
