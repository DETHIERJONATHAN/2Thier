// Ce fichier contient des utilitaires liés à l'authentification

/**
 * Vérifie si un token JWT est présent dans le localStorage
 * @returns {boolean} Vrai si un token existe
 */
export const hasAuthToken = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Vérifie si un token JWT est présent et s'il n'a pas expiré
 * @returns {boolean} Vrai si le token est valide
 */
export const hasValidAuthToken = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Vérifier l'expiration du token sans le décoder complètement
    // Un token JWT a trois parties: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return false;
    
    const decodedPayload = JSON.parse(atob(payload));
    const expirationTime = decodedPayload.exp * 1000; // convertir en millisecondes
    
    return Date.now() < expirationTime;
  } catch (e) {
    console.error('Erreur lors de la vérification du token:', e);
    return false;
  }
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} Vrai si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  return hasValidAuthToken();
};

/**
 * Vérifie si l'utilisateur actuel est un super admin
 * @returns {boolean} Vrai si l'utilisateur est un super admin
 */
export const isSuperAdmin = (): boolean => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    const payload = token.split('.')[1];
    if (!payload) return false;
    
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.role === 'super_admin';
  } catch (e) {
    return false;
  }
};

/**
 * Récupère l'identifiant de l'utilisateur à partir du token
 * @returns {string|null} L'identifiant de l'utilisateur ou null
 */
export const getUserId = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    const payload = token.split('.')[1];
    if (!payload) return null;
    
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.userId || null;
  } catch (e) {
    return null;
  }
};
