// src/config.ts
// Configuration globale de l'application

import * as prodConfig from './config.prod';
import fs from 'fs';

// Déterminer si nous sommes en production
const isProduction = process.env.NODE_ENV === 'production';

// 🔐 Fonction pour lire JWT_SECRET depuis plusieurs sources
const getJWTSecretFromConfig = (): string => {
  // ✅ PRIORITÉ 1: process.env (variables d'environnement Google Secret Manager)
  let secret = process.env.JWT_SECRET;
  if (secret && secret.trim()) {
    console.log('[CONFIG] ✅ JWT_SECRET trouvé dans process.env');
    return secret;
  }

  // ✅ PRIORITÉ 2: Fichier Cloud Run secret
  const cloudRunSecretPath = '/run/secrets/JWT_SECRET';
  if (fs.existsSync(cloudRunSecretPath)) {
    try {
      secret = fs.readFileSync(cloudRunSecretPath, 'utf-8').trim();
      if (secret) {
        console.log('[CONFIG] ✅ JWT_SECRET trouvé dans /run/secrets/JWT_SECRET');
        return secret;
      }
    } catch (err) {
      console.error('[CONFIG] ❌ Erreur à la lecture de /run/secrets/JWT_SECRET:', err);
    }
  }

  // ❌ FALLBACK: En production, JWT_SECRET est OBLIGATOIRE
  if (isProduction) {
    console.error('[CONFIG] ❌ FATAL: JWT_SECRET non disponible en production — arrêt immédiat');
    process.exit(1);
  }
  const fallbackSecret = 'dev_secret_key';
  return fallbackSecret;
};

// Configuration de base
export const IS_PRODUCTION = isProduction;
export const JWT_SECRET = getJWTSecretFromConfig();
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

// Log du mode
if (isProduction) {
  console.log('Application en mode PRODUCTION');
} else {
  console.log('Application en mode DÉVELOPPEMENT');
}

// Re-export la config prod pour usage externe si nécessaire
export { prodConfig };
