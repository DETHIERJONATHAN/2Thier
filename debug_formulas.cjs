/**
 * Script de débogage pour identifier et résoudre le problème de retour des formules.
 * Ce script teste le fonctionnement du stockage des formules et affiche des informations
 * détaillées pour identifier pourquoi les formules ne sont pas retournées correctement.
 * 
 * À exécuter avec:
 * node debug_formulas.cjs
 */

const fs = require('fs');
const path = require('path');

// Chemin vers les fichiers concernés
const apiRoutePath = path.join(__dirname, 'src', 'routes', 'api', 'fields', 'formulas.ts');
const mockFormulasPath = path.join(__dirname, 'src', 'global-mock-formulas.ts');

console.log('=== DÉBOGAGE DU SYSTÈME DE FORMULES ===');

// Vérifier l'existence des fichiers
if (!fs.existsSync(apiRoutePath)) {
  console.error('⚠️ Le fichier de routes API est introuvable:', apiRoutePath);
} else {
  console.log('✅ Route API trouvée:', apiRoutePath);
  const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');
  console.log(`   Taille du fichier: ${apiRouteContent.length} octets`);
  
  // Analyse basique du contenu
  console.log('   Analyse du fichier routes:');
  console.log(`   - Contient mockFormulas.getFormulasForField: ${apiRouteContent.includes('mockFormulas.getFormulasForField')}`);
  console.log(`   - Contient mockFormulas.updateFormula: ${apiRouteContent.includes('mockFormulas.updateFormula')}`);
}

if (!fs.existsSync(mockFormulasPath)) {
  console.error('⚠️ Le fichier de mock des formules est introuvable:', mockFormulasPath);
} else {
  console.log('✅ Fichier mock trouvé:', mockFormulasPath);
  const mockContent = fs.readFileSync(mockFormulasPath, 'utf8');
  console.log(`   Taille du fichier: ${mockContent.length} octets`);
  
  // Analyse basique du contenu
  console.log('   Analyse du fichier de mock:');
  console.log(`   - Utilise global._globalFormulasStore: ${mockContent.includes('global._globalFormulasStore')}`);
  console.log(`   - Contient getFormulasForField: ${mockContent.includes('getFormulasForField')}`);
  console.log(`   - Contient updateFormula: ${mockContent.includes('updateFormula')}`);
  console.log(`   - Effectue une copie profonde (JSON.parse/stringify): ${mockContent.includes('JSON.parse(JSON.stringify')}`);
}

// Création d'un correctif ciblé pour assurer que les formules sont correctement retournées
const patchContent = `
// CORRECTIF: Assurer que les formules sont correctement retournées après mise à jour
// Le problème vient probablement du fait que la route API GET n'utilise pas la version la plus récente des données

/**
 * Modification de src/routes/api/fields/formulas.ts
 * Ce correctif ajoute des logs supplémentaires et s'assure que les formules sont correctement
 * retournées après chaque mise à jour.
 */

// 1. Ajouter un mécanisme de debug
console.log('[FORMULAS_DEBUG] Patch de débogage chargé');

// 2. Test de fonctionnement du store global
if (typeof global !== 'undefined' && global._globalFormulasStore) {
  console.log('[FORMULAS_DEBUG] État actuel du stockage global:', 
    Array.from(global._globalFormulasStore.entries())
      .map(([key, formulas]) => ({ fieldId: key, count: formulas.length }))
  );
} else {
  console.log('[FORMULAS_DEBUG] ⚠️ Le stockage global semble non initialisé');
}

/**
 * 3. Consignes pour corriger le problème:
 * 
 * a) Vérifier que dans src/routes/api/fields/formulas.ts, la route GET récupère bien
 *    les données du mock avec getFormulasForField() et renvoie EXACTEMENT ce que retourne cette fonction.
 * 
 * b) Vérifier que dans src/routes/api/fields/formulas.ts, après chaque mise à jour (dans la route PUT),
 *    les formules mises à jour sont bien renvoyées avec res.json(allFormulas).
 * 
 * c) Vérifier que dans src/global-mock-formulas.ts, la fonction getFormulasForField() retourne
 *    toujours une copie profonde des données pour éviter les modifications accidentelles.
 * 
 * d) Vérifier que le store global est initialisé correctement au démarrage de l'application.
 */

console.log('[FORMULAS_DEBUG] Pour appliquer les corrections:');
console.log('1. Suivez les consignes ci-dessus');
console.log('2. Redémarrez l\'API avec npm run dev');
console.log('3. Testez à nouveau l\'édition des formules dans l\'interface');
`;

// Écrire le fichier de correctifs
const patchFilePath = path.join(__dirname, 'debug_formulas.md');
fs.writeFileSync(patchFilePath, patchContent);
console.log(`\nFichier de correctifs créé: ${patchFilePath}`);

// Créer un script de mise à jour pour le fichier API
const apiPatchContent = `/**
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
  /const mockFormulasData = mockFormulas\.getFormulasForField\(fieldId as string\);/g,
  'const mockFormulasData = mockFormulas.getFormulasForField(fieldId as string);\n      console.log("[API] GET - Debug: Type de retour: " + typeof mockFormulasData + ", Est un tableau: " + Array.isArray(mockFormulasData) + ", Longueur: " + (mockFormulasData?.length || 0));'
);

// Enregistrer une copie de sauvegarde
const backupPath = apiRoutePath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, apiRouteContent);
console.log(\`Sauvegarde du fichier original créée: \${backupPath}\`);

// Écrire les modifications
fs.writeFileSync(apiRoutePath, updatedApiRouteContent);
console.log(\`Fichier mis à jour avec succès: \${apiRoutePath}\`);

console.log('\\nModifications effectuées:');
console.log('- Ajout de logs de débogage dans la route GET pour identifier pourquoi les formules ne sont pas retournées');
console.log('\\nPour appliquer les modifications:');
console.log('1. Redémarrez l\\'API avec npm run dev');
console.log('2. Testez à nouveau l\\'édition des formules dans l\\'interface');
`;

// Écrire le script de mise à jour
const apiPatchFilePath = path.join(__dirname, 'fix_formula_api.cjs');
fs.writeFileSync(apiPatchFilePath, apiPatchContent);
console.log(`Script de correction API créé: ${apiPatchFilePath}`);

console.log('\nPour résoudre le problème:');
console.log('1. Exécutez: node fix_formula_api.cjs');
console.log('2. Redémarrez l\'API');
console.log('3. Consultez les logs pour identifier si les formules sont correctement récupérées');
