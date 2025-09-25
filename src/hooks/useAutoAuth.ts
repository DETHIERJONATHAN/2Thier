import { useEffect } from 'react';
import { useAuthContext } from '../auth/AuthProvider';

/**
 * Hook pour assurer l'authentification automatique en mode développement
 * Maintenant compatible avec le système d'authentification par cookies httpOnly
 */
export const useAutoAuth = () => {
  const { user, login } = useAuthContext();
  
  useEffect(() => {
    // Si l'utilisateur n'est pas connecté, essayer de se connecter automatiquement
    if (!user) {
      const autoLogin = async () => {
        try {
          console.log('[useAutoAuth] Tentative de connexion automatique...');
          // Utiliser des identifiants par défaut pour le développement
          await login('admin@example.com', 'admin123');
          console.log('[useAutoAuth] Connexion automatique réussie');
        } catch (error) {
          console.error('Échec de la connexion automatique:', error);
          // Ne pas afficher d'erreur car l'utilisateur peut simplement ne pas être connecté
        }
      };
      
      // Petite temporisation pour éviter les conflits avec d'autres hooks
      const timer = setTimeout(autoLogin, 500);
      return () => clearTimeout(timer);
    }
  }, [user, login]);
};

export default useAutoAuth;
