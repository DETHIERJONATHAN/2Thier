const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration pour servir les fichiers statiques du build
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware pour les JSON
app.use(express.json());

// Route catch-all pour servir le frontend React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 [PRODUCTION] Application en cours d'exécution sur le port ${PORT}`);
  console.log(`🌐 [PRODUCTION] Accédez à l'application sur http://localhost:${PORT}`);
  console.log(`✅ [PRODUCTION] Mode production activé - React Strict Mode désactivé`);
});
