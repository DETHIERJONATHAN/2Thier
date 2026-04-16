// ============================================================================
// ANALYTICS - Google Analytics 4 + Web Vitals
// ============================================================================
// GA4 Measurement ID: configurable via env var VITE_GA4_ID
// Web Vitals: automatically reported to GA4 for Core Web Vitals monitoring
// ============================================================================

const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initAnalytics() {
  if (initialized || !GA4_ID) return;
  initialized = true;

  // Load gtag.js
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, {
    send_page_view: false, // We handle page views manually for SPA
  });
}

export function trackPageView(path: string) {
  if (!GA4_ID || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!GA4_ID || !window.gtag) return;
  window.gtag('event', name, params);
}
