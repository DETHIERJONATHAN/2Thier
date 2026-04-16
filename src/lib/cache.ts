/**
 * Unified cache abstraction.
 *
 * Backends, in order of preference:
 *   1. Redis, if `REDIS_URL` is set and `ioredis` is installed.
 *   2. In-memory Map with TTL expiry (per-process, no persistence).
 *
 * Callers should assume values round-trip as JSON — don't store class
 * instances or functions.
 */
import { logger } from './logger';

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

type Entry = { value: unknown; expiresAt: number | null };

class MemoryBackend implements CacheBackend {
  private store = new Map<string, Entry>();
  private readonly maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of Array.from(this.store.keys())) {
      if (re.test(k)) this.store.delete(k);
    }
  }
}

class RedisBackend implements CacheBackend {
  constructor(private client: {
    get: (k: string) => Promise<string | null>;
    set: (k: string, v: string, ...args: unknown[]) => Promise<unknown>;
    del: (k: string) => Promise<unknown>;
    keys: (p: string) => Promise<string[]>;
  }) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) await Promise.all(keys.map(k => this.client.del(k)));
  }
}

let backend: CacheBackend | null = null;

async function initBackend(): Promise<CacheBackend> {
  if (backend) return backend;
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      // Dynamic module name + @vite-ignore so Vite/Rollup doesn't try to resolve
      // the optional dependency at bundle analysis time.
      const modName = 'ioredis';
      const mod = await import(/* @vite-ignore */ modName).catch(() => null);
      if (mod) {
        const Redis = (mod as { default: new (url: string) => unknown }).default;
        const client = new Redis(url) as {
          get: (k: string) => Promise<string | null>;
          set: (k: string, v: string, ...args: unknown[]) => Promise<unknown>;
          del: (k: string) => Promise<unknown>;
          keys: (p: string) => Promise<string[]>;
          on: (event: string, cb: (err: Error) => void) => void;
        };
        client.on('error', (err) => logger.warn('[cache] Redis error:', err.message));
        backend = new RedisBackend(client);
        logger.info('[cache] Using Redis backend');
        return backend;
      }
      logger.warn('[cache] REDIS_URL set but ioredis not installed — falling back to memory');
    } catch (err) {
      logger.warn('[cache] Redis init failed:', (err as Error).message);
    }
  }
  backend = new MemoryBackend();
  return backend;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  return (await initBackend()).get<T>(key);
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  return (await initBackend()).set<T>(key, value, ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  return (await initBackend()).del(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  return (await initBackend()).delPattern(pattern);
}

/** Read-through helper: returns cached value or runs `loader` and caches the result. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null && hit !== undefined) return hit;
  const fresh = await loader();
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
}
