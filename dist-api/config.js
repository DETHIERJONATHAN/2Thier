"use strict";
// src/config.ts
// Configuration globale de l'application
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY = exports.FORCE_REAL_DATA = exports.DISABLE_MOCK_DATA = exports.DISABLE_DEV_FEATURES = exports.ENABLE_API_LOGS = exports.API_URL = exports.TOKEN_EXPIRY = exports.JWT_SECRET = exports.IS_PRODUCTION = void 0;
var prodConfig = __importStar(require("./config.prod"));
var fs_1 = __importDefault(require("fs"));
// Déterminer si nous sommes en production
var isProduction = process.env.NODE_ENV === 'production';
// 🔐 Fonction pour lire JWT_SECRET depuis plusieurs sources
var getJWTSecretFromConfig = function () {
    // ✅ PRIORITÉ 1: process.env (variables d'environnement Google Secret Manager)
    var secret = process.env.JWT_SECRET;
    if (secret && secret.trim()) {
        console.log('[CONFIG] ✅ JWT_SECRET trouvé dans process.env');
        return secret;
    }
    // ✅ PRIORITÉ 2: Fichier Cloud Run secret
    var cloudRunSecretPath = '/run/secrets/JWT_SECRET';
    if (fs_1.default.existsSync(cloudRunSecretPath)) {
        try {
            secret = fs_1.default.readFileSync(cloudRunSecretPath, 'utf-8').trim();
            if (secret) {
                console.log('[CONFIG] ✅ JWT_SECRET trouvé dans /run/secrets/JWT_SECRET');
                return secret;
            }
        }
        catch (err) {
            console.error('[CONFIG] ❌ Erreur à la lecture de /run/secrets/JWT_SECRET:', err);
        }
    }
    // ❌ FALLBACK: Clé de développement/production par défaut
    var fallbackSecret = isProduction ? 'prod_secret_key' : 'dev_secret_key';
    if (isProduction) {
        console.warn('[CONFIG] ⚠️ JWT_SECRET non disponible en production, utilisateur une clé par défaut');
    }
    return fallbackSecret;
};
// Configuration de base
exports.IS_PRODUCTION = isProduction;
exports.JWT_SECRET = getJWTSecretFromConfig();
exports.TOKEN_EXPIRY = isProduction ? '24h' : '8h';
// Configuration API
// Base API dynamique : on évite de figer 'http://localhost:4000' afin de ne pas le retrouver dans le bundle prod.
// En dev, le hook useAuthenticatedApi gère déjà un fallback local si aucune variable n'est définie.
exports.API_URL = process.env.API_URL || (isProduction ? 'https://api.crmpro.com' : '');
exports.ENABLE_API_LOGS = !isProduction;
// Fonctionnalités de développement
exports.DISABLE_DEV_FEATURES = isProduction;
exports.DISABLE_MOCK_DATA = isProduction;
exports.FORCE_REAL_DATA = isProduction;
// Sécurité
exports.SECURITY = {
    REQUIRE_AUTH: isProduction, // Toujours exiger une authentification en production
    VALIDATE_TOKENS: isProduction, // Toujours valider les tokens JWT en production
    ENFORCE_PERMISSIONS: isProduction // Toujours appliquer les permissions en production
};
// En production, utiliser la configuration de production
if (isProduction) {
    console.log('Application en mode PRODUCTION');
    Object.assign(exports, prodConfig);
}
else {
    console.log('Application en mode DÉVELOPPEMENT');
}
