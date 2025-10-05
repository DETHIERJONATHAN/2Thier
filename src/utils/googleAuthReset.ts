/**
 * Utilitaires pour réinitialiser l'état d'authentification Google en cas de boucle
 */

export function resetGoogleAuthState(): void {
  try {
    // Nettoyer tous les marqueurs d'état Google
    sessionStorage.removeItem('google_auth_just_completed');
    sessionStorage.removeItem('google_auth_error');
    
    // Réinitialiser les verrous globaux
    if (typeof window !== 'undefined') {
      window.__googleAutoConnectInFlight = false;
      window.__googleAutoConnectCooldownUntil = Date.now() + 300_000; // 5 min de cooldown
      window.__googleAutoConnectAttemptCount = 0;
    }
    
    console.log('[GoogleAuthReset] État Google réinitialisé');
  } catch (error) {
    console.error('[GoogleAuthReset] Erreur lors de la réinitialisation:', error);
  }
}

export function isInGoogleAuthLoop(): boolean {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasGoogleError = urlParams.has('google_error');
    const hasRecentError = sessionStorage.getItem('google_auth_error');
    
    return hasGoogleError || !!hasRecentError;
  } catch {
    return false;
  }
}

export function getGoogleAuthErrorInfo(): { error: string; timestamp: number } | null {
  try {
    const errorRaw = sessionStorage.getItem('google_auth_error');
    if (errorRaw) {
      const errorInfo = JSON.parse(errorRaw);
      return {
        error: errorInfo.error || 'unknown',
        timestamp: errorInfo.ts || 0
      };
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const googleError = urlParams.get('google_error');
    if (googleError) {
      return {
        error: googleError,
        timestamp: Date.now()
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

// Fonction d'urgence pour débloquer une situation
export function emergencyGoogleAuthReset(): void {
  resetGoogleAuthState();
  
  // Nettoyer l'URL si elle contient des paramètres Google
  if (window.location.search.includes('google_')) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    // Supprimer tous les paramètres Google
    const googleParams = ['google_success', 'google_error', 'organizationId', 'user', 'admin_email'];
    googleParams.forEach(param => params.delete(param));
    
    // Reconstruire l'URL propre
    const cleanUrl = `${url.origin}${url.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
  
  console.log('[GoogleAuthReset] Reset d\'urgence effectué');
}