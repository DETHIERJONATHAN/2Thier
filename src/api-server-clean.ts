import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';
import expressWinston from 'express-winston';
import apiRouter from './routes/index';
import { prisma } from './lib/prisma';
import { initializeSocketIO } from './lib/socket';

// 🔥 ROUTES TBL SPÉCIALISÉES
import tblSubmissionEvaluatorRouter from './components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator';
import tblConfigRouter from './components/TreeBranchLeaf/treebranchleaf-new/TBL/routes/tbl-routes'; // 🔧 TBL CONFIG (variables, calculation-modes, fields)
import iaConfigRouter from './components/TreeBranchLeaf/treebranchleaf-new/TBL/routes/ia-config-routes'; // 🎯 IA MESURE CONFIG (objets référence, paramètres détection)
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
import measurementReferenceRouter from './api/measurement-reference'; // 📐 CONFIGURATION OBJETS DE RÉFÉRENCE POUR MESURES IA
import calendarRouter from './api/calendar'; // 📅 AGENDA / CALENDRIER / TÂCHES

// 👤 ROUTES UTILISATEURS
import userFavoritesRouter from './routes/userFavoritesRoutes'; // ⭐ FAVORIS MODULES UTILISATEUR
import userBookmarksRouter from './routes/userBookmarksRoutes'; // 🔖 BOOKMARKS PAGES WEB FAVORITES
import honeycombRouter from './routes/honeycombRoutes'; // 🍯 HONEYCOMB - FLUX RSS PERSONNALISÉS
import userPreferencesRouter from './routes/userPreferencesRoutes'; // 🔧 PRÉFÉRENCES UTILISATEUR (remplace localStorage)
import waxRouter from './routes/wax'; // 🕯️ WAX — Carte interactive & contenu éphémère

// 📋 ROUTES FORMULAIRES SITES WEB (style Effy)
import websiteFormsRouter from './routes/website-forms'; // 📋 CRUD FORMULAIRES ADMIN
import publicFormsRouter from './routes/public-forms'; // 📋 SOUMISSION PUBLIQUE FORMULAIRES

// 📨 ROUTES PEPPOL e-INVOICING
import peppolRouter from './routes/peppol'; // 📨 e-FACTURATION PEPPOL (via Odoo headless)

// 🧾 ROUTES FACTURES (standalone + chantier + peppol incoming unifiées)
import invoicesRouter from './routes/invoices';

// 💰 ROUTES DÉPENSES (scan tickets IA + suivi comptable)
import expensesRouter from './routes/expenses';

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
      frameSrc: ["'self'", "maps.google.com", "*.google.com", "blob:"],
      objectSrc: ["'self'", "blob:"],
      mediaSrc: ["'self'", "https://storage.googleapis.com", "blob:"],
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

