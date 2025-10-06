import { PrismaClient } from '@prisma/client';

// Ajout pour éviter les multiples instances en développement avec le rechargement à chaud de Vite
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
    // 🚀 Configuration optimisée du connection pool
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // ⚡ Optimisations de performance
    // @ts-ignore - Configuration avancée non typée
    __internal: {
      engine: {
        // Connection pool optimisé selon l'environnement
        connection_limit: process.env.NODE_ENV === 'production' ? 20 : 5,
        pool_timeout: 30, // secondes
        connect_timeout: 10, // secondes
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
