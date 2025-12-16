"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = exports.securityMetrics = void 0;
exports.logSecurityEvent = logSecurityEvent;
var winston_1 = __importDefault(require("winston"));
var winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
var path_1 = __importDefault(require("path"));
// 🔒 Configuration du logger de sécurité Enterprise
var securityLogger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(function (_a) {
        var timestamp = _a.timestamp, level = _a.level, message = _a.message, meta = __rest(_a, ["timestamp", "level", "message"]);
        return JSON.stringify(__assign({ timestamp: timestamp, level: level.toUpperCase(), message: message }, sanitizeLogData(meta)));
    })),
    defaultMeta: { service: 'crm-security' },
    transports: [
        // Console pour développement
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple(), winston_1.default.format.printf(function (_a) {
                var timestamp = _a.timestamp, level = _a.level, message = _a.message, meta = __rest(_a, ["timestamp", "level", "message"]);
                var sanitized = sanitizeLogData(meta);
                return "".concat(timestamp, " [").concat(level, "]: ").concat(message, " ").concat(Object.keys(sanitized).length ? JSON.stringify(sanitized) : '');
            }))
        }),
        // Fichier de log rotatif pour la sécurité
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(process.cwd(), 'logs', 'security-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            createSymlink: true,
            symlinkName: 'security-current.log'
        }),
        // Fichier séparé pour les erreurs critiques
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(process.cwd(), 'logs', 'security-errors-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d'
        })
    ]
});
exports.securityLogger = securityLogger;
// 🛡️ Fonction de sanitisation des données sensibles
function sanitizeLogData(data) {
    if (!data || typeof data !== 'object')
        return data;
    var sensitiveFields = [
        'password', 'token', 'secret', 'key', 'auth', 'authorization',
        'cookie', 'session', 'csrf', 'api_key', 'access_token', 'refresh_token'
    ];
    var sanitized = __assign({}, data);
    Object.keys(sanitized).forEach(function (key) {
        var lowerKey = key.toLowerCase();
        if (sensitiveFields.some(function (field) { return lowerKey.includes(field); })) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeLogData(sanitized[key]);
        }
    });
    return sanitized;
}
// 🚨 Fonction pour logger les événements de sécurité
function logSecurityEvent(eventType, details, level) {
    if (level === void 0) { level = 'info'; }
    var securityEvent = {
        eventType: eventType,
        timestamp: new Date().toISOString(),
        details: sanitizeLogData(details),
        severity: level,
        source: 'CRM_SECURITY_SYSTEM'
    };
    securityLogger[level]("SECURITY_EVENT: ".concat(eventType), securityEvent);
    // 🔔 Alertes pour événements critiques
    if (level === 'error' || eventType.includes('ATTACK') || eventType.includes('BREACH')) {
        console.error("\uD83D\uDEA8 ALERTE S\u00C9CURIT\u00C9: ".concat(eventType), securityEvent);
    }
}
// 📊 Métriques de sécurité
exports.securityMetrics = {
    requestCount: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
    lastReset: new Date()
};
