import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { AuthProvider } from './auth/AuthProvider'
import suppressAntdWarnings from './utils/suppressAntdWarnings'

// Supprimer les avertissements Ant Design en mode développement
suppressAntdWarnings();

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
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
