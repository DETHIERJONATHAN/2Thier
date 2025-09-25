/**
 * Correctif ciblé pour résoudre le problème de persistance des formules dans la vue
 * Ce script modifie le fichier de routes API pour ajouter des logs de débogage et
 * corriger le problème de retour des formules vides.
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de routes API
const apiRoutePath = path.join(__dirname, 'src', 'routes', 'api', 'fields', 'formulas.ts');
const mockFormulasPath = path.join(__dirname, 'src', 'global-mock-formulas.ts');

console.log('=== CORRECTIF POUR LE PROBLÈME DES FORMULES ===');

// Vérifier l'existence des fichiers
if (!fs.existsSync(apiRoutePath)) {
  console.error('⚠️ Le fichier de routes API est introuvable:', apiRoutePath);
  process.exit(1);
}

if (!fs.existsSync(mockFormulasPath)) {
  console.error('⚠️ Le fichier de mock des formules est introuvable:', mockFormulasPath);
  process.exit(1);
}

console.log('✅ Fichiers trouvés, application du correctif');

// Lire le contenu du fichier API
const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');

// 1. Ajouter un log de débogage dans la route GET
console.log('Modification de la route GET...');
const updatedGetRoute = apiRouteContent.replace(
  /console\.log\(`\[API\] GET - \${mockFormulasData\.length} formules mockées trouvées`\);/g,
  'console.log(`[API] GET - ${mockFormulasData.length} formules mockées trouvées`);\n' +
  '      console.log("[API] GET - Debug: Type de retour:", typeof mockFormulasData, "Est un tableau:", Array.isArray(mockFormulasData), "Longueur:", mockFormulasData?.length || 0);'
);

// 2. Vérifier que la route PUT utilise correctement le store global et retourne les données
console.log('Modification de la route PUT...');
const updatedPutRoute = updatedGetRoute.replace(
  /const allFormulas = mockFormulas\.getFormulasForField\(fieldId as string\);/g,
  'const allFormulas = mockFormulas.getFormulasForField(fieldId as string);\n' +
  '      console.log(`[API] PUT - Debug: Type de retour:`, typeof allFormulas, "Est un tableau:", Array.isArray(allFormulas), "Longueur:", allFormulas?.length || 0);'
);

// 3. Correction du problème principal - Création d'une version fixe des formules pour assurer le retour correct
const finalContent = updatedPutRoute.replace(
  /console\.log\(`\[API\] PUT - Formules mockées retournées \(catch\): \${allFormulas\.length}\`\);/g,
  'console.log(`[API] PUT - Formules mockées retournées (catch): ${allFormulas.length}`);\n' +
  '      \n' +
  '      // CORRECTIF: Vérification supplémentaire pour assurer que les formules sont bien retournées\n' +
  '      if (Array.isArray(allFormulas) && allFormulas.length > 0) {\n' +
  '        console.log(`[API] PUT - Retournant ${allFormulas.length} formules vérifiées`);\n' +
  '      } else {\n' +
  '        console.warn(`[API] PUT - WARNING: Le tableau de formules semble vide ou invalide, récupération forcée`);\n' +
  '        // Récupération forcée depuis le store global\n' +
  '        try {\n' +
  '          if (global._globalFormulasStore && global._globalFormulasStore.has(fieldId as string)) {\n' +
  '            const forcedFormulas = JSON.parse(JSON.stringify(global._globalFormulasStore.get(fieldId as string) || []));\n' +
  '            console.log(`[API] PUT - Récupération forcée: ${forcedFormulas.length} formules`);\n' +
  '            return res.json(forcedFormulas);\n' +
  '          }\n' +
  '        } catch (forceErr) {\n' +
  '          console.error("[API] Erreur lors de la récupération forcée:", forceErr);\n' +
  '        }\n' +
  '      }'
);

// Enregistrer une copie de sauvegarde
const backupPath = apiRoutePath + '.backup-fix-' + Date.now();
fs.writeFileSync(backupPath, apiRouteContent);
console.log(`Sauvegarde du fichier original créée: ${backupPath}`);

// Écrire les modifications
fs.writeFileSync(apiRoutePath, finalContent);
console.log(`✅ Fichier de routes API mis à jour avec succès`);

// Maintenant on vérifie si une modification est nécessaire dans le fichier global-mock-formulas.ts
const mockFormulasContent = fs.readFileSync(mockFormulasPath, 'utf8');

// Vérifier si le module dispose d'une fonction pour forcer le rechargement des données
if (!mockFormulasContent.includes('forceRefreshStore')) {
  console.log('Ajout de la fonction forceRefreshStore au fichier mock...');
  
  // Trouver la position où ajouter la nouvelle fonction - juste avant la dernière accolade
  const lastBracePosition = mockFormulasContent.lastIndexOf('};');
  
  if (lastBracePosition !== -1) {
    const updatedMockContent = 
      mockFormulasContent.substring(0, lastBracePosition) + 
      `
// Fonction pour forcer le rechargement du store (utile pour déboguer)
export const forceRefreshStore = (fieldId: string): any[] => {
  if (!fieldId) return [];
  
  console.log('[MOCK] Forçage du rechargement du store pour le champ ' + fieldId);
  
  if (!global._globalFormulasStore.has(fieldId)) {
    console.log('[MOCK] Le champ n\\'existe pas dans le store');
    return [];
  }
  
  // Récupérer les données et les retourner directement
  const formulas = global._globalFormulasStore.get(fieldId) || [];
  console.log('[MOCK] Store forcé - ' + formulas.length + ' formules récupérées');
  
  return JSON.parse(JSON.stringify(formulas));
};
` + 
      mockFormulasContent.substring(lastBracePosition);
      
    // Enregistrer une copie de sauvegarde
    const mockBackupPath = mockFormulasPath + '.backup-fix-' + Date.now();
    fs.writeFileSync(mockBackupPath, mockFormulasContent);
    console.log(`Sauvegarde du fichier mock créée: ${mockBackupPath}`);
    
    // Écrire les modifications
    fs.writeFileSync(mockFormulasPath, updatedMockContent);
    console.log(`✅ Fichier mock mis à jour avec succès`);
  } else {
    console.log('⚠️ Structure du fichier mock inattendue, aucune modification effectuée.');
  }
} else {
  console.log('La fonction forceRefreshStore existe déjà, aucune modification nécessaire.');
}

console.log('\n=== CORRECTIF APPLIQUÉ AVEC SUCCÈS ===');
console.log('\nPour appliquer les modifications:');
console.log('1. Redémarrez le serveur API (npm run dev)');
console.log('2. Testez à nouveau les opérations de formules dans l\'interface');
console.log('\nLes modifications apportées:');
console.log('- Ajout de logs de débogage dans la route GET');
console.log('- Ajout de logs de débogage dans la route PUT');
console.log('- Ajout d\'un mécanisme de récupération forcée des formules');
console.log('- Ajout d\'une fonction forceRefreshStore pour déboguer');
