import { PrismaClient } from '@prisma/client';

// Fabrique robuste de l'URL de base de données pour Prisma.
// Objectif: éviter un crash au démarrage si DATABASE_URL n'est pas défini sur Cloud Run
// en le reconstruisant à partir des variables PG* et/ou du socket Cloud SQL.
function buildDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL;
  if (direct && direct.trim().length > 0) {
    return direct;
  }

  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || '';
  const db = process.env.PGDATABASE || '2thier';

  // Instance Cloud SQL (ex: thiernew:europe-west1:crm-db)
  const instance = process.env.CLOUDSQL_INSTANCE || 'thiernew:europe-west1:crm-db';

  // Hôte: si PGHOST commence par /cloudsql, on l'utilise, sinon on utilise le socket de l'instance
  const pgHost = process.env.PGHOST;
  const socketHost = pgHost && pgHost.startsWith('/cloudsql/') ? pgHost : `/cloudsql/${instance}`;

  const encodedPwd = encodeURIComponent(password);
  // Pour les sockets Unix, Prisma recommande host=/cloudsql/INSTANCE en paramètre de requête, host réseau = localhost
  const url = `postgresql://${user}:${encodedPwd}@localhost:5432/${db}?host=${encodeURIComponent(socketHost)}`;

  console.warn('[Prisma] DATABASE_URL non défini. URL reconstruite depuis PG* et Cloud SQL:', {
    PGUSER: user,
    PGDATABASE: db,
    PGHOST: pgHost,
    CLOUDSQL_INSTANCE: instance,
    effectiveHostParam: socketHost
  });

  return url;
}

// Ajout pour éviter les multiples instances en développement avec le rechargement à chaud de Vite
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
    // 🚀 Configuration optimisée du connection pool
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  // ⚡ Optimisations de performance
  // @ts-expect-error - Configuration avancée non typée
    __internal: {
      engine: {
        // Connection pool optimisé selon l'environnement
        connection_limit: process.env.NODE_ENV === 'production' ? 20 : 5,
        pool_timeout: 30, // secondes
        connect_timeout: 10, // secondes
      },
    },
  });

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

// Tentative de connexion non bloquante pour diagnostiquer les problèmes de config en production
// (n'empêche pas le serveur de démarrer si la DB est momentanément indisponible)
void (async () => {
  try {
    // Ne pas faire échouer le démarrage: c'est un check best-effort
    await prismaClient.$connect();
    console.log('[Prisma] Connexion établie avec succès');
  } catch (err) {
    console.warn('[Prisma] Échec de connexion au démarrage (le serveur continue). Détails:', (err as Error)?.message);
  }
})();
