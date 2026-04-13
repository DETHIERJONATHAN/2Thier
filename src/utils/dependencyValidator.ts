import type { FieldDependency } from "../../../../../../../store/slices/types";

// Interface pour le résultat de validation
interface DependencyValidationResult {
  isValid: boolean;
  message: string;
  details?: unknown;
}

/**
 * Valide une dépendance avant toute manipulation API.
 * @param dependency La dépendance à vérifier
 * @param origin Le composant d'origine de l'appel (pour le debug)
 */
export function validateDependency(dependency: FieldDependency, origin: string = 'unknown'): DependencyValidationResult {
  console.log(`[DependencyValidator:${origin}] 🔍 Validation de l'objet dépendance ${dependency?.id}`);

  // Vérification de base
  if (!dependency) {
    console.error(`[DependencyValidator:${origin}] ❌ Dépendance indéfinie`);
    return { isValid: false, message: "Dépendance indéfinie" };
  }

  // Vérification de l'ID
  if (!dependency.id) {
    console.error(`[DependencyValidator:${origin}] ❌ ID de dépendance manquant`);
    return { isValid: false, message: "ID de dépendance manquant" };
  }

  // Vérification du champ cible
  if (!dependency.targetFieldId) {
    console.error(`[DependencyValidator:${origin}] ❌ ID de champ cible manquant pour ${dependency.id}`);
    return { isValid: false, message: "ID de champ cible manquant" };
  }

  // Vérification de la séquence
  if (!dependency.sequence) {
    console.warn(`[DependencyValidator:${origin}] ⚠️ Séquence de dépendance manquante pour ${dependency.id}`);
    // Une séquence manquante n'est pas fatale, on peut en créer une par défaut
    return { 
      isValid: true, 
      message: "Séquence de dépendance manquante, une séquence par défaut sera créée" 
    };
  }

  // Vérification des conditions et de l'action
  const { conditions, action } = dependency.sequence;
  
  if (!Array.isArray(conditions)) {
    console.error(`[DependencyValidator:${origin}] ❌ Conditions n'est pas un tableau dans ${dependency.id}`);
    return { 
      isValid: false, 
      message: "Format de conditions invalide", 
      details: { conditions }
    };
  }

  // Vérification de l'action
  const validActions = ['show', 'hide', 'require', 'unrequire'];
  if (!validActions.includes(action)) {
    console.error(`[DependencyValidator:${origin}] ❌ Action invalide "${action}" dans ${dependency.id}`);
    return { 
      isValid: false, 
      message: `Action invalide "${action}". Les actions valides sont: ${validActions.join(', ')}`, 
      details: { action }
    };
  }

  // Vérification de chaque groupe de conditions
  for (let i = 0; i < conditions.length; i++) {
    const conditionGroup = conditions[i];
    
    if (!Array.isArray(conditionGroup)) {
      console.error(`[DependencyValidator:${origin}] ❌ Groupe de conditions ${i} n'est pas un tableau dans ${dependency.id}`);
      return { 
        isValid: false, 
        message: `Format de groupe de conditions ${i} invalide`, 
        details: { conditionGroup }
      };
    }

    // Vérification de chaque élément du groupe
    for (const item of conditionGroup) {
      if (!item.type) {
        console.error(`[DependencyValidator:${origin}] ❌ Élément de condition sans type dans ${dependency.id}`, item);
        return { 
          isValid: false, 
          message: "Élément de condition invalide (type manquant)", 
          details: item 
        };
      }
      
      if (item.type === 'field' && !item.id) {
        console.error(`[DependencyValidator:${origin}] ❌ Champ sans ID dans les conditions de ${dependency.id}`, item);
        return { 
          isValid: false, 
          message: "Champ invalide dans les conditions (ID manquant)", 
          details: item 
        };
      }
      
      if (item.type === 'operator' && !item.value) {
        console.error(`[DependencyValidator:${origin}] ❌ Opérateur sans valeur dans les conditions de ${dependency.id}`, item);
        return { 
          isValid: false, 
          message: "Opérateur invalide dans les conditions (valeur manquante)", 
          details: item 
        };
      }
    }
  }

  console.log(`[DependencyValidator:${origin}] ✅ Dépendance ${dependency.id} est valide`);
  return { isValid: true, message: "Dépendance valide" };
}

/**
 * Prépare une dépendance pour l'envoi à l'API.
 * @param dependency La dépendance à préparer
 */
