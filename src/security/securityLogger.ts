import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

// 🔒 Configuration du logger de sécurité Enterprise
// En production (Cloud Run), on utilise uniquement la console car:
// 1. Le système de fichiers est en lecture seule (sauf /tmp)
// 2. Cloud Run intègre nativement Cloud Logging
const transports: winston.transport[] = [
  // Console pour tous les environnements
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const sanitized = sanitizeLogData(meta);
        return `${timestamp} [${level}]: ${message} ${Object.keys(sanitized).length ? JSON.stringify(sanitized) : ''}`;
      })
    )
  })
];

// En développement uniquement, ajouter les logs fichiers
if (!isProduction) {
  transports.push(
    // Fichier de log rotatif pour la sécurité
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      createSymlink: true,
      symlinkName: 'security-current.log'
    }),
    // Fichier séparé pour les erreurs critiques
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'security-errors-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  );
}

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        message,
        ...sanitizeLogData(meta)
      });
    })
  ),
  defaultMeta: { service: 'crm-security' },
  transports
});

// 🛡️ Fonction de sanitisation des données sensibles
function sanitizeLogData(data: unknown): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'csrf', 'api_key', 'access_token', 'refresh_token'
  ];
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });
  
  return sanitized;
}

// 🚨 Fonction pour logger les événements de sécurité
export function logSecurityEvent(
  eventType: string, 
  details: Record<string, unknown>, 
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const securityEvent = {
    eventType,
    timestamp: new Date().toISOString(),
    details: sanitizeLogData(details),
    severity: level,
    source: 'CRM_SECURITY_SYSTEM'
  };
  
  securityLogger[level](`SECURITY_EVENT: ${eventType}`, securityEvent);
  
  // 🔔 Alertes pour événements critiques
  if (level === 'error' || eventType.includes('ATTACK') || eventType.includes('BREACH')) {
    console.error(`🚨 ALERTE SÉCURITÉ: ${eventType}`, securityEvent);
  }
}

// 📊 Métriques de sécurité
export const securityMetrics = {
  requestCount: 0,
  blockedRequests: 0,
  suspiciousActivity: 0,
  lastReset: new Date()
};

export { securityLogger };