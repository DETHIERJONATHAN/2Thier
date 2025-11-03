const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Chercher le bloc à supprimer (lignes 1688-1705)
const startPattern = '        // 🧬 Après duplication: copier les variables liées';
const endPattern = '        }';

const startIdx = content.indexOf(startPattern);
if (startIdx === -1) {
  console.error('❌ Pattern de début non trouvé');
  process.exit(1);
}

// Trouver la fin du bloc try-catch (le } après console.warn)
let searchFrom = startIdx;
let foundTry = 0;
let foundCatch = 0;

// Chercher "try {" après startIdx
const tryIdx = content.indexOf('try {', searchFrom);
if (tryIdx === -1) {
  console.error('❌ try { non trouvé');
  process.exit(1);
}

// Chercher "} catch (e) {" après tryIdx
const catchIdx = content.indexOf('} catch (e) {', tryIdx);
if (catchIdx === -1) {
  console.error('❌ } catch (e) { non trouvé');
  process.exit(1);
}

// Chercher le } final du catch (après console.warn)
// On cherche après "console.warn(`⚠️"
const warnIdx = content.indexOf('console.warn(`', catchIdx);
if (warnIdx === -1) {
  console.error('❌ console.warn non trouvé');
  process.exit(1);
}

// Trouver le } qui ferme le catch (après le warn)
let endIdx = content.indexOf('\n        }', warnIdx);
if (endIdx === -1) {
  console.error('❌ Fin du catch non trouvée');
  process.exit(1);
}
endIdx += '\n        }'.length;

console.log('✅ Bloc trouvé de position', startIdx, 'à', endIdx);

// Remplacer par un simple commentaire
const replacement = `        // ℹ️ NOTE: Les variables liées (linkedVariableIds) sont DÉJÀ copiées par deepCopyNodeInternal
        // avec autoCreateDisplayNode: true, donc pas besoin d'appeler copyLinkedVariablesFromNode ici
        console.log(\`ℹ️ [DUPLICATE-TEMPLATES] Variables liées déjà copiées par deepCopyNodeInternal pour \${newRootId}\`);`;

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);

content = before + replacement + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Bloc redondant supprimé et remplacé par un commentaire!');
