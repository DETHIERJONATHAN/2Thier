import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from '../../src/lib/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      resetTimeout: 100, // 100ms pour les tests
      callTimeout: 500,
      successThreshold: 2,
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('remains CLOSED on success', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('opens after failureThreshold consecutive failures', async () => {
    const fail = () => breaker.execute(() => Promise.reject(new Error('fail')));
    await expect(fail()).rejects.toThrow('fail');
    await expect(fail()).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('CLOSED');
    await expect(fail()).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('OPEN');
  });

  it('throws CircuitBreakerOpenError when OPEN', async () => {
    // Force OPEN
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    await expect(breaker.execute(() => Promise.resolve('ok')))
      .rejects.toThrow(CircuitBreakerOpenError);
  });

  it('transitions to HALF_OPEN after resetTimeout', async () => {
    // Force OPEN
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(breaker.getState()).toBe('OPEN');

    // Wait for resetTimeout
    await new Promise(r => setTimeout(r, 150));

    // Next call should transition to HALF_OPEN and succeed
    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    // After 1 success we need 2 for CLOSED (successThreshold=2)
    expect(breaker.getState()).toBe('HALF_OPEN');
  });

  it('closes after successThreshold successes in HALF_OPEN', async () => {
    // Force OPEN
    for (let i = 0; i < 3; i++) {
      await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 150));

    // 2 successes should close it
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('HALF_OPEN');
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('resets failure count on success', async () => {
    // 2 failures (not enough to open)
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    // 1 success resets
    await breaker.execute(() => Promise.resolve('ok'));
    // 2 more failures should NOT open (count was reset)
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('handles timeout', async () => {
    const slowFn = () => new Promise<string>((resolve) => {
      setTimeout(() => resolve('too late'), 1000);
    });
    await expect(breaker.execute(slowFn)).rejects.toThrow('Timeout after 500ms');
  });

  it('getStats returns correct info', async () => {
    await breaker.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    const stats = breaker.getStats();
    expect(stats.name).toBe('test-service');
    expect(stats.state).toBe('CLOSED');
    expect(stats.failureCount).toBe(1);
  });
});
