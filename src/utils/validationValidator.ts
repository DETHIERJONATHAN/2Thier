import type { FieldValidation } from "../../../../../../../store/slices/types";

// Interface pour le résultat de validation
interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: any;
}

/**
 * Valide une validation avant toute manipulation API.
 * @param validation La validation à vérifier
 * @param origin Le composant d'origine de l'appel (pour le debug)
 */
export function validateValidation(validation: FieldValidation, origin: string = 'unknown'): ValidationResult {
  console.log(`[ValidationValidator:${origin}] 🔍 Validation de l'objet validation ${validation?.id}`);

  // Vérification de base
  if (!validation) {
    console.error(`[ValidationValidator:${origin}] ❌ Validation indéfinie`);
    return { isValid: false, message: "Validation indéfinie" };
  }

  // Vérification de l'ID
  if (!validation.id) {
    console.error(`[ValidationValidator:${origin}] ❌ ID de validation manquant`);
    return { isValid: false, message: "ID de validation manquant" };
  }

  // Vérification de la séquence
  if (!validation.sequence) {
    console.warn(`[ValidationValidator:${origin}] ⚠️ Séquence de validation manquante pour ${validation.id}`);
    // Une séquence manquante n'est pas fatale, on peut en créer une par défaut
    return { 
      isValid: true,
      message: "Séquence de validation manquante, une séquence par défaut sera créée" 
    };
  }

  // Vérification des séquences validationSequence et comparisonSequence
  const { validationSequence, comparisonSequence } = validation.sequence;
  
  if (!Array.isArray(validationSequence)) {
    console.error(`[ValidationValidator:${origin}] ❌ validationSequence n'est pas un tableau dans ${validation.id}`);
    return { 
      isValid: false, 
      message: "Format de séquence de validation invalide", 
      details: { validationSequence }
    };
  }

  if (!Array.isArray(comparisonSequence)) {
    console.error(`[ValidationValidator:${origin}] ❌ comparisonSequence n'est pas un tableau dans ${validation.id}`);
    return { 
      isValid: false, 
      message: "Format de séquence de comparaison invalide", 
      details: { comparisonSequence }
    };
  }

  // Vérification des éléments des séquences
  for (const item of [...validationSequence, ...comparisonSequence]) {
    if (!item.type) {
      console.error(`[ValidationValidator:${origin}] ❌ Élément de séquence sans type dans ${validation.id}`, item);
      return { 
        isValid: false, 
        message: "Élément de séquence invalide (type manquant)", 
        details: item 
      };
    }
    
    if (item.type === 'field' && !item.id) {
      console.error(`[ValidationValidator:${origin}] ❌ Champ sans ID dans la séquence de ${validation.id}`, item);
      return { 
        isValid: false, 
        message: "Champ invalide dans la séquence (ID manquant)", 
        details: item 
      };
    }
    
    if (item.type === 'operator' && !item.value) {
      console.error(`[ValidationValidator:${origin}] ❌ Opérateur sans valeur dans la séquence de ${validation.id}`, item);
      return { 
        isValid: false, 
        message: "Opérateur invalide dans la séquence (valeur manquante)", 
        details: item 
      };
    }
  }

  // Vérification du message d'erreur
  if (!validation.errorMessage) {
    console.warn(`[ValidationValidator:${origin}] ⚠️ Message d'erreur manquant pour ${validation.id}`);
    // Un message manquant n'est pas fatal, on peut utiliser un message par défaut
  }

  console.log(`[ValidationValidator:${origin}] ✅ Validation ${validation.id} est valide`);
  return { isValid: true, message: "Validation valide" };
}

/**
 * Prépare une validation pour l'envoi à l'API.
 * @param validation La validation à préparer
 */
export function prepareValidationForAPI(validation: FieldValidation): any {
  console.log(`[ValidationValidator] 🔧 Préparation de la validation ${validation.id} pour l'API`);
  
  // Création d'une copie pour ne pas modifier l'original
  const prepared = {
    id: validation.id,
    name: validation.name || "Validation sans nom",
    sequence: validation.sequence || { validationSequence: [], comparisonSequence: [] },
    errorMessage: validation.errorMessage || "Valeur invalide",
    fieldId: validation.fieldId
  };

  console.log(`[ValidationValidator] ✅ Validation ${validation.id} prête pour l'API`, prepared);
  return prepared;
}

/**
 * Récupère les en-têtes standard pour les appels API.
 */
export function getAPIHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Évalue une règle de validation avec des valeurs réelles.
 * @param validation La validation à évaluer
 * @param values Les valeurs à utiliser pour l'évaluation
 */
export function evaluateValidation(validation: FieldValidation, values: Record<string, any>): { isValid: boolean; error?: string; details?: any } {
  console.log(`[ValidationEvaluator] 🧪 Évaluation de la validation ${validation.id}`, values);
  
  if (!validation.sequence) {
    console.warn(`[ValidationEvaluator] ⚠️ Pas de séquence à évaluer pour ${validation.id}`);
    return { isValid: true };
  }
  
  try {
    // Construction de l'expression à partir des séquences
    const { validationSequence, comparisonSequence } = validation.sequence;
    
    // Conversion des séquences en expressions
    let validationExpr = '';
    let comparisonExpr = '';
    
    // Traitement de la séquence de validation
    for (const item of validationSequence) {
      if (item.type === 'field') {
        const value = values[item.id] ?? null;
        validationExpr += typeof value === 'string' ? `"${value}"` : value;
      } else if (item.type === 'operator') {
        validationExpr += ` ${item.value} `;
      } else if (item.type === 'value') {
        validationExpr += typeof item.value === 'string' ? `"${item.value}"` : item.value;
      }
    }
    
    // Traitement de la séquence de comparaison
    for (const item of comparisonSequence) {
      if (item.type === 'field') {
        const value = values[item.id] ?? null;
        comparisonExpr += typeof value === 'string' ? `"${value}"` : value;
      } else if (item.type === 'operator') {
        comparisonExpr += ` ${item.value} `;
      } else if (item.type === 'value') {
        comparisonExpr += typeof item.value === 'string' ? `"${item.value}"` : item.value;
      }
    }
    
    // Construction de l'expression complète
    const fullExpr = `${validationExpr} ${comparisonSequence.length > 0 ? '==' : ''} ${comparisonExpr}`;
    
    console.log(`[ValidationEvaluator] 📝 Expression à évaluer: ${fullExpr}`);
    
    // Évaluation sécurisée de l'expression
    let result;
    try {
      // Utilisation d'une fonction anonyme pour éviter eval()
      result = new Function(`return ${fullExpr}`)();
    } catch (error) {
      console.error(`[ValidationEvaluator] ❌ Erreur lors de l'évaluation: ${error}`);
      return { 
        isValid: false, 
        error: `Erreur d'évaluation: ${error}`, 
        details: { expression: fullExpr, error }
      };
    }
    
    console.log(`[ValidationEvaluator] 🔍 Résultat de l'évaluation: ${result}`);
    
    // La validation est valide si l'expression est vraie
    return { 
      isValid: !!result, 
      error: !result ? validation.errorMessage || "Validation échouée" : undefined,
      details: { expression: fullExpr, result }
    };
    
  } catch (error) {
    console.error(`[ValidationEvaluator] ❌ Erreur lors de l'évaluation de la validation: ${error}`);
    return { 
      isValid: false, 
      error: `Erreur lors de l'évaluation: ${error}`, 
      details: error
    };
  }
}

