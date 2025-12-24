/**
 * Configuration d'environnement injectée à runtime
 * Cela permet de configurer l'API sans rebuild
 */
(function() {
  // En production Cloud Run: vide = URLs relatives (app.2thier.be/api)
  // En développement: localhost:4000
  const isDev = !window.location.hostname.includes('2thier.be') && 
                !window.location.hostname.includes('devis1min.be') &&
                !window.location.hostname.includes('railway.app') &&
                window.location.hostname !== '127.0.0.1';

  // Configuration des URLs
  const apiBaseUrl = isDev 
    ? 'http://localhost:4000'
    : ''; // URLs relatives en prod (même domaine)

  // Injecter dans window pour les scripts qui en auraient besoin
  window.__API_BASE_URL = apiBaseUrl;
  window.__BACKEND_URL = apiBaseUrl;

  console.log('[ENV-CONFIG] API Base URL:', apiBaseUrl);
  console.log('[ENV-CONFIG] Host:', window.location.hostname);
  console.log('[ENV-CONFIG] Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');
})();
