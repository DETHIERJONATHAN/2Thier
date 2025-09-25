import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
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
      manifest: {
        name: 'Devis1Minute',
        short_name: 'Devis1Min',
        description: 'Obtenez vos devis en 1 minute',
        theme_color: '#1890ff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/devis1minute',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // 🔧 CORRECTION: Augmenter limite fichiers lourds
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB au lieu de 2MB
        
        // Cache strategy agressif
        runtimeCaching: [
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
    strictPort: true, // Forcer l'utilisation du port 5173, échouer si occupé
    proxy: {
      '/api': 'http://localhost:4000'
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
