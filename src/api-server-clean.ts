import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';
import expressWinston from 'express-winston';
import apiRouter from './routes/index';
import { prisma } from './lib/prisma';

// 🔥 ROUTES TBL SPÉCIALISÉES
import tblSubmissionEvaluatorRouter from './components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator';
import tblConfigRouter from './components/TreeBranchLeaf/treebranchleaf-new/TBL/routes/tbl-routes'; // 🔧 TBL CONFIG (variables, calculation-modes, fields)
import tableRoutesNewRouter from './components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes';
import calculatedValueController from './controllers/calculatedValueController'; // 🎯 VALEURS CALCULÉES STOCKÉES
import tblBatchRoutes from './routes/tbl-batch-routes'; // 🚀 BATCH LOADING TBL
import batchRoutes from './routes/batch-routes'; // 🚀 BATCH GLOBAL (Gmail, Leads, Analytics)

// 🌐 ROUTES GESTION SITES WEB
// 🔄 FORCE RELOAD - Timestamp: 2025-10-09 20:05
import websitesRouter from './api/websites';

// 🌐 ROUTES CRUD CONTENU SITES WEB
import websiteServicesRouter from './api/website-services';
import websiteProjectsRouter from './api/website-projects';
import websiteTestimonialsRouter from './api/website-testimonials';
import websiteSectionsRouter from './api/website-sections';
import websiteThemesRouter from './api/website-themes';
import contactFormRouter from './api/contact-form';
import imageUploadRouter from './api/image-upload';

// 🤖 ROUTES GÉNÉRATION CONTENU IA
import aiContentRouter from './api/ai-content';
import aiRouter from './api/ai'; // 🤖 GEMINI AI (optimisation, suggestions)
import aiFieldGeneratorRouter from './routes/ai-field-generator'; // 🤖 IA GÉNÉRATION INTELLIGENTE DE CONTENU
import createRepeatRouter from './components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-routes';
import cloudRunDomainsRouter from './api/cloud-run-domains'; // ☁️ GESTION DOMAINES CLOUD RUN

// 📄 ROUTES GESTION DOCUMENTS PDF
import documentsRouter from './routes/documents'; // 📄 TEMPLATES DE DOCUMENTS (ADMIN)

// 👤 ROUTES UTILISATEURS
import userFavoritesRouter from './routes/userFavoritesRoutes'; // ⭐ FAVORIS MODULES UTILISATEUR

// 🌐 MIDDLEWARE DÉTECTION SITES VITRINES AUTOMATIQUE
import { detectWebsite, websiteInterceptor } from './middleware/websiteDetection';
import { renderWebsite } from './middleware/websiteRenderer';

// 🛡️ IMPORTS SÉCURITÉ ENTERPRISE
import { securityLogger, logSecurityEvent } from './security/securityLogger';
import { 
  securityMonitoring,
  timingAttackProtection,
  advancedRateLimit,
  authRateLimit,
  anomalyDetection,
  inputSanitization
} from './security/securityMiddleware';

// 🎯 LOG IMMÉDIAT - Confirme que le fichier est chargé par Node.js
console.log('🎬 [BOOTSTRAP] api-server-clean.cjs loaded at', new Date().toISOString());
console.log('🎬 [BOOTSTRAP] PORT env:', process.env.PORT || '(not set, using 8080)');
console.log('🎬 [BOOTSTRAP] NODE_ENV:', process.env.NODE_ENV || 'development');

console.log('🚀 [API-SERVER-CLEAN] Démarrage du serveur CRM...');

// 🔒 INITIALISATION LOGGING SÉCURISÉ ENTERPRISE
logSecurityEvent('SERVER_STARTUP', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  securityLevel: 'ENTERPRISE'
}, 'info');

const app = express();

// 🌐 Configuration pour Cloud Run / reverse proxies (1 = single proxy, not true which is permissive)
app.set('trust proxy', 1);

const port = Number(process.env.PORT || 8080); // Cloud Run utilise le PORT 8080 par défaut
console.log('🎯 [BOOTSTRAP] Server will listen on port:', port);

// 📦 Métadonnées build (injectées par le script de déploiement)
const BUILD_VERSION = process.env.BUILD_VERSION || 'dev-local';
const GIT_SHA = process.env.GIT_SHA || 'unknown';

