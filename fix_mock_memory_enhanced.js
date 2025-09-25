/**
 * Solution améliorée pour résoudre les problèmes de stockage des formules en mode développement.
 * 
 * À exécuter avec: 
 * node fix_mock_memory_enhanced.js
 * 
 * Ce script modifie le fichier global-mock-formulas.ts pour utiliser une solution
 * de stockage plus robuste avec un système de mise en cache et de logs amélioré.
 * 
 * Note: Ce script utilise la concaténation traditionnelle au lieu des templates literals
 * pour éviter les problèmes de caractères spéciaux dans certains environnements.
 */

const fs = require('fs');
const path = require('path');

const globalMockFilePath = path.join(__dirname, 'src', 'global-mock-formulas.ts');

// Vérifier que le fichier existe
if (!fs.existsSync(globalMockFilePath)) {
  console.error('Fichier global-mock-formulas.ts introuvable!');
  process.exit(1);
}

// Contenu de remplacement avec une solution plus robuste
const newContent = `/**
 * Fichier de mocks global pour les formules - à utiliser en développement uniquement
 * Version améliorée avec une meilleure gestion des données et des logs détaillés
 */

// Déclaration globale pour persister les données entre les modules
declare global {
  var _globalFormulasStore: Map<string, any[]>;
  var _formulasOperationLog: Array<{
    timestamp: Date,
    operation: string,
    fieldId: string,
    formulaId?: string,
    status: string,
    details?: any
  }>;
}

// Initialisation du stockage global et du log s'ils n'existent pas déjà
if (!global._globalFormulasStore) {
  global._globalFormulasStore = new Map<string, any[]>();
  console.log('[MOCK] Initialisation du stockage global des formules');
}

if (!global._formulasOperationLog) {
  global._formulasOperationLog = [];
}

// Fonction de journalisation des opérations
const logOperation = (operation: string, fieldId: string, formulaId: string | null = null, status: string = 'success', details: any = null) => {
  const logEntry = {
    timestamp: new Date(),
    operation,
    fieldId,
    ...(formulaId ? { formulaId } : {}),
    status,
    ...(details ? { details } : {})
  };
  
  global._formulasOperationLog.push(logEntry);
  
  // Limiter la taille du log à 100 entrées
  if (global._formulasOperationLog.length > 100) {
    global._formulasOperationLog.shift();
  }
  
  return logEntry;
};

/**
 * Récupère les formules stockées pour un champ spécifique
 */
export const getFormulasForField = (fieldId: string): any[] => {
  try {
    if (!fieldId) {
      console.error('[MOCK] Erreur: fieldId est undefined ou null');
      logOperation('getFormulasForField', 'unknown', null, 'error', 'fieldId manquant');
      return [];
    }
    
    if (!global._globalFormulasStore.has(fieldId)) {
      console.log('[MOCK] Initialisation du stockage pour le champ ' + fieldId);
      global._globalFormulasStore.set(fieldId, []);
      logOperation('initStorage', fieldId);
    }
    
    const formulas = global._globalFormulasStore.get(fieldId) || [];
    console.log('[MOCK] Récupération de ' + formulas.length + ' formules pour le champ ' + fieldId);
    logOperation('getFormulasForField', fieldId, null, 'success', { count: formulas.length });
    
    // Effectuer une copie profonde pour éviter toute modification accidentelle
    return JSON.parse(JSON.stringify(formulas));
  } catch (error) {
    console.error('[MOCK] Erreur lors de la récupération des formules pour le champ ' + fieldId + ':', error);
    logOperation('getFormulasForField', fieldId, null, 'error', error.message);
    return [];
  }
};

/**
 * Met à jour une formule ou la crée si elle n'existe pas
 */
export const updateFormula = (fieldId: string, formulaId: string, data: any): any => {
  try {
    if (!fieldId || !formulaId) {
      console.error('[MOCK] Erreur: fieldId ou formulaId manquant');
      logOperation('updateFormula', fieldId || 'unknown', formulaId || null, 'error', 'Paramètres manquants');
      return null;
    }
    
    console.log('[MOCK] Mise à jour formule ' + formulaId + ' pour champ ' + fieldId, data);
    
    // Récupérer les formules actuelles (avec une copie pour éviter les références)
    const formulas = JSON.parse(JSON.stringify(getFormulasForField(fieldId)));
    
    // Trouver l'index de la formule à mettre à jour
    const index = formulas.findIndex(f => f.id === formulaId);
    
    // Créer un objet formule avec les données
    const formula = {
      id: formulaId,
      fieldId,
      name: data.name || 'Formule sans nom',
      sequence: data.sequence || [],
      order: typeof data.order === 'number' ? data.order : 0,
      updatedAt: new Date().toISOString()
    };
    
    // Mettre à jour ou ajouter la formule
    if (index >= 0) {
      formulas[index] = { ...formulas[index], ...formula };
      console.log('[MOCK] Formule ' + formulaId + ' mise à jour');
      logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'update' });
    } else {
      formulas.push(formula);
      console.log('[MOCK] Formule ' + formulaId + ' ajoutée au stockage');
      logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'create' });
    }
    
    // Mettre à jour le stockage avec une nouvelle référence
    global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
    
    console.log('[MOCK] Stockage mis à jour pour le champ ' + fieldId + ', maintenant ' + formulas.length + ' formules');
    
    // Tri des formules par ordre pour garantir la cohérence
    const sortedFormulas = formulas.sort((a, b) => a.order - b.order);
    
    // Renvoyer la formule mise à jour
    return formula;
  } catch (error) {
    console.error('[MOCK] Erreur lors de la mise à jour de la formule ' + formulaId + ':', error);
    logOperation('updateFormula', fieldId, formulaId, 'error', error.message);
    return null;
  }
};

/**
 * Supprime une formule
 */
export const deleteFormula = (fieldId: string, formulaId: string): boolean => {
  try {
    if (!fieldId || !formulaId) {
      console.error('[MOCK] Erreur: fieldId ou formulaId manquant pour la suppression');
      logOperation('deleteFormula', fieldId || 'unknown', formulaId || null, 'error', 'Paramètres manquants');
      return false;
    }
    
    const formulas = getFormulasForField(fieldId);
    const index = formulas.findIndex(f => f.id === formulaId);
    
    if (index >= 0) {
      formulas.splice(index, 1);
      global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
      console.log('[MOCK] Formule ' + formulaId + ' supprimée');
      logOperation('deleteFormula', fieldId, formulaId, 'success');
      return true;
    }
    
    console.log('[MOCK] Formule ' + formulaId + ' non trouvée pour suppression');
    logOperation('deleteFormula', fieldId, formulaId, 'warning', 'Formule non trouvée');
    return false;
  } catch (error) {
    console.error('[MOCK] Erreur lors de la suppression de la formule ' + formulaId + ':', error);
    logOperation('deleteFormula', fieldId, formulaId, 'error', error.message);
    return false;
  }
};

// Exporter l'état du stockage pour le debug
export const getStoreState = () => {
  return {
    fieldsCount: global._globalFormulasStore.size,
    fields: Array.from(global._globalFormulasStore.keys()),
    totalFormulas: Array.from(global._globalFormulasStore.values()).reduce((acc, arr) => acc + arr.length, 0),
    lastOperations: global._formulasOperationLog.slice(-10)
  };
};

// Fonction d'assistance pour voir les dernières opérations
export const getLastOperations = (count: number = 10) => {
  return global._formulasOperationLog.slice(-count);
};

// Fonction pour vider le stockage (utile pour les tests)
export const clearStorage = (fieldId?: string) => {
  if (fieldId) {
    global._globalFormulasStore.delete(fieldId);
    logOperation('clearStorage', fieldId);
    return true;
  } else {
    global._globalFormulasStore.clear();
    logOperation('clearAllStorage', 'all');
    return true;
  }
};
`;

// Sauvegarde du fichier original si aucune sauvegarde n'existe déjà
const backupFilePath = `${globalMockFilePath}.backup`;
if (!fs.existsSync(backupFilePath)) {
  fs.copyFileSync(globalMockFilePath, backupFilePath);
  console.log(`Sauvegarde du fichier original créée: ${backupFilePath}`);
} else {
  console.log(`Une sauvegarde existe déjà: ${backupFilePath}`);
}

// Écrire le nouveau contenu
fs.writeFileSync(globalMockFilePath, newContent);
console.log(`Fichier mis à jour avec succès: ${globalMockFilePath}`);

console.log('\nPour appliquer les modifications:');
console.log('1. Redémarrez le serveur API (npm run dev)');
console.log('2. Testez à nouveau les opérations de formules');
console.log('\nLes améliorations apportées:');
console.log('- Meilleure journalisation des opérations');
console.log('- Prévention des modifications accidentelles par référence');
console.log('- Gestion plus robuste des erreurs');
console.log('- Vérifications des paramètres obligatoires');
