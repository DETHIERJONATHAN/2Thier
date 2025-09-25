/**
 * Fichier de mocks global pour les formules - à utiliser en développement uniquement
 * Version améliorée avec une meilleure gestion des données et des logs détaillés
 */

// Déclaration globale pour persister les données entre les modules
declare global {
  var _globalFormulasStore: Map<string, any[]>;
  var _backupFormulasStore: Map<string, any[]>;  // Stockage de secours pour la redondance
  var _formulasOperationLog: Array<{
    timestamp: Date,
    operation: string,
    fieldId: string,
    formulaId?: string,
    status: string,
    details?: any
  }>;
}

// CORRECTIF MAJEUR : Initialisation du stockage global avec système de persistance amélioré
// Utiliser un système avec mécanisme de double stockage pour plus de fiabilité
if (!global._globalFormulasStore) {
  global._globalFormulasStore = new Map<string, any[]>();
  console.log('[MOCK] 🆕 Initialisation du stockage global principal des formules');
  
  // Ajouter un stockage de secours comme redondance
  global._backupFormulasStore = new Map<string, any[]>();
  console.log('[MOCK] 🆕 Initialisation du stockage de secours des formules');
}

// Initialiser le stockage de secours s'il n'existe pas encore
if (!global._backupFormulasStore) {
  global._backupFormulasStore = new Map<string, any[]>();
  console.log('[MOCK] 🆕 Initialisation tardive du stockage de secours');
}

