/**
 * Script de diagnostic rapide pour TreeBranchLeaf
 * Vérifie les problèmes courants et donne des recommandations
 */

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${exists ? 'OK' : 'MANQUANT'}`);
  return exists;
}

function checkFileContent(filePath, patterns, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${description}: Fichier manquant`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let allFound = true;
  
  console.log(`🔍 Vérification de ${description}:`);
  
  for (const [pattern, desc] of patterns) {
    const found = content.includes(pattern);
    console.log(`  ${found ? '✅' : '❌'} ${desc}: ${found ? 'OK' : 'MANQUANT'}`);
    if (!found) allFound = false;
  }
  
  return allFound;
}

function diagnoseTreeBranchLeaf() {
  console.log('🔧 DIAGNOSTIC TREEBRANCHLEAF - ' + new Date().toLocaleString());
  console.log('=================================================');
  
  // 1. Vérification des fichiers essentiels
  console.log('\n📂 1. FICHIERS ESSENTIELS');
  const files = [
    ['prisma/schema.prisma', 'Schéma Prisma'],
    ['src/routes/treebranchleaf.ts', 'Routes TreeBranchLeaf'],
    ['src/routes/index.ts', 'Index des routes'],
    ['src/pages/TreeBranchLeafListPage.tsx', 'Page Liste'],
    ['src/pages/TreeBranchLeafEditorPage.tsx', 'Page Éditeur'],
    ['api-server-clean.ts', 'Serveur API'],
    ['package.json', 'Configuration npm']
  ];
  
  files.forEach(([file, desc]) => checkFileExists(path.join(__dirname, file), desc));
  
  // 2. Vérification du schéma Prisma
  console.log('\n🗄️  2. SCHÉMA PRISMA');
  const prismaPatterns = [
    ['model TreeBranchLeafTree', 'Modèle TreeBranchLeafTree'],
    ['model TreeBranchLeafNode', 'Modèle TreeBranchLeafNode'],
    ['model TreeBranchLeafMarker', 'Modèle TreeBranchLeafMarker'],
    ['model TreeBranchLeafOption', 'Modèle TreeBranchLeafOption'],
    ['model TreeBranchLeafSubmission', 'Modèle TreeBranchLeafSubmission'],
    ['model TreeBranchLeafSubmissionData', 'Modèle TreeBranchLeafSubmissionData']
  ];
  checkFileContent('prisma/schema.prisma', prismaPatterns, 'Schéma Prisma');
  
  // 3. Vérification des routes
  console.log('\n🛣️  3. ROUTES API');
  const routePatterns = [
    ['router.get(\'/trees\'', 'Route GET /trees'],
    ['router.post(\'/trees\'', 'Route POST /trees'],
    ['router.get(\'/trees/:id\'', 'Route GET /trees/:id'],
    ['router.put(\'/trees/:id\'', 'Route PUT /trees/:id'],
    ['router.delete(\'/trees/:id\'', 'Route DELETE /trees/:id'],
    ['authenticateToken', 'Middleware d\'authentification']
  ];
  checkFileContent('src/routes/treebranchleaf.ts', routePatterns, 'Routes TreeBranchLeaf');
  
  // 4. Vérification de l'intégration des routes
  console.log('\n🔗 4. INTÉGRATION DES ROUTES');
  const indexPatterns = [
    ['import treeBranchLeafRoutes', 'Import TreeBranchLeaf'],
    ['app.use(\'/api/treebranchleaf\'', 'Montage des routes TreeBranchLeaf']
  ];
  checkFileContent('src/routes/index.ts', indexPatterns, 'Index des routes');
  
  // 5. Vérification du serveur
  console.log('\n🖥️  5. SERVEUR API');
  const serverPatterns = [
    ['import routes', 'Import des routes'],
    ['app.use(\'/api\'', 'Montage des routes API'],
    ['app.listen', 'Démarrage du serveur']
  ];
  checkFileContent('api-server-clean.ts', serverPatterns, 'Serveur API');
  
  // 6. Vérification des composants React
  console.log('\n⚛️  6. COMPOSANTS REACT');
  const listPagePatterns = [
    ['useAuthenticatedApi', 'Hook API authentifié'],
    ['TreeBranchLeafListPage', 'Nom du composant'],
    ['useEffect', 'Gestion des effets']
  ];
  checkFileContent('src/pages/TreeBranchLeafListPage.tsx', listPagePatterns, 'Page Liste');
  
  const editorPagePatterns = [
    ['useAuthenticatedApi', 'Hook API authentifié'],
    ['TreeBranchLeafEditorPage', 'Nom du composant'],
    ['@dnd-kit', 'Drag & Drop']
  ];
  checkFileContent('src/pages/TreeBranchLeafEditorPage.tsx', editorPagePatterns, 'Page Éditeur');
  
  // 7. Recommandations
  console.log('\n💡 7. RECOMMANDATIONS');
  console.log('  📋 Pour tester:');
  console.log('    - Exécutez: node test-treebranchleaf-complete.js');
  console.log('    - Vérifiez les logs du serveur avec: npm run dev');
  console.log('    - Ouvrez: http://localhost:5173/formulaire/treebranchleaf');
  
  console.log('  🔧 En cas d\'erreur 500:');
  console.log('    - Vérifiez la base de données avec: npx prisma db push');
  console.log('    - Régénérez le client: npx prisma generate');
  console.log('    - Redémarrez le serveur');
  
  console.log('  🐛 Pour débugger:');
  console.log('    - Consultez la console du navigateur (F12)');
  console.log('    - Vérifiez les logs du terminal serveur');
  console.log('    - Testez l\'authentification');
  
  console.log('\n=================================================');
  console.log('✅ DIAGNOSTIC TERMINÉ');
}

// Exécution du diagnostic
try {
  diagnoseTreeBranchLeaf();
} catch (error) {
  console.error('💥 ERREUR:', error.message);
}
