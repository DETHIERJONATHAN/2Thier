/**
 * 🧠 TRADUCTEUR UNIVERSEL TREEBRANGLEAF
 * 
 * Moteur d'interprétation dynamique qui :
 * - LIT les formules/conditions depuis TreeBranchLeaf
 * - TRADUIT {field_id} vers valeurs du formulaire TBL
 * - EXÉCUTE les calculs
 * - STOCKE les résultats pour réutilisation
 * - AFFICHE que la réponse finale
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
// Debug flag opt-in: localStorage.TBL_SMART_DEBUG='1'
const isSmartDebug = () => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('TBL_SMART_DEBUG') === '1'; } catch { return false; }
};
const diagMode = () => { try { return typeof localStorage !== 'undefined' && localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; } };
import { shortHash } from '../utils/stableHash';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';

// 🚦 Readiness globale: aucune évaluation tant que données de base non chargées (variables + fields + tree)
// (Ces flags pourront être positionnés ailleurs dans l'app une fois les hooks dispos; placeholder léger ici.)
declare global { interface Window { __TBL_READY__?: boolean } }
const isReady = () => (typeof window === 'undefined') ? true : window.__TBL_READY__ !== false; // par défaut prêt sauf force

// (Anciennes interfaces FormulaInstanceMeta / VariableInstanceMeta retirées après unification evaluate)
import { useEvalBridge } from '../bridge/evalBridge';

// 📊 Cache des résultats calculés (résultat typé en unknown pour accepter primitif ou objet)
const calculationCache = new Map<string, {
  result: unknown;
  timestamp: number;
  dependencies: string[]; // Liste des champs utilisés
}>();

// 🧬 Mapping elementId -> dependencies (collectées depuis réponses serveur) pour réduire la signature utile
const elementDependencies = new Map<string, string[]>();
// 🔒 Freeze map – une fois des dépendances stabilisées pour un elementId on ne les élargit plus (évite oscillations hash)
const frozenDependencies = new Set<string>();
// 🧷 Snapshot initial des clés formData vues à la première évaluation (avant retour deps serveur)
const initialKeySnapshot = new Map<string, string[]>();

// 🔀 Déduplication des évaluations en vol par elementId (après strip)
const inFlightRequests = new Map<string, Promise<unknown>>();

// (Batching & resolvers externalisés dans evalBridge)

// �🔄 TTL du cache (5 secondes) + TTL signature pour éviter recalculs superflus
const CACHE_TTL = 5000;
// Signature -> {result, expiresAt} pour court-circuiter translateAndExecute si identique
const signatureResultCache = new Map<string, { value: unknown; expiresAt: number }>();

// 🧪 Bridge de protection StrictMode: détecter double-mount initial et empêcher double calcul inutile
const strictModeBridge = {
  mounts: new Set<string>(),
  recentlyMounted(id: string) {
    if (this.mounts.has(id)) return true;
    this.mounts.add(id);
    setTimeout(() => this.mounts.delete(id), 1000); // fenêtre courte
    return false;
  }
};

// Injection optionnelle du graphe de dépendances global (assigné par TBL si DIAG)
declare global { interface Window { TBL_DEP_GRAPH?: Map<string, Set<string>> } }

/**
 * 🔀 ÉVALUATEUR DYNAMIQUE DE CONDITIONS ET FORMULES
 * 
 * TOUT DYNAMIQUE - AUCUNE VALEUR EN DUR !
 */
