import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zhiive.app',
  appName: 'Zhiive',
  webDir: 'dist',
  server: {
    // En production, l'app charge les fichiers locaux (build Vite)
    // Pour le dev, décommenter la ligne suivante pour pointer vers le serveur Vite :
    // url: 'http://localhost:5173',
    androidScheme: 'https',
  },
  plugins: {
    Browser: {
      // Le plugin Browser ouvre un WebView natif (InAppBrowser)
      // Pas de restriction X-Frame-Options, pas de CORS — 100% des sites fonctionnent
    },
  },
};

export default config;
