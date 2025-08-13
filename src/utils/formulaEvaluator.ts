import { Formula, FormulaItem } from '../types/formula';

/**
 * Évalue une formule avec des valeurs de test
 * 
 * @param formula La formule à tester
 * @param fieldValues Les valeurs de test pour chaque champ (clé = ID du champ, valeur = valeur de test)
 * @returns Le résultat de l'évaluation de la formule
 */
export const evaluateFormula = (formula: Formula, fieldValues: Record<string, number>): {
  result: number | boolean | null;
  success: boolean;
  error?: string;
  debug: { step: number; operation: string; value: any }[];
} => {
  if (!formula || !formula.sequence || !Array.isArray(formula.sequence) || formula.sequence.length === 0) {
    return {
      result: null,
      success: false,
      error: 'Formule vide ou invalide',
      debug: []
    };
  }

  // Tableau pour suivre chaque étape du calcul (pour le débogage)
  const debugSteps: { step: number; operation: string; value: any }[] = [];

  try {
    // Traiter chaque élément de la séquence
    let result: any = null;
    let currentOperator: string | null = null;
    let isFirstValue = true;

    formula.sequence.forEach((item, index) => {
      if (!item || !item.type) {
        throw new Error(`Élément de formule invalide à l'étape ${index + 1}`);
      }

      // Récupérer la valeur selon le type d'élément
      let itemValue: number | boolean;
      
      switch (item.type) {
        case 'field':
          // Gérer plusieurs façons possibles de stocker l'ID du champ
          const fieldId = item.fieldId || item.id || String(item.value);
          if (!fieldValues.hasOwnProperty(fieldId)) {
            throw new Error(`Valeur manquante pour le champ ${fieldId}`);
          }
          itemValue = fieldValues[fieldId];
          break;
          
        case 'value':
          // Convertir en nombre si possible
          if (typeof item.value === 'string') {
            itemValue = parseFloat(item.value);
            if (isNaN(itemValue)) itemValue = 0;
          } else if (typeof item.value === 'number') {
            itemValue = item.value;
          } else {
            itemValue = 0;
          }
          break;
          
        case 'operator':
          currentOperator = String(item.value);
          // Ne pas traiter l'opérateur immédiatement
          debugSteps.push({ step: index + 1, operation: `Opérateur: ${currentOperator}`, value: null });
          return;
          
        case 'function':
          // Fonctions non supportées pour l'instant
          throw new Error(`Les fonctions ne sont pas encore supportées: ${item.value}`);
          
        default:
          throw new Error(`Type d'élément non supporté: ${item.type}`);
      }

      // Si c'est le premier élément ou après un opérateur
      if (isFirstValue) {
        result = itemValue;
        isFirstValue = false;
        debugSteps.push({ step: index + 1, operation: 'Valeur initiale', value: result });
        return;
      }

      // Appliquer l'opérateur avec la valeur actuelle
      if (currentOperator === null) {
        throw new Error(`Opérateur manquant avant la valeur à l'étape ${index + 1}`);
      }

      // Effectuer l'opération
      switch (currentOperator) {
        case '+':
          result += itemValue;
          break;
        case '-':
          result -= itemValue;
          break;
        case '*':
          result *= itemValue;
          break;
        case '/':
          if (itemValue === 0) {
            throw new Error('Division par zéro');
          }
          result /= itemValue;
          break;
        case '=':
          result = result === itemValue;
          break;
        case '!=':
          result = result !== itemValue;
          break;
        case '>':
          result = result > itemValue;
          break;
        case '<':
          result = result < itemValue;
          break;
        case '>=':
          result = result >= itemValue;
          break;
        case '<=':
          result = result <= itemValue;
          break;
        case '&&':
          result = Boolean(result) && Boolean(itemValue);
          break;
        case '||':
          result = Boolean(result) || Boolean(itemValue);
          break;
        default:
          throw new Error(`Opérateur non supporté: ${currentOperator}`);
      }

      debugSteps.push({ 
        step: index + 1, 
        operation: `${currentOperator} ${itemValue}`, 
        value: result 
      });

      // Réinitialiser l'opérateur
      currentOperator = null;
    });

    return {
      result,
      success: true,
      debug: debugSteps
    };
  } catch (error) {
    return {
      result: null,
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      debug: debugSteps
    };
  }
};

/**
 * Crée un jeu de tests pour vérifier qu'une formule fonctionne comme prévu
 */
