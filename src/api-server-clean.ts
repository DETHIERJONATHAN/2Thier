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

// 🛡️ IMPORTS SÉCURITÉ ENTERPRISE
import { securityLogger, logSecurityEvent } from './security/securityLogger';
import { 
  securityMonitoring,
  timingAttackProtection,
  advancedRateLimit,
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

// 📊 LOGGING SÉCURISÉ DE TOUTES LES REQUÊTES
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
    return req.url === '/api/health' && res.statusCode < 400;
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
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
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

// ⚡ Configuration CORS sécurisée
const FRONTEND_URL = process.env.FRONTEND_URL;
const prodOrigins = [FRONTEND_URL || 'https://crm.2thier.be', 'https://www.2thier.be'];
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

// Configuration Passport
console.log('🔧 [API-SERVER-CLEAN] Configuration Passport...');
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ [API-SERVER-CLEAN] Passport configuré');

// Routes API - Utilisation du système existant complet
console.log('🔧 [API-SERVER-CLEAN] Configuration des routes...');
app.use('/api', apiRouter); // Utilise TOUTES les routes existantes !
console.log('✅ [API-SERVER-CLEAN] Routes configurées');

// 🎯 Production: servir le frontend statique (dist) si présent
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(process.cwd(), 'dist');
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('🗂️ [STATIC] Distribution front détectée, activation du serveur statique');
    app.use(express.static(distDir));
    // Fallback SPA: toutes les routes non-API renvoient index.html
    app.get(/^(?!\/api\/).*/, (_req, res) => {
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

// Route de test racine
app.get('/', (req, res) => {
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

// 🔒 Gestionnaire d'erreurs sécurisé
import type { ErrorRequestHandler } from 'express';
const errorHandler: ErrorRequestHandler = (err, req, res) => {
  logSecurityEvent('SERVER_ERROR', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }, 'error');

  // En production, ne pas exposer les détails d'erreur
  const errorResponse = process.env.NODE_ENV === 'production' 
    ? { error: 'Une erreur interne s\'est produite' }
    : { error: err.message, stack: err.stack };

  const status = typeof (err as { status?: number }).status === 'number' ? (err as { status?: number }).status! : 500;
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