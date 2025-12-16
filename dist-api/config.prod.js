"use strict";
// src/config.prod.ts
// Configuration pour l'environnement de production
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECURITY = exports.FORCE_REAL_DATA = exports.DISABLE_MOCK_DATA = exports.DISABLE_DEV_FEATURES = exports.ENABLE_API_LOGS = exports.API_URL = exports.TOKEN_EXPIRY = exports.JWT_SECRET = exports.IS_PRODUCTION = void 0;
// Forcer le mode production
exports.IS_PRODUCTION = true;
// Paramètres d'authentification
exports.JWT_SECRET = process.env.JWT_SECRET || 'prod_secret_key_change_me';
exports.TOKEN_EXPIRY = '24h'; // Durée de validité du token en production
// Paramètres de l'API
exports.API_URL = process.env.API_URL || 'https://api.crmpro.com';
exports.ENABLE_API_LOGS = false; // Désactiver les logs détaillés en production
// Désactiver les fonctionnalités de développement
exports.DISABLE_DEV_FEATURES = true;
exports.DISABLE_MOCK_DATA = true;
exports.FORCE_REAL_DATA = true;
exports.SECURITY = {
    REQUIRE_AUTH: true, // Toujours exiger une authentification
    VALIDATE_TOKENS: true, // Valider les tokens JWT
    ENFORCE_PERMISSIONS: true // Appliquer strictement les permissions
};
