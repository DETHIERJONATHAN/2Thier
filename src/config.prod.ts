// src/config.prod.ts
// Configuration pour l'environnement de production

// Forcer le mode production
export const IS_PRODUCTION = true;

// Paramètres d'authentification
export const JWT_SECRET = process.env.JWT_SECRET || 'prod_secret_key_change_me';
export const TOKEN_EXPIRY = '24h';  // Durée de validité du token en production

// Paramètres de l'API
export const API_URL = process.env.API_URL || 'https://api.crmpro.com';
export const ENABLE_API_LOGS = false;  // Désactiver les logs détaillés en production

// Désactiver les fonctionnalités de développement
export const DISABLE_DEV_FEATURES = true;
export const DISABLE_MOCK_DATA = true;
export const FORCE_REAL_DATA = true;

export const SECURITY = {
  REQUIRE_AUTH: true,          // Toujours exiger une authentification
  VALIDATE_TOKENS: true,       // Valider les tokens JWT
  ENFORCE_PERMISSIONS: true    // Appliquer strictement les permissions
};
