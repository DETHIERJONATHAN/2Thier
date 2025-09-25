/**
 * Ce script est une solution temporaire pour résoudre le problème de stockage des formules.
 * 
 * À exécuter avec: 
 * node fix_mock_memory.js
 * 
 * Ce script modifie le fichier global-mock-formulas.ts pour utiliser une solution de stockage
 * plus robuste qui persiste entre les différentes routes.
 */

const fs = require('fs');
const path = require('path');

const globalMockFilePath = path.join(__dirname, 'src', 'global-mock-formulas.ts');

// Vérifier que le fichier existe
if (!fs.existsSync(globalMockFilePath)) {
  console.error('Fichier global-mock-formulas.ts introuvable!');
  process.exit(1);
}

// Contenu de remplacement avec une solution utilisant un objet global au niveau de l'application
const newContent = `/**
 * Fichier de mocks global pour les formules - à utiliser en développement uniquement
 * Cette version utilise une approche globale pour garantir que le stockage est partagé entre les routes
 */

// Déclaration globale pour persister les données entre les modules
declare global {
  var _globalFormulasStore: Map<string, any[]>;
}

// Initialisation du stockage global s'il n'existe pas déjà
if (!global._globalFormulasStore) {
  global._globalFormulasStore = new Map<string, any[]>();
  console.log('[MOCK] Initialisation du stockage global des formules');
}

/**
 * Récupère les formules stockées pour un champ spécifique
 */
export const getFormulasForField = (fieldId: string): any[] => {
  if (!global._globalFormulasStore.has(fieldId)) {
    global._globalFormulasStore.set(fieldId, []);
  }
  return global._globalFormulasStore.get(fieldId) || [];
};

/**
 * Met à jour une formule ou la crée si elle n'existe pas
 */
export const updateFormula = (fieldId: string, formulaId: string, data: any): any => {
  console.log(\`[MOCK] Mise à jour formule \${formulaId} pour champ \${fieldId}\`, data);
  
  // Récupérer les formules actuelles
  const formulas = getFormulasForField(fieldId);
  
  // Trouver l'index de la formule à mettre à jour
  const index = formulas.findIndex(f => f.id === formulaId);
  
  // Créer un objet formule avec les données
  const formula = {
    id: formulaId,
    fieldId,
    name: data.name || 'Formule sans nom',
    sequence: data.sequence || [],
    order: data.order || 0,
    updatedAt: new Date()
  };
  
  // Mettre à jour ou ajouter la formule
  if (index >= 0) {
    formulas[index] = { ...formulas[index], ...formula };
  } else {
    formulas.push(formula);
  }
  
  // Mettre à jour le stockage
  global._globalFormulasStore.set(fieldId, formulas);
  console.log(\`[MOCK] Stockage mis à jour pour le champ \${fieldId}, maintenant \${formulas.length} formules\`);
  console.log('[MOCK] État actuel du stockage:', Array.from(global._globalFormulasStore.entries()));
  
  // Renvoyer la formule mise à jour
  return formula;
};

/**
 * Supprime une formule
 */
export const deleteFormula = (fieldId: string, formulaId: string): boolean => {
  const formulas = getFormulasForField(fieldId);
  const index = formulas.findIndex(f => f.id === formulaId);
  
  if (index >= 0) {
    formulas.splice(index, 1);
    global._globalFormulasStore.set(fieldId, formulas);
    return true;
  }
  
  return false;
};

// Exporter l'état du stockage pour le debug
export const getStoreState = () => {
  return {
    fieldsCount: global._globalFormulasStore.size,
    fields: Array.from(global._globalFormulasStore.keys()),
    totalFormulas: Array.from(global._globalFormulasStore.values()).reduce((acc, arr) => acc + arr.length, 0)
  };
};
`;

// Sauvegarde du fichier original
const backupFilePath = `${globalMockFilePath}.backup`;
fs.copyFileSync(globalMockFilePath, backupFilePath);
console.log(`Sauvegarde du fichier original créée: ${backupFilePath}`);

// Écrire le nouveau contenu
fs.writeFileSync(globalMockFilePath, newContent);
console.log(`Fichier mis à jour avec succès: ${globalMockFilePath}`);

console.log('\nPour appliquer les modifications:');
console.log('1. Redémarrez le serveur API');
console.log('2. Testez à nouveau les opérations de formules');
