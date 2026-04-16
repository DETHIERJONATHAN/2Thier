import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
initSentry();
initAnalytics();

// Auto-reload when a Vite chunk fails to load (stale deployment / hash mismatch)
window.addEventListener('unhandledrejection', (event) => {
  const msg: string = (event.reason as Error)?.message ?? '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('ChunkLoadError')) {
    window.location.reload();
  }
});

import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
// Ant Design reset avant nos styles pour harmoniser l'UI
import 'antd/dist/reset.css'
import './index.css'
import './styles/crm-marketplace-style.css'
import './styles/2thier-colors.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './auth/AuthProvider'
import { trackPageView } from './lib/analytics'
import suppressAntdWarnings from './utils/suppressAntdWarnings'
import initConsoleFilter from './utils/consoleFilter'
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd'
import frFR from 'antd/locale/fr_FR'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'

// i18n — must be imported before App to initialize
import './i18n'

// Supprimer les avertissements Ant Design en mode développement
suppressAntdWarnings();

// Réduire le bruit des logs en développement sans casser les erreurs
initConsoleFilter();

// Ant Design locale map synced with i18n
const antdLocales: Record<string, typeof frFR> = { fr: frFR, en: enUS };

function PageViewTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
  return null;
}

const Root = () => {
  const { i18n: i18nInstance } = useTranslation();
  const antdLocale = antdLocales[i18nInstance.language?.substring(0, 2)] || frFR;

  return (
    <HelmetProvider>
    <BrowserRouter>
      <PageViewTracker />
      <AuthProvider>
        <ErrorBoundary>
          <ConfigProvider
            locale={antdLocale}
            theme={{
              token: {
                colorPrimary: '#2C5967',
                colorInfo: '#2C5967',
                borderRadius: 8,
                colorBgLayout: '#f5f7fb',
                colorBgContainer: '#ffffff',
                colorText: '#1f2933',
                colorTextSecondary: '#4b5563',
                colorBorder: '#e5e7eb',
                fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
              },
              algorithm: antdTheme.defaultAlgorithm,
            }}
          >
            <AntdApp>
              <App />
            </AntdApp>
          </ConfigProvider>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <Root />
)

// Report Web Vitals (CLS, FCP, INP, LCP, TTFB)
import('./lib/webVitals').then(({ reportWebVitals }) => reportWebVitals());
