#!/usr/bin/env node
/**
 * Script d'intégration pour copier les tables des sélecteurs après duplication de templates
 * Cet script modifie treebranchleaf-routes.ts pour ajouter l'appel à copySelectorTablesAfterNodeCopy
 */

const fs = require('fs');
const path = require('path');

const routesFile = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

if (!fs.existsSync(routesFile)) {
  console.error('❌ Fichier non trouvé:', routesFile);
  process.exit(1);
}

let content = fs.readFileSync(routesFile, 'utf8');

// ÉTAPE 1: Ajouter l'import
console.log('📝 Étape 1: Ajout de l\'import copySelectorTablesAfterNodeCopy...');

const importLineToFind = `import { copyVariableWithCapacities, copyLinkedVariablesFromNode, createDisplayNodeForExistingVariable } from './copy-variable-with-capacities.js';`;
const newImportLine = `import { copyVariableWithCapacities, copyLinkedVariablesFromNode, createDisplayNodeForExistingVariable } from './copy-variable-with-capacities.js';
import { copySelectorTablesAfterNodeCopy } from './copy-selector-tables.js';`;

if (content.includes(importLineToFind)) {
  content = content.replace(importLineToFind, newImportLine);
  console.log('✅ Import ajouté');
} else {
  console.warn('⚠️  Ligne d\'import non trouvée - tentative de recherche alternative...');
  if (content.includes('from \'./copy-variable-with-capacities.js\'')) {
    const idx = content.lastIndexOf('from \'./copy-variable-with-capacities.js\'');
    const lineEnd = content.indexOf('\n', idx);
    const insertPos = lineEnd + 1;
    content = content.slice(0, insertPos) + `import { copySelectorTablesAfterNodeCopy } from './copy-selector-tables.js';\n` + content.slice(insertPos);
    console.log('✅ Import ajouté (alternative)');
  }
}

// ÉTAPE 2: Ajouter l'appel à copySelectorTablesAfterNodeCopy
console.log('📝 Étape 2: Ajout de l\'appel à copySelectorTablesAfterNodeCopy...');

// Chercher le commentaire NOTE: Les variables liées
const lookForNote = `// ℹ️ NOTE: Les variables liées (linkedVariableIds) sont DÉJÀ copiées par deepCopyNodeInternal`;
const noteIndex = content.indexOf(lookForNote);

if (noteIndex !== -1) {
  // Trouver le début de la ligne
  const lineStart = content.lastIndexOf('\n', noteIndex) + 1;
  
  // Insérer le code juste AVANT ce commentaire
  const selectorCopyCode = `
        // 🔗 APRÈS duplication: Copier les tables des sélecteurs
        try {
          const selectorCopyOptions = {
            nodeIdMap: result.idMap,
            tableCopyCache: new Map(),
            tableIdMap: new Map()
          };
          await copySelectorTablesAfterNodeCopy(
            prisma,
            newRootId,
            template.id,
            selectorCopyOptions,
            copyNumber
          );
          console.log(\`✅ [DUPLICATE-TEMPLATES] Tables des sélecteurs copiées pour \${newRootId}\`);
        } catch (selectorErr) {
          console.warn('⚠️  [DUPLICATE-TEMPLATES] Erreur lors de la copie des tables des sélecteurs pour', newRootId, selectorErr);
        }

`;

  content = content.slice(0, lineStart) + selectorCopyCode + content.slice(lineStart);
  console.log('✅ Appel à copySelectorTablesAfterNodeCopy ajouté');
} else {
  console.error('❌ Impossible de trouver le point d\'insertion (NOTE: Les variables liées)');
  process.exit(1);
}

// ÉTAPE 3: Écrire le fichier
console.log('💾 Étape 3: Sauvegarde du fichier...');
fs.writeFileSync(routesFile, content, 'utf8');
console.log('✅ Fichier sauvegardé avec succès!');

console.log('\n🎉 Intégration terminée!');
console.log('Prochaines étapes:');
console.log('1. Vérifie que copy-selector-tables.ts existe');
console.log('2. Exécute: npm run build');
console.log('3. Test la duplication de Versant via l\'interface');
