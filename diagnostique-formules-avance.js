// Script de diagnostic avancé pour les problèmes de boucles dans les formules
// À exécuter dans la console du navigateur quand le problème se produit

console.log('🔍 [DIAGNOSTIC FORMULES] Démarrage du diagnostic avancé...');

// Surveillance des re-rendus excessifs
let renderCount = 0;
let lastRenderTime = Date.now();
const renderThreshold = 50; // Plus de 50 rendus en 5 secondes = problème

// Intercepter les logs de FormulaPanel
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && args[0].includes('FormulaPanel')) {
    renderCount++;
    const now = Date.now();
    if (now - lastRenderTime > 5000) {
      if (renderCount > renderThreshold) {
        console.error('🚨 BOUCLE DÉTECTÉE:', renderCount, 'rendus en 5 secondes');
        console.trace('Stack trace de la boucle');
      }
      renderCount = 0;
      lastRenderTime = now;
    }
  }
  originalLog.apply(console, args);
};

// Surveiller les useEffect qui se déclenchent trop souvent
const effectCalls = new Map();
const originalUseEffect = React.useEffect;
if (typeof React !== 'undefined') {
  React.useEffect = function(effect, deps) {
    const stack = new Error().stack;
    const key = stack.split('\n')[2]; // Ligne d'appel
    
    if (!effectCalls.has(key)) {
      effectCalls.set(key, 0);
    }
    
    const count = effectCalls.get(key) + 1;
    effectCalls.set(key, count);
    
    if (count > 20) {
      console.warn('⚠️ useEffect appelé trop souvent:', count, 'fois');
      console.log('Location:', key);
      console.log('Dependencies:', deps);
    }
    
    return originalUseEffect(effect, deps);
  };
}

// Surveiller les appels API excessifs
const apiCalls = new Map();
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (url.includes('formula')) {
    if (!apiCalls.has(url)) {
      apiCalls.set(url, 0);
    }
    
    const count = apiCalls.get(url) + 1;
    apiCalls.set(url, count);
    
    if (count > 10) {
      console.error('🚨 APPELS API EXCESSIFS:', url, count, 'fois');
    }
  }
  
  return originalFetch.apply(this, args);
};

// Surveiller les changements d'état suspects
function watchStateChanges() {
  const formulaPanels = document.querySelectorAll('[class*="formula"], [class*="Formula"]');
  console.log('📊 Panels de formule trouvés:', formulaPanels.length);
  
  formulaPanels.forEach((panel, index) => {
    console.log(`Panel ${index}:`, {
      className: panel.className,
      children: panel.children.length,
      textContent: panel.textContent.substring(0, 100)
    });
  });
}

// Détecter les dépendances instables
function detectUnstableDependencies() {
  console.log('🔍 Recherche de dépendances instables...');
  
  // Vérifier les objets créés à chaque rendu
  const checkForNewObjects = setInterval(() => {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent.includes('useCallback') || script.textContent.includes('useMemo')) {
        console.log('⚠️ Hook de mémorisation détecté, vérifier les dépendances');
      }
    });
  }, 1000);
  
  setTimeout(() => clearInterval(checkForNewObjects), 10000);
}

// Rapport de diagnostic
function generateReport() {
  console.log('📋 RAPPORT DE DIAGNOSTIC:');
  console.log('- Rendus comptés:', renderCount);
  console.log('- Effects surveillés:', effectCalls.size);
  console.log('- Appels API:', apiCalls.size);
  
  console.log('\n🔧 ACTIONS RECOMMANDÉES:');
  if (renderCount > renderThreshold) {
    console.log('- Vérifier les dépendances des hooks');
    console.log('- Utiliser useMemo/useCallback pour stabiliser les objets');
    console.log('- Éviter la création d\'objets dans le JSX');
  }
  
  if (apiCalls.size > 5) {
    console.log('- Implémenter un debounce plus agressif');
    console.log('- Vérifier la logique de cache');
    console.log('- Éviter les appels en cascade');
  }
}

// Lancer le diagnostic
watchStateChanges();
detectUnstableDependencies();

// Rapport automatique après 30 secondes
setTimeout(generateReport, 30000);

console.log('✅ Diagnostic lancé. Naviguez vers les formules et observez les logs...');
