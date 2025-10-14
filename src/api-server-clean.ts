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

// 🔥 ROUTES TBL SPÉCIALISÉES
import tblSubmissionEvaluatorRouter from './components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator';

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

// 🌐 MIDDLEWARE DÉTECTION SITES VITRINES AUTOMATIQUE
import { detectWebsite } from './middleware/websiteDetection';
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

console.log('🚀 [API-SERVER-CLEAN] Démarrage du serveur CRM...');

// 🔒 INITIALISATION LOGGING SÉCURISÉ ENTERPRISE
logSecurityEvent('SERVER_STARTUP', {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  environment: process.env.NODE_ENV || 'development',
  securityLevel: 'ENTERPRISE'
}, 'info');

const app = express();
const port = Number(process.env.PORT || 4000);
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
app.use(expressWinston.logger({
  winstonInstance: securityLogger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: false,
  colorize: false,
  requestWhitelist: ['method', 'url', 'ip'],
  responseWhitelist: ['statusCode'],
  skip: (req, res) => {
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
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
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

// ⚡ Configuration CORS sécurisée (ajout app.2thier.be)
const FRONTEND_URL = process.env.FRONTEND_URL;
const prodOrigins = [
  FRONTEND_URL || 'https://app.2thier.be',
  'https://www.2thier.be',
  'https://crm.2thier.be'
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
    sameSite: 'strict'
  },
  store: undefined // TODO: Ajouter un store persistant en production
}));

console.log('✅ [ENTERPRISE-SECURITY] Configuration sécurité niveau Enterprise activée');

// 📸 Servir les fichiers uploadés en statique
const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
app.use('/uploads', express.static(uploadsDir));
console.log('📸 [UPLOADS] Dossier uploads configuré:', uploadsDir);

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
app.use('/api/ai', aiFieldGeneratorRouter); // 🤖 IA GÉNÉRATION INTELLIGENTE (generate-field, status)
app.use('/api/ai', aiRouter); // 🤖 GEMINI AI (suggestions, optimisations)
app.use('/api', contactFormRouter); // 📧 FORMULAIRE DE CONTACT SITE VITRINE
app.use('/api', imageUploadRouter); // 📸 UPLOAD D'IMAGES (LOGOS, PHOTOS)
app.use('/api/tbl', tblSubmissionEvaluatorRouter); // 🔥 TBL PRISMA EVALUATOR
console.log('✅ [API-SERVER-CLEAN] Routes configurées');

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// 🌐 MIDDLEWARE DE DÉTECTION AUTOMATIQUE DES SITES VITRINES
// Doit être AVANT le serveur de fichiers statiques pour intercepter les domaines
app.use(detectWebsite);

//  Production: servir le frontend statique (dist) si présent
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('🗂️ [STATIC] Distribution front détectée, activation du serveur statique');
    
    // ⚡ IMPORTANT: Servir les assets statiques (CSS, JS, images)
    app.use(express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));
    
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

// Démarrage du serveur
app.listen(port, () => {
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

  console.log(`🎉 [API-SERVER-CLEAN] Serveur CRM démarré avec succès sur http://localhost:${port}`);
  console.log(`🛡️ [ENTERPRISE-SECURITY] Sécurité niveau 100% activée`);
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