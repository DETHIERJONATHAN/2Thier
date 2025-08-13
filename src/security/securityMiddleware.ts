import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
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
export const advancedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // IPs de confiance (localhost, etc.)
    const trustedIPs = ['127.0.0.1', '::1', 'localhost'];
    if (trustedIPs.includes(req.ip)) return 1000;
    
    // Endpoints sensibles
    const sensitiveEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/reset'];
    if (sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))) {
      return 5; // Max 5 tentatives de connexion par 15min
    }
    
    return 100; // Limite générale
  },
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityMetrics.blockedRequests++;
    logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent']
    }, 'warn');
    
    res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Limite de requêtes dépassée. Veuillez réessayer plus tard.',
      retryAfter: 900 // 15 minutes en secondes
    });
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
  
  // Anomalie 1: Trop de requêtes en peu de temps
  if (requestsInLastMinute > 30) {
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