// � Middleware d'en-têtes de version
app.use((req, res, next) => {
  res.setHeader('X-App-Version', BUILD_VERSION);
  res.setHeader('X-Git-Sha', GIT_SHA);
  next();
});

// �📊 LOGGING SÉCURISÉ DE TOUTES LES REQUÊTES
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(expressWinston.logger({
  winstonInstance: securityLogger,
  meta: !isDevelopment, // Pas de meta en dev pour réduire la verbosité
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: false,
  colorize: false,
  requestWhitelist: ['method', 'url', 'ip'],
  responseWhitelist: ['statusCode'],
  skip: (req, res) => {
    // En développement, skip la plupart des logs pour la performance
    if (isDevelopment) {
      // Logger seulement les erreurs (400+) et les endpoints critiques
      if (res.statusCode < 400) {
        // Skip les TBL/tree-nodes qui génèrent beaucoup de requêtes
        const skipPatterns = [
          '/api/tree-nodes/',
          '/api/treebranchleaf/',
          '/api/tbl/',
          '/api/repeat/',
          '/api/health',
          '/health'
        ];
        if (skipPatterns.some(pattern => req.url.startsWith(pattern))) {
          return true;
        }
      }
    }
    // Skip les endpoints de santé pour éviter le spam de logs
    return ['/api/health', '/health'].includes(req.url) && res.statusCode < 400;
  }
}));

// 🛡️ SÉCURITÉ NIVEAU 1 - MONITORING ET PROTECTION DE BASE
app.use(securityMonitoring);
app.use(timingAttackProtection);

// 🛡️ SÉCURITÉ NIVEAU 2 - PROTECTION HEADERS ET COMPRESSION
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "maps.googleapis.com", "*.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "maps.gstatic.com", "*.googleapis.com", "*.ggpht.com"],
      connectSrc: ["'self'", "https:", "wss:", "maps.googleapis.com", "*.googleapis.com"],
      frameSrc: ["'self'", "maps.google.com", "*.google.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 🛡️ SÉCURITÉ NIVEAU 3 - RATE LIMITING AVANCÉ
app.use(advancedRateLimit);

// 🛡️ SÉCURITÉ NIVEAU 4 - DÉTECTION D'ANOMALIES
app.use(anomalyDetection);

// ⚡ Configuration CORS sécurisée (Google Cloud Run + domaines 2thier.be)
const FRONTEND_URL = process.env.FRONTEND_URL;
const prodOrigins = [
  FRONTEND_URL || 'https://app.2thier.be',
  'https://www.2thier.be',
  'https://crm.2thier.be',
  /\.run\.app$/,       // Google Cloud Run
  /\.appspot\.com$/    // Google App Engine
];
const devOrigins = [FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? prodOrigins : devOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-organization-id'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining', 'x-organization-id']
}));

// 🛡️ SÉCURITÉ NIVEAU 5 - SANITISATION DES ENTRÉES
app.use(inputSanitization);

// 📊 Configuration JSON et URL encoding avec validation
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      logSecurityEvent('INVALID_JSON', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        error: (e as Error).message
      }, 'warn');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// 🔐 Configuration Session avec sécurité Enterprise
app.use(session({
  secret: process.env.SESSION_SECRET || 'crm-dev-secret-2024',
  resave: false,
  saveUninitialized: false,
  name: 'CRM_SESSION_ID',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  },
  store: undefined // TODO: Ajouter un store persistant en production
}));

console.log('✅ [ENTERPRISE-SECURITY] Configuration sécurité niveau Enterprise activée');

// 📸 Servir les fichiers uploadés en statique avec CORS
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
app.use('/uploads', (req, res, next) => {
  // Headers CORS pour autoriser l'affichage des images
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsDir, {
  maxAge: '1h', // Cache 1 heure
  etag: true,
  lastModified: true
}));
console.log('📸 [UPLOADS] Dossier uploads configuré avec CORS:', uploadsDir);

// Configuration Passport
console.log('🔧 [API-SERVER-CLEAN] Configuration Passport...');
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ [API-SERVER-CLEAN] Passport configuré');