// ⚡ Configuration CORS sécurisée (Google Cloud Run + domaines 2thier.be + GitHub Codespaces)
const FRONTEND_URL = process.env.FRONTEND_URL;
const prodOrigins = [
  FRONTEND_URL || 'https://www.zhiive.com',
  'https://www.zhiive.com',
  'https://zhiive.com',
  'https://app.2thier.be',
  'https://www.2thier.be',
  'https://crm.2thier.be',
  'http://localhost:4000',  // Mode production local
  /\.run\.app$/,       // Google Cloud Run
  /\.appspot\.com$/,   // Google App Engine
  /^https:\/\/.*\.app\.github\.dev$/,  // GitHub Codespaces (toutes URLs)
  /^https:\/\/.*-\d+\.app\.github\.dev$/  // GitHub Codespaces avec port
];
const devOrigins = [
  FRONTEND_URL || 'http://localhost:5173', 
  'http://localhost:3000',
  'http://localhost:4000',  // Mode production local
  /^https:\/\/.*\.app\.github\.dev$/,  // GitHub Codespaces (toutes URLs)
  /^https:\/\/.*-\d+\.app\.github\.dev$/  // GitHub Codespaces avec port
];
app.use(cors({
  origin: (origin, callback) => {
    // Permettre les requêtes sans origin (comme curl, Postman, ou requêtes serveur-à-serveur)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' ? prodOrigins : devOrigins;
    
    // Vérifier si l'origin correspond à une des origines autorisées
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚫 [CORS] Origin bloqué: ${origin}`);
      callback(null, false);
    }
  },
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

// 📎 Middleware pour parser les formulaires multipart (pièces jointes email)
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max (vidéos)
  useTempFiles: true,
  tempFileDir: '/tmp/',
  abortOnLimit: true,
  responseOnLimit: 'Fichier trop volumineux (max 100 Mo)',
}));
console.log('✅ [FileUpload] Middleware configuré (100MB max)');

// 🔐 Configuration Session avec sécurité Enterprise
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SESSION_SECRET requis en production'); })() : 'crm-dev-secret-2024');
const PgSession = connectPgSimple(session);
app.use(session({
  secret: sessionSecret,
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
  store: new PgSession({
    conObject: {
      host: process.env.PGHOST || '127.0.0.1',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || '2thier',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
    },
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15, // Nettoyage des sessions expirées toutes les 15min
  }),
}));

console.log('✅ [ENTERPRISE-SECURITY] Configuration sécurité niveau Enterprise activée');

// 📸 Rediriger /uploads/* vers Google Cloud Storage (dev ET production)
const GCS_BUCKET_NAME = process.env.GCS_BUCKET || 'crm-2thier-uploads';
app.use('/uploads', (req, res) => {
  const gcsUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}${req.path}`;
  res.redirect(301, gcsUrl);
});
console.log('📸 [UPLOADS] Redirection /uploads/* → GCS bucket', GCS_BUCKET_NAME);

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
app.use('/api/measurement-reference', measurementReferenceRouter); // 📐 OBJETS RÉFÉRENCE MESURE IA (/:organizationId)
app.use('/api/tbl', tblConfigRouter); // 🔧 TBL CONFIG ROUTES (/variables, /calculation-modes, /fields)
app.use('/api/treebranchleaf', iaConfigRouter); // 🎯 IA MESURE CONFIG (/nodes/:nodeId/ia-config)
app.use('/api/tbl', tblSubmissionEvaluatorRouter); // 🔥 TBL PRISMA EVALUATOR
app.use('/api/tbl/batch', tblBatchRoutes); // 🚀 BATCH LOADING TBL (réduit ~100 requêtes à 1)
app.use('/api/batch', batchRoutes); // 🚀 BATCH GLOBAL (Gmail, Leads, Analytics)
app.use('/api/tree-nodes', calculatedValueController); // 🎯 VALEURS CALCULÉES STOCKÉES DANS PRISMA
app.use('/api/user/favorites', userFavoritesRouter); // ⭐ FAVORIS MODULES UTILISATEUR
app.use('/api/user/bookmarks', userBookmarksRouter); // 🔖 BOOKMARKS PAGES WEB FAVORITES
app.use('/api/user/bookmarks', honeycombRouter); // 🍯 HONEYCOMB - FLUX RSS PERSONNALISÉS (/feeds)
app.use('/api/user-preferences', userPreferencesRouter); // 🔧 PRÉFÉRENCES UTILISATEUR (remplace localStorage)
app.use('/api/wax', waxRouter); // 🕯️ WAX — Carte interactive & contenu éphémère
app.use('/api/website-forms', websiteFormsRouter); // 📋 FORMULAIRES SITES WEB (style Effy) - CRUD ADMIN
app.use('/api/public/forms', publicFormsRouter); // 📋 SOUMISSION PUBLIQUE FORMULAIRES (sans auth)
app.use('/api/calendar', calendarRouter); // 📅 AGENDA / CALENDRIER / TÂCHES
app.use('/api/peppol', peppolRouter); // 📨 PEPPOL e-FACTURATION (Odoo Bridge)
app.use('/api/invoices', invoicesRouter); // 🧾 FACTURES UNIFIÉES (standalone + chantier + incoming)
app.use('/api/expenses', expensesRouter); // 💰 DÉPENSES (scan tickets IA + suivi)
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
    
    // Servir .well-known/ (security.txt etc.)
    app.use('/.well-known', express.static(path.join(distDir, '.well-known')));
    
    // 🔥 NOUVEAU: Servir TOUS les fichiers statiques de dist/ (images, JS, CSS, etc.)
    // Cette route intercepte les fichiers avec extension AVANT le catch-all SPA
    app.get(/^\/[^/]+\.(png|jpg|jpeg|gif|svg|ico|webp|js|css|woff|woff2|ttf|eot|json|webmanifest|html|txt|xml|mp3)$/i, (req, res, next) => {
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
          '.xml': 'application/xml',
          '.mp3': 'audio/mpeg'
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

    // 📱 MANIFEST PWA DYNAMIQUE — adapté au hostname (CRM, site vitrine, etc.)
    const dynamicManifestHandler = (req: express.Request, res: express.Response) => {
      // Fallback = CRM (app.2thier.be, localhost, etc.)
      let manifest: Record<string, unknown> = {
        name: 'Zhiive',
        short_name: 'Zhiive',
        description: 'Zhiive — The Hive',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1e3a5f',
        background_color: '#0f172a',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
        ]
      };

      // Si detectWebsite a trouvé un site vitrine → adapter le manifest
      if (req.isWebsiteRoute && req.websiteData) {
        const site = req.websiteData;
        const config = site.config as Record<string, unknown> | null;
        manifest = {
          name: site.name,
          short_name: site.name.length > 12 ? site.name.substring(0, 12) : site.name,
          description: (config?.metaDescription as string) || `Site ${site.name}`,
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: (config?.primaryColor as string) || '#1e3a5f',
          background_color: '#0f172a',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
          ]
        };
        console.log(`📱 [MANIFEST] Dynamique pour ${site.domain} → ${site.name}`);
      }

      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(manifest);
    };
    app.get('/manifest.json', dynamicManifestHandler);
    app.get('/manifest.webmanifest', dynamicManifestHandler);

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
import { connectDatabase } from './lib/database';
import { startPeppolCronJobs } from './cron/peppol-status-checker';

// 🎯 FONCTION PRINCIPALE DE DÉMARRAGE
async function startServer() {
  try {
    // 🔌 ÉTAPE 1: Connexion à la base de données AVANT le serveur HTTP
    console.log('🔌 [STARTUP] Connexion à la base de données...');
    await connectDatabase();
    console.log('✅ [STARTUP] Base de données connectée');

    // 🐝 Auto-ensure swipe modules exist (wax, nectar, etc.)
    try {
      const { db } = await import('./lib/database');
      const swipeModules = [
        { key: 'wax', label: 'Wax', feature: 'wax-map', placement: 'swipe', tabIcon: 'wax-map', tabColor: '#E17055', order: 5 },
      ];
      for (const m of swipeModules) {
        const existing = await db.module.findUnique({ where: { key: m.key } });
        if (!existing) {
          await db.module.create({
            data: {
              id: `mod-${m.key}-${Date.now()}`,
              key: m.key,
              label: m.label,
              feature: m.feature,
              placement: m.placement,
              tabIcon: m.tabIcon,
              tabColor: m.tabColor,
              order: m.order,
              active: true,
              updatedAt: new Date(),
            },
          });
          console.log(`🐝 [BOOTSTRAP] Module '${m.key}' créé (placement=${m.placement})`);
        }
      }
    } catch (e) {
      console.warn('⚠️ [BOOTSTRAP] Erreur auto-ensure modules:', e);
    }

    // 🚀 ÉTAPE 2: Démarrage du serveur HTTP + Socket.io
    const httpServer = http.createServer(app);
    
    // 🔌 Initialisation Socket.io
    const io = initializeSocketIO(httpServer);
    console.log('🔌 [SOCKET.IO] WebSocket server attached to HTTP server');
    
    const server = httpServer.listen(port, '0.0.0.0', () => {
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
      console.log(`   - Auto Google Auth (POST): http://localhost:${port}/api/auto-google-auth/connect`);
      console.log(`   - Auto Google Status (GET): http://localhost:${port}/api/auto-google-auth/status`);

      // 🔄 Démarrage des jobs cron Peppol (vérification statuts)
      startPeppolCronJobs();

      // 🕯️ Cleanup cron: expire ephemeral messages + WaxPins (every 5 min)
      setInterval(async () => {
        try {
          const { db } = await import('./lib/database');
          const now = new Date();

          // Expire ephemeral messages viewed + TTL elapsed
          const expiredMsgs = await db.message.findMany({
            where: {
              isEphemeral: true,
              isExpired: false,
              viewedAt: { not: null },
              ephemeralTtl: { not: null },
            },
          });
          let expiredCount = 0;
          for (const m of expiredMsgs) {
            if (m.viewedAt && m.ephemeralTtl) {
              const expiresAt = new Date(m.viewedAt.getTime() + m.ephemeralTtl * 1000);
              if (now > expiresAt) {
                await db.message.update({
                  where: { id: m.id },
                  data: { isExpired: true, content: null, mediaUrls: undefined },
                });
                expiredCount++;
              }
            }
          }

          // Delete expired WaxPins
          const deletedPins = await db.waxPin.deleteMany({
            where: { expiresAt: { lt: now } },
          });

          if (expiredCount > 0 || deletedPins.count > 0) {
            console.log(`🕯️ [WAX-CLEANUP] ${expiredCount} messages expired, ${deletedPins.count} pins deleted`);
          }
        } catch (err) {
          console.error('⚠️ [WAX-CLEANUP] Error:', err);
        }
      }, 5 * 60 * 1000); // every 5 minutes
    });

    return server;
  } catch (error) {
    console.error('❌ [STARTUP] Erreur fatale au démarrage:', error);
    process.exit(1);
  }
}

// 🚀 Lancement du serveur
startServer().catch(err => {
  console.error('❌ [FATAL] Impossible de démarrer le serveur:', err);
  process.exit(1);
});

export { app };