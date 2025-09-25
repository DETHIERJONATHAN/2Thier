// Force cache refresh pour debug des callbacks
console.log('🚨 SCRIPT FORCE-REFRESH ACTIVÉ - TIMESTAMP:', Date.now());
console.log('🔄 VIDAGE FORCÉ DU CACHE NAVIGATEUR...');

// Force le navigateur à recharger complètement
if (typeof window !== 'undefined') {
  // Vider le localStorage 
  localStorage.setItem('CACHE_BUSTED', Date.now().toString());
  
  // Forcer le rechargement dur après 100ms
  setTimeout(() => {
    window.location.reload(true);
  }, 100);
}