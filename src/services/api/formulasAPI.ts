/**
 * Service pour gérer les API liées aux formules
 */

/**
 * Récupère toutes les formules disponibles
 * @returns Promise avec les formules
 */
export const getAllFormulas = async () => {
  const response = await fetch('/api/formulas/all', {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération des formules: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Récupère les formules pour un champ spécifique
 * @param fieldId - ID du champ
 * @returns Promise avec les formules du champ
 */
export const getFieldFormulas = async (fieldId: string) => {
  const response = await fetch(`/api/formulas/field/${fieldId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération des formules pour le champ ${fieldId}: ${response.statusText}`);
  }
  
  return response.json();
};
