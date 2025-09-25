/**
 * Fichier de mocks pour les formules - à utiliser en développement uniquement
 */

// Simule le stockage en mémoire des formules
const formulasStore = new Map<string, any[]>();

/**
 * Récupère les formules stockées pour un champ spécifique
 */
export const getFormulasForField = (fieldId: string): any[] => {
  if (!formulasStore.has(fieldId)) {
    formulasStore.set(fieldId, []);
  }
  return formulasStore.get(fieldId) || [];
};

/**
 * Met à jour une formule ou la crée si elle n'existe pas
 */
export const updateFormula = (fieldId: string, formulaId: string, data: any): any => {
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
  formulasStore.set(fieldId, formulas);
  
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
    formulasStore.set(fieldId, formulas);
    return true;
  }
  
  return false;
};
