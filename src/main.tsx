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
  <StrictMode>
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
  </StrictMode>,
)
