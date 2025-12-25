/**
 * 🔄 REDIRECTION VERS LA COUCHE D'ABSTRACTION DATABASE
 * =====================================================
 * 
 * Ce fichier est maintenu pour la compatibilité avec l'ancien code.
 * 
 * ⚠️ POUR LE NOUVEAU CODE, UTILISER:
 * ```typescript
 * import { db } from '@/lib/database';
 * ```
 * 
 * La logique de connexion, singleton et configuration est maintenant
 * centralisée dans src/lib/database.ts
 */

// Réexporter depuis la couche d'abstraction centralisée
export { db as prisma, db, Prisma, disconnectDatabase, checkDatabaseConnection, getDatabaseInfo } from './database';
export type { DatabaseClient } from './database';
