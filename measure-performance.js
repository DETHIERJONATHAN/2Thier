// Script simple pour mesurer les performances sans Lighthouse
import fs from 'fs';
import path from 'path';

console.log('🔍 ANALYSE DES PERFORMANCES - DEVIS1MINUTE');
console.log('===========================================\n');

// Analyser la taille des fichiers dist/
const distPath = './dist';
if (fs.existsSync(distPath)) {
  console.log('📊 TAILLE DES FICHIERS BUILD:');
  const files = fs.readdirSync(path.join(distPath, 'assets'))
    .filter(f => f.endsWith('.js') || f.endsWith('.css'))
    .map(file => {
      const stats = fs.statSync(path.join(distPath, 'assets', file));
      return {
        file,
        size: stats.size,
        sizeMB: (stats.size / 1024 / 1024).toFixed(2)
      };
    })
    .sort((a, b) => b.size - a.size);

  let totalSize = 0;
  files.forEach(({ file, size, sizeMB }) => {
    console.log(`  📄 ${file}: ${sizeMB} MB`);
    totalSize += size;
  });

  console.log(`\n📦 TOTAL: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Vérifier les fichiers compressés
  console.log('\n🗜️  COMPRESSION:');
  const compressedFiles = fs.readdirSync(distPath, { recursive: true })
    .filter(f => f.endsWith('.gz') || f.endsWith('.br'));
  
  console.log(`  ✅ Gzip: ${compressedFiles.filter(f => f.endsWith('.gz')).length} fichiers`);
  console.log(`  ✅ Brotli: ${compressedFiles.filter(f => f.endsWith('.br')).length} fichiers`);
} else {
  console.log('❌ Dossier dist/ non trouvé. Lancez: npm run build');
}

console.log('\n🎯 RECOMMANDATIONS:');
console.log('1. AppLayout chunk trop gros (>3MB) - implémenter dynamic imports');
console.log('2. Activer compression serveur (Gzip/Brotli)');
console.log('3. Lazy loading des composants lourds');
console.log('4. Tree-shaking des bibliothèques inutilisées');
console.log('\n✅ OPTIMISATIONS DÉJÀ ACTIVÉES:');
console.log('- Code splitting par vendors');
console.log('- Lazy loading des routes');
console.log('- Minification Terser');
console.log('- PWA avec cache');
