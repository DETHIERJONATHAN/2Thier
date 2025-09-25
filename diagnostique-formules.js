/**
 * 🔍 Script de diagnostic pour les formules TreeBranchLeaf
 * 
 * Ce script surveille les performances, les appels API et l'état
 * des formules en temps réel pour détecter les problèmes.
 */

// Configuration du monitoring
const MONITORING_CONFIG = {
  // Seuils d'alerte
  MAX_API_CALLS_PER_SECOND: 5,
  MAX_RENDER_TIME_MS: 100,
  MAX_DEBOUNCE_QUEUE: 10,
  
  // Timeouts
  API_TIMEOUT_MS: 5000,
  DEBOUNCE_WARNING_MS: 2000,
  
  // Logs
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_PERFORMANCE_LOGS: true,
  ENABLE_API_LOGS: true
};

class FormulaDiagnostic {
  constructor() {
    this.apiCalls = [];
    this.renderTimes = [];
    this.debounceQueue = new Map();
    this.errors = [];
    this.warnings = [];
    
    this.init();
  }

  init() {
    this.log('🚀 FormulaDiagnostic: Initialisation du monitoring');
    
    // Intercepter les appels fetch
    this.interceptFetch();
    
    // Surveiller les performances
    this.monitorPerformance();
    
    // Surveiller les erreurs
    this.monitorErrors();
    
    // Rapport périodique
    this.startPeriodicReport();
  }

