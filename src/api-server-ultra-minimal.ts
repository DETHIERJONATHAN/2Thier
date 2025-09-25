console.log('🔍 [ULTRA-MINIMAL] Démarrage...');

import express from 'express';
console.log('✅ [ULTRA-MINIMAL] Express importé');

const app = express();
console.log('✅ [ULTRA-MINIMAL] App créée');

const port = 4000;
console.log(`🔧 [ULTRA-MINIMAL] Port: ${port}`);

app.get('/health', (req, res) => {
  console.log('🏥 [ULTRA-MINIMAL] Health check appelé');
  res.json({ status: 'OK', ultra: 'minimal' });
});

app.listen(port, () => {
  console.log(`🚀 [ULTRA-MINIMAL] Serveur démarré sur le port ${port}`);
});

console.log('✅ [ULTRA-MINIMAL] Fin du script');
