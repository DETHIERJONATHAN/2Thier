import { logger } from '../../../../lib/logger';
/**
 * 🔧 Logger de performance - Système de logs optimisé pour la production
 * 
 * Évite les logs coûteux en production et fournit des logs utiles en développement
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const performanceLogger = {
  debug: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      // logger.debug(`🔍 ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  info: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      // logger.info(`ℹ️ ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  warn: (message: string, ...data: unknown[]) => {
    if (isDevelopment) {
      // logger.warn(`⚠️ ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  error: (message: string, ...data: unknown[]) => {
    logger.error(`❌ ${message}`, ...data);
  },
  
  performance: (message: string, startTime: number) => {
    if (isDevelopment) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      // logger.debug(`⏱️ ${message}: ${duration.toFixed(2)}ms`); // ✨ Log réduit
    }
  }
};

export const withPerformanceMeasure = <T extends (...args: unknown[]) => any>(
  fn: T,
  label: string
): T => {
  if (!isDevelopment) {
    return fn;
  }

  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = fn(...args);
    performanceLogger.performance(label, startTime);
    return result;
  }) as T;
};
