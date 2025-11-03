const fs = require('fs');

const filePath = 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Chercher la route spécifique
const searchString = "router.delete('/nodes/:nodeId/tables/:tableId'";
const idx = content.indexOf(searchString);

console.log('Position trouvée:', idx);

if (idx === -1) {
  console.error('❌ Route non trouvée');
  process.exit(1);
}

console.log('Contexte:', content.substring(idx, idx + 300));
