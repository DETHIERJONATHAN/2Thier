// Fonctions d'API pour l'authentification et le chargement du user
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

export async function fetchMe(api: any) {
  return api.get('/api/me');
}

export async function login(api: any, email: string, password: string) {
  const response = await api.post('/login', { email, password });
  if (!response.success) {
    throw new Error(response.message || 'Erreur de connexion');
  }
  // Le token est géré par useAuthenticatedApi (cookie ou localStorage)
  return response;
}

// Ajoute ici logout, refreshToken si besoin
