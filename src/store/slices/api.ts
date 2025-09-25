// api.ts - Utilitaires pour les appels API

import { toast } from 'react-toastify';
import { isSuperAdmin } from '../../utils/roles';

// Fonction pour récupérer le token d'authentification
export const getToken = () => localStorage.getItem('token');

// Fonction pour effectuer une requête fetch authentifiée
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const organizationId = getOrganizationId();
  
  const baseHeaders: Record<string, string> = {};
  // Copier uniquement les headers string existants
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => { baseHeaders[key] = value; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => { baseHeaders[key] = value; });
    } else {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') baseHeaders[key] = value;
      });
    }
  }
  // Supprimer Authorization Bearer et utiliser les cookies à la place
  delete baseHeaders['authorization'];

  // Ajouter l'en-tête d'organisation si disponible
  if (organizationId) {
    baseHeaders['x-organization-id'] = organizationId;
  }

  return fetch(url, {
    ...options,
    headers: baseHeaders,
    credentials: 'include', // Important: pour envoyer les cookies d'authentification
  });
}

// Fonction utilitaire pour vérifier si l'utilisateur est un superadmin
export const checkSuperAdmin = () => isSuperAdmin(localStorage.getItem('role'));

// Fonction utilitaire pour obtenir l'ID de l'organisation
export const getOrganizationId = () => localStorage.getItem('organizationId');

// Fonction utilitaire pour gérer les erreurs de manière standardisée
export const handleApiError = (err: unknown, message = "Une erreur est survenue") => {
  const errorMsg = err instanceof Error ? err.message : message;
  toast.error(errorMsg);
  console.error(`[API Error] ${message}:`, err);
  throw err;
};

