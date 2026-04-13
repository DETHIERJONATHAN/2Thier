/**
 * #43 Automated Pruning — expired Stories, WaxPins, and dead sessions
 * 
 * Called on server startup and then every hour.
 */
import { db } from './database';
import { logger } from './logger';

const ONE_HOUR = 60 * 60 * 1000;

async function pruneExpiredData() {
  const now = new Date();
  try {
    // 1. Delete expired Stories (but keep highlights)
    const expiredStories = await db.story.deleteMany({
      where: {
        expiresAt: { lt: now },
        isHighlight: false,
      },
    });

    // 2. Delete expired WaxPins
    const expiredWaxPins = await db.waxPin.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // 3. Delete expired PostgreSQL sessions (express-session store)
    // The "session" table is managed by connect-pg-simple, rows have an "expire" column
    try {
      await db.$executeRawUnsafe(
        `DELETE FROM "session" WHERE "expire" < NOW() - INTERVAL '1 day'`
      );
    } catch {
      // Table may not exist yet or use different name — ignore silently
    }

    const total = expiredStories.count + expiredWaxPins.count;
    if (total > 0) {
      logger.debug(
        `🧹 [PRUNING] Cleaned: ${expiredStories.count} stories, ${expiredWaxPins.count} waxpins`
      );
    }
  } catch (err) {
    logger.error('[PRUNING] Error during cleanup:', err);
  }
}

let pruneInterval: ReturnType<typeof setInterval> | null = null;

export function startPruning() {
  // Run immediately on startup
  pruneExpiredData();
  // Then every hour
  pruneInterval = setInterval(pruneExpiredData, ONE_HOUR);
  logger.debug('🧹 [PRUNING] Automated pruning started (every 1h)');
}

export function stopPruning() {
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}
