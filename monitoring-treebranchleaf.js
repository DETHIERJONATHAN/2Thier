/**
 * 🎯 Script de monitoring TreeBranchLeaf
 * 
 * Monitore en temps réel les performances, les appels API
 * et l'état des composants TreeBranchLeaf
 */

// Injection dans la console du navigateur
(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    ENABLE_LOGS: true,
    MONITOR_API: true,
    MONITOR_RENDERS: true,
    MONITOR_FORMULAS: true,
    CHECK_INTERVAL: 5000, // 5 secondes
    MAX_LOGS: 100
  };

  // Storage des données de monitoring
  const monitoring = {
    apiCalls: [],
    renderCounts: new Map(),
    formulaChanges: [],
    errors: [],
    warnings: [],
    startTime: Date.now()
  };

  // Helper de log
  function log(emoji, message, data = null, level = 'info') {
    if (!CONFIG.ENABLE_LOGS) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] ${emoji} TBL-Monitor:`;
    
    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
    }
  }

  // Intercepter fetch pour surveiller les API calls
  if (CONFIG.MONITOR_API && window.fetch) {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const url = args[0];
      const isTreeBranchLeafAPI = typeof url === 'string' && (
        url.includes('/treebranchleaf') || 
        url.includes('/formula') || 
        url.includes('/nodes/')
      );
      
      if (isTreeBranchLeafAPI) {
        const start = performance.now();
        const call = {
          url,
          method: args[1]?.method || 'GET',
          timestamp: Date.now(),
          startTime: start
        };
        
        return originalFetch.apply(this, args)
          .then(response => {
            call.duration = performance.now() - start;
            call.status = response.status;
            call.success = response.ok;
            
            monitoring.apiCalls.push(call);
            
            // Garder seulement les 100 derniers appels
            if (monitoring.apiCalls.length > CONFIG.MAX_LOGS) {
              monitoring.apiCalls = monitoring.apiCalls.slice(-CONFIG.MAX_LOGS);
            }
            
            const emoji = response.ok ? '✅' : '❌';
            log(emoji, `${call.method} ${url.split('/').pop()} (${Math.round(call.duration)}ms)`);
            
            return response;
          })
          .catch(error => {
            call.duration = performance.now() - start;
            call.error = error.message;
            
            monitoring.apiCalls.push(call);
            monitoring.errors.push({
              type: 'API_ERROR',
              message: error.message,
              url,
              timestamp: Date.now()
            });
            
            log('❌', `Erreur API ${url}`, error, 'error');
            throw error;
          });
      }
      
      return originalFetch.apply(this, args);
    };
  }

  // Surveiller les composants React (détection par noms de classe)
  function checkComponents() {
    const components = {
      formulaPanel: document.querySelectorAll('[class*="FormulaPanel"], [class*="formula-panel"]').length,
      parameters: document.querySelectorAll('[class*="Parameters"], [class*="parameters"]').length,
      treeViewer: document.querySelectorAll('[class*="TreeViewer"], [class*="tree-viewer"]').length,
      fieldRenderer: document.querySelectorAll('[class*="FieldRenderer"], [class*="field-renderer"]').length
    };
    
    let hasChanges = false;
    for (const [name, count] of Object.entries(components)) {
      const previous = monitoring.renderCounts.get(name) || 0;
      if (count !== previous) {
        hasChanges = true;
        monitoring.renderCounts.set(name, count);
        
        if (count > previous) {
          log('🔄', `Composant ${name} rendu (${count} instances)`);
        }
      }
    }
    
    return hasChanges;
  }

  // Surveiller les erreurs JavaScript
  if (CONFIG.MONITOR_RENDERS) {
    window.addEventListener('error', (event) => {
      const error = {
        type: 'JS_ERROR',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now()
      };
      
      monitoring.errors.push(error);
      
      if (event.message.toLowerCase().includes('treebranchleaf') || 
          event.message.toLowerCase().includes('formula')) {
        log('🚨', 'Erreur TreeBranchLeaf détectée', error, 'error');
      }
    });
  }

  // Analyse périodique
  function performAnalysis() {
    const now = Date.now();
    const last30s = now - 30000;
    
    // Compter les appels API récents
    const recentAPICalls = monitoring.apiCalls.filter(call => call.timestamp > last30s);
    const slowAPICalls = recentAPICalls.filter(call => call.duration > 1000);
    const failedAPICalls = recentAPICalls.filter(call => !call.success);
    
    // Compter les erreurs récentes
    const recentErrors = monitoring.errors.filter(error => error.timestamp > last30s);
    
    // Rapport si des problèmes détectés
    if (recentAPICalls.length > 10) {
      log('⚠️', `Beaucoup d'appels API: ${recentAPICalls.length}/30s`, null, 'warn');
    }
    
    if (slowAPICalls.length > 0) {
      log('🐌', `Appels API lents: ${slowAPICalls.length}`, slowAPICalls.map(c => `${c.url} (${Math.round(c.duration)}ms)`), 'warn');
    }
    
    if (failedAPICalls.length > 0) {
      log('💥', `Appels API échoués: ${failedAPICalls.length}`, failedAPICalls, 'error');
    }
    
    if (recentErrors.length > 0) {
      log('🚨', `Erreurs récentes: ${recentErrors.length}`, recentErrors, 'error');
    }
    
    // Vérifier les composants
    checkComponents();
  }

  // Démarrer le monitoring
  log('🚀', 'Monitoring TreeBranchLeaf démarré');
  
  // Analyse périodique
  const intervalId = setInterval(performAnalysis, CONFIG.CHECK_INTERVAL);
  
  // API publique
  window.TBLMonitor = {
    // Afficher les statistiques
    stats() {
      const now = Date.now();
      const uptime = Math.round((now - monitoring.startTime) / 1000);
      
      return {
        uptime: `${uptime}s`,
        apiCalls: monitoring.apiCalls.length,
        errors: monitoring.errors.length,
        warnings: monitoring.warnings.length,
        components: Object.fromEntries(monitoring.renderCounts),
        recentAPICalls: monitoring.apiCalls.filter(call => now - call.timestamp < 60000).length
      };
    },
    
    // Afficher les appels API récents
    apiCalls(limit = 10) {
      return monitoring.apiCalls.slice(-limit).map(call => ({
        url: call.url.split('/').slice(-2).join('/'),
        method: call.method,
        duration: Math.round(call.duration || 0) + 'ms',
        status: call.status,
        timestamp: new Date(call.timestamp).toLocaleTimeString()
      }));
    },
    
    // Afficher les erreurs récentes
    errors(limit = 5) {
      return monitoring.errors.slice(-limit);
    },
    
    // Réinitialiser les données
    reset() {
      monitoring.apiCalls = [];
      monitoring.errors = [];
      monitoring.warnings = [];
      monitoring.renderCounts.clear();
      monitoring.startTime = Date.now();
      log('🔄', 'Monitoring réinitialisé');
    },
    
    // Arrêter le monitoring
    stop() {
      clearInterval(intervalId);
      log('🛑', 'Monitoring arrêté');
    },
    
    // Tester les formules
    testFormulas() {
      const formulaPanels = document.querySelectorAll('[class*="FormulaPanel"], [class*="formula-panel"]');
      log('🧪', `Test des formules - ${formulaPanels.length} panels trouvés`);
      
      formulaPanels.forEach((panel, index) => {
        const inputs = panel.querySelectorAll('input, textarea');
        log('🔍', `Panel ${index + 1}: ${inputs.length} champs de saisie`);
      });
    }
  };
  
  // Instructions d'utilisation
  console.log(`
🎯 TreeBranchLeaf Monitor activé !

Commandes disponibles:
• TBLMonitor.stats()        - Statistiques générales
• TBLMonitor.apiCalls()     - Appels API récents
• TBLMonitor.errors()       - Erreurs récentes
• TBLMonitor.testFormulas() - Tester les formules
• TBLMonitor.reset()        - Réinitialiser
• TBLMonitor.stop()         - Arrêter

Le monitoring surveille automatiquement:
✅ Appels API TreeBranchLeaf
✅ Erreurs JavaScript
✅ Rendus des composants
✅ Performances générales
  `);
})();
