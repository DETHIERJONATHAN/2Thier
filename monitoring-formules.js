// Script de monitoring en temps réel pour vérifier la résolution des boucles
// À exécuter dans la console du navigateur

console.log('🔍 [MONITORING] Démarrage du monitoring des formules...');

// Compteurs globaux
let apiCallCount = 0;
let renderCount = 0;
let errorCount = 0;
let lastApiCall = null;
let startTime = Date.now();

// Intercepter les appels API
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  
  if (typeof url === 'string' && url.includes('formula')) {
    apiCallCount++;
    lastApiCall = { url, time: Date.now() };
    
    console.log(`📡 [API-${apiCallCount}] ${url}`);
    
    // Alerte si trop d'appels
    if (apiCallCount > 20) {
      console.error('🚨 TROP D\'APPELS API DÉTECTÉS!', apiCallCount);
    }
  }
  
  return originalFetch.apply(this, args);
};

// Intercepter les logs de composants
const originalLog = console.log;
console.log = function(...args) {
  const message = args[0];
  
  if (typeof message === 'string' && message.includes('FormulaPanel')) {
    renderCount++;
    
    if (message.includes('Sauvegarde demandée')) {
      console.log(`💾 [SAVE-${renderCount}] ${message}`);
    } else if (message.includes('Sauvegarde réussie')) {
      console.log(`✅ [SUCCESS-${renderCount}] ${message}`);
    }
    
    // Alerte si trop de renders
    if (renderCount > 50) {
      console.error('🚨 TROP DE RENDERS DÉTECTÉS!', renderCount);
    }
  }
  
  originalLog.apply(console, args);
};

// Intercepter les erreurs
const originalError = console.error;
console.error = function(...args) {
  errorCount++;
  console.log(`❌ [ERROR-${errorCount}] ${args[0]}`);
  originalError.apply(console, args);
};

// Surveillance continue
const monitor = () => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  
  console.log(`
📊 [MONITORING - ${elapsed}s]
  🔄 API Calls: ${apiCallCount}
  🖼️ Renders: ${renderCount}
  ❌ Errors: ${errorCount}
  📡 Last API: ${lastApiCall ? lastApiCall.url : 'aucun'}
  `);
  
  // Reset des compteurs toutes les 30 secondes pour éviter l'accumulation
  if (elapsed % 30 === 0 && elapsed > 0) {
    console.log('🔄 Reset des compteurs...');
    apiCallCount = 0;
    renderCount = 0;
    errorCount = 0;
    startTime = Date.now();
  }
};

// Monitoring toutes les 5 secondes
const monitoringInterval = setInterval(monitor, 5000);

// Surveillance spécifique des boucles de re-render
let lastRenderTime = Date.now();
let rapidRenderCount = 0;

const checkRapidRenders = () => {
  const now = Date.now();
  
  if (now - lastRenderTime < 100) { // Moins de 100ms entre renders
    rapidRenderCount++;
    
    if (rapidRenderCount > 10) {
      console.error('🚨 BOUCLE DE RENDER DÉTECTÉE! Plus de 10 renders en moins de 1 seconde');
      console.trace('Stack trace de la boucle');
      rapidRenderCount = 0; // Reset pour éviter le spam
    }
  } else {
    rapidRenderCount = 0; // Reset si assez de temps s'est écoulé
  }
  
  lastRenderTime = now;
};

// Hook dans React si disponible
if (typeof React !== 'undefined' && React.useEffect) {
  const originalUseEffect = React.useEffect;
  React.useEffect = function(effect, deps) {
    checkRapidRenders();
    return originalUseEffect(effect, deps);
  };
}

// Nettoyage automatique après 5 minutes
setTimeout(() => {
  clearInterval(monitoringInterval);
  console.log('🛑 Monitoring arrêté après 5 minutes');
  
  // Restaurer les fonctions originales
  window.fetch = originalFetch;
  console.log = originalLog;
  console.error = originalError;
  
  if (typeof React !== 'undefined' && originalUseEffect) {
    React.useEffect = originalUseEffect;
  }
}, 5 * 60 * 1000);

// Test de fonctionnement
console.log('✅ Monitoring actif! Naviguez vers les formules et observez...');

// Export pour pouvoir arrêter manuellement
window.stopFormulaMonitoring = () => {
  clearInterval(monitoringInterval);
  window.fetch = originalFetch;
  console.log = originalLog;
  console.error = originalError;
  console.log('🛑 Monitoring arrêté manuellement');
};
