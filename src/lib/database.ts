/**
 * 🎯 DATABASE ABSTRACTION LAYER
 * =============================
 * 
 * Point d'entrée UNIQUE pour tous les accès à la base de données.
 * 
 * POURQUOI CETTE COUCHE D'ABSTRACTION ?
 * - Centraliser la configuration de la base de données
 * - Permettre de changer de technologie (Prisma -> Drizzle, TypeORM, SQL brut) en un seul endroit
 * - Éviter les fuites de connexions (singleton garanti)
 * - Faciliter les tests (mock facile)
 * 
 * COMMENT UTILISER :
 * ```typescript
 * // ✅ BONNE PRATIQUE - Import depuis database.ts
 * import { db } from '@/lib/database';
 * const users = await db.user.findMany();
 * 
 * // ❌ MAUVAISE PRATIQUE - Ne JAMAIS faire ça
 * import { PrismaClient } from '@prisma/client';
 * const prisma = new PrismaClient(); // INTERDIT !
 * ```
 * 
 * POUR CHANGER DE BASE DE DONNÉES :
 * 1. Modifier uniquement ce fichier
 * 2. Adapter l'export `db` pour utiliser le nouveau client
 * 3. Optionnellement créer des adaptateurs pour les méthodes spécifiques
 * 
 * @module database
 * @version 2.0.0
 * @author CRM Team
 */

import { PrismaClient, Prisma } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Type d'adaptateur de base de données.
 * Pour l'instant, seul Prisma est supporté. Ajouter d'autres options ici.
 */
export type DatabaseAdapter = 'prisma' | 'drizzle' | 'typeorm' | 'raw';

/**
 * Adaptateur actuel - changer cette valeur pour migrer
 */
const CURRENT_ADAPTER: DatabaseAdapter = 'prisma';

/**
 * Configuration de connexion selon l'environnement
 */
const DB_CONFIG = {
  development: {
    connectionLimit: 5,
    poolTimeout: 30,
    connectTimeout: 10,
    logLevel: ['warn', 'error'] as Prisma.LogLevel[],
  },
  production: {
    connectionLimit: 20,
    poolTimeout: 30,
    connectTimeout: 10,
    logLevel: [] as Prisma.LogLevel[],
  },
  test: {
    connectionLimit: 2,
    poolTimeout: 10,
    connectTimeout: 5,
    logLevel: ['error'] as Prisma.LogLevel[],
  },
};

// ============================================================================
// DATABASE URL BUILDER
// ============================================================================

/**
 * Construit l'URL de connexion à la base de données.
 * Supporte Google Cloud SQL (Unix socket) et connexions directes.
 */
function buildDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL;
  if (direct && direct.trim().length > 0) {
    return direct;
  }

  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const db = process.env.PGDATABASE || '2thier';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';

  // Si PGHOST est un socket Unix (Cloud SQL)
  if (host.startsWith('/cloudsql/')) {
    const encodedPwd = encodeURIComponent(password);
    const url = `postgresql://${user}:${encodedPwd}@localhost/${db}?host=${encodeURIComponent(host)}`;
    
    console.warn('[Database] Connexion via Unix socket Cloud SQL:', {
      PGUSER: user,
      PGDATABASE: db,
      PGHOST: host,
    });
    
    return url;
  }

  // Connexion standard (local, TCP)
  const encodedPwd = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPwd}@${host}:${port}/${db}`;
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

// Stockage global pour éviter les multiples instances en développement (hot reload)
const globalForDb = globalThis as unknown as { 
  __db_instance: PrismaClient | undefined;
  __db_initialized: boolean;
};

/**
 * Crée ou retourne l'instance singleton de PrismaClient
 */
function createPrismaInstance(): PrismaClient {
  if (globalForDb.__db_instance) {
    return globalForDb.__db_instance;
  }

  const env = (process.env.NODE_ENV || 'development') as keyof typeof DB_CONFIG;
  const config = DB_CONFIG[env] || DB_CONFIG.development;

  const instance = new PrismaClient({
    log: config.logLevel,
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });

  // Stocker globalement en développement pour éviter les duplications avec hot reload
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__db_instance = instance;
  }

  return instance;
}

/**
 * 🔌 CONNEXION SYNCHRONE
 * 
 * Fonction utilitaire pour établir la connexion à la base de données
 * AVANT de démarrer le serveur HTTP.
 * 
 * @example
 * ```typescript
 * // Dans api-server-clean.ts
 * await connectDatabase();
 * app.listen(port, () => { ... });
 * ```
 */
export async function connectDatabase(): Promise<void> {
  if (globalForDb.__db_initialized) {
    console.log('[Database] ⚡ Connexion déjà établie (singleton)');
    return;
  }

  globalForDb.__db_initialized = true;
  
  try {
    console.log('[Database] 🔌 Connexion en cours...');
    await db.$connect();
    console.log('[Database] ✅ Connexion établie avec succès');
  } catch (err) {
    console.error('[Database] ❌ Échec de connexion:', (err as Error)?.message);
    throw err; // Propager l'erreur pour arrêter le démarrage du serveur
  }
}

// ============================================================================
// EXPORTS PRINCIPAUX
// ============================================================================

/**
 * 🎯 INSTANCE PRINCIPALE DE LA BASE DE DONNÉES
 * 
 * C'est LA seule instance à utiliser dans toute l'application.
 * Uses $extends to auto-limit findMany calls without explicit `take`.
 * 
 * @example
 * ```typescript
 * import { db } from '@/lib/database';
 * 
 * // Requêtes
 * const users = await db.user.findMany();
 * const user = await db.user.findUnique({ where: { id } });
 * 
 * // Transactions
 * await db.$transaction([...]);
 * ```
 */

/** Maximum default take for findMany auto-limit via $extends */
const MAX_DEFAULT_TAKE = 1000;

const _basePrisma = createPrismaInstance();

// $extends: auto-limit findMany calls that don't specify a `take` param
export const db = _basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ args, query }: { args: Record<string, unknown>; query: (args: Record<string, unknown>) => Promise<unknown> }) {
        if (args.take === undefined) {
          args.take = MAX_DEFAULT_TAKE;
        }
        return query(args);
      },
    },
  },
}) as unknown as typeof _basePrisma;

/**
 * Alias pour compatibilité avec l'ancien code
 * @deprecated Utiliser `db` à la place
 */
export const prisma = db;

/**
 * Type du client de base de données (pour les signatures de fonction)
 */
export type DatabaseClient = typeof db;

/**
 * Réexport des types Prisma pour les définitions de types
 * Ceci permet de ne pas avoir à importer directement depuis @prisma/client
 */
export { Prisma };
export type { PrismaClient };

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Ferme proprement la connexion à la base de données.
 * À utiliser lors de l'arrêt du serveur ou dans les tests.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    console.log('[Database] Connexion fermée proprement');
  } catch (err) {
    console.error('[Database] Erreur lors de la fermeture:', (err as Error)?.message);
  }
}

/**
 * Vérifie que la connexion à la base de données est active.
 * Utile pour les health checks.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Retourne des informations sur la configuration actuelle
 */
export function getDatabaseInfo(): {
  adapter: DatabaseAdapter;
  environment: string;
  connected: boolean;
} {
  return {
    adapter: CURRENT_ADAPTER,
    environment: process.env.NODE_ENV || 'development',
    connected: globalForDb.__db_initialized || false,
  };
}

// ============================================================================
// INTERFACE D'ABSTRACTION (pour migration future)
// ============================================================================

/**
 * Interface générique pour les opérations de base de données.
 * Permet de créer des adaptateurs pour différentes technologies.
 * 
 * @example Implémentation future pour Drizzle
 * ```typescript
 * class DrizzleAdapter implements DatabaseOperations {
 *   async findMany<T>(table: string, options: FindOptions): Promise<T[]> {
 *     // Implémentation Drizzle
 *   }
 * }
 * ```
 */
export interface DatabaseOperations {
  findMany<T>(table: string, options?: unknown): Promise<T[]>;
  findUnique<T>(table: string, where: unknown): Promise<T | null>;
  create<T>(table: string, data: unknown): Promise<T>;
  update<T>(table: string, where: unknown, data: unknown): Promise<T>;
  delete<T>(table: string, where: unknown): Promise<T>;
  transaction<T>(operations: (() => Promise<unknown>)[]): Promise<T>;
}

// ============================================================================
// HOOKS DE LIFECYCLE (pour monitoring/logging)
// ============================================================================

// Gestion propre de l'arrêt du processus
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

// Log de l'adaptateur utilisé au démarrage
console.log(`[Database] Adaptateur: ${CURRENT_ADAPTER} | Env: ${process.env.NODE_ENV || 'development'}`);
