import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify(''),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
  },
  plugins: [
    react(),
    
    // 📦 COMPRESSION GZIP/BROTLI
    viteCompression({
      algorithm: 'gzip',
      threshold: 1024, // Compresser files > 1kb
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    
    // 📱 PWA pour cache agressif
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: false, // 📱 Manifest servi dynamiquement par l'API selon le hostname
      workbox: {
  // 🔧 CORRECTION: Augmenter limite fichiers lourds (assets ~13MB)
  maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20MB au lieu de 2MB
        
        // 🚫 EXCLURE les requêtes API du Service Worker - NE JAMAIS CACHER
        navigateFallbackDenylist: [/^\/api\//],
        
        // Cache strategy agressif
        runtimeCaching: [
          {
            // 🚫 CRITIQUE: Les API doivent TOUJOURS aller au réseau
            urlPattern: /^.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
              }
            }
          }
        ]
      }
    }),
    
    // 📊 BUNDLE ANALYZER (en dev uniquement)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  server: {
    port: 5173,
    host: true, // Exposer sur le réseau (requis pour Codespaces)
    strictPort: true, // Forcer l'utilisation du port 5173, échouer si occupé
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        // ⏱️ Timeout long pour éviter les 502 sur génération PDF (~3s)
        timeout: 120000,
        // 🍪 CRITIQUE: Forward les cookies Set-Cookie du backend
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        // 🔧 Codespaces: indiquer au backend que l'origine est HTTPS
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Propager les headers X-Forwarded-* pour que le backend sache qu'on est en HTTPS
            const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
            const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
            proxyReq.setHeader('X-Forwarded-Proto', forwardedProto);
            proxyReq.setHeader('X-Forwarded-Host', forwardedHost || '');
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  // 🚀 OPTIMISATIONS PERFORMANCE CRITIQUES
  build: {
    // Code splitting agressif
    rollupOptions: {
      output: {
        // Séparer les vendors des composants
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Ant Design (très lourd)
          'antd-vendor': ['antd', '@ant-design/icons'],
          // Charts et visualisation
          'charts-vendor': ['recharts', '@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid'],
          // Utilitaires réels
          'utils-vendor': ['axios', 'date-fns', 'uuid'],
          // DnD et interactions
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // UI et icônes
          'ui-vendor': ['@heroicons/react', 'lucide-react', 'react-icons'],
          // State management
          'data-vendor': ['zustand', 'immer', 'use-debounce'],
        },
        // Noms de fichiers optimisés avec hash
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Optimisations build
    minify: 'terser', // Minification agressive
    terserOptions: {
      compress: {
        drop_console: true, // Supprimer console.log en prod
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    
    // Taille des chunks
    chunkSizeWarningLimit: 1000, // Warning si chunk > 1MB
    
    // Source maps pour debug (mais pas inline)
    sourcemap: false, // Désactiver en prod pour la perf
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Compression des assets
    assetsInlineLimit: 4096, // Inline assets < 4kb
  },
  
  // 🎯 OPTIMISATIONS DEV
  optimizeDeps: {
    // Pre-bundle des dépendances lourdes
    include: [
      'react',
      'react-dom', 
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      'axios',
      'date-fns',
    ],
    // Exclure certaines dépendances du pre-bundling
    exclude: [
      // Modules qui causent des problèmes
    ]
  },
  
  // 🔧 ALIAS POUR IMPORTS OPTIMISÉS  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@services': resolve(__dirname, 'src/services'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    }
  },
  
  // 📱 OPTIMISATIONS CSS
  css: {
    // PostCSS optimizations
    postcss: {
      plugins: [
        // Sera configuré avec autoprefixer
      ]
    }
  }
});