// Routes API - Utilisation du système existant complet
console.log('🔧 [API-SERVER-CLEAN] Configuration des routes...');
// Limiteur spécialisé auth uniquement sur bloc /api/auth
app.use('/api/auth', authRateLimit);
app.use('/api', apiRouter); // Utilise TOUTES les routes existantes !
app.use('/api', websitesRouter); // 🌐 GESTION DES SITES WEB (Site Vitrine, Devis1Minute)
app.use('/api', websiteServicesRouter); // 🌐 CRUD SERVICES
app.use('/api', websiteProjectsRouter); // 🌐 CRUD PROJECTS
app.use('/api', websiteTestimonialsRouter); // 🌐 CRUD TESTIMONIALS
app.use('/api', websiteSectionsRouter); // 🎨 CRUD SECTIONS (PAGE BUILDER)
app.use('/api/website-themes', websiteThemesRouter); // 🎨 GESTION THÈMES SITES WEB
app.use('/api/ai-content', aiContentRouter); // 🤖 GÉNÉRATION CONTENU IA (Gemini)
app.use('/api', cloudRunDomainsRouter); // ☁️ MAPPING DOMAINES CLOUD RUN
app.use('/api/ai', aiFieldGeneratorRouter); // 🤖 IA GÉNÉRATION INTELLIGENTE (generate-field, status)
app.use('/api/ai', aiRouter); // 🤖 GEMINI AI (suggestions, optimisations)
app.use('/api', contactFormRouter); // 📧 FORMULAIRE DE CONTACT SITE VITRINE
app.use('/api/image-upload', imageUploadRouter); // 📸 UPLOAD D'IMAGES (LOGOS, PHOTOS)
app.use('/api/documents', documentsRouter); // 📄 TEMPLATES DE DOCUMENTS (ADMIN + GÉNÉRATION)
app.use('/api/tbl', tblConfigRouter); // 🔧 TBL CONFIG ROUTES (/variables, /calculation-modes, /fields)
app.use('/api/tbl', tblSubmissionEvaluatorRouter); // 🔥 TBL PRISMA EVALUATOR
app.use('/api/tbl/batch', tblBatchRoutes); // 🚀 BATCH LOADING TBL (réduit ~100 requêtes à 1)
app.use('/api/batch', batchRoutes); // 🚀 BATCH GLOBAL (Gmail, Leads, Analytics)
app.use('/api/tree-nodes', calculatedValueController); // 🎯 VALEURS CALCULÉES STOCKÉES DANS PRISMA
app.use('/api/user/favorites', userFavoritesRouter); // ⭐ FAVORIS MODULES UTILISATEUR
// ⚠️ SUPPRIMÉ - Déjà monté via apiRouter ligne 249: app.use('/api/treebranchleaf', tableRoutesNewRouter);
const repeatRouter = createRepeatRouter(prisma);
app.use('/api/treebranchleaf/repeat', repeatRouter); // 🔁 Compatibilité historique
app.use('/api/repeat', repeatRouter); // 🔁 Nouveau point d'entrée stabilisé pour le frontend
console.log('✅ [API-SERVER-CLEAN] Routes configurées');

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Vérification de la connectivité base de données (utilitaire de debug/ops)
app.get('/api/health/db', async (_req, res) => {
  try {
    // Vérifie que le moteur répond sans forcer d'autres requêtes applicatives
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'OK', timestamp: new Date().toISOString() });
  } catch (e) {
    const message = (e as Error)?.message || 'Unknown error';
    res.status(503).json({ db: 'DOWN', error: message, timestamp: new Date().toISOString() });
  }
});

// 🌐 MIDDLEWARE DE DÉTECTION AUTOMATIQUE DES SITES VITRINES
// Doit être AVANT le serveur de fichiers statiques pour intercepter les domaines
app.use(detectWebsite);
app.use(websiteInterceptor); // ⚡ INTERCEPTE ET REND LES SITES VITRINES DIRECTEMENT

