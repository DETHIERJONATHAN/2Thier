
import * as dotenv from 'dotenv';
console.log('🔍 [DEBUG] Chargement dotenv...');
dotenv.config();
console.log('✅ [DEBUG] Dotenv chargé');

import express, { type Request, type Response } from 'express';
console.log('✅ [DEBUG] Express importé');
import cors from 'cors';
console.log('✅ [DEBUG] CORS importé');
import session from 'express-session';
console.log('✅ [DEBUG] Session importée');
import cookieParser from 'cookie-parser';
console.log('✅ [DEBUG] CookieParser importé');
import passport from 'passport';
console.log('✅ [DEBUG] Passport importé');
import mainApiRouter from './routes/index'; // ✅ Router principal complet
import aiInternalRouter from './routes/ai-internal';
console.log('✅ [DEBUG] Router minimal importé');
// import analyticsRouter from './routes/analytics.ts'; // 📊 ANALYTICS - FUTUR
import { setupSecurity } from './middlewares/security';
console.log('✅ [DEBUG] Security importé');

//  AUTO-SYNC DÉSACTIVÉ - Mode IMAP bidirectionnel pur
// import { autoMailSync } from './services/AutoMailSyncService.js';

console.log('🚀 [DEBUG] Création de l\'app Express...');
const app = express();
console.log('✅ [DEBUG] App Express créée');
const port = process.env.PORT || 4000;
console.log(`🔧 [DEBUG] Port configuré: ${port}`);

console.log('🔧 [DEBUG] Configuration CORS...');
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));
console.log('✅ [DEBUG] CORS configuré');

console.log('🔧 [DEBUG] Configuration JSON parser...');
app.use(express.json());
console.log('✅ [DEBUG] JSON parser configuré');

console.log('🔧 [DEBUG] Configuration Cookie parser...');
app.use(cookieParser());
console.log('✅ [DEBUG] Cookie parser configuré');

// Configuration de la session
console.log('🔧 [DEBUG] Configuration sessions...');
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}));
console.log('✅ [DEBUG] Sessions configurées');

// Initialiser Passport.js pour l'authentification
console.log('🔧 [DEBUG] Configuration Passport...');
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ [DEBUG] Passport configuré');

// Middleware de logging global pour debug
console.log('🔧 [DEBUG] Configuration logging middleware...');
app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    console.log(`[SERVER] Headers:`, req.headers.authorization ? 'Authorization present' : 'No auth');
    console.log(`[SERVER] Cookies:`, req.cookies?.token ? 'Token cookie present' : 'No token cookie');
    next();
});
console.log('✅ [DEBUG] Logging middleware configuré');

// 🧹 ROUTE DE NETTOYAGE FORCÉ DES COOKIES (pour résoudre les 401)
app.get('/clear-auth', (_req, res) => {
    console.log('🧹 [CLEAR-AUTH] Nettoyage forcé des cookies d\'authentification...');
    
    // Nettoyer tous les cookies possibles avec toutes les configurations
    const cookieOptions = [
        { path: '/' },
        { path: '/', domain: 'localhost' },
        { path: '/', domain: '.localhost' },
        { path: '/', httpOnly: true },
        { path: '/', secure: false },
        { path: '/', sameSite: 'lax' as const },
        { path: '/', sameSite: 'none' as const },
        { path: '/', sameSite: 'strict' as const }
    ];
    
    // Nettoyer le cookie 'token' avec toutes les variantes possibles
    cookieOptions.forEach(options => {
        res.clearCookie('token', options);
    });
    
    // Aussi supprimer d'autres cookies potentiels
    ['auth', 'session', 'user', 'jwt', 'access_token'].forEach(cookieName => {
        cookieOptions.forEach(options => {
            res.clearCookie(cookieName, options);
        });
    });
    
    console.log('✅ [CLEAR-AUTH] Cookies nettoyés - redirection vers le frontend');
    
    // Retourner du HTML avec script de nettoyage automatique
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🧹 Nettoyage en cours...</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                h1 { color: #27ae60; }
                .loading { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🧹 Nettoyage en cours...</h1>
                <div class="loading">⟳</div>
                <p>Cache et cookies supprimés. Redirection automatique...</p>
                <p><a href="http://localhost:5173">Aller au CRM maintenant</a></p>
            </div>
            <script>
                // Nettoyer complètement le cache côté client
                console.log('🧹 Nettoyage côté client...');
                
                localStorage.clear();
                sessionStorage.clear();
                
                // Supprimer tous les cookies côté client aussi
                document.cookie.split(';').forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); 
                });
                
                console.log('✅ Nettoyage terminé');
                
                // Redirection automatique après 3 secondes
                setTimeout(() => {
                    window.location.href = 'http://localhost:5173?cleared=1';
                }, 3000);
            </script>
        </body>
        </html>
    `);
});

// 🔥 NETTOYAGE RADICAL FORCÉ
app.get('/force-clean', (_req, res) => {
    console.log('🔥 [FORCE-CLEAN] Nettoyage radical demandé');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔥 Nettoyage Radical</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #e74c3c; color: white; }
                .container { background: rgba(0,0,0,0.8); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                h1 { color: #fff; }
                .loading { animation: spin 1s linear infinite; font-size: 2em; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔥 NETTOYAGE RADICAL EN COURS...</h1>
                <div class="loading">⚡</div>
                <p>Suppression COMPLÈTE de tous les tokens et cookies...</p>
                <p>Redirection automatique vers la page de connexion...</p>
            </div>
            <script src="/force-clean.js"></script>
        </body>
        </html>
    `);
});

// Utiliser le routeur principal pour TOUTES les routes /api
// Ce routeur contient maintenant les routes gmail, qui seront donc protégées
// par les mêmes middlewares d'authentification que les autres.
app.use('/api', mainApiRouter);
app.use('/api/ai/internal', aiInternalRouter);

// 📊 ANALYTICS ROUTES - FUTURES FONCTIONNALITÉS
// app.use('/api/analytics', analyticsRouter);

// Gestion des erreurs
// Middleware d'erreurs (signature à 4 args conservée via eslint-disable comment si nécessaire)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: unknown) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
});

console.log('🔧 [DEBUG] Configuration sécurité...');
setupSecurity(app);
console.log('✅ [DEBUG] Sécurité configurée');

console.log('🚀 [DEBUG] Démarrage du serveur...');
app.listen(port, () => {
    console.log(`🎉 [SUCCESS] Server is running on port ${port}`);
    console.log(`🌐 [SUCCESS] Health check: http://localhost:${port}/health`);
});
console.log('✅ [DEBUG] Fin du script principal');
