import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logSecurityEvent, securityMetrics } from './securityLogger';

// 🛡️ MIDDLEWARE DE MONITORING SÉCURISÉ
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Ajouter l'ID de requête pour le tracking
  (req as any).requestId = requestId;
  
  // Analyser les patterns suspects
  const suspiciousPatterns = [
    /(\<script\>)/gi,  // XSS basique
    /(union\s+select)/gi,  // SQL injection
    /(\.\.\/)|(\.\.\\)/g,  // Path traversal
    /(eval\(|function\s*\()/gi,  // Code injection
    /(exec\(|system\()/gi,  // Command injection
  ];
  
  const userAgent = req.headers['user-agent'] || '';
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(JSON.stringify(req.body || {})) ||
    pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    securityMetrics.suspiciousActivity++;
    logSecurityEvent('SUSPICIOUS_REQUEST', {
      requestId,
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent,
      body: req.body,
      patterns: 'detected'
    }, 'warn');
  }
  
  // Continuer avec la réponse
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    securityMetrics.requestCount++;
    
    // Logger les requêtes lentes (potentielles attaques)
    if (duration > 5000) {
      logSecurityEvent('SLOW_REQUEST', {
        requestId,
        duration,
        method: req.method,
        url: req.url,
        ip: req.ip
      }, 'warn');
    }
  });
  
  next();
};

// 🛡️ PROTECTION CONTRE LES ATTAQUES DE TIMING
export const timingAttackProtection = (req: Request, res: Response, next: NextFunction) => {
  const randomDelay = Math.floor(Math.random() * 50); // 0-50ms aléatoire
  
  setTimeout(() => {
    next();
  }, randomDelay);
};

// 🛡️ RATE LIMITING AVANCÉ AVEC WHITELIST
// Limiteur spécifique pour les endpoints d'authentification (permet plus de tentatives sans bloquer d'autres routes)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 tentatives de login / registre / reset par IP / 15min
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Spécifique pour Cloud Run
  message: { error: 'Trop de tentatives d\'authentification, réessayez plus tard.' },
  keyGenerator: (req: Request) => {
    const ipKey = ipKeyGenerator(req.ip ?? '');
    const identifier = (req.body && (req.body.email || req.body.username)) || 'anon';
    return `${ipKey}|${identifier}`;
  },
  handler: (req: Request, res: Response) => {
    securityMetrics.blockedRequests++;
    logSecurityEvent('AUTH_RATE_LIMIT', { ip: req.ip, url: req.url, bodyKeys: Object.keys(req.body || {}) }, 'warn');
    res.status(429).json({ error: 'Trop de tentatives', retryAfter: 900 });
  }
});

// Limiteur général API (exclut explicitement static et OPTIONS, plus plafond élevé)
export const advancedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  trustProxy: 1, // Spécifique pour Cloud Run
  max: (req: Request) => {
    // OPTIONS jamais compté (CORS preflight)
    if (req.method === 'OPTIONS') return 10_000;

    // Exclusions static
    if (
      req.path.startsWith('/assets/') ||
      req.path === '/manifest.webmanifest' ||
      req.path === '/registerSW.js' ||
      req.path === '/sw.js'
    ) return 10_000;

    const trustedIPs = ['127.0.0.1', '::1', 'localhost'];
    if (trustedIPs.includes(req.ip)) return 10_000;

    return 1000; // plafond général relevé
  },
  skip: (req: Request) => {
    return (
      req.method === 'OPTIONS' ||
      req.path.startsWith('/assets/') ||
      req.path === '/manifest.webmanifest' ||
      req.path === '/registerSW.js' ||
      req.path === '/sw.js'
    );
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard', retryAfter: '15 minutes' },
  handler: (req: Request, res: Response) => {
    securityMetrics.blockedRequests++;
    logSecurityEvent('API_RATE_LIMIT', { ip: req.ip, url: req.url, method: req.method }, 'warn');
    res.status(429).json({ error: 'Trop de requêtes', retryAfter: 900 });
  }
});

// 🛡️ DÉTECTION D'ANOMALIES COMPORTEMENTALES
const requestHistory = new Map<string, Array<{ timestamp: number; endpoint: string }>>();

export const anomalyDetection = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip;
  const currentTime = Date.now();
  const endpoint = req.path;
  
  if (!requestHistory.has(clientIP)) {
    requestHistory.set(clientIP, []);
  }
  
  const history = requestHistory.get(clientIP)!;
  
  // Nettoyer l'historique (garder seulement les 10 dernières minutes)
  const tenMinutesAgo = currentTime - (10 * 60 * 1000);
  const recentHistory = history.filter(req => req.timestamp > tenMinutesAgo);
  
  // Ajouter la requête actuelle
  recentHistory.push({ timestamp: currentTime, endpoint });
  requestHistory.set(clientIP, recentHistory);
  
  // Détecter les anomalies
  const requestsInLastMinute = recentHistory.filter(req => 
    req.timestamp > currentTime - 60000
  ).length;
  
  const uniqueEndpoints = new Set(recentHistory.map(req => req.endpoint)).size;
  const totalRequests = recentHistory.length;
  
  // Anomalie 1: Trop de requêtes en peu de temps (seuil élevé pour le développement)
  if (requestsInLastMinute > 200) {
    logSecurityEvent('ANOMALY_HIGH_FREQUENCY', {
      ip: clientIP,
      requestsPerMinute: requestsInLastMinute,
      userAgent: req.headers['user-agent']
    }, 'warn');
  }
  
  // Anomalie 2: Scanning de endpoints (beaucoup d'endpoints différents)
  if (uniqueEndpoints > 20 && totalRequests > 50) {
    logSecurityEvent('ANOMALY_ENDPOINT_SCANNING', {
      ip: clientIP,
      uniqueEndpoints,
      totalRequests,
      endpoints: Array.from(new Set(recentHistory.map(r => r.endpoint)))
    }, 'warn');
  }
  
  next();
};

// 🛡️ SANITISATION DES ENTRÉES - VERSION CORRIGÉE
export const inputSanitization = (req: Request, res: Response, next: NextFunction) => {
  // Sanitiser récursivement les objets
  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        // Nettoyer les caractères dangereux
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts
          .replace(/javascript:/gi, '') // Protocole javascript
          .replace(/on\w+\s*=/gi, '') // Event handlers
          .trim();
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };
  
  // Sanitiser body uniquement (query et params sont en lecture seule)
  if (req.body && typeof req.body === 'object') {
    try {
      req.body = sanitizeObject(req.body);
    } catch (e) {
      console.warn('Cannot sanitize req.body:', e);
    }
  }
  
  next();
};

// 🛡️ DÉTECTION D'INJECTION SQL BASIQUE
export const sqlInjectionDetection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i
  ];
  
  const checkForSQLInjection = (data: any): boolean => {
    if (typeof data === 'string') {
      return sqlPatterns.some(pattern => pattern.test(data));
    }
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(checkForSQLInjection);
    }
    return false;
  };
  
  const requestData = { 
    ...req.query, 
    ...req.body, 
    ...req.params,
    url: req.url 
  };
  
  if (checkForSQLInjection(requestData)) {
    logSecurityEvent('SQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      suspiciousData: requestData
    }, 'error');
    
    return res.status(400).json({
      error: 'Requête invalide détectée'
    });
  }
  
  next();
};