export function prepareDependencyForAPI(dependency: FieldDependency): any {
  console.log(`[DependencyValidator] 🔧 Préparation de la dépendance ${dependency.id} pour l'API`);
  
  // Création d'une copie pour ne pas modifier l'original
  const prepared = {
    id: dependency.id,
    name: dependency.name || "Dépendance sans nom",
    sequence: dependency.sequence || { 
      conditions: [[]], 
      action: 'show',
      targetFieldId: dependency.targetFieldId
    },
    targetFieldId: dependency.targetFieldId
  };

  console.log(`[DependencyValidator] ✅ Dépendance ${dependency.id} prête pour l'API`, prepared);
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
 * Évalue une règle de dépendance avec des valeurs réelles.
 * @param dependency La dépendance à évaluer
 * @param values Les valeurs à utiliser pour l'évaluation
 */
export function evaluateDependency(
  dependency: FieldDependency,
  values: Record<string, unknown>
): { result: 'show' | 'hide' | 'require' | 'unrequire'; details?: unknown } {
  console.log(`[DependencyEvaluator] 🧪 Évaluation de la dépendance ${dependency.id}`, values);
  
  if (!dependency.sequence) {
    console.warn(`[DependencyEvaluator] ⚠️ Pas de séquence à évaluer pour ${dependency.id}`);
    return { result: 'show' }; // Par défaut, on montre le champ
  }
  
  try {
    const { conditions, action } = dependency.sequence;
    
    // Si pas de conditions, on applique l'action par défaut
    if (!conditions || conditions.length === 0 || (conditions.length === 1 && conditions[0].length === 0)) {
      console.log(`[DependencyEvaluator] ℹ️ Pas de conditions, action par défaut: ${action}`);
      return { result: action };
    }
    
    // Évaluation des conditions (OU logique entre les groupes)
    let finalResult = false;
    
    for (const conditionGroup of conditions) {
      if (conditionGroup.length === 0) continue;
      
      // Construction de l'expression pour ce groupe (ET logique dans le groupe)
      let groupExpr = '';
      
      // Traitement des éléments du groupe
      for (let i = 0; i < conditionGroup.length; i++) {
        const item = conditionGroup[i];
        
        if (item.type === 'field') {
          if (!item.id) continue;
          const value = values[item.id] ?? null;
          groupExpr += typeof value === 'string' ? `"${value}"` : value;
        } else if (item.type === 'operator') {
          groupExpr += ` ${item.value} `;
        } else if (item.type === 'value') {
          groupExpr += typeof item.value === 'string' ? `"${item.value}"` : item.value;
        }
      }
      
      console.log(`[DependencyEvaluator] 📝 Expression de groupe à évaluer: ${groupExpr}`);
      
      // Évaluation sécurisée de l'expression du groupe
      let groupResult;
      try {
        // Utilisation d'une fonction anonyme pour éviter eval()
        groupResult = new Function(`return ${groupExpr}`)();
      } catch (error) {
        console.error(`[DependencyEvaluator] ❌ Erreur lors de l'évaluation du groupe: ${error}`);
        continue; // On passe au groupe suivant en cas d'erreur
      }
      
      console.log(`[DependencyEvaluator] 🔍 Résultat de l'évaluation du groupe: ${groupResult}`);
      
      // Si ce groupe est vrai, le résultat final est vrai (OU logique)
      if (groupResult) {
        finalResult = true;
        break;
      }
    }
    
    console.log(`[DependencyEvaluator] 🔍 Résultat final de l'évaluation: ${finalResult}`);
    
    // Application de l'action en fonction du résultat
    if (finalResult) {
      // Les conditions sont remplies, on applique l'action
      return { result: action, details: { conditionsResult: finalResult, appliedAction: action } };
    } else {
      // Les conditions ne sont pas remplies, on applique l'action inverse
      const inverseAction = 
        action === 'show' ? 'hide' : 
        action === 'hide' ? 'show' : 
        action === 'require' ? 'unrequire' : 'require';
      
      return { result: inverseAction, details: { conditionsResult: finalResult, appliedAction: inverseAction } };
    }
    
  } catch (error) {
    console.error(`[DependencyEvaluator] ❌ Erreur lors de l'évaluation de la dépendance: ${error}`);
    return { result: 'show', details: { error } }; // Par défaut, on montre le champ en cas d'erreur
  }
}

