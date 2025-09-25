// Script pour ajouter des logs détaillés au SmartCalculatedField
const fs = require('fs');
const path = require('path');

const smartFieldPath = path.join(__dirname, 'src', 'components', 'TreeBranchLeaf', 'treebranchleaf-new', 'SmartCalculatedField.tsx');

console.log(`🔬 [TEST SCRIPT] Ajout de logs détaillés au SmartCalculatedField...`);

// Lire le fichier actuel
if (fs.existsSync(smartFieldPath)) {
  let content = fs.readFileSync(smartFieldPath, 'utf8');
  
  // Ajouter des logs au début du hook useUniversalTranslator
  if (content.includes('const useUniversalTranslator')) {
    console.log(`🔬 [TEST SCRIPT] Fichier SmartCalculatedField trouvé, ajout des logs...`);
    
    // Trouver et remplacer le début du hook
    const hookPattern = /(const useUniversalTranslator[^{]*{)/;
    const replacement = `$1
  console.log(\`🔬 [TEST SMART] ========== SMARTCALCULATEDFIELD ==========\`);
  console.log(\`🔬 [TEST SMART] SourceRef: \${sourceRef}\`);
  console.log(\`🔬 [TEST SMART] FormData keys: \${Object.keys(formData || {}).join(', ')}\`);
  console.log(\`🔬 [TEST SMART] FormData values: \`, formData);`;
    
    content = content.replace(hookPattern, replacement);
    
    // Ajouter des logs dans le calcul du résultat
    const resultPattern = /(if \(result !== null && result !== undefined\))/;
    const resultReplacement = `console.log(\`🔬 [TEST SMART] Résultat calculé: \${result}\`);
    $1`;
    
    content = content.replace(resultPattern, resultReplacement);
    
    // Sauvegarder
    fs.writeFileSync(smartFieldPath, content);
    console.log(`✅ [TEST SCRIPT] Logs ajoutés au SmartCalculatedField!`);
  } else {
    console.log(`❌ [TEST SCRIPT] Hook useUniversalTranslator non trouvé dans le fichier`);
  }
} else {
  console.log(`❌ [TEST SCRIPT] Fichier SmartCalculatedField non trouvé: ${smartFieldPath}`);
}
