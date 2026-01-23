import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Ant Design reset avant nos styles pour harmoniser l'UI
import 'antd/dist/reset.css'
import './index.css'
import './styles/crm-marketplace-style.css'
import './styles/2thier-colors.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './auth/AuthProvider'
import suppressAntdWarnings from './utils/suppressAntdWarnings'
import initConsoleFilter from './utils/consoleFilter'
import { ConfigProvider, theme as antdTheme, App as AntdApp } from 'antd'
import frFR from 'antd/locale/fr_FR'

// ✅ Aide au diagnostic: afficher les erreurs JS critiques en DEV
if (import.meta.env.DEV) {
  const renderFatalError = (title: string, detail: string) => {
    let overlay = document.getElementById('fatal-error-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fatal-error-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '999999';
      overlay.style.background = 'rgba(255, 255, 255, 0.98)';
      overlay.style.color = '#111827';
      overlay.style.padding = '24px';
      overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      overlay.style.fontSize = '12px';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.overflow = 'auto';
      document.body.appendChild(overlay);
    }
    overlay.textContent = `❌ ${title}\n\n${detail}`;
  };

  window.addEventListener('error', (event) => {
    const message = event.error?.stack || event.message || 'Erreur JavaScript inconnue';
    renderFatalError('Erreur JavaScript', message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.stack || event.reason.message : String(event.reason);
    renderFatalError('Promise non gérée', reason);
  });
}

// Supprimer les avertissements Ant Design en mode développement
suppressAntdWarnings();

// Réduire le bruit des logs en développement sans casser les erreurs
initConsoleFilter();

// Ne pas effacer le localStorage en production
// Commenté pour conserver les sessions authentifiées
// if (import.meta.env.DEV) {
//   console.log("Mode développement - Effacement du localStorage pour forcer la réauthentification");
//   localStorage.clear();
// }

createRoot(document.getElementById('root')!).render(
  // StrictMode désactivé pour éviter le double-mounting visible (mount → unmount → mount)
  // qui cause des flash visuels en développement
  // <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <ConfigProvider
            locale={frFR}
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
  // </StrictMode>
  ,
)
