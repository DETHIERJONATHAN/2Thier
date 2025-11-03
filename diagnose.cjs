const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Vérifier les patterns simples qui devraient toujours être en ASCII
const has1 = content.includes('[DUPLICATE-TEMPLATES] Echec application');
const has2 = content.includes('applySharedReferencesFromOriginalInternal');
const has3 = content.includes('copyLinkedVariablesFromNode');

console.log('Check1 - [DUPLICATE-TEMPLATES] Echec application:', has1);
console.log('Check2 - applySharedReferencesFromOriginalInternal:', has2);
console.log('Check3 - copyLinkedVariablesFromNode:', has3);

// Vérifier ce qui est vraiment rédigé
const lines = content.split('\n');
const linesWith = lines.filter((l, i) => {
  if (l.includes('[DUPLICATE-TEMPLATES]') && l.includes('Echec')) {
    console.log(`Ligne ${i+1}: ${l.substring(0, 100)}`);
    return true;
  }
  return false;
});

console.log('Total lignes trouvées avec [DUPLICATE-TEMPLATES] Echec:', linesWith.length);

// Chercher le problème: le } orphelin
const orphanIdx = content.indexOf('      }\n      }\n    }');
if (orphanIdx > -1) {
  console.log('✅ Pattern orphelin trouvé à la position', orphanIdx);
  const before = content.substring(Math.max(0, orphanIdx - 100), orphanIdx);
  const after = content.substring(orphanIdx, Math.min(content.length, orphanIdx + 200));
  console.log('\nContexte AVANT:');
  console.log(before);
  console.log('\nLE PATTERN:');
  console.log(after);
}
