/**
 * Fichier de mocks global pour les formules - ÃƒÂ  utiliser en dÃƒÂ©veloppement uniquement
 * Version amÃƒÂ©liorÃƒÂ©e avec une meilleure gestion des donnÃƒÂ©es et des logs dÃƒÂ©taillÃƒÂ©s
 */

// DÃƒÂ©claration globale pour persister les donnÃƒÂ©es entre les modules
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

// CORRECTIF MAJEUR : Initialisation du stockage global avec systÃƒÂ¨me de persistance amÃƒÂ©liorÃƒÂ©
// Utiliser un systÃƒÂ¨me avec mÃƒÂ©canisme de double stockage pour plus de fiabilitÃƒÂ©
if (!global._globalFormulasStore) {
  global._globalFormulasStore = new Map<string, any[]>();
  
  // Ajouter un stockage de secours comme redondance
  global._backupFormulasStore = new Map<string, any[]>();
}

// Initialiser le stockage de secours s'il n'existe pas encore
if (!global._backupFormulasStore) {
  global._backupFormulasStore = new Map<string, any[]>();
}

if (!global._formulasOperationLog) {
  global._formulasOperationLog = [];
}

// Fonction de journalisation des opÃƒÂ©rations
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
  
  // Limiter la taille du log ÃƒÂ  100 entrÃƒÂ©es
  if (global._formulasOperationLog.length > 100) {
    global._formulasOperationLog.shift();
  }
  
  return logEntry;
};

/**
 * RÃƒÂ©cupÃƒÂ¨re les formules stockÃƒÂ©es pour un champ spÃƒÂ©cifique
 */
export const getFormulasForField = (fieldId: string): any[] => {
  try {
    if (!fieldId) {
      console.error('[MOCK] Erreur: fieldId est undefined ou null');
      logOperation('getFormulasForField', 'unknown', null, 'error', 'fieldId manquant');
      return [];
    }
    
    
    if (!global._globalFormulasStore.has(fieldId)) {
      global._globalFormulasStore.set(fieldId, []);
      logOperation('initStorage', fieldId);
    }
    
    const storedData = global._globalFormulasStore.get(fieldId);
    if (!storedData) {
      console.warn('[MOCK] DonnÃƒÂ©es manquantes aprÃƒÂ¨s vÃƒÂ©rification, crÃƒÂ©ation d\'un tableau vide');
      global._globalFormulasStore.set(fieldId, []);
      return [];
    }
    
    
    if (storedData.length > 0) {
    }
    
    logOperation('getFormulasForField', fieldId, null, 'success', { count: storedData.length });
    
    // Effectuer une copie profonde pour ÃƒÂ©viter toute modification accidentelle
    return JSON.parse(JSON.stringify(storedData));
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la rÃƒÂ©cupÃƒÂ©ration des formules pour le champ ' + fieldId + ':', error);
    logOperation('getFormulasForField', fieldId, null, 'error', error.message || String(error));
    return [];
  }
};

/**
 * Met ÃƒÂ  jour une formule ou la crÃƒÂ©e si elle n'existe pas
 */
export const updateFormula = (fieldId: string, formulaId: string, data: any): any => {
  try {
    if (!fieldId || !formulaId) {
      console.error('[MOCK] Erreur: fieldId ou formulaId manquant');
      logOperation('updateFormula', fieldId || 'unknown', formulaId || null, 'error', 'ParamÃƒÂ¨tres manquants');
      return null;
    }
    
    
    // RÃƒÂ©cupÃƒÂ©rer les formules actuelles (avec une copie pour ÃƒÂ©viter les rÃƒÂ©fÃƒÂ©rences)
    const formulas = JSON.parse(JSON.stringify(getFormulasForField(fieldId)));
    
    // Trouver l'index de la formule ÃƒÂ  mettre ÃƒÂ  jour
    const index = formulas.findIndex((f: any) => f.id === formulaId);
    
    // CrÃƒÂ©er un objet formule avec les donnÃƒÂ©es
    const formula = {
      id: formulaId,
      fieldId,
      name: data.name || 'Formule sans nom',
      sequence: data.sequence || [],
      order: typeof data.order === 'number' ? data.order : 0,
      updatedAt: new Date().toISOString()
    };
    
    // Mettre ÃƒÂ  jour ou ajouter la formule
    if (index >= 0) {
      formulas[index] = { ...formulas[index], ...formula };
      logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'update' });
    } else {
      formulas.push(formula);
      logOperation('updateFormula', fieldId, formulaId, 'success', { type: 'create' });
    }
    
    // Mettre ÃƒÂ  jour le stockage avec une nouvelle rÃƒÂ©fÃƒÂ©rence
    const formulasCopy = JSON.parse(JSON.stringify(formulas));
    
    // Tri des formules par ordre pour garantir la cohÃƒÂ©rence
    const sortedFormulas = formulasCopy.sort((a: any, b: any) => a.order - b.order);
    
    // CORRECTIF MAJEUR : Double sauvegarde dans deux stores sÃƒÂ©parÃƒÂ©s pour redondance
    // Sauvegarde dans le store principal
    global._globalFormulasStore.set(fieldId, sortedFormulas);
    
    // Sauvegarde de secours
    try {
      // CrÃƒÂ©er une copie fraÃƒÂ®che pour le stockage de secours
      const backupCopy = JSON.parse(JSON.stringify(sortedFormulas));
      global._backupFormulasStore.set(fieldId, backupCopy);
    } catch (backupError) {
      console.error('[MOCK] Ã¢ÂÅ’ Ãƒâ€°chec de la sauvegarde de secours:', backupError);
    }
    
    
    // VÃƒÂ©rification dÃƒÂ©taillÃƒÂ©e des donnÃƒÂ©es
    const storedFormulas = global._globalFormulasStore.get(fieldId);
    if (storedFormulas && storedFormulas.length > 0) {
      
      // VÃƒÂ©rifier la structure complÃƒÂ¨te pour dÃƒÂ©tecter les anomalies
      storedFormulas.forEach((f: any, idx: number) => {
        if (!f.id || !f.sequence) {
          console.warn(`[MOCK] Ã¢Å¡Â Ã¯Â¸Â Formule #${idx} potentiellement corrompue:`, 
            JSON.stringify({id: f.id, hasSequence: !!f.sequence, sequenceType: typeof f.sequence}));
        }
      });
    }
    
    // Renvoyer la formule mise ÃƒÂ  jour
    return formula;
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la mise ÃƒÂ  jour de la formule ' + formulaId + ':', error);
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
      logOperation('deleteFormula', fieldId || 'unknown', formulaId || null, 'error', 'ParamÃƒÂ¨tres manquants');
      return false;
    }
    
    const formulas = getFormulasForField(fieldId);
    const index = formulas.findIndex(f => f.id === formulaId);
    
    if (index >= 0) {
      formulas.splice(index, 1);
      global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
      logOperation('deleteFormula', fieldId, formulaId, 'success');
      return true;
    }
    
    logOperation('deleteFormula', fieldId, formulaId, 'warning', 'Formule non trouvÃƒÂ©e');
    return false;
  } catch (error: any) {
    console.error('[MOCK] Erreur lors de la suppression de la formule ' + formulaId + ':', error);
    logOperation('deleteFormula', fieldId, formulaId, 'error', error.message || String(error));
    return false;
  }
};