//  Production: servir le frontend statique (dist) si présent
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('🗂️ [STATIC] Distribution front détectée, activation du serveur statique');
    
    // ⚡ CRITIQUE: Servir UNIQUEMENT /assets/* pour ne PAS intercepter la route racine /
    // Cela permet à websiteInterceptor de gérer / pour les sites vitrines
    const assetsDir = path.join(distDir, 'assets');
    app.use('/assets', express.static(assetsDir, {
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }));
    
    // 🔥 NOUVEAU: Servir TOUS les fichiers statiques de dist/ (images, JS, CSS, etc.)
    // Cette route intercepte les fichiers avec extension AVANT le catch-all SPA
    app.get(/^\/[^/]+\.(png|jpg|jpeg|gif|svg|ico|webp|js|css|woff|woff2|ttf|eot|json|webmanifest|html|txt|xml)$/i, (req, res, next) => {
      const filePath = path.join(distDir, req.path);
      if (fs.existsSync(filePath)) {
        // Définir le bon Content-Type selon l'extension
        const ext = path.extname(req.path).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.webp': 'image/webp',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.eot': 'application/vnd.ms-fontobject',
          '.json': 'application/json',
          '.webmanifest': 'application/manifest+json',
          '.html': 'text/html',
          '.txt': 'text/plain',
          '.xml': 'application/xml'
        };
        if (mimeTypes[ext]) {
          res.setHeader('Content-Type', mimeTypes[ext]);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 jour
        console.log(`📁 [STATIC] Serving: ${req.path}`);
        return res.sendFile(filePath);
      }
      next();
    });
    
    // Servir aussi les fichiers PWA et favicon à la racine du dist
    app.get(/^\/pwa-.*/, (req, res) => {
      const filePath = path.join(distDir, req.path);
      if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
      } else {
        res.status(404).end();
      }
    });
    app.get('/favicon.ico', (req, res) => res.sendFile(path.join(distDir, 'favicon.ico')));
    app.get('/manifest.json', (req, res) => res.sendFile(path.join(distDir, 'manifest.json')));
    app.get('/manifest.webmanifest', (req, res) => res.sendFile(path.join(distDir, 'manifest.webmanifest')));
    app.get('/registerSW.js', (req, res) => {
      const swPath = path.join(distDir, 'registerSW.js');
      if (fs.existsSync(swPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(swPath);
      } else {
        res.status(404).end();
      }
    });
    
    // 🔧 Service Worker (sw.js)
    app.get('/sw.js', (req, res) => {
      const swPath = path.join(distDir, 'sw.js');
      if (fs.existsSync(swPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(swPath);
      } else {
        res.status(404).end();
      }
    });

    // 🔧 Workbox (workbox-*.js) - CRITIQUE pour le Service Worker
    app.get(/^\/workbox-.*\.js$/, (req, res) => {
      const filePath = path.join(distDir, req.path);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(filePath);
      } else {
        res.status(404).end();
      }
    });
    
    // 🔧 Configuration d'environnement runtime (env-config.js)
    app.get('/env-config.js', (req, res) => {
      const envPath = path.join(distDir, 'env-config.js');
      if (fs.existsSync(envPath)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.sendFile(envPath);
      } else {
        res.status(404).end();
      }
    });
    
    // 🌐 RENDU DES SITES VITRINES OU FALLBACK CRM
    // Cette route attrape TOUT ce qui n'est pas /api/ ou /assets/
    app.get(/^(?!\/api\/|\/assets\/).*/, (req: any, res, _next) => {
      // � SI UN SITE VITRINE A ÉTÉ DÉTECTÉ, LE RENDRE EN SSR
      if (req.isWebsiteRoute === true && req.websiteData) {
        console.log(`🎨 [WEBSITE-RENDER] Rendu SSR pour: ${req.websiteData.name} (${req.hostname})`);
        return renderWebsite(req, res);
      }
      
      // 📱 SINON, SERVIR LE CRM REACT
      console.log(`📱 [CRM-SPA] Serving React app for: ${req.hostname}${req.url}`);
      res.sendFile(indexHtml);
    });
  } else {
    console.warn('⚠️ [STATIC] Aucun build front trouvé (dist/index.html manquant)');
  }
}

// 📊 LOGGING SÉCURISÉ DES ERREURS
app.use(expressWinston.errorLogger({
  winstonInstance: securityLogger,
  meta: true,
  msg: 'ERROR {{err.message}} {{req.method}} {{req.url}}',
  requestWhitelist: ['method', 'url', 'ip', 'body'],
  blacklistedMetaFields: ['password', 'token', 'secret']
}));

