import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import logger from './logger';

function sendMetric(metric: { name: string; value: number; rating: string }) {
  logger.debug(`[WebVitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
}

export function reportWebVitals() {
  onCLS(sendMetric);
  onFCP(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}
