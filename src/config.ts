// src/config.ts
// Configuration globale de l'application

import * as prodConfig from './config.prod';

// Déterminer si nous sommes en production
const isProduction = process.env.NODE_ENV === 'production';

// Configuration de base
export const IS_PRODUCTION = isProduction;
export const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? 'prod_secret_key' : 'dev_secret_key');
export const TOKEN_EXPIRY = isProduction ? '24h' : '8h';

// Configuration API
// Base API dynamique : on évite de figer 'http://localhost:4000' afin de ne pas le retrouver dans le bundle prod.
// En dev, le hook useAuthenticatedApi gère déjà un fallback local si aucune variable n'est définie.
export const API_URL = process.env.API_URL || (isProduction ? 'https://api.crmpro.com' : '');
export const ENABLE_API_LOGS = !isProduction;

// Fonctionnalités de développement
export const DISABLE_DEV_FEATURES = isProduction;
export const DISABLE_MOCK_DATA = isProduction;
export const FORCE_REAL_DATA = isProduction;

// Sécurité
export const SECURITY = {
  REQUIRE_AUTH: isProduction,      // Toujours exiger une authentification en production
  VALIDATE_TOKENS: isProduction,   // Toujours valider les tokens JWT en production
  ENFORCE_PERMISSIONS: isProduction // Toujours appliquer les permissions en production
};

// En production, utiliser la configuration de production
if (isProduction) {
  console.log('Application en mode PRODUCTION');
  Object.assign(exports, prodConfig);
} else {
  console.log('Application en mode DÉVELOPPEMENT');
}