if (!global._formulasOperationLog) {
  global._formulasOperationLog = [];
  console.log('[MOCK] 📝 Initialisation du journal des opérations de formules');
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
    
    console.log('[MOCK] getFormulasForField - État du store global:', global._globalFormulasStore.size, 'champs stockés');
    console.log('[MOCK] getFormulasForField - Clés actuelles:', Array.from(global._globalFormulasStore.keys()).join(', '));
    
    if (!global._globalFormulasStore.has(fieldId)) {
      console.log('[MOCK] Initialisation du stockage pour le champ ' + fieldId);
      global._globalFormulasStore.set(fieldId, []);
      logOperation('initStorage', fieldId);
    }
    
    const storedData = global._globalFormulasStore.get(fieldId);
    if (!storedData) {
      console.warn('[MOCK] Données manquantes après vérification, création d\'un tableau vide');
      global._globalFormulasStore.set(fieldId, []);
      return [];
    }
    
    console.log('[MOCK] Récupération de ' + storedData.length + ' formules pour le champ ' + fieldId);
    
    if (storedData.length > 0) {
      console.log('[MOCK] Exemple de données:', JSON.stringify(storedData[0]));
    }
    
    logOperation('getFormulasForField', fieldId, null, 'success', { count: storedData.length });
    
    // Effectuer une copie profonde pour éviter toute modification accidentelle
    return JSON.parse(JSON.stringify(storedData));
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la récupération des formules pour le champ ' + fieldId + ':', error);
    logOperation('getFormulasForField', fieldId, null, 'error', error.message || String(error));
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
    const index = formulas.findIndex((f: any) => f.id === formulaId);
    
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
    const formulasCopy = JSON.parse(JSON.stringify(formulas));
    
    // Tri des formules par ordre pour garantir la cohérence
    const sortedFormulas = formulasCopy.sort((a: any, b: any) => a.order - b.order);
    
    // CORRECTIF MAJEUR : Double sauvegarde dans deux stores séparés pour redondance
    // Sauvegarde dans le store principal
    global._globalFormulasStore.set(fieldId, sortedFormulas);
    
    // Sauvegarde de secours
    try {
      // Créer une copie fraîche pour le stockage de secours
      const backupCopy = JSON.parse(JSON.stringify(sortedFormulas));
      global._backupFormulasStore.set(fieldId, backupCopy);
      console.log('[MOCK] ✅ Double sauvegarde réussie pour le champ ' + fieldId);
    } catch (backupError) {
      console.error('[MOCK] ❌ Échec de la sauvegarde de secours:', backupError);
    }
    
    console.log('[MOCK] 🔄 Stockage mis à jour pour le champ ' + fieldId + ', maintenant ' + formulas.length + ' formules');
    console.log('[MOCK] ✓ Vérification après mise à jour: ' + (global._globalFormulasStore.get(fieldId)?.length || 0) + ' formules dans le store principal');
    console.log('[MOCK] ✓ Vérification du store de secours: ' + (global._backupFormulasStore.get(fieldId)?.length || 0) + ' formules');
    
    // Vérification détaillée des données
    const storedFormulas = global._globalFormulasStore.get(fieldId);
    if (storedFormulas && storedFormulas.length > 0) {
      console.log('[MOCK] 📄 Vérification principale - premier élément:', JSON.stringify(storedFormulas[0]));
      
      // Vérifier la structure complète pour détecter les anomalies
      storedFormulas.forEach((f: any, idx: number) => {
        if (!f.id || !f.sequence) {
          console.warn(`[MOCK] ⚠️ Formule #${idx} potentiellement corrompue:`, 
            JSON.stringify({id: f.id, hasSequence: !!f.sequence, sequenceType: typeof f.sequence}));
        }
      });
    }
    
    // Renvoyer la formule mise à jour
    return formula;
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la mise à jour de la formule ' + formulaId + ':', error);
    logOperation('updateFormula', fieldId, formulaId, 'error', error.message || String(error));
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
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la suppression de la formule ' + formulaId + ':', error);
    logOperation('deleteFormula', fieldId, formulaId, 'error', error.message || String(error));
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

// Fonction pour forcer le rechargement du store avec système de secours (utile pour déboguer)
export const forceRefreshStore = (fieldId: string): any[] => {
  if (!fieldId) {
    console.error('[MOCK] ❌ forceRefreshStore - ERREUR: fieldId est vide ou null');
    return [];
  }
  
  console.log('[MOCK] 🔄 Forçage du rechargement du store pour le champ ' + fieldId);
  console.log('[MOCK] 📊 État actuel du store principal: ' + global._globalFormulasStore.size + ' champs');
  console.log('[MOCK] 📊 État actuel du store de secours: ' + global._backupFormulasStore.size + ' champs');
  console.log('[MOCK] 🔑 Clés dans le store principal: ' + Array.from(global._globalFormulasStore.keys()).join(', '));
  console.log('[MOCK] 🔑 Clés dans le store de secours: ' + Array.from(global._backupFormulasStore.keys()).join(', '));
  
  let formulas: any[] = [];
  let source = 'aucune';
  
  // Tentative 1: Récupérer depuis le store principal
  if (global._globalFormulasStore.has(fieldId)) {
    try {
      const primaryData = global._globalFormulasStore.get(fieldId);
      if (primaryData && Array.isArray(primaryData) && primaryData.length > 0) {
        formulas = JSON.parse(JSON.stringify(primaryData));
        source = 'principale';
        console.log(`[MOCK] ✅ Données récupérées depuis la source principale: ${formulas.length} formules`);
      } else {
        console.warn(`[MOCK] ⚠️ La source principale existe mais ne contient pas de données valides`);
      }
    } catch (primaryError) {
      console.error(`[MOCK] ❌ Erreur lors de l'accès à la source principale:`, primaryError);
    }
  } else {
    console.warn(`[MOCK] ⚠️ Le champ ${fieldId} n'existe pas dans la source principale`);
  }
  
  // Tentative 2: Si la source principale a échoué, essayer la source de secours
  if (formulas.length === 0 && global._backupFormulasStore.has(fieldId)) {
    try {
      const backupData = global._backupFormulasStore.get(fieldId);
      if (backupData && Array.isArray(backupData) && backupData.length > 0) {
        formulas = JSON.parse(JSON.stringify(backupData));
        source = 'secours';
        console.log(`[MOCK] ✅ Données récupérées depuis la source de secours: ${formulas.length} formules`);
        
        // Restaurer les données dans le store principal
        global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
        console.log(`[MOCK] 🔄 Store principal restauré à partir du store de secours`);
      } else {
        console.warn(`[MOCK] ⚠️ La source de secours existe mais ne contient pas de données valides`);
      }
    } catch (backupError) {
      console.error(`[MOCK] ❌ Erreur lors de l'accès à la source de secours:`, backupError);
    }
  }
  
  // Si aucune donnée n'a été récupérée, initialiser un tableau vide
  if (formulas.length === 0) {
    console.log(`[MOCK] ⚠️ Aucune donnée trouvée pour le champ ${fieldId}, initialisation d'un tableau vide`);
    global._globalFormulasStore.set(fieldId, []);
    global._backupFormulasStore.set(fieldId, []);
    logOperation('forceRefreshStore_init', fieldId);
    return [];
  }
  
  // Log détaillé des données récupérées
  console.log(`[MOCK] ✓ Store forcé (source: ${source}) - ${formulas.length} formules récupérées pour ${fieldId}`);
  
  if (formulas.length > 0) {
    console.log('[MOCK] 📄 Premier élément du store:', JSON.stringify(formulas[0]));
  } else {
    console.log('[MOCK] 📄 Store vide pour le champ ' + fieldId);
  }
  
  logOperation('forceRefreshStore', fieldId, null, 'success', { count: formulas.length, source });
  return formulas;
};
