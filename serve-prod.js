import express from 'express';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware compression
app.use(compression());

// Servir les fichiers statiques
app.use(express.static('dist', {
  // Headers pour le cache
  setHeaders: (res, filePath, stat) => {
    // Cache les assets buildés plus longtemps
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 an
    }
  }
}));

// Fallback pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de production démarré sur http://localhost:${PORT}`);
  console.log(`📊 Test de performance: npm run perf:lighthouse -- --port=3000`);
});