export const testFormula = (
  formula: Formula, 
  testCases: Array<{
    values: Record<string, number>;
    expectedResult: number | boolean;
    name?: string;
  }>
) => {
  console.log(`🧪 Test de la formule: ${formula.name || formula.id}`);
  
  const results = testCases.map((testCase, index) => {
    const { values, expectedResult, name } = testCase;
    const evaluation = evaluateFormula(formula, values);
    
    const testName = name || `Test #${index + 1}`;
    const success = evaluation.success && evaluation.result === expectedResult;
    
    console.log(`${success ? '✅' : '❌'} ${testName}`);
    
    if (!success) {
      console.log(`   Valeurs: ${JSON.stringify(values)}`);
      console.log(`   Résultat attendu: ${expectedResult}`);
      console.log(`   Résultat obtenu: ${evaluation.result}`);
      if (evaluation.error) {
        console.log(`   Erreur: ${evaluation.error}`);
      }
    }
    
    // Afficher les étapes de calcul pour le débogage
    console.log('   Étapes:');
    evaluation.debug.forEach(step => {
      console.log(`     ${step.step}. ${step.operation} => ${step.value}`);
    });
    
    return {
      name: testName,
      success,
      values,
      expectedResult,
      actualResult: evaluation.result,
      error: evaluation.error,
      debug: evaluation.debug
    };
  });
  
  // Résumé
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 Résumé: ${successCount}/${testCases.length} tests réussis`);
  
  return {
    formulaId: formula.id,
    formulaName: formula.name,
    success: successCount === testCases.length,
    successCount,
    totalTests: testCases.length,
    results
  };
};

/**
 * Exemples de tests pour une formule
 */
export const exampleTestFormula = () => {
  // Exemple de formule: prix * quantité
  const formula: Formula = {
    id: 'example-formula',
    name: 'Prix Total',
    targetProperty: 'prixTotal',
    sequence: [
      {
        id: 'field-prix',
        type: 'field',
        value: 'prix',
        label: 'Prix unitaire',
        fieldId: 'prix'
      },
      {
        id: 'op-mult',
        type: 'operator',
        value: '*',
        label: '*'
      },
      {
        id: 'field-qte',
        type: 'field',
        value: 'quantite',
        label: 'Quantité',
        fieldId: 'quantite'
      }
    ]
  };
  
  // Jeux de test
  const testCases = [
    {
      name: 'Cas standard',
      values: { prix: 10, quantite: 5 },
      expectedResult: 50
    },
    {
      name: 'Prix zéro',
      values: { prix: 0, quantite: 5 },
      expectedResult: 0
    },
    {
      name: 'Quantité décimale',
      values: { prix: 10, quantite: 2.5 },
      expectedResult: 25
    }
  ];
  
  // Exécuter les tests
  return testFormula(formula, testCases);
};

/**
 * Interface simple pour tester une formule avec des valeurs concrètes
 */
export const formulaTestUI = (formula: Formula, currentValues?: Record<string, number>) => {
  const fieldsInFormula = formula.sequence
    .filter(item => item.type === 'field')
    .map(item => ({
      id: item.fieldId || String(item.value),
      label: item.label || String(item.value)
    }));
  
  // Valeurs par défaut pour les champs
  const defaultValues = currentValues || {};
  fieldsInFormula.forEach(field => {
    if (defaultValues[field.id] === undefined) {
      defaultValues[field.id] = 0;
    }
  });
  
  // Évaluer avec les valeurs actuelles
  const evaluation = evaluateFormula(formula, defaultValues);
  
  console.log('='.repeat(50));
  console.log(`🔎 Test de la formule: ${formula.name || formula.id}`);
  console.log('='.repeat(50));
  console.log('\nValeurs actuelles:');
  
  Object.entries(defaultValues).forEach(([fieldId, value]) => {
    const field = fieldsInFormula.find(f => f.id === fieldId);
    console.log(`- ${field?.label || fieldId}: ${value}`);
  });
  
  console.log('\nRésultat:');
  if (evaluation.success) {
    console.log(`✅ ${evaluation.result}`);
  } else {
    console.log(`❌ Erreur: ${evaluation.error}`);
  }
  
  console.log('\nÉtapes de calcul:');
  evaluation.debug.forEach(step => {
    console.log(`${step.step}. ${step.operation} => ${step.value}`);
  });
  
  console.log('\n' + '='.repeat(50));
  
  return {
    formula,
    fieldsInFormula,
    currentValues: defaultValues,
    result: evaluation.result,
    success: evaluation.success,
    error: evaluation.error,
    debug: evaluation.debug
  };
};
