// Script pour activer les diagnostics TBL et tester immédiatement
// À coller dans la console du navigateur sur http://localhost:5173

console.log('🔧 Activation des diagnostics TBL');

// Activer tous les flags de diagnostic
localStorage.setItem('TBL_AUTO_DIAG', '1');
localStorage.setItem('TBL_SMART_DEBUG', '1');
localStorage.setItem('TBL_DIAG', '1');
localStorage.setItem('USE_FIXED_HIERARCHY', '1');

console.log('✅ Flags activés:');
console.log('- TBL_AUTO_DIAG: auto-diagnostic à l\'ouverture');
console.log('- TBL_SMART_DEBUG: logs détaillés SmartCalculatedField');
console.log('- TBL_DIAG: mode diagnostic général');
console.log('- USE_FIXED_HIERARCHY: hook hiérarchique fixe');

// Recharger la page pour appliquer
setTimeout(() => {
  console.log('🔄 Rechargement automatique...');
  window.location.reload();
}, 1000);