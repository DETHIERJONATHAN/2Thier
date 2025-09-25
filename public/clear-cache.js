// Script pour forcer un nettoyage complet du cache et des cookies
console.log('🧹 NETTOYAGE COMPLET DU CACHE COMMENCÉ...');

// Supprimer tous les cookies du domaine
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Supprimer aussi les variations avec différents chemins et domaines
const cookiesToClear = ['token', 'auth', 'session'];
const domains = ['', 'localhost', '.localhost'];
const paths = ['/', '/api'];

cookiesToClear.forEach(cookieName => {
    domains.forEach(domain => {
        paths.forEach(path => {
            // Variation standard
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
            // Variation sans domaine
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
            // Variation sans path
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}`;
            // Variation simple
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
        });
    });
});

// Nettoyer le localStorage et sessionStorage
try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ localStorage et sessionStorage nettoyés');
} catch (e) {
    console.log('⚠️ Erreur lors du nettoyage du storage:', e.message);
}

// Nettoyer les caches
if ('caches' in window) {
    caches.keys().then(names => {
        names.forEach(name => {
            caches.delete(name);
        });
        console.log('✅ Cache API nettoyé');
    }).catch(e => console.log('⚠️ Erreur lors du nettoyage du cache:', e.message));
}

console.log('🧹 NETTOYAGE COMPLET TERMINÉ!');
console.log('🔄 Rechargement de la page dans 2 secondes...');

// Recharger la page après 2 secondes
setTimeout(() => {
    window.location.href = window.location.origin;
}, 2000);