  log(message, data = null) {
    if (!MONITORING_CONFIG.ENABLE_CONSOLE_LOGS) return;
    
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`[${timestamp}] ${message}`, data || '');
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = (...args) => {
      const url = args[0];
      const options = args[1] || {};
      
      // Enregistrer l'appel API
      const apiCall = {
        url,
        method: options.method || 'GET',
        timestamp: Date.now(),
        component: this.detectComponent()
      };
      
      this.apiCalls.push(apiCall);
      
      if (MONITORING_CONFIG.ENABLE_API_LOGS) {
        this.log(`📡 API Call: ${apiCall.method} ${url}`, { component: apiCall.component });
      }
      
      // Vérifier le taux d'appels
      this.checkApiCallRate();
      
      return originalFetch.apply(this, args)
        .then(response => {
          apiCall.duration = Date.now() - apiCall.timestamp;
          apiCall.status = response.status;
          
          if (MONITORING_CONFIG.ENABLE_API_LOGS) {
            this.log(`✅ API Response: ${apiCall.status} (${apiCall.duration}ms)`);
          }
          
          return response;
        })
        .catch(error => {
          apiCall.duration = Date.now() - apiCall.timestamp;
          apiCall.error = error.message;
          
          this.errors.push({
            type: 'API_ERROR',
            message: `Erreur API: ${url}`,
            error,
            timestamp: Date.now()
          });
          
          this.log(`❌ API Error: ${url}`, error);
          
          throw error;
        });
    };
  }

  detectComponent() {
    // Détecter le composant à l'origine de l'appel via la stack trace
    const stack = new Error().stack || '';
    
    if (stack.includes('FormulaPanel')) return 'FormulaPanel';
    if (stack.includes('Parameters')) return 'Parameters';
    if (stack.includes('TreeBranchLeaf')) return 'TreeBranchLeaf';
    
    return 'Unknown';
  }

  checkApiCallRate() {
    const now = Date.now();
    const recentCalls = this.apiCalls.filter(call => 
      now - call.timestamp < 1000 // Dernière seconde
    );
    
    if (recentCalls.length > MONITORING_CONFIG.MAX_API_CALLS_PER_SECOND) {
      this.warnings.push({
        type: 'HIGH_API_RATE',
        message: `Taux d'appels API élevé: ${recentCalls.length}/seconde`,
        calls: recentCalls,
        timestamp: now
      });
      
      this.log(`⚠️ Taux d'appels API élevé: ${recentCalls.length}/seconde`, recentCalls);
    }
  }

  monitorPerformance() {
    // Surveiller les re-rendus
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.duration > MONITORING_CONFIG.MAX_RENDER_TIME_MS) {
          this.warnings.push({
            type: 'SLOW_RENDER',
            message: `Rendu lent détecté: ${entry.duration}ms`,
            entry,
            timestamp: Date.now()
          });
          
          if (MONITORING_CONFIG.ENABLE_PERFORMANCE_LOGS) {
            this.log(`🐌 Rendu lent: ${entry.name} (${entry.duration}ms)`);
          }
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
      this.log('⚠️ Performance Observer non supporté');
    }
  }

  monitorErrors() {
    window.addEventListener('error', (event) => {
      this.errors.push({
        type: 'JAVASCRIPT_ERROR',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: Date.now()
      });
      
      this.log(`❌ JavaScript Error: ${event.message}`, {
        filename: event.filename,
        line: event.lineno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        type: 'PROMISE_REJECTION',
        message: event.reason?.message || 'Promise rejetée',
        reason: event.reason,
        timestamp: Date.now()
      });
      
      this.log(`❌ Promise rejetée: ${event.reason?.message || 'Unknown'}`);
    });
  }

  startPeriodicReport() {
    setInterval(() => {
      this.generateReport();
    }, 10000); // Rapport toutes les 10 secondes
  }

  generateReport() {
    const now = Date.now();
    const last30s = now - 30000;
    
    // Statistiques des 30 dernières secondes
    const recentApiCalls = this.apiCalls.filter(call => call.timestamp > last30s);
    const recentErrors = this.errors.filter(error => error.timestamp > last30s);
    const recentWarnings = this.warnings.filter(warning => warning.timestamp > last30s);
    
    if (recentApiCalls.length === 0 && recentErrors.length === 0 && recentWarnings.length === 0) {
      return; // Pas de rapport si rien à signaler
    }
    
    console.group('📊 Rapport de diagnostic FormulaPanel (30s)');
    
    // Appels API par composant
    const apiByComponent = {};
    recentApiCalls.forEach(call => {
      apiByComponent[call.component] = (apiByComponent[call.component] || 0) + 1;
    });
    
    this.log(`📡 Appels API: ${recentApiCalls.length} total`, apiByComponent);
    
    // Erreurs
    if (recentErrors.length > 0) {
      this.log(`❌ Erreurs: ${recentErrors.length}`, recentErrors.map(e => e.message));
    }
    
    // Avertissements
    if (recentWarnings.length > 0) {
      this.log(`⚠️ Avertissements: ${recentWarnings.length}`, recentWarnings.map(w => w.message));
    }
    
    // Recommandations
    this.generateRecommendations(recentApiCalls, recentErrors, recentWarnings);
    
    console.groupEnd();
  }

  generateRecommendations(apiCalls, errors, warnings) {
    const recommendations = [];
    
    // Trop d'appels API
    if (apiCalls.length > 10) {
      recommendations.push('🔧 Considérez augmenter le debounce timeout');
    }
    
    // Appels API redondants
    const duplicateCalls = apiCalls.filter((call, index, arr) => 
      arr.findIndex(c => c.url === call.url && c.method === call.method) !== index
    );
    
    if (duplicateCalls.length > 3) {
      recommendations.push('🔧 Appels API redondants détectés, vérifiez la stabilisation des hooks');
    }
    
    // Erreurs fréquentes
    if (errors.length > 2) {
      recommendations.push('🔧 Erreurs fréquentes, vérifiez la gestion d\'erreur et la validation');
    }
    
    // Avertissements de performance
    const slowRenders = warnings.filter(w => w.type === 'SLOW_RENDER');
    if (slowRenders.length > 0) {
      recommendations.push('🔧 Rendus lents détectés, optimisez les dépendances React');
    }
    
    if (recommendations.length > 0) {
      this.log('💡 Recommandations:', recommendations);
    }
  }

  // API publique pour tests manuels
  getStats() {
    const now = Date.now();
    const last60s = now - 60000;
    
    return {
      apiCalls: this.apiCalls.filter(call => call.timestamp > last60s),
      errors: this.errors.filter(error => error.timestamp > last60s),
      warnings: this.warnings.filter(warning => warning.timestamp > last60s),
      components: [...new Set(this.apiCalls.map(call => call.component))]
    };
  }

  reset() {
    this.apiCalls = [];
    this.errors = [];
    this.warnings = [];
    this.log('🔄 Diagnostic reset');
  }
}

// Initialisation automatique si dans un navigateur
if (typeof window !== 'undefined') {
  window.formulaDiagnostic = new FormulaDiagnostic();
  
  // API console pour les développeurs
  window.checkFormulas = () => {
    const stats = window.formulaDiagnostic.getStats();
    console.table(stats.apiCalls);
    return stats;
  };
  
  window.resetDiagnostic = () => {
    window.formulaDiagnostic.reset();
  };
  
  console.log('🔍 FormulaDiagnostic activé. Utilisez checkFormulas() ou resetDiagnostic() dans la console.');
}

// Export pour usage en module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormulaDiagnostic;
}