// Nouvelle route de diagnostic (remplace l'ancienne racine JSON)
app.get('/api/root-info', (_req, res) => {
  res.json({
    status: 'CRM API Server Online - ENTERPRISE SECURITY',
    timestamp: new Date().toISOString(),
    securityLevel: '100%',
    endpoints: {
      health: '/api/health',
      notifications: '/api/notifications',
      modules: '/api/modules/all',
      blocks: '/api/blocks',
      auth: '/api/auto-google-auth/connect'
    }
  });
});

// Endpoint debug pour vérifier la présence du build front en production
app.get('/api/debug/static-status', (_req, res) => {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtml = path.join(distDir, 'index.html');
  res.json({
    env: process.env.NODE_ENV,
    distExists: fs.existsSync(distDir),
    indexExists: fs.existsSync(indexHtml),
    served: process.env.NODE_ENV === 'production' && fs.existsSync(indexHtml)
  });
});

// 🔒 Gestionnaire d'erreurs sécurisé
import type { ErrorRequestHandler } from 'express';
// Express 5: error middleware MUST have 4 params (err, req, res, next)
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logSecurityEvent('SERVER_ERROR', {
    error: err.message,
    stack: err.stack,
    method: req?.method || 'UNKNOWN',
    url: req?.url || 'UNKNOWN',
    ip: req?.ip || 'UNKNOWN',
    userAgent: req?.headers?.['user-agent'] || 'UNKNOWN'
  }, 'error');

  // En production, ne pas exposer les détails d'erreur
  const errorResponse = process.env.NODE_ENV === 'production' 
    ? { error: 'Une erreur interne s\'est produite' }
    : { error: err.message, stack: err.stack };

  const status = typeof (err as { status?: number }).status === 'number' ? (err as { status?: number }).status! : 500;
  // Si les en-têtes sont déjà envoyés, déléguer à Express
  if (res.headersSent) {
    return next(err);
  }
  res.status(status).json(errorResponse);
};
app.use(errorHandler);

// Import du hook de synchronisation TreeBranchLeaf
import { initializeTreeBranchLeafSync } from './components/TreeBranchLeaf/treebranchleaf-new/api/sync-variable-hook';

// Démarrage du serveur
const server = app.listen(port, '0.0.0.0', () => {
  logSecurityEvent('SERVER_READY', {
    port,
    securityLevel: 'ENTERPRISE',
    features: [
      'Advanced Rate Limiting',
      'Anomaly Detection', 
      'Input Sanitization',
      'Security Monitoring',
      'Comprehensive Logging',
      'Helmet Protection',
      'Timing Attack Protection'
    ]
  }, 'info');

  console.log(`🎉 [API-SERVER-CLEAN] Serveur CRM démarré avec succès sur http://0.0.0.0:${port}`);
  console.log(`🛡️ [ENTERPRISE-SECURITY] Sécurité niveau 100% activée`);
  
  // 🔄 Synchronisation automatique des sourceRef TreeBranchLeaf
  // ⚠️ DÉSACTIVÉ EN PRODUCTION pour éviter les crashes mémoire
  // Cette synchronisation charge tous les nodes en mémoire
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔄 [TREEBRANCHLEAF] Synchronisation des sourceRef...');
    initializeTreeBranchLeafSync().catch(err => {
      console.error('⚠️  [TREEBRANCHLEAF] Erreur lors de la synchronisation:', err);
    });
  } else {
    console.log('⏭️ [TREEBRANCHLEAF] Synchronisation désactivée en production (optimisation mémoire)');
  }
  console.log(`📋 [API-SERVER-CLEAN] Endpoints disponibles:`);
  console.log(`   - Health: http://localhost:${port}/api/health`);
  console.log(`   - Auth Me: http://localhost:${port}/api/auth/me`);
  console.log(`   - Auth Login: http://localhost:${port}/api/auth/login`);
  console.log(`   - Notifications: http://localhost:${port}/api/notifications`);
  console.log(`   - Modules: http://localhost:${port}/api/modules/all`);
  console.log(`   - Blocks: http://localhost:${port}/api/blocks`);
  console.log(`   - Google Auth: http://localhost:${port}/api/auto-google-auth/connect`);
});
export { app };