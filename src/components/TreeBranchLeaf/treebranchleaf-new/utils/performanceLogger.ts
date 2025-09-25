/**
 * 🔧 Logger de performance - Système de logs optimisé pour la production
 * 
 * Évite les logs coûteux en production et fournit des logs utiles en développement
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const performanceLogger = {
  debug: (message: string, ...data: any[]) => {
    if (isDevelopment) {
      // console.log(`🔍 ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  info: (message: string, ...data: any[]) => {
    if (isDevelopment) {
      // console.info(`ℹ️ ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  warn: (message: string, ...data: any[]) => {
    if (isDevelopment) {
      // console.warn(`⚠️ ${message}`, ...data); // ✨ Log réduit
    }
  },
  
  error: (message: string, ...data: any[]) => {
    console.error(`❌ ${message}`, ...data);
  },
  
  performance: (message: string, startTime: number) => {
    if (isDevelopment) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      // console.log(`⏱️ ${message}: ${duration.toFixed(2)}ms`); // ✨ Log réduit
    }
  }
};

export const withPerformanceMeasure = <T extends (...args: any[]) => any>(
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
