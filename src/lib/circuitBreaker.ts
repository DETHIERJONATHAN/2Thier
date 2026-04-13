import { logger } from './logger';
/**
 * Circuit Breaker — Pattern de résilience pour appels externes
 * 
 * États : CLOSED (normal) → OPEN (circuit coupé) → HALF_OPEN (test)
 * 
 * Usage:
 *   const breaker = new CircuitBreaker('telnyx', { failureThreshold: 5, resetTimeout: 30000 });
 *   const result = await breaker.execute(() => axios.get('https://api.telnyx.com/v2/calls'));
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Nombre d'échecs consécutifs avant ouverture (défaut: 5) */
  failureThreshold?: number;
  /** Durée en ms avant tentative de fermeture (défaut: 30s) */
  resetTimeout?: number;
  /** Timeout en ms pour chaque appel (défaut: 15s) */
  callTimeout?: number;
  /** Nombre de succès en HALF_OPEN pour refermer (défaut: 2) */
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly callTimeout: number;
  private readonly successThreshold: number;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30_000;
    this.callTimeout = options.callTimeout ?? 15_000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] OPEN → HALF_OPEN`);
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    try {
      const result = await this.withTimeout(fn(), this.callTimeout);
      this.onSuccess();
      return result;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) throw error;
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] HALF_OPEN → CLOSED`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker:${this.name}] CLOSED → OPEN (${this.failureCount} failures)`);
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[CircuitBreaker:${this.name}] Timeout after ${ms}ms`));
      }, ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker "${serviceName}" is OPEN — service unavailable`);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ── Instances partagées pour les services externes critiques ──
export const telnyxBreaker = new CircuitBreaker('telnyx', {
  failureThreshold: 5,
  resetTimeout: 30_000,
  callTimeout: 15_000,
});

export const postalBreaker = new CircuitBreaker('postal', {
  failureThreshold: 3,
  resetTimeout: 60_000,
  callTimeout: 10_000,
});

export const googleAuthBreaker = new CircuitBreaker('google-auth', {
  failureThreshold: 3,
  resetTimeout: 45_000,
  callTimeout: 10_000,
});

export const vatLookupBreaker = new CircuitBreaker('vat-lookup', {
  failureThreshold: 5,
  resetTimeout: 60_000,
  callTimeout: 10_000,
});

/** Registry pour le health check */
export function getAllCircuitBreakers() {
  return [telnyxBreaker, postalBreaker, googleAuthBreaker, vatLookupBreaker];
}
