/**
 * 🔍 VÉRIFICATION: État actuel du code operation-interpreter.ts
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ========== VÉRIFICATION CODE ==========\n');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TreeBranchLeaf', 'treebranchleaf-new', 'api', 'operation-interpreter.ts');

console.log(`Fichier: ${filePath}\n`);

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Chercher la zone critique (lignes 1458-1473)
  console.log('📋 Code autour de la ligne 1463:\n');
  
  for (let i = 1458; i <= 1473; i++) {
    const line = lines[i - 1] || '';
    const marker = i === 1463 ? '👉' : '  ';
    console.log(`${marker} ${i}: ${line}`);
  }
  
  console.log('\n\n🔎 Recherche de la validation lookup:\n');
  
  // Chercher toutes les occurrences
  let found = false;
  lines.forEach((line, idx) => {
    if (line.includes('!lookup.enabled') || line.includes('isLookupActive')) {
      console.log(`   Ligne ${idx + 1}: ${line.trim()}`);
      found = true;
    }
  });
  
  if (!found) {
    console.log('   ❌ Aucune occurrence trouvée!');
  }
  
  console.log('\n\n🔍 Recherche du pattern "lookup && (":\n');
  
  found = false;
  lines.forEach((line, idx) => {
    if (line.includes('lookup && (')) {
      console.log(`   Ligne ${idx + 1}: ${line.trim()}`);
      found = true;
      
      // Afficher les 3 lignes suivantes
      for (let i = 1; i <= 3; i++) {
        const nextLine = lines[idx + i];
        if (nextLine) {
          console.log(`   Ligne ${idx + i + 1}: ${nextLine.trim()}`);
        }
      }
    }
  });
  
  if (!found) {
    console.log('   ❌ Pattern non trouvé! Le fix n\'a peut-être pas été appliqué.');
  } else {
    console.log('\n   ✅ Pattern trouvé - Le fix semble appliqué!');
  }
  
} catch (error) {
  console.error('\n❌ ERREUR:', error.message);
}
