import { Formula, SimpleCondition } from '../types/formula';

/**
 * Évalue une formule avec des valeurs de test
 * 
 * @param formula La formule à tester
 * @param fieldValues Les valeurs de test pour chaque champ (clé = ID du champ, valeur = valeur de test)
 * @returns Le résultat de l'évaluation de la formule
 */
export const evaluateFormula = (formula: Formula, fieldValues: Record<string, number>, context?: {
  // Résultats déjà calculés de formules pour éviter la récursion infinie
  formulaResults?: Record<string, number | boolean | null>;
  // Accès brut aux valeurs non numériques (ex: advanced_select objets)
  rawValues?: Record<string, unknown>;
  // Résolveur de formule imbriquée si absent du cache
  resolveFormulaById?: (id: string) => Formula | undefined;
  // Limiter profondeur pour prévenir cycles complexes
  depth?: number;
  // Ensemble des formules visitées pour détection cycle
  visited?: Set<string>;
}): {
  result: number | boolean | string | null;
  success: boolean;
  error?: string;
  debug: { step: number; operation: string; value: number | boolean | string | null }[];
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
  const debugSteps: { step: number; operation: string; value: number | boolean | string | null }[] = [];

  try {
    // Traiter chaque élément de la séquence
  let result: number | boolean | string | null = null;
    // Valeur brute (non convertie) du résultat courant (pour comparaisons string)
    let resultRaw: unknown = null;
    let currentOperator: string | null = null;
    let isFirstValue = true;

  formula.sequence.forEach((item, index) => {
      if (!item || !item.type) {
        throw new Error(`Élément de formule invalide à l'étape ${index + 1}`);
      }

      // Récupérer la valeur selon le type d'élément
  let itemValue: number | boolean; // valeur numérique logique utilisée pour opérations arithmétiques / bool
  let itemRaw: unknown = undefined; // valeur brute potentiellement string pour comparaisons '=' / '!='
      
      switch (item.type) {
        case 'value': {
          // Support "10%" => 0.10 si param utilisateur A
          if (typeof item.value === 'string') {
            const raw = item.value.trim();
            itemRaw = raw; // conserver brut
            // Si flag valueType=string => ne pas convertir sauf pour pourcentage explicite
            if (item.valueType === 'string' && !/^-?\d+(\.\d+)?%$/.test(raw.replace(/\s+/g,''))) {
              itemValue = 0; // neutre pour opérations arithmétiques
              break;
            }
            if (/^-?\d+(\.\d+)?%$/.test(raw)) {
              const base = parseFloat(raw.replace('%', ''));
              itemValue = isNaN(base) ? 0 : base / 100;
            } else {
              const num = parseFloat(raw);
              if (isNaN(num)) {
                // Constante non numérique => garder 0 comme valeur numérique mais raw servira pour '=' / '!='
                itemValue = 0;
              } else {
                itemValue = num;
              }
            }
          } else if (typeof item.value === 'number') {
            itemRaw = item.value;
            itemValue = item.value;
          } else {
            itemValue = 0;
          }
          break; }
        case 'field': {
          // Récupère la valeur d'un champ simple (number / text convertible) depuis fieldValues ou rawValues
          const fid = String(item.fieldId || item.value || '');
          let rawVal: unknown = undefined;
          if (fid) {
            if (typeof fieldValues[fid] !== 'undefined') rawVal = fieldValues[fid];
            else if (context?.rawValues && Object.prototype.hasOwnProperty.call(context.rawValues, fid)) rawVal = context.rawValues[fid];
          }
          console.log(`[FormulaEvaluator] 🏷️ Champ "${fid}": rawVal=${rawVal}, typeof=${typeof rawVal}`);
          
          // Si advanced_select stocké comme objet { selection, extra, nodeId }
          if (rawVal && typeof rawVal === 'object') {
            const sel = (rawVal as Record<string, unknown>).selection;
            console.log(`[FormulaEvaluator] 🔍 Advanced select - selection:${sel}, objet:`, rawVal);
            rawVal = typeof sel !== 'undefined' ? sel : rawVal;
          }
          itemRaw = rawVal;
          if (typeof rawVal === 'number') itemValue = rawVal;
          else if (typeof rawVal === 'string') {
            const trimmed = rawVal.trim();
            if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
              const base = parseFloat(trimmed.replace('%','')); itemValue = isNaN(base)?0: base/100;
            } else {
              const num = parseFloat(trimmed); itemValue = isNaN(num)?0:num;
            }
          } else {
            itemValue = 0;
          }
          console.log(`[FormulaEvaluator] 📊 Champ "${fid}" évalué: ${itemValue} (raw: ${rawVal})`);
          debugSteps.push({ step: index + 1, operation: `Champ ${fid}`, value: itemValue });
          break; }
        case 'formula_ref': {
          const refId = item.refFormulaId || String(item.value);
            if (!refId) throw new Error('formula_ref sans refFormulaId');
            const cache = context?.formulaResults || {};
            let refResult = cache[refId];
            if (typeof refResult === 'undefined') {
              // Détection cycle
              const visited = context?.visited || new Set<string>();
              if (visited.has(refId)) throw new Error(`Cycle détecté sur la formule ${refId}`);
              visited.add(refId);
              if (context?.depth && context.depth > 20) throw new Error('Profondeur formule imbriquée trop grande');
              const refFormula = context?.resolveFormulaById ? context.resolveFormulaById(refId) : undefined;
              if (!refFormula) throw new Error(`Formule référencée introuvable: ${refId}`);
              const nested = evaluateFormula(refFormula, fieldValues, {
                ...context,
                depth: (context?.depth || 0) + 1,
                visited,
                formulaResults: { ...(context?.formulaResults || {}) }
              });
              if (!nested.success) throw new Error(`Erreur formule imbriquée ${refId}: ${nested.error}`);
              refResult = nested.result as number | boolean | null;
              if (context?.formulaResults) context.formulaResults[refId] = refResult;
              visited.delete(refId);
            }
            if (typeof refResult === 'boolean') itemValue = refResult ? 1 : 0; else itemValue = Number(refResult ?? 0);
          break; }
        case 'adv_part': {
          const fid = item.fieldId || item.value as string;
          const part = item.part || 'selection';
          const raw = context?.rawValues?.[fid];
          let extracted: unknown = undefined;
          if (raw && typeof raw === 'object') {
            const obj = raw as Record<string, unknown>;
            if (part === 'selection') extracted = obj['selection'];
            else if (part === 'extra') extracted = obj['extra'];
            else if (part === 'nodeId') extracted = obj['nodeId'];
          } else if (part === 'selection') {
            extracted = raw; // fallback si simple valeur
          }
          itemRaw = extracted;
          // Conversion number
          if (typeof extracted === 'number') itemValue = extracted;
          else if (typeof extracted === 'string') {
            const s = extracted.trim();
            if (/^-?\d+(\.\d+)?%$/.test(s)) {
              const base = parseFloat(s.replace('%',''));
              itemValue = isNaN(base) ? 0 : base / 100;
            } else {
              const n = parseFloat(s);
              itemValue = isNaN(n) ? 0 : n;
            }
          } else {
            itemValue = 0; // Non numérique => 0
          }
          break; }
        case 'cond': {
          // Nouvelle logique: si condExpr existe on l'évalue comme une sous-formule booléenne
          let pass = false;
          let condDebugValue: number | boolean | string | null = null;
          if (item.condExpr && item.condExpr.length > 0) {
            // Vérifier si l'expression commence par une fonction IF
            const firstToken = item.condExpr[0];
            if (firstToken?.type === 'function' && String(firstToken.value).startsWith('IF(')) {
              // Traiter comme une fonction IF : évaluer les arguments suivants comme condition
              // Extraire la condition des tokens suivants (ignorer le IF)
              const conditionTokens = item.condExpr.slice(1); // Ignorer le token IF
              if (conditionTokens.length >= 3) {
                // Évaluer la condition (ex: Prix Kw/h > Prix Kw/h)
                const tempBool: Formula = { id: `${formula.id}__if_cond_${index}`, name: 'if-condition', sequence: conditionTokens, targetProperty: '' };
                const nestedBool = evaluateFormula(tempBool, fieldValues, { ...context, depth: (context?.depth || 0) + 1 });
                if (nestedBool.success) {
                  pass = Boolean(nestedBool.result);
                  condDebugValue = nestedBool.result as number | boolean | string | null;
                } else {
                  console.warn(`[FormulaEvaluator] Erreur évaluation condition IF: ${nestedBool.error}`);
                  pass = false;
                  condDebugValue = false;
                }
              } else {
                console.warn('[FormulaEvaluator] Fonction IF sans condition suffisante');
                pass = false;
                condDebugValue = false;
              }
            } else {
              // Traitement normal d'une expression booléenne
              const tempBool: Formula = { id: `${formula.id}__cond_expr_${index}`, name: 'cond-expr', sequence: item.condExpr, targetProperty: '' };
              const nestedBool = evaluateFormula(tempBool, fieldValues, { ...context, depth: (context?.depth || 0) + 1 });
              if (!nestedBool.success) throw new Error(`Erreur expression condition: ${nestedBool.error}`);
              pass = Boolean(nestedBool.result);
              condDebugValue = nestedBool.result as number | boolean | string | null;
            }
          } else {
            const cond = item.condition as SimpleCondition | undefined;
            const evalCondition = () => {
              if (!cond) return false;
              const raw = context?.rawValues?.[cond.fieldId] ?? context?.rawValues?.[cond.fieldId];
              const part = cond.part || 'selection';
              let base: unknown = raw;
              if (raw && typeof raw === 'object') {
                const obj = raw as Record<string, unknown>;
                if (part === 'selection') base = obj['selection'];
                else if (part === 'extra') base = obj['extra'];
                else if (part === 'nodeId') base = obj['nodeId'];
              }
              const op = cond.operator || '=';
              const val = cond.value;
              const cmp = (a: unknown, b: unknown, op: string): boolean => {
                if (op === 'in') {
                  if (!Array.isArray(b)) return false;
                  return b.some(x => String(x) === String(a));
                }
                // Comparaisons string pures si l'un n'est pas numérique
                const aNum = parseFloat(String(a));
                const bNum = parseFloat(String(b as unknown));
                const aIsNum = !isNaN(aNum) && String(a).trim() !== '' && /^-?\d+(\.\d+)?$/.test(String(a).trim());
                const bIsNum = !isNaN(bNum) && String(b).trim() !== '' && /^-?\d+(\.\d+)?$/.test(String(b as string).trim());
                const an = typeof a === 'number' ? a : parseFloat(String(a));
                const bn = typeof b === 'number' ? b : parseFloat(String(b as unknown));
                switch (op) {
                  case '=': return String(a) === String(b);
                  case '!=': return String(a) !== String(b);
                  case '>': return aIsNum && bIsNum ? an > bn : String(a) > String(b);
                  case '>=': return aIsNum && bIsNum ? an >= bn : String(a) >= String(b);
                  case '<': return aIsNum && bIsNum ? an < bn : String(a) < String(b);
                  case '<=': return aIsNum && bIsNum ? an <= bn : String(a) <= String(b);
                  default: return false;
                }
              };
              return cmp(base, val, op);
            };
            pass = evalCondition();
            condDebugValue = pass;
          }
          // Étape 1: évaluation de la condition
          debugSteps.push({ step: index + 1, operation: `Condition TEST`, value: condDebugValue });
          console.log(`[FormulaEvaluator] 🔍 Condition IF évaluée: ${pass} (${condDebugValue})`);
          
          // Évaluer sous-séquence THEN ou ELSE
          const seqToEval = pass ? (item.then || []) : (item.else || []);
          console.log(`[FormulaEvaluator] 📝 Branche sélectionnée: ${pass ? 'THEN' : 'ELSE'} (${seqToEval.length} éléments)`);
          if (seqToEval.length > 0) {
            console.log(`[FormulaEvaluator] 🔢 Séquence à évaluer:`, seqToEval.map(s => `${s.type}:${s.label || s.value}`));
          }
          if (seqToEval.length === 0) {
            // Comportement selon elseBehavior
            if (!pass && item.elseBehavior === 'ignore') {
              itemValue = 0; // Pour la séquence principale on retourne 0 (ou on pourrait skip). Simplicité: 0.
            } else {
              itemValue = 0; // THEN vide => 0
            }
            debugSteps.push({ step: index + 1, operation: `Condition ${pass ? 'THEN (vide)' : 'ELSE (vide)'}`, value: 0 });
          } else {
            // Construire une formule temporaire locale
            const temp: Formula = { id: `${formula.id}__cond_${index}`, name: 'cond', sequence: seqToEval, targetProperty: '' };
            console.log(`[FormulaEvaluator] ⚙️ Évaluation de la branche ${pass ? 'THEN' : 'ELSE'} avec fieldValues:`, Object.keys(fieldValues));
            const nested = evaluateFormula(temp, fieldValues, { ...context, depth: (context?.depth || 0) + 1 });
            console.log(`[FormulaEvaluator] 📊 Résultat branche ${pass ? 'THEN' : 'ELSE'}:`, nested);
            if (!nested.success) throw new Error(`Erreur sous-séquence condition: ${nested.error}`);
            const valNum = typeof nested.result === 'number' ? nested.result : (typeof nested.result === 'boolean' ? (nested.result ? 1 : 0) : 0);
            itemValue = valNum;
            console.log(`[FormulaEvaluator] ✅ Valeur finale de la condition: ${itemValue}`);
            debugSteps.push({ step: index + 1, operation: `Condition ${pass ? 'THEN' : 'ELSE'} (résultat branche)`, value: valNum });
          }
          itemRaw = itemValue;
          break; }
  case 'switch': {
          // Récupérer la valeur de base (advanced_select part ou raw)
          const fieldId = item.switchFieldId || item.fieldId;
          const part = item.switchPart || 'selection';
          const raw = context?.rawValues?.[fieldId||''];
          let key: unknown = raw;
          if (raw && typeof raw === 'object') {
            const obj = raw as Record<string, unknown>;
            if (part === 'selection') key = obj['selection'];
            else if (part === 'extra') key = obj['extra'];
            else if (part === 'nodeId') key = obj['nodeId'];
          }
          const cases = item.cases || [];
            const match = cases.find(c => String(c.value) === String(key));
            const seqToEval = match ? cDeep(match.seq) : (item.defaultSeq || []);
            if (seqToEval.length === 0) { itemValue = 0; break; }
            const temp: Formula = { id: `${formula.id}__switch_${index}`, name: 'switch', sequence: seqToEval, targetProperty: '' };
            const nested = evaluateFormula(temp, fieldValues, { ...context, depth: (context?.depth || 0) + 1 });
            if (!nested.success) throw new Error(`Erreur switch: ${nested.error}`);
            const valNum = typeof nested.result === 'number' ? nested.result : (typeof nested.result === 'boolean' ? (nested.result ? 1 : 0) : 0);
            itemValue = valNum;
            debugSteps.push({ step: index + 1, operation: `Switch valeur=${String(key)}`, value: valNum });
            itemRaw = itemValue;
          break; }
          
        case 'operator':
          currentOperator = String(item.value);
          // Ne pas traiter l'opérateur immédiatement
          debugSteps.push({ step: index + 1, operation: `Opérateur: ${currentOperator}`, value: null });
          return;
          
        case 'function': {
          // Support des fonctions de base
          const functionValue = String(item.value || '').trim();
          
          if (functionValue.startsWith('IF(')) {
            // Parser basique pour IF(condition, alors, sinon)
            // Pour l'instant, on supporte IF suivi d'autres éléments dans la séquence
            // Cette approche simple traite IF comme un préfixe qui influence l'interprétation
            
            // Dans le contexte de votre usage, IF semble être suivi des arguments dans la séquence
            // On va traiter cela comme un marqueur conditionnel
            itemValue = 1; // IF validé, continuer l'évaluation
            debugSteps.push({ step: index + 1, operation: `Function IF détectée`, value: itemValue });
          } else if (functionValue.startsWith('ROUND(')) {
            // Pour ROUND et autres fonctions mathématiques, on peut les ignorer pour l'instant
            itemValue = 0; // Neutre
            debugSteps.push({ step: index + 1, operation: `Function ${functionValue} (non implémentée)`, value: itemValue });
          } else {
            // Autres fonctions : les traiter comme des valeurs neutres pour ne pas casser l'évaluation
            itemValue = 0;
            debugSteps.push({ step: index + 1, operation: `Function ${functionValue} (ignorée)`, value: itemValue });
          }
          break;
        }
          
        default:
          throw new Error(`Type d'élément non supporté: ${item.type}`);
      }

      // Si c'est le premier élément ou après un opérateur
      if (isFirstValue) {
        result = (itemRaw !== undefined ? (itemRaw as (number|string|boolean|null)) : itemValue);
        resultRaw = itemRaw;
        isFirstValue = false;
        debugSteps.push({ step: index + 1, operation: 'Valeur initiale', value: result });
        return;
      }

      // Appliquer l'opérateur avec la valeur actuelle
      if (currentOperator === null) {
        throw new Error(`Opérateur manquant avant la valeur à l'étape ${index + 1}`);
      }

      // Effectuer l'opération
      console.log(`[FormulaEvaluator] 🔢 Opération: ${result} ${currentOperator} ${itemValue}`);
    switch (currentOperator) {
        case '+':
      result = (Number(result) || 0) + Number(itemValue);
          break;
        case '-':
      result = (Number(result) || 0) - Number(itemValue);
          break;
        case '*':
      result = (Number(result) || 0) * Number(itemValue);
          break;
        case '/':
          if (itemValue === 0) {
            // Enregistrer l'étape avant de lever l'erreur pour diagnostic UI
            debugSteps.push({ step: index + 1, operation: 'Division par 0 (arrêt)', value: null });
            console.log(`[FormulaEvaluator] ❌ Division par zéro détectée !`);
            throw new Error('Division par zéro');
          }
      result = (Number(result) || 0) / Number(itemValue);
          break;
        case '=':
      result = String(resultRaw ?? result) === String(itemRaw ?? itemValue);
          break;
        case '!=':
      result = String(resultRaw ?? result) !== String(itemRaw ?? itemValue);
          break;
        case '>':
      result = Number(result) > Number(itemValue);
          break;
        case '<':
      result = Number(result) < Number(itemValue);
          break;
        case '>=':
      result = Number(result) >= Number(itemValue);
          break;
        case '<=':
      result = Number(result) <= Number(itemValue);
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

      console.log(`[FormulaEvaluator] ➡️ Résultat après opération: ${result}`);
      debugSteps.push({ 
        step: index + 1, 
        operation: `${currentOperator} ${itemValue}`, 
        value: result 
      });

  // Mettre à jour la valeur brute AVANT de réinitialiser (sinon on perd l'info)
  if (['+','-','*','/'].includes(currentOperator || '')) resultRaw = result;
  if (['=','!='].includes(currentOperator || '')) resultRaw = result; // bool
  // Réinitialiser l'opérateur après application
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

/**
 * Évalue un ensemble de formules en respectant les dépendances inter-formules (formula_ref).
 * Retourne un objet { fieldId: { formulaId: result } } et un ordre d'évaluation.
 */
export function evaluateFormulasSet(params: {
  formulas: Formula[]; // toutes les formules disponibles
  fieldValues: Record<string, number>; // valeurs numériques de base
  rawValues?: Record<string, unknown>; // valeurs brutes (advanced_select, strings...)
  resolveFormulaById?: (id: string) => Formula | undefined;
}): {
  results: Record<string, Record<string, number | boolean | string | null>>;
  order: string[]; // ordre topologique des formules évaluées
  errors: Record<string, string>; // formulaId -> erreur
} {
  const { formulas, fieldValues, rawValues, resolveFormulaById } = params;
  const byId: Record<string, Formula> = {};
  formulas.forEach(f => { if (f && f.id) byId[f.id] = f; });
  const deps: Record<string, Set<string>> = {};
  const reverseDeps: Record<string, Set<string>> = {};
  const formulaIds = Object.keys(byId);

  // Extraire dépendances formula_ref
  for (const f of formulas) {
    if (!f || !f.id) continue;
    const set = (deps[f.id] = deps[f.id] || new Set());
    for (const it of f.sequence || []) {
      if (it?.type === 'formula_ref' && it.refFormulaId) {
        set.add(it.refFormulaId);
        (reverseDeps[it.refFormulaId] = reverseDeps[it.refFormulaId] || new Set()).add(f.id);
      }
    }
  }

  // Kahn topological sort
  const inDegree: Record<string, number> = {};
  formulaIds.forEach(id => { inDegree[id] = deps[id]?.size || 0; });
  const queue: string[] = formulaIds.filter(id => inDegree[id] === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const consumer of reverseDeps[id] || []) {
      inDegree[consumer] -= 1;
      if (inDegree[consumer] === 0) queue.push(consumer);
    }
  }
  // Détecter cycles
  const hasCycle = order.length !== formulaIds.length;
  if (hasCycle) {
    // On continue quand même mais les formules cycliques seront évaluées avec guard existant.
    const remaining = formulaIds.filter(id => !order.includes(id));
    order.push(...remaining); // append pour tentative d'évaluation protégée
  }

  const results: Record<string, Record<string, number | boolean | string | null>> = {};
  const errors: Record<string, string> = {};
  const formulaResultsCache: Record<string, number | boolean | null> = {};

  const resolver = (id: string) => byId[id] || resolveFormulaById?.(id);

  for (const fid of order) {
    const f = byId[fid];
    if (!f) continue;
    try {
      const out = evaluateFormula(f, fieldValues, {
        rawValues,
        resolveFormulaById: resolver,
        formulaResults: formulaResultsCache,
        visited: new Set(),
        depth: 0
      });
      if (!results[f.targetProperty || f.id]) results[f.targetProperty || f.id] = {};
      results[f.targetProperty || f.id][f.id] = out.result;
      if (out.success) {
        // stocker numérique/bool pour références ultérieures
        if (typeof out.result === 'number' || typeof out.result === 'boolean' || out.result === null) {
          formulaResultsCache[f.id] = out.result as number | boolean | null;
        } else if (typeof out.result === 'string') {
          const num = parseFloat(out.result);
            if (!isNaN(num)) formulaResultsCache[f.id] = num;
        }
      } else {
        errors[f.id] = out.error || 'Erreur inconnue';
      }
    } catch (e) {
      errors[fid] = (e as Error)?.message || 'Erreur inconnue';
    }
  }

  return { results, order, errors };
}
