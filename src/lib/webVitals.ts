import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { trackEvent } from './analytics';

function sendMetric(metric: { name: string; value: number; rating: string }) {
  trackEvent('web_vitals', {
    event_category: 'Web Vitals',
    event_label: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    metric_rating: metric.rating,
    non_interaction: true,
  });
}

export function reportWebVitals() {
  onCLS(sendMetric);
  onFCP(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}