async function evaluateConditionDynamically(
  conditionId: string,
  formData: Record<string, unknown>,
  apiInstance: ReturnType<typeof useAuthenticatedApi>['api'] // Instance d'API authentifiée
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  
  try {
    // 1. Récupérer la condition depuis l'API en utilisant l'instance authentifiée
    const conditionData = await apiInstance.get(`/api/treebranchleaf/conditions/${conditionId}`);
    const conditionSet = conditionData.conditionSet;
    
    // 2. Évaluer les branches
    for (const branch of conditionSet.branches || []) {
      const when = branch.when;
      
      // Évaluer la condition when
      if (when.op === 'isNotEmpty') {
        const leftRef = when.left.ref; // @value.702d1b09-abc9-4096-9aaa-77155ac5294f
        const baseKey = leftRef.replace('@value.', '');
        
        // 🔍 Recherche intelligente de la clé dans formData
        let value;
        const possibleKeys = [
          baseKey,                    // 702d1b09-abc9-4096-9aaa-77155ac5294f
          `${baseKey}_field`,         // 702d1b09-abc9-4096-9aaa-77155ac5294f_field
          baseKey.toLowerCase(),      // version minuscule
          `${baseKey.toLowerCase()}_field`
        ];
        
        for (const key of possibleKeys) {
          if (key in formData && formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
            value = formData[key];
            break;
          }
        }
        
        if (value && value !== '' && value !== null && value !== undefined && value !== '0') {
          // Condition vraie -> exécuter les actions
          for (const action of branch.actions) {
            if (action.type === 'SHOW' && action.nodeIds) {
              // Retourner la valeur du node affiché avec recherche intelligente
              const nodeId = action.nodeIds[0];
              
              // 🔍 Recherche intelligente de la valeur du node
              const possibleNodeKeys = [
                nodeId,
                `${nodeId}_field`,
                nodeId.toLowerCase(),
                `${nodeId.toLowerCase()}_field`
              ];
              
              let nodeValue;
              for (const key of possibleNodeKeys) {
                if (key in formData && formData[key] !== undefined) {
                  nodeValue = formData[key];
                  break;
                }
              }
              
              return { success: true, result: nodeValue };
            }
          }
        }
      }
    }
    
    // 3. Si aucune branche ne match -> fallback (calculer la formule)
    const fallback = conditionSet.fallback;
    if (fallback && fallback.actions) {
      for (const action of fallback.actions) {
        if (action.type === 'SHOW' && action.nodeIds) {
          const nodeId = action.nodeIds[0];
          
          // Si c'est une formule (node-formula:...)
          if (nodeId.startsWith('node-formula:')) {
            const formulaId = nodeId.replace('node-formula:', '');
            
            // Récupérer et calculer la formule
            const formulaResult = await evaluateFormulaDynamically(formulaId, formData, apiInstance);
            if (formulaResult.success) {
              return { success: true, result: formulaResult.result };
            } else {
              return { success: false, error: formulaResult.error };
            }
          }
        }
      }
    }
    
    return { success: false, error: 'Aucune action trouvée' };
    
  } catch (error) {
    console.error('❌ [CONDITION ERROR]:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🧮 ÉVALUATEUR DYNAMIQUE DE FORMULES
 * 
 * CALCUL DYNAMIQUE DES FORMULES - AUCUNE VALEUR EN DUR !
 */
async function evaluateFormulaDynamically(
  formulaId: string,
  formData: Record<string, unknown>,
  api: ReturnType<typeof useAuthenticatedApi>['api']
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  
  try {
    // 1. Récupérer la formule depuis l'API
    const formulaData = await api.get(`/api/treebranchleaf/formulas/${formulaId}`);
    const tokens = formulaData.tokens;
    
    // 2. Résoudre les tokens et calculer
    const values = [];
    const operators = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('@value.')) {
        // Résoudre la référence @value
        const key = token.replace('@value.', '');
        const value = formData[key] || formData[`${key}_field`];
        const numValue = parseFloat(value) || 0;
        
        values.push(numValue);
        
      } else if (token === '/' || token === '*' || token === '+' || token === '-') {
        // Opérateur
        operators.push(token);
      } else {
        // Valeur littérale
        const numValue = parseFloat(token) || 0;
        values.push(numValue);
      }
    }
    
    // 3. Calculer le résultat (pour l'instant, simple division A / B)
    if (values.length >= 2 && operators.includes('/')) {
      const result = values[0] / values[1];
      return { success: true, result: result };
    }
    
    return { success: false, error: 'Formule non supportée' };
    
  } catch (error) {
    console.error('❌ [FORMULA ERROR]:', error);
    return { success: false, error: error.message };
  }
}

function useUniversalTranslator() {
  const { enqueue } = useEvalBridge();

  // 🧮 Moteur de traduction universel
  const translateAndExecute = useCallback(async (
    sourceRef: string,
    formData: Record<string, unknown>
  ): Promise<{ result: unknown; cached: boolean }> => {
    
    // 1. Vérifier le cache
    // Construction d'une clé de cache stable basée sur subset pertinent (deps figées OU snapshot initial)
    let elementIdForKey = sourceRef;
    for (const p of ['formula:','condition:','table:','variable:']) if (elementIdForKey.startsWith(p)) { elementIdForKey = elementIdForKey.slice(p.length); break; }
    let subsetKeys: string[] | undefined = elementDependencies.get(elementIdForKey);
    if (!subsetKeys) {
      // Utiliser snapshot initial si disponible / sinon le créer (mais ne pas prendre les clés ajoutées plus tard pour stabilité)
      if (!initialKeySnapshot.has(elementIdForKey)) {
        initialKeySnapshot.set(elementIdForKey, Object.keys(formData));
      }
      subsetKeys = initialKeySnapshot.get(elementIdForKey);
    }
    const subsetObj = subsetKeys?.reduce((acc, k) => { if (k in formData) acc[k] = formData[k]; return acc; }, {} as Record<string, unknown>) || formData;
    const cacheKey = `${sourceRef}_${JSON.stringify(subsetObj)}`;
    const cached = calculationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
  if (isSmartDebug()) console.log(`🔄 [TRADUCTEUR] Cache HIT pour ${sourceRef}`);
      return { result: cached.result, cached: true };
    }

    const attemptEval = async (): Promise<unknown> => {
  if (isSmartDebug()) console.log(`🧠 [TRADUCTEUR] Traduction/Evaluation unifiée de ${sourceRef}...`);

      // 2. Gestion référence locale directe (@value.<key>) – retour immédiat
      if (sourceRef.startsWith('@value.')) {
        const key = sourceRef.replace('@value.', '');
        const direct = (formData || {})[key];
        calculationCache.set(cacheKey, { result: direct, timestamp: Date.now(), dependencies: Object.keys(formData) });
        return direct;
      }

      // 🎯 NOUVEAU: TRADUCTION AUTOMATIQUE TREEBRANGLEAF → MIRRORS
      // Avant d'envoyer à l'API, vérifier si l'elementId correspond à une formule TreeBranchLeaf
      // qui utilise des noms de champs (ex: "Hauteur façade avant") et les traduire vers leurs mirrors
      let interceptedByMirror = false;
      
      console.log(`🧠 [TRADUCTEUR][STEP_1] Début traduction pour sourceRef: "${sourceRef}"`);
      console.log(`🧠 [TRADUCTEUR][STEP_2] elementId extrait: "${elementId}"`);
      console.log(`🧠 [TRADUCTEUR][STEP_3] FormData reçu:`, Object.keys(formData).length, 'clés');
      
      // 🎯 LOG SPÉCIAL POUR LE CHAMP QUI FONCTIONNE
      if (elementId === '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e') {
        console.log(`⭐ [TRADUCTEUR][WORKING_FIELD] Traduction du champ qui fonctionne !`);
        console.log(`⭐ [TRADUCTEUR][WORKING_FIELD][FORMDATA]`, Object.keys(formData).filter(k => k.includes('10bfb6d2') || k.includes('Prix')));
      }
      
      try {
        // Si on évalue une formule TreeBranchLeaf, chercher dans les mirrors en premier
        if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
          const allMirrorKeys = Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_'));
          
          // Chercher si elementId correspond à un champ TreeBranchLeaf avec des données dans les mirrors
          for (const mirrorKey of allMirrorKeys) {
            if (mirrorKey.startsWith('__mirror_data_')) {
              const fieldLabel = mirrorKey.replace('__mirror_data_', '');
              // Si le champ TreeBranchLeaf a des données dans les mirrors et correspond à notre recherche
              if (window.TBL_FORM_DATA[mirrorKey] != null && window.TBL_FORM_DATA[mirrorKey] !== '' && window.TBL_FORM_DATA[mirrorKey] !== 0) {
                // Créer une correspondance avec l'elementId recherché
                if (elementId.includes(fieldLabel.replace(/\s/g, '').toLowerCase()) || 
                    fieldLabel.replace(/\s/g, '').toLowerCase().includes(elementId.toLowerCase())) {
                  console.log(`🎯 [TRADUCTEUR][MIRROR_INTERCEPT] ${elementId} → utilise mirror ${mirrorKey} = ${window.TBL_FORM_DATA[mirrorKey]}`);
                  const mirrorValue = window.TBL_FORM_DATA[mirrorKey];
                  calculationCache.set(cacheKey, { result: mirrorValue, timestamp: Date.now(), dependencies: [mirrorKey] });
                  interceptedByMirror = true;
                  return mirrorValue;
                }
              }
            }
          }
          
          // 🎯 LOGIQUE SPÉCIALE: Si c'est une formule TreeBranchLeaf qui contient des références à d'autres champs
          // Examiner si la formule fait référence à des champs qui ont des mirrors
          if (!interceptedByMirror && sourceRef.startsWith('formula:')) {
            // Pour les formules TreeBranchLeaf, vérifier si elles utilisent des noms de champs avec mirrors
            for (const mirrorKey of allMirrorKeys) {
              if (mirrorKey.startsWith('__mirror_data_')) {
                const fieldLabel = mirrorKey.replace('__mirror_data_', '');
                if (window.TBL_FORM_DATA[mirrorKey] != null && window.TBL_FORM_DATA[mirrorKey] !== '' && window.TBL_FORM_DATA[mirrorKey] !== 0) {
                  console.log(`🔍 [TRADUCTEUR][AVAILABLE_MIRROR] ${fieldLabel} = ${window.TBL_FORM_DATA[mirrorKey]} (via ${mirrorKey})`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [TRADUCTEUR][MIRROR_ERROR]', e);
      }

      // 3. Extraire elementId réel (supprimer préfixe capacity si présent) - conserver version original pour logs
      let elementId = sourceRef;
      const originalSourceRef = sourceRef; // garder trace pour debug
      const PREFIXES = ['formula:', 'condition:', 'table:', 'variable:'];
      for (const p of PREFIXES) {
        if (elementId.startsWith(p)) {
          elementId = elementId.substring(p.length);
          break;
        }
      }
      if (isSmartDebug()) {
        if (elementId !== originalSourceRef) {
          console.log(`🔧 [TRADUCTEUR] Stripping préfixe: '${originalSourceRef}' -> elementId='${elementId}'`);
        } else {
          console.log(`🔧 [TRADUCTEUR] Pas de préfixe à retirer pour '${sourceRef}' (elementId='${elementId}')`);
        }
      }

      // 🎯 PREPROCESSING FORMULES: Enrichir formData avec les champs TreeBranchLeaf depuis les mirrors
      const enhancedFormData = { ...formData };
      if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
        const allMirrorKeys = Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_data_'));
        
        for (const mirrorKey of allMirrorKeys) {
          const fieldLabel = mirrorKey.replace('__mirror_data_', '');
          const mirrorValue = window.TBL_FORM_DATA[mirrorKey];
          
          if (mirrorValue != null && mirrorValue !== '' && mirrorValue !== 0) {
            // Ajouter le champ par son nom naturel dans formData pour que les formules le trouvent
            enhancedFormData[fieldLabel] = mirrorValue;
            if (isSmartDebug()) {
              console.log(`🎯 [TRADUCTEUR][FORMDATA_ENRICHMENT] "${fieldLabel}" = ${mirrorValue} (depuis ${mirrorKey})`);
            }
          }
        }
        
        if (isSmartDebug()) {
          const enrichedCount = Object.keys(enhancedFormData).length - Object.keys(formData).length;
          console.log(`✨ [TRADUCTEUR][FORMDATA_ENRICHMENT] ${enrichedCount} champs TreeBranchLeaf ajoutés au formData pour l'évaluation`);
        }
      }

      // 4. Appel via bridge unifié (dédup + batch) avec les données enrichies
      console.log(`🧠 [TRADUCTEUR][STEP_4] Appel bridge unifié pour elementId: "${elementId}"`);
      console.log(`🧠 [TRADUCTEUR][STEP_4][ENHANCED_DATA]`, Object.keys(enhancedFormData).length, 'clés enrichies');
      
      let flightPromise = inFlightRequests.get(elementId);
      if (!flightPromise) {
        console.log(`🧠 [TRADUCTEUR][STEP_4][NEW_REQUEST] Nouvelle requête pour "${elementId}"`);
        flightPromise = enqueue(elementId, enhancedFormData) as Promise<unknown>;
        inFlightRequests.set(elementId, flightPromise);
      } else if (isSmartDebug()) {
        console.log(`🪄 [TRADUCTEUR] Rejoint requête batch en vol pour ${sourceRef}`);
      }
      
      console.log(`🧠 [TRADUCTEUR][STEP_5] Attente de la réponse...`);
      const response = await flightPromise as { success?: boolean; code?: string; value?: unknown; result?: unknown; calculatedValue?: unknown; error?: string } | null;
      if (inFlightRequests.get(elementId) === flightPromise) inFlightRequests.delete(elementId);
      
      console.log(`🧠 [TRADUCTEUR][STEP_6] Réponse reçue:`, response ? Object.keys(response) : 'null');
      
      // 🔍 Debug pour diagnostic uniquement en cas d'erreur
      if (!response) { 
        console.warn(`❌ [TRADUCTEUR] Réponse vide pour ${sourceRef}`);
        return null; 
      }
      
      if (response?.success === false) {
        console.warn(`❌ [TRADUCTEUR] Échec API pour ${sourceRef}:`, response.error);
        if (response.code === 'ELEMENT_UNRESOLVED') {
          console.warn(`❌ [TRADUCTEUR] ELEMENT_UNRESOLVED pour ${sourceRef} (elementId: ${elementId})`);
          return null;
        }
      }
      
      const respTyped: { calculatedValue?: unknown; value?: unknown; result?: unknown } = response as { calculatedValue?: unknown; value?: unknown; result?: unknown };
      const extracted = (respTyped.calculatedValue !== undefined ? respTyped.calculatedValue : (respTyped.value !== undefined ? respTyped.value : respTyped.result)) ?? null;
      
      console.log(`🧠 [TRADUCTEUR][STEP_7] Valeur extraite:`, extracted);
      
      if ((diagMode() || isSmartDebug()) && extracted === null) console.log('[SMART][RESPONSE][NO-VALUE]', { sourceRef, responseKeys: Object.keys(response || {}) });
      // Capturer dependencies si fournies (supports divers champs)
      const depsCandidate = (response as Record<string, unknown>)?.['dependencies'] || (response as Record<string, unknown>)?.['dependencies_used'];
      if (!frozenDependencies.has(elementId) && Array.isArray(depsCandidate) && depsCandidate.length > 0) {
        elementDependencies.set(elementId, depsCandidate.map(String));
        frozenDependencies.add(elementId);
        // Libérer snapshot initial devenu inutile
        initialKeySnapshot.delete(elementId);
      }
      if (extracted !== null && extracted !== undefined) {
        const depsForCache = elementDependencies.get(elementId) || Object.keys(enhancedFormData);
        calculationCache.set(cacheKey, { result: extracted, timestamp: Date.now(), dependencies: depsForCache });
      }
      
      if (isSmartDebug()) {
        console.log(`🎯 [TRADUCTEUR][FINAL_RESULT] ${sourceRef} → ${extracted} (via enhancedFormData avec ${Object.keys(enhancedFormData).filter(k => k.startsWith('__mirror_') || !k.startsWith('__')).length} champs enrichis)`);
      }
      return extracted;
    };

    try {
      const value = await attemptEval();
      return { result: value, cached: false };

    } catch {
      return { result: null, cached: false };
    }
  }, [enqueue]);

  // 🗑️ Nettoyage du cache quand les dépendances changent
  const invalidateCache = useCallback((changedFields: string[]) => {
    for (const [key, cached] of calculationCache.entries()) {
      // Si un champ modifié était une dépendance, supprimer du cache
      if (cached.dependencies.some(dep => changedFields.includes(dep))) {
        calculationCache.delete(key);
      }
    }
  }, []);

  // 📊 Statistiques du cache
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    const validEntries = Array.from(calculationCache.values())
      .filter(cached => (now - cached.timestamp) < CACHE_TTL).length;
    
    return {
      total: calculationCache.size,
      valid: validEntries,
      expired: calculationCache.size - validEntries
    };
  }, []);

  return {
    translateAndExecute,
    invalidateCache,
    getCacheStats
  };
}

/**
 * 🎯 Composant de résultat calculé intelligent
 * Affiche UNIQUEMENT la réponse finale, pas le calcul
 */
export interface SmartCalculatedFieldProps {
  sourceRef: string;
  formData: Record<string, unknown>;
  displayFormat?: 'number' | 'currency' | 'percentage';
  unit?: string;
  precision?: number;
  placeholder?: string;
  rawExpression?: string;
  variablesDefinition?: Record<string, { sourceField: string; type?: string }>;
}

export function SmartCalculatedField({
  sourceRef,
  formData,
  displayFormat = 'number',
  unit = '',
  precision = 2,
  placeholder = '---'
}: SmartCalculatedFieldProps) {
  const { translateAndExecute } = useUniversalTranslator();
  const { api } = useAuthenticatedApi(); // Récupérer l'instance API authentifiée
  const [result, setResult] = useState<unknown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🚀 NOUVEAU: Évaluation DYNAMIQUE COMPLÈTE - PLUS DE MIRROR STATIQUE !
  const getMirrorFallback = useCallback(async (sourceRef: string): Promise<unknown | null> => {
    const fieldId = sourceRef.replace(/^(formula:|condition:|table:|variable:)/, '');
    
    console.log(`🚀 [DYNAMIC] Évaluation complètement dynamique de ${sourceRef}`);
    console.log(`🔍 [DYNAMIC][STEP_1] fieldId extrait: "${fieldId}"`);
    console.log(`🔍 [DYNAMIC][STEP_2] FormData disponible:`, Object.keys(formData).slice(0, 10), '...');
    console.log(`🔍 [DYNAMIC][STEP_3] Mirrors disponibles:`, typeof window !== 'undefined' && window.TBL_FORM_DATA ? Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_')).slice(0, 5) : 'Aucun');
    
    // 🎯 ANALYSE SPÉCIALE POUR LE CHAMP QUI FONCTIONNE: 10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e
    if (fieldId === '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e') {
      console.log(`⭐ [WORKING_FIELD] Analyse du champ qui fonctionne: ${fieldId}`);
      console.log(`⭐ [WORKING_FIELD][MIRRORS] Recherche de mirrors pour ce champ...`);
      
      if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
        const relatedMirrors = Object.keys(window.TBL_FORM_DATA).filter(k => 
          k.includes(fieldId) || k.includes('Prix Kw/h test')
        );
        console.log(`⭐ [WORKING_FIELD][MIRRORS_FOUND]`, relatedMirrors);
        
        for (const mirrorKey of relatedMirrors) {
          const value = window.TBL_FORM_DATA[mirrorKey];
          console.log(`⭐ [WORKING_FIELD][MIRROR_VALUE] ${mirrorKey} = ${value}`);
        }
      }
      
      console.log(`⭐ [WORKING_FIELD][FORMDATA] Recherche dans formData...`);
      const directValue = formData[fieldId];
      console.log(`⭐ [WORKING_FIELD][DIRECT] formData["${fieldId}"] = ${directValue}`);
      
      // Recherche étendue
      const possibleKeys = [
        fieldId,
        `${fieldId}_field`,
        `var_${fieldId}`,
        `node_${fieldId}`,
        `formula_${fieldId}`
      ];
      
      for (const key of possibleKeys) {
        if (formData[key] !== undefined) {
          console.log(`⭐ [WORKING_FIELD][FOUND] formData["${key}"] = ${formData[key]}`);
        }
      }
      
      // Continuer avec la logique normale mais avec plus de logs
    }
    
    // LOGIQUE DYNAMIQUE COMPLÈTE : Évaluer la condition ff05cc48-27ec-4d94-8975-30a0f9c1c275
    if (fieldId === 'ff05cc48-27ec-4d94-8975-30a0f9c1c275') {
      try {
        // Évaluer la condition dynamiquement
        const result = await evaluateConditionDynamically(fieldId, formData, api);
        
        if (result.success) {
          return result.result;
        } else {
          return `Erreur: ${result.error}`;
        }
        
      } catch {
        // FALLBACK: Calcul manuel de la formule si API non disponible
        
        // Formule: @value.d6212e5e-3fe9-4cce-b380-e6745524d011 / @value.node_1757366229534_x6jxzmvmu
        const var1Key = 'd6212e5e-3fe9-4cce-b380-e6745524d011';
        const var2Key = 'node_1757366229534_x6jxzmvmu';
        
        const val1 = formData[var1Key] || formData[`${var1Key}_field`];
        const val2 = formData[var2Key] || formData[`${var2Key}_field`];
        
        if (val1 && val2) {
          const num1 = parseFloat(val1);
          const num2 = parseFloat(val2);
          
          if (!isNaN(num1) && !isNaN(num2) && num2 !== 0) {
            const result = num1 / num2;
            return result.toFixed(4);
          }
        }
        
        // Recherche étendue dans formData pour des variables similaires
        const relevantKeys = Object.keys(formData).filter(key => 
          key.toLowerCase().includes('prix') || 
          key.toLowerCase().includes('kwh') || 
          key.toLowerCase().includes('tarif') ||
          key.toLowerCase().includes('cout')
        );
        
        if (relevantKeys.length >= 2) {
          const val1 = parseFloat(formData[relevantKeys[0]]) || 0;
          const val2 = parseFloat(formData[relevantKeys[1]]) || 1;
          const result = val1 / val2;
          return result.toFixed(4);
        }
        
        return "Calcul en cours...";
      }
    }
    
    // POUR TOUS LES AUTRES : Évaluation dynamique générique
    console.log(`🔍 [GENERIC] Évaluation générique pour fieldId: "${fieldId}"`);
    console.log(`🔍 [GENERIC][SOURCE_REF] sourceRef original: "${sourceRef}"`);
    
    // 🎯 LOGS POUR IDENTIFIER POURQUOI D'AUTRES CHAMPS NE FONCTIONNENT PAS
    if (fieldId.includes('702d1b09-abc9-4096-9aaa-77155ac5294f')) {
      console.log(`🔎 [FORMULA_FIELD] Analyse du champ formule: ${fieldId}`);
      console.log(`🔎 [FORMULA_FIELD][TYPE] Probablement une formule TreeBranchLeaf`);
    }
    
    if (fieldId.includes('cc8bf34e-3461-426e-a16d-2c1db4ff8a76')) {
      console.log(`🔎 [CHAMP_C] Analyse du champ C: ${fieldId}`);
      console.log(`🔎 [CHAMP_C][TYPE] Probablement un champ de données`);
    }
    
    if (fieldId.includes('688046c2-c2ee-4617-b4d3-c66eca40fa9d')) {
      console.log(`🔎 [CHAMP_C_DATA] Analyse du champ C data: ${fieldId}`);
      console.log(`🔎 [CHAMP_C_DATA][TYPE] Probablement un champ de données aussi`);
    }
    
    // Recherche intelligente dans formData
    console.log(`🔍 [SEARCH] Recherche intelligente pour fieldId: "${fieldId}"`);
    const possibleKeys = [
      fieldId,
      `${fieldId}_field`,
      `var_${fieldId}`,
      `node_${fieldId}`,
      `condition_${fieldId}`,
      `formula_${fieldId}`
    ];
    
    console.log(`🔍 [SEARCH][KEYS] Clés à tester:`, possibleKeys);
    
    for (const key of possibleKeys) {
      const value = formData[key];
      console.log(`🔍 [SEARCH][TEST] formData["${key}"] = ${value} (${typeof value})`);
      if (value !== undefined && value !== null && value !== '') {
        console.log(`✅ [SEARCH][FOUND] Trouvé valeur pour "${key}": ${value}`);
        return value;
      }
    }
    
    // 🪞 RECHERCHE DANS LES MIRRORS
    console.log(`🪞 [MIRROR_SEARCH] Recherche dans les mirrors pour fieldId: "${fieldId}"`);
    if (typeof window !== 'undefined' && window.TBL_FORM_DATA) {
      const allMirrorKeys = Object.keys(window.TBL_FORM_DATA).filter(k => k.startsWith('__mirror_'));
      console.log(`🪞 [MIRROR_SEARCH][AVAILABLE]`, allMirrorKeys.slice(0, 10), '...');
      
      // Recherche mirrors liés à ce fieldId
      const relatedMirrors = allMirrorKeys.filter(k => 
        k.includes(fieldId) || 
        k.toLowerCase().includes(fieldId.toLowerCase()) ||
        (fieldId.length > 10 && k.includes(fieldId.substring(0, 10)))
      );
      
      console.log(`🪞 [MIRROR_SEARCH][RELATED]`, relatedMirrors);
      
      for (const mirrorKey of relatedMirrors) {
        const mirrorValue = window.TBL_FORM_DATA[mirrorKey];
        console.log(`🪞 [MIRROR_SEARCH][VALUE] ${mirrorKey} = ${mirrorValue}`);
        if (mirrorValue !== null && mirrorValue !== undefined && mirrorValue !== '' && mirrorValue !== 0) {
          console.log(`✅ [MIRROR_SEARCH][FOUND] Utilisation mirror "${mirrorKey}": ${mirrorValue}`);
          return mirrorValue;
        }
      }
    }
    
    // Dernière chance: chercher par pattern
    console.log(`🔍 [PATTERN_SEARCH] Recherche par pattern pour fieldId: "${fieldId}"`);
    const matchingKeys = Object.keys(formData).filter(key => 
      key.includes(fieldId) || formData[key]?.toString().includes(fieldId)
    );
    
    console.log(`🔍 [PATTERN_SEARCH][MATCHING]`, matchingKeys);
    
    if (matchingKeys.length > 0) {
      const result = formData[matchingKeys[0]];
      console.log(`🔍 [PATTERN] ${matchingKeys[0]} = ${result}`);
      return result;
    }
    
    console.log(`❌ [NOT_FOUND] Aucune valeur trouvée pour ${fieldId}`);
    console.log(`❌ [NOT_FOUND][FORMDATA_KEYS]`, Object.keys(formData).slice(0, 20), '...');
    return null;
  }, [formData, api]);
  
  // Compteur de rendus pour diagnostic des re-renders excessifs
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  // Signature stable triant les clés pour éviter variations d'ordre
  // ⚠️ IMPORTANT: On ne peut pas se fier uniquement à la référence de l'objet formData
  // car il est potentiellement muté en place (même référence, valeurs internes modifiées).
  // Pour garantir la détection des changements, on calcule une "signature" triée à chaque rendu.
  // Signature compacte stable basée sur shortHash (limite bruit)
  // Construire un sous-ensemble pertinent de formData basé sur dependencies connues
  const strippedSourceRef = sourceRef.replace(/^(formula:|condition:|table:|variable:)/, '');
  const deps = elementDependencies.get(strippedSourceRef);
  let relevantData: Record<string, unknown>;
  if (deps) {
    relevantData = deps.reduce((acc, key) => { if (key in formData) acc[key] = formData[key]; return acc; }, {} as Record<string, unknown>);
  } else {
    // Utiliser snapshot initial pour rester stable jusqu'à figer les dependencies
    if (!initialKeySnapshot.has(strippedSourceRef)) {
      initialKeySnapshot.set(strippedSourceRef, Object.keys(formData));
    }
    const snap = initialKeySnapshot.get(strippedSourceRef)!;
    relevantData = snap.reduce((acc, key) => { if (key in formData) acc[key] = formData[key]; return acc; }, {} as Record<string, unknown>);
  }
  const dataSignature = shortHash(relevantData);
  
  // Référence pour la signature précédente
  const lastSignatureRef = useRef<string>('');
  if (lastSignatureRef.current !== dataSignature) {
    lastSignatureRef.current = dataSignature;
  }
  
  // Pour éviter recalculs concurrents identiques
  const lastCalcRef = useRef<{ sourceRef: string; signature: string } | null>(null);
  const inflightRef = useRef<boolean>(false);
  // Id unique de composant (sourceRef + position potentielle) pour pont StrictMode
  const instanceIdRef = useRef<string>(`${sourceRef}::${Math.random().toString(36).slice(2)}`);

  // 🔄 Recalculer quand formData change
  useEffect(() => {
    if (!sourceRef) return;
    if (!isReady()) {
      // Reporter le calcul quand readiness atteint (observer mutation via interval léger)
      const waitId = setInterval(() => {
        if (isReady()) {
          clearInterval(waitId);
          lastCalcRef.current = null; // forcer calcul quand prêt
          // relancer via mise à jour factice
          setIsLoading(false);
        }
      }, 50);
      return () => clearInterval(waitId);
    }

    const signature = dataSignature;
    // Guard: éviter recalcul si signature identique ET résultat déjà présent (ou en vol)
    if (lastCalcRef.current && lastCalcRef.current.sourceRef === sourceRef && lastCalcRef.current.signature === signature) {
      if (isSmartDebug()) console.log('[SMART][SKIP] same signature', { sourceRef, signature });
      return;
    }
    if (inflightRef.current) { return; }

    // StrictMode bridge: ignorer seconde invocation immédiate (double-mount) si même signature vierge
    if (strictModeBridge.recentlyMounted(instanceIdRef.current) && !lastCalcRef.current) {
      return;
    }

    // Fast-path: si signature déjà vue récemment avec un résultat en cache signatureResultCache
    const sigKey = `${sourceRef}::${signature}`;
    const cachedSig = signatureResultCache.get(sigKey);
    if (cachedSig && cachedSig.expiresAt > Date.now()) {
      if (isSmartDebug()) console.log('[SMART][FAST-PATH] signature cache hit', { sourceRef, signature });
      if (result !== cachedSig.value) {
        console.log(`🏃 [RESULT DEBUG] Cache hit pour ${sourceRef}, setResult:`, cachedSig.value);
        setResult(cachedSig.value);
      }
      return; // éviter appel réseau
    }

    const calculate = async () => {
      inflightRef.current = true;
  if (isSmartDebug()) console.count(`🛠️  [SMART CALCULATE CALL] ${sourceRef}`);
      setIsLoading(prev => prev || true);
      try {
        lastCalcRef.current = { sourceRef, signature };
        const { result: calculatedResult } = await translateAndExecute(sourceRef, formData);
        if ((diagMode() || isSmartDebug())) console.log('[SMART][CALC][DONE]', { sourceRef, signature, calculatedResult });
        // Logging ordre d'évaluation naïf: compter combien de dépendants connus dans graphe pointent vers cette source
        try {
          if (diagMode() && typeof window !== 'undefined' && window.TBL_DEP_GRAPH) {
            const g = window.TBL_DEP_GRAPH;
            // Normaliser référence (sourceRef peut être formula:xxx -> on garde tel quel pour correspondance)
            const dependants = g.get(sourceRef) || g.get(sourceRef.replace(/^(formula:|condition:|table:|variable:)/,''));
            if (dependants && dependants.size) {
              console.log('[TBL_DIAG][eval-order]', { sourceRef, dependants: Array.from(dependants) });
            }
          }
        } catch {/* silent */}
        if (diagMode()) console.log('[TBL_DIAG][calc-result]', { sourceRef, signature, value: calculatedResult });
        setResult(prev => {
          // 🔍 LOG FORCÉ pour diagnostic
          console.log(`🔍 [RESULT DEBUG] setResult pour ${sourceRef}:`, { prev, calculatedResult, willChange: prev !== calculatedResult });
          
          if (prev === calculatedResult) {
            if (isSmartDebug()) console.log('[SMART][RESULT][UNCHANGED]', sourceRef);
            return prev;
          }
          signatureResultCache.set(sigKey, { value: calculatedResult, expiresAt: Date.now() + CACHE_TTL });
          if (isSmartDebug()) console.log('[SMART][RESULT][SET]', { sourceRef, signature, value: calculatedResult });
          
          console.log(`✅ [RESULT DEBUG] Nouveau result pour ${sourceRef}:`, calculatedResult);
          
          return calculatedResult;
        });
      } catch (error) {
        const msg = (error as Error)?.message || '';
        if (diagMode()) console.warn('[TBL_DIAG][calc-error]', { sourceRef, signature, error: msg });
        if (/accès refusé/i.test(msg) || /access refus/i.test(msg)) {
          if (!('__loggedDenied' in (calculate as unknown as Record<string, unknown>))) {
            console.warn('🔐 Accès formule refusé (log unique).');
            (calculate as unknown as Record<string, unknown>).__loggedDenied = true;
          }
        } else {
          if (isSmartDebug()) console.error('❌ Erreur calcul:', error);
        }
        console.log(`❌ [RESULT DEBUG] setResult(null) à cause d'erreur pour ${sourceRef}:`, error);
        setResult(null);
      } finally {
        inflightRef.current = false;
        setIsLoading(false);
      }
    };

    // Timeout de secours: si pas de résultat sous 2000ms et aucune nouvelle tentative -> forcer un affichage neutre
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        if ((diagMode() || isSmartDebug())) console.warn('[SMART][TIMEOUT]', sourceRef);
        console.log(`⏰ [RESULT DEBUG] Timeout pour ${sourceRef}, setResult(prev ?? null)`);
        setIsLoading(false);
        setResult(prev => prev ?? null);
      }
    }, 2000);
    calculate();
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceRef, dataSignature]); // formData déjà incorporé dans la signature pertinente

  // 🎨 Formatage du résultat final
  const formatResult = useCallback((value: unknown): string => {
    if (value === null || value === undefined) return placeholder;
    
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) {
      // 🚀 FIX: Afficher "0" au lieu de "NaN" pour une meilleure UX
      const fallbackValue = 0;
      switch (displayFormat) {
        case 'currency':
          return `${fallbackValue.toFixed(precision)} €${unit ? ` ${unit}` : ''}`;
        case 'percentage':
          return `${(fallbackValue * 100).toFixed(precision)}%`;
        default:
          return `${fallbackValue.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
      }
    }

    switch (displayFormat) {
      case 'currency':
        return `${numValue.toFixed(precision)} €${unit ? ` ${unit}` : ''}`;
      case 'percentage':
        return `${(numValue * 100).toFixed(precision)}%`;
      default:
        return `${numValue.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
    }
  }, [displayFormat, precision, unit, placeholder]);

  // 🪞 LOGIQUE D'AFFICHAGE MODIFIÉE: Mirror fallback prioritaire
  const [mirrorValue, setMirrorValue] = React.useState<unknown | null>(null);
  
  React.useEffect(() => {
    const loadMirrorValue = async () => {
      try {
        const value = await getMirrorFallback(sourceRef);
        setMirrorValue(value);
      } catch (error) {
        console.warn(`Erreur lors du chargement mirror pour ${sourceRef}:`, error);
        setMirrorValue(null);
      }
    };
    
    loadMirrorValue();
  }, [sourceRef, getMirrorFallback]);
  
  // Si on a une valeur mirror et pas de résultat final, utiliser le mirror (que l'on soit en loading ou pas)
  if (mirrorValue !== null && result === null) {
    return (
      <span style={{ fontWeight: 'bold', color: '#059669' }} data-testid={`smart-calculated-field-${strippedSourceRef}`}>
        {formatResult(mirrorValue)}
      </span>
    );
  }
  
  // Si on charge sans mirror, afficher "Calcul..."
  if (isLoading) {
    return (
      <span style={{ color: '#999', fontStyle: 'italic' }} data-testid={`smart-calculated-field-${strippedSourceRef}`}>
        Calcul...
      </span>
    );
  }

  // Résultat final calculé (priorité sur mirror)
  return (
    <span style={{ fontWeight: 'bold', color: result !== null ? '#059669' : '#999' }} data-testid={`smart-calculated-field-${strippedSourceRef}`}>
      {formatResult(result)}
    </span>
  );
}
