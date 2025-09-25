// Script simple pour tester la solution mirror dans la console
console.log('🚀 Activation des diagnostics TBL...');

// Activer les flags de diagnostic
localStorage.setItem('TBL_AUTO_DIAG', '1');
localStorage.setItem('TBL_SMART_DEBUG', '1');
localStorage.setItem('USE_FIXED_HIERARCHY', '1');

console.log('✅ Flags activés, rechargement...');

// Recharger pour appliquer les changements
window.location.reload();