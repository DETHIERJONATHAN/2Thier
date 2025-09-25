// Script pour forcer la suppression complète du vieux token
console.log('🧹 NETTOYAGE RADICAL DU TOKEN INVALIDE...');

// 1. Supprimer du localStorage
localStorage.removeItem('token');
localStorage.removeItem('auth');
localStorage.removeItem('user');
localStorage.clear();

// 2. Supprimer du sessionStorage
sessionStorage.removeItem('token');
sessionStorage.removeItem('auth');
sessionStorage.removeItem('user');
sessionStorage.clear();

// 3. Supprimer TOUS les cookies possibles
const cookiesToClear = ['token', 'auth', 'session', 'user', 'remember', 'jwt'];
const domains = ['', 'localhost', '.localhost', '127.0.0.1'];
const paths = ['/', '/api', '/auth'];

cookiesToClear.forEach(cookieName => {
    domains.forEach(domain => {
        paths.forEach(path => {
            // Plusieurs variantes de suppression
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
            document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain}`;
            document.cookie = `${cookieName}=; max-age=0; path=${path}`;
            document.cookie = `${cookieName}=; max-age=0; domain=${domain}`;
            document.cookie = `${cookieName}=; max-age=0`;
        });
    });
});

// 4. Supprimer TOUS les cookies actuels
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;max-age=0;path=/");
});

// 5. Appeler le serveur pour nettoyer côté serveur
fetch('/api/logout', { 
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
}).catch(() => {}); // Ignorer les erreurs

fetch('/clear-auth', { 
    method: 'GET',
    credentials: 'include'
}).catch(() => {}); // Ignorer les erreurs

console.log('✅ Nettoyage terminé!');
console.log('🔄 Rechargement FORCÉ dans 1 seconde...');

// Forcer un rechargement complet
setTimeout(() => {
    window.location.href = window.location.origin + '/login?cleaned=1';
}, 1000);