// Exporter l'ÃƒÂ©tat du stockage pour le debug
export const getStoreState = () => {
  return {
    fieldsCount: global._globalFormulasStore.size,
    fields: Array.from(global._globalFormulasStore.keys()),
    totalFormulas: Array.from(global._globalFormulasStore.values()).reduce((acc, arr) => acc + arr.length, 0),
    lastOperations: global._formulasOperationLog.slice(-10)
  };
};

// Fonction d'assistance pour voir les derniÃƒÂ¨res opÃƒÂ©rations
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

// Fonction pour forcer le rechargement du store avec systÃƒÂ¨me de secours (utile pour dÃƒÂ©boguer)
export const forceRefreshStore = (fieldId: string): any[] => {
  if (!fieldId) {
    console.error('[MOCK] Ã¢ÂÅ’ forceRefreshStore - ERREUR: fieldId est vide ou null');
    return [];
  }
  
  
  let formulas: any[] = [];
  let source = 'aucune';
  
  // Tentative 1: RÃƒÂ©cupÃƒÂ©rer depuis le store principal
  if (global._globalFormulasStore.has(fieldId)) {
    try {
      const primaryData = global._globalFormulasStore.get(fieldId);
      if (primaryData && Array.isArray(primaryData) && primaryData.length > 0) {
        formulas = JSON.parse(JSON.stringify(primaryData));
        source = 'principale';
      } else {
        console.warn(`[MOCK] Ã¢Å¡Â Ã¯Â¸Â La source principale existe mais ne contient pas de donnÃƒÂ©es valides`);
      }
    } catch (primaryError) {
      console.error(`[MOCK] Ã¢ÂÅ’ Erreur lors de l'accÃƒÂ¨s ÃƒÂ  la source principale:`, primaryError);
    }
  } else {
    console.warn(`[MOCK] Ã¢Å¡Â Ã¯Â¸Â Le champ ${fieldId} n'existe pas dans la source principale`);
  }
  
  // Tentative 2: Si la source principale a ÃƒÂ©chouÃƒÂ©, essayer la source de secours
  if (formulas.length === 0 && global._backupFormulasStore.has(fieldId)) {
    try {
      const backupData = global._backupFormulasStore.get(fieldId);
      if (backupData && Array.isArray(backupData) && backupData.length > 0) {
        formulas = JSON.parse(JSON.stringify(backupData));
        source = 'secours';
        
        // Restaurer les donnÃƒÂ©es dans le store principal
        global._globalFormulasStore.set(fieldId, JSON.parse(JSON.stringify(formulas)));
      } else {
        console.warn(`[MOCK] Ã¢Å¡Â Ã¯Â¸Â La source de secours existe mais ne contient pas de donnÃƒÂ©es valides`);
      }
    } catch (backupError) {
      console.error(`[MOCK] Ã¢ÂÅ’ Erreur lors de l'accÃƒÂ¨s ÃƒÂ  la source de secours:`, backupError);
    }
  }
  
  // Si aucune donnÃƒÂ©e n'a ÃƒÂ©tÃƒÂ© rÃƒÂ©cupÃƒÂ©rÃƒÂ©e, initialiser un tableau vide
  if (formulas.length === 0) {
    global._globalFormulasStore.set(fieldId, []);
    global._backupFormulasStore.set(fieldId, []);
    logOperation('forceRefreshStore_init', fieldId);
    return [];
  }
  
  // Log dÃƒÂ©taillÃƒÂ© des donnÃƒÂ©es rÃƒÂ©cupÃƒÂ©rÃƒÂ©es
  
  if (formulas.length > 0) {
  } else {
  }
  
  logOperation('forceRefreshStore', fieldId, null, 'success', { count: formulas.length, source });
  return formulas;
};
