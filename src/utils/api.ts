/**
 * Récupère les en-têtes d'authentification nécessaires pour les appels API.
 * Gère le token standard et le token d'usurpation.
 */
export const getAPIHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  const impersonationToken = localStorage.getItem('impersonationToken');

  if (impersonationToken) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-impersonation-token'] = impersonationToken;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};
