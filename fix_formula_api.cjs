/**
 * Correctif ciblé pour résoudre le problème des formules qui ne sont pas retournées.
 * À exécuter avec:
 * node fix_formula_api.cjs
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de routes API
const apiRoutePath = path.join(__dirname, 'src', 'routes', 'api', 'fields', 'formulas.ts');

// Vérifier que le fichier existe
if (!fs.existsSync(apiRoutePath)) {
  console.error('Fichier de routes API introuvable:', apiRoutePath);
  process.exit(1);
}

// Lire le contenu du fichier
const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');

// Modifications à effectuer
const updatedApiRouteContent = apiRouteContent.replace(
  /const mockFormulasData = mockFormulas.getFormulasForField(fieldId as string);/g,
  'const mockFormulasData = mockFormulas.getFormulasForField(fieldId as string);
      console.log("[API] GET - Debug: Type de retour: " + typeof mockFormulasData + ", Est un tableau: " + Array.isArray(mockFormulasData) + ", Longueur: " + (mockFormulasData?.length || 0));'
);

// Enregistrer une copie de sauvegarde
const backupPath = apiRoutePath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, apiRouteContent);
console.log(`Sauvegarde du fichier original créée: ${backupPath}`);

// Écrire les modifications
fs.writeFileSync(apiRoutePath, updatedApiRouteContent);
console.log(`Fichier mis à jour avec succès: ${apiRoutePath}`);

console.log('\nModifications effectuées:');
console.log('- Ajout de logs de débogage dans la route GET pour identifier pourquoi les formules ne sont pas retournées');
console.log('\nPour appliquer les modifications:');
console.log('1. Redémarrez l\'API avec npm run dev');
console.log('2. Testez à nouveau l\'édition des formules dans l\'interface');
