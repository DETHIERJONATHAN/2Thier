import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import useCRMStore from '../store';

/**
 * Ce composant "invisible" a pour seul rôle de s'assurer que les données
 * du store (comme les blocs de formulaires) sont initialisées ou mises à jour 
 * uniquement lorsque le contexte d'authentification est prêt.
 * Il centralise la logique de récupération des données initiales pour éviter
 * les problèmes de synchronisation (race conditions).
 */
const StoreInitializer = () => {
  const { user, loading: authLoading } = useAuth();
  const fetchBlocks = useCRMStore(state => state.fetchBlocks);

  useEffect(() => {
    // On ne déclenche la récupération que si l'authentification est terminée
    // ET qu'un utilisateur est bien connecté.
    if (!authLoading && user) {
      fetchBlocks();
    }
  }, [user, authLoading, fetchBlocks]); // Se redéclenche si l'utilisateur ou le statut de chargement change

  return null; // Ce composant ne rend rien à l'écran
};

export default StoreInitializer;
