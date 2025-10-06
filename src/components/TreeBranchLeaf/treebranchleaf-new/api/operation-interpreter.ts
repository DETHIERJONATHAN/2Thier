/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 SYSTÈME UNIVERSEL D'INTERPRÉTATION DES OPÉRATIONS TBL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ce module permet de LIRE, COMPRENDRE, et RETRANSCRIRE n'importe quelle
 * opération TBL (Condition, Formule, Table) de manière récursive.
 * 
 * PRINCIPES FONDAMENTAUX :
 * ------------------------
 * 1. TOUT peut se mélanger : Condition → Formule → Table → Condition...
 * 2. Chaque opération est interprétée RÉCURSIVEMENT
 * 3. Les données sont récupérées depuis SubmissionData
 * 4. Le résultat est retranscrit en texte humain
 * 
 * ARCHITECTURE :
 * --------------
 * - identifyReferenceType()    : Identifie le type d'une référence
 * - interpretReference()        : Point d'entrée récursif universel
 * - interpretCondition()        : Interprète une condition
 * - interpretFormula()          : Interprète une formule
 * - interpretTable()            : Interprète un lookup de table
 * - interpretField()            : Interprète un champ simple
 * - evaluateVariableOperation() : Point d'entrée principal depuis l'API
 * 
 * @author System TBL
 * @version 1.0.0
 * @date 2025-01-06
 */

import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📤 Structure de retour standard pour toutes les interprétations
 * 
 * Cette interface unifie le format de retour de toutes les fonctions
 * d'interprétation, garantissant cohérence et traçabilité.
 */
export interface InterpretResult {
  /** Valeur calculée finale (ex: "73", "1450", "0.35") */
  result: string;
  
  /** Texte explicatif en langage humain (ex: "Si Prix > 10 Alors...") */
  humanText: string;
  
  /** Structure détaillée de l'opération pour traçabilité complète */
  details: {
    /** Type d'opération (condition, formula, table, field) */
    type: string;
    /** Autres propriétés spécifiques au type */
    [key: string]: any;
  };
}

/**
 * 🎯 Types de références possibles dans le système TBL
 */
type ReferenceType = 'field' | 'formula' | 'condition' | 'table';

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 MODULE 1 : IDENTIFICATION DU TYPE DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔍 Identifie le type d'une référence TBL
 * 
 * Cette fonction analyse une chaîne de référence et détermine si elle
 * pointe vers un champ, une formule, une condition ou une table.
 * 
 * FORMATS RECONNUS :
 * ------------------
 * - Formule     : "node-formula:xxx" ou "@value.node-formula:xxx"
 * - Condition   : "condition:xxx" ou "@value.condition:xxx"
 * - Table       : "node-table:xxx" ou "@table.xxx"
 * - Champ UUID  : "702d1b09-abc9-4096-9aaa-77155ac5294f"
 * - Champ généré: "node_1757366229534_x6jxzmvmu"
 * 
 * @param ref - Référence brute à analyser
 * @returns Type de référence identifié
 * 
 * @example
 * identifyReferenceType("@value.702d1b09...") → 'field'
 * identifyReferenceType("node-formula:4e352467...") → 'formula'
 * identifyReferenceType("condition:ff05cc48...") → 'condition'
 * identifyReferenceType("@table.cmgbfpc7t...") → 'table'
 */
function identifyReferenceType(ref: string): ReferenceType {
  // Nettoyer les préfixes courants pour analyse
  const cleaned = ref
    .replace('@value.', '')
    .replace('@table.', '')
    .trim();
  
  // 🧮 Vérifier si c'est une FORMULE
  if (cleaned.startsWith('node-formula:')) {
    return 'formula';
  }
  
  // 🔀 Vérifier si c'est une CONDITION
  if (cleaned.startsWith('condition:') || cleaned.startsWith('node-condition:')) {
    return 'condition';
  }
  
  // 📊 Vérifier si c'est une TABLE
  if (cleaned.startsWith('node-table:') || ref.includes('@table.')) {
    return 'table';
  }
  
  // 📝 Vérifier si c'est un champ généré automatiquement
  if (cleaned.startsWith('node_')) {
    return 'field';
  }
  
  // 📝 Vérifier si c'est un UUID de champ
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (uuidRegex.test(cleaned)) {
    return 'field';
  }
  
  // Par défaut, considérer comme un champ
  return 'field';
}

/**
 * 🧹 Normalise une référence en enlevant les préfixes
 * 
 * Cette fonction nettoie une référence pour obtenir l'ID pur utilisable
 * dans les requêtes Prisma.
 * 
 * @param ref - Référence à normaliser
 * @returns ID normalisé
 * 
 * @example
 * normalizeRef("@value.702d1b09...") → "702d1b09..."
 * normalizeRef("node-formula:4e352467...") → "4e352467..."
 * normalizeRef("condition:ff05cc48...") → "ff05cc48..."
 */
function normalizeRef(ref: string): string {
  return ref
    .replace('@value.', '')
    .replace('@table.', '')
    .replace('node-formula:', '')
    .replace('node-table:', '')
    .replace('node-condition:', '')
    .replace('condition:', '')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 MODULE 2 : RÉCUPÉRATION DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📊 ENRICHISSEMENT MASSIF - Charge TOUTES les valeurs et labels d'une soumission
 * 
 * Cette fonction effectue une récupération massive depuis la base de données :
 * 1. Récupère TOUTES les valeurs depuis TreeBranchLeafSubmissionData
 * 2. Récupère TOUS les labels depuis TreeBranchLeafNode (pour tout l'arbre)
 * 3. Remplit les Maps valueMap et labelMap pour accès rapide
 * 
 * IMPORTANT : Cette fonction ENRICHIT les Maps existantes (ne les remplace pas)
 * 
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valueMap - Map des valeurs à enrichir
 * @param labelMap - Map des labels à enrichir
 * @param treeId - ID de l'arbre (optionnel, sera détecté automatiquement)
 */
async function enrichDataFromSubmission(
  submissionId: string,
  prisma: PrismaClient,
  valueMap: Map<string, unknown>,
  labelMap: Map<string, string>,
  treeId?: string
): Promise<void> {
  console.log(`[ENRICHMENT] 📊 Enrichissement données: ${submissionId}`);
  
  try {
    // 1. Récupérer les VALEURS depuis TreeBranchLeafSubmissionData
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId },
      select: { 
        nodeId: true, 
        value: true
      }
    });
    
    console.log(`[ENRICHMENT] 📊 ${submissionData.length} valeurs récupérées depuis SubmissionData`);
    
    // 2. Trouver l'arbre de cette soumission si pas fourni
    if (!treeId) {
      const firstSubmissionNode = await prisma.treeBranchLeafSubmissionData.findFirst({
        where: { submissionId },
        include: { TreeBranchLeafNode: { select: { treeId: true } } }
      });
      treeId = firstSubmissionNode?.TreeBranchLeafNode?.treeId;
    }
    
    if (treeId) {
      // 3. Récupérer TOUS les labels de l'arbre
      const allNodes = await prisma.treeBranchLeafNode.findMany({
        where: { treeId },
        select: { 
          id: true, 
          label: true 
        }
      });
      
      console.log(`[ENRICHMENT] 🏷️ ${allNodes.length} labels récupérés depuis l'arbre`);
      
      // 4. ENRICHIR LABELMAP
      for (const node of allNodes) {
        if (!labelMap.has(node.id)) {
          labelMap.set(node.id, node.label);
        }
      }
    } else {
      console.warn(`[ENRICHMENT] ⚠️ Impossible de trouver l'arbre pour la soumission ${submissionId}`);
    }
    
    // 5. ENRICHIR VALUEMAP
    for (const data of submissionData) {
      if (data.nodeId && data.value !== null) {
        // Ne pas écraser si déjà présent (priorité au valueMap initial pour mode preview)
        if (!valueMap.has(data.nodeId)) {
          let parsedValue: unknown;
          try {
            parsedValue = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          } catch {
            parsedValue = data.value;
          }
          valueMap.set(data.nodeId, parsedValue);
        }
      }
    }
    
    console.log(`[ENRICHMENT] 🎉 Enrichissement terminé - labels: ${labelMap.size}, valeurs: ${valueMap.size}`);
    
  } catch (error) {
    console.error(`[ENRICHMENT] ❌ Erreur enrichissement:`, error);
  }
}

/**
 * 📊 Récupère la valeur d'un nœud depuis valueMap (avec fallback DB)
 * 
 * Cette fonction interroge d'abord le valueMap (mode preview ou cache enrichi),
 * puis fait un fallback vers TreeBranchLeafSubmissionData si nécessaire.
 * 
 * IMPORTANT : La valeur peut être null si :
 * - Le champ n'a pas encore été rempli par l'utilisateur
 * - Le champ est calculé mais pas encore évalué
 * - Le champ est optionnel et laissé vide
 * 
 * @param nodeId - ID du nœud à récupérer
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @param valueMap - Map des valeurs (déjà enrichie par enrichDataFromSubmission)
 * @returns Valeur du nœud ou null si non trouvée
 * 
 * @example
 * await getNodeValue("702d1b09...", "tbl-1759750447813...", prisma, valueMap)
 * → "1450"
 */
async function getNodeValue(
  nodeId: string,
  submissionId: string,
  prisma: PrismaClient,
  valueMap?: Map<string, unknown>
): Promise<string | null> {
  // 🎯 PRIORITÉ 1: Vérifier dans valueMap si fourni
  if (valueMap && valueMap.has(nodeId)) {
    const val = valueMap.get(nodeId);
    return val !== null && val !== undefined ? String(val) : null;
  }
  
  // 🎯 PRIORITÉ 2: Requête Prisma pour récupérer depuis la base (fallback rare)
  const data = await prisma.treeBranchLeafSubmissionData.findFirst({
    where: {
      nodeId,
      submissionId
    },
    select: {
      value: true
    }
  });
  
  // Retourner la valeur ou null
  return data?.value || null;
}

/**
 * 🏷️ Récupère le label depuis labelMap (avec fallback DB)
 * 
 * Cette fonction récupère d'abord le label depuis labelMap (cache enrichi),
 * puis fait un fallback vers TreeBranchLeafNode si nécessaire.
 * 
 * @param nodeId - ID du nœud
 * @param prisma - Instance Prisma Client
 * @param labelMap - Map des labels (déjà enrichie par enrichDataFromSubmission)
 * @returns Label du nœud ou "Inconnu" si non trouvé
 * 
 * @example
 * await getNodeLabel("702d1b09...", prisma, labelMap) → "Prix Kw/h"
 */
async function getNodeLabel(
  nodeId: string,
  prisma: PrismaClient,
  labelMap?: Map<string, string>
): Promise<string> {
  // 🎯 PRIORITÉ 1: Vérifier dans labelMap si fourni
  if (labelMap && labelMap.has(nodeId)) {
    const label = labelMap.get(nodeId);
    return label || 'Inconnu';
  }
  
  // 🎯 PRIORITÉ 2: Requête Prisma (fallback rare)
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { label: true }
  });
  
  return node?.label || 'Inconnu';
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 MODULE 3 : INTERPRÉTATION RÉCURSIVE UNIVERSELLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔄 FONCTION RÉCURSIVE UNIVERSELLE - CŒUR DU SYSTÈME
 * 
 * C'est LA fonction centrale qui interprète n'importe quelle référence TBL.
 * Elle agit comme un dispatcher intelligent qui :
 * 
 * 1. 🔍 Identifie le type de la référence
 * 2. 🎯 Vérifie si déjà calculée (cache)
 * 3. 🎬 Délègue à l'interpréteur approprié
 * 4. 💾 Met en cache le résultat
 * 5. 📤 Retourne le résultat structuré
 * 
 * RÉCURSIVITÉ :
 * -------------
 * Cette fonction s'appelle elle-même indirectement via les interpréteurs
 * spécifiques (interpretCondition, interpretFormula, etc.), permettant
 * de résoudre des structures imbriquées infiniment complexes.
 * 
 * PROTECTION :
 * ------------
 * - Limite de profondeur (depth > 10) pour éviter boucles infinies
 * - Cache (valuesCache) pour éviter recalculs multiples
 * 
 * @param ref - Référence à interpréter (peut être n'importe quel format)
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs déjà calculées (évite boucles)
 * @param depth - Profondeur de récursion actuelle (protection)
 * @param valueMap - Map des valeurs (mode preview ou enrichie)
 * @param labelMap - Map des labels (enrichie automatiquement)
 * @returns Résultat interprété avec valeur, texte et détails
 * 
 * @example
 * // Cas simple : champ
 * await interpretReference("702d1b09...", "tbl-xxx", prisma)
 * → { result: "1450", humanText: "Prix Kw/h(1450)", details: {...} }
 * 
 * // Cas complexe : condition qui contient une formule
 * await interpretReference("condition:ff05cc48...", "tbl-xxx", prisma)
 * → Résout récursivement toute la structure
 */
async function interpretReference(
  ref: string,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult> = new Map(),
  depth: number = 0,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🛡️ ÉTAPE 1 : Protection contre récursion infinie
  // ═══════════════════════════════════════════════════════════════════════
  if (depth > 10) {
    console.error(`[INTERPRÉTATION] ❌ Récursion trop profonde (depth=${depth}) pour ref:`, ref);
    return {
      result: '∅',
      humanText: '⚠️ Récursion trop profonde',
      details: {
        type: 'error',
        error: 'Max depth exceeded',
        depth
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 ÉTAPE 2 : Vérifier le cache
  // ═══════════════════════════════════════════════════════════════════════
  const cleanRef = normalizeRef(ref);
  
  if (valuesCache.has(cleanRef)) {
    console.log(`[INTERPRÉTATION] ♻️ Cache hit pour ref: ${cleanRef}`);
    return valuesCache.get(cleanRef)!;
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔍 ÉTAPE 3 : Identifier le type de référence
  // ═══════════════════════════════════════════════════════════════════════
  const type = identifyReferenceType(ref);
  console.log(`[INTERPRÉTATION] 🔍 Type identifié: ${type} pour ref: ${ref} (depth=${depth})`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎬 ÉTAPE 4 : Déléguer à l'interpréteur approprié
  // ═══════════════════════════════════════════════════════════════════════
  let result: InterpretResult;
  
  try {
    switch (type) {
      case 'condition':
        console.log(`[INTERPRÉTATION] 🔀 Délégation vers interpretCondition`);
        result = await interpretCondition(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap);
        break;
      
      case 'formula':
        console.log(`[INTERPRÉTATION] 🧮 Délégation vers interpretFormula`);
        result = await interpretFormula(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap);
        break;
      
      case 'table':
        console.log(`[INTERPRÉTATION] 📊 Délégation vers interpretTable`);
        result = await interpretTable(cleanRef, submissionId, prisma, valuesCache, depth, valueMap, labelMap);
        break;
      
      case 'field':
        console.log(`[INTERPRÉTATION] 📝 Délégation vers interpretField`);
        result = await interpretField(cleanRef, submissionId, prisma, valueMap, labelMap);
        break;
      
      default:
        console.error(`[INTERPRÉTATION] ❌ Type inconnu: ${type}`);
        result = {
          result: '∅',
          humanText: `Type inconnu: ${type}`,
          details: { type: 'error', error: 'Unknown type' }
        };
    }
  } catch (error) {
    // Gestion des erreurs d'interprétation
    console.error(`[INTERPRÉTATION] ❌ Erreur lors de l'interprétation:`, error);
    result = {
      result: '∅',
      humanText: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`,
      details: {
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 💾 ÉTAPE 5 : Mettre en cache le résultat
  // ═══════════════════════════════════════════════════════════════════════
  valuesCache.set(cleanRef, result);
  console.log(`[INTERPRÉTATION] ✅ Résultat mis en cache pour: ${cleanRef} = ${result.result}`);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔀 MODULE 4 : INTERPRÉTATION DES CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔀 INTERPRÈTE UNE CONDITION (Si...Alors...Sinon)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 FONCTIONNEMENT CLÉS :
 * ═══════════════════════════════════════════════════════════════════════════
 * Cette fonction évalue une condition logique ET INTERPRÈTE LES DEUX BRANCHES
 * (ALORS + SINON) pour fournir un résultat complet et transparent.
 * 
 * ⚠️ DIFFÉRENCE AVEC L'ANCIENNE VERSION :
 * ----------------------------------------
 * AVANT : On interprétait SEULEMENT la branche sélectionnée
 *         → Texte incomplet : "Si X; ALORS: Y = result"
 * 
 * MAINTENANT : On interprète LES DEUX branches systématiquement
 *              → Texte complet : "Si X; ALORS: Y = result1; SINON: Z = result2 → [ALORS SÉLECTIONNÉ]"
 * 
 * 📊 EXEMPLE CONCRET :
 * --------------------
 * Condition : Si "Prix Kw/h" est vide
 * ALORS : Calcul automatique = 1250 / 5000 = 0.25
 * SINON : Utiliser la valeur saisie = Prix Kw/h
 * 
 * Résultat affiché :
 * "Si Prix Kw/h(∅) est vide; 
 *  ALORS: Calcul du prix Kw/h(1250)/Consommation(5000) = 0.25; 
 *  SINON: Prix Kw/h(150) = 150 
 *  → [ALORS SÉLECTIONNÉ] Result = 0.25"
 * 
 * 🔄 PROCESSUS DÉTAILLÉ :
 * -----------------------
 * 1. 📥 Récupérer la condition depuis TreeBranchLeafNodeCondition
 * 2. 🔍 Extraire le WHEN (left op right)
 * 3. 📊 Récupérer les valeurs LEFT et RIGHT
 *    - LEFT : Valeur du champ testé (ex: Prix Kw/h)
 *    - RIGHT : Valeur de comparaison (fixe ou référence)
 * 4. ⚖️ Évaluer l'opérateur (isEmpty, eq, gt, etc.)
 * 5. 🎯 Déterminer quelle branche est vraie (ALORS ou SINON)
 * 6. 🔄 **INTERPRÉTER LES DEUX BRANCHES** (nouvelle logique)
 *    - Interpréter la branche ALORS (peut être formule/table/champ/condition)
 *    - Interpréter la branche SINON (idem)
 * 7. 📝 Construire le texte humain COMPLET avec les deux résultats
 * 8. 📤 Retourner le résultat de la branche sélectionnée + texte explicatif
 * 
 * 🏗️ STRUCTURE D'UNE CONDITION :
 * -------------------------------
 * {
 *   branches: [{
 *     when: { 
 *       op: "isEmpty",               // Opérateur : isEmpty, eq, gt, etc.
 *       left: {ref: "@value.xxx"}    // Référence au champ testé
 *     },
 *     actions: [{ 
 *       type: "SHOW", 
 *       nodeIds: ["node-formula:yyy"] // Action si condition VRAIE
 *     }]
 *   }],
 *   fallback: {
 *     actions: [{ 
 *       type: "SHOW", 
 *       nodeIds: ["zzz"]              // Action si condition FAUSSE
 *     }]
 *   }
 * }
 * 
 * 🎨 FORMAT DU TEXTE GÉNÉRÉ :
 * ---------------------------
 * "Si {condition}; ALORS: {texte_alors}; SINON: {texte_sinon} → [{branche} SÉLECTIONNÉ] Result = {résultat}"
 * 
 * Note: Les humanText des branches contiennent déjà leur résultat
 *       (ex: "expression = 0.25"), donc on ne rajoute PAS "= result" après !
 * 
 * 📦 RETOUR :
 * -----------
 * {
 *   result: "0.25",                    // Résultat de la branche sélectionnée
 *   humanText: "Si ... ALORS: ... SINON: ... → [ALORS SÉLECTIONNÉ]",
 *   details: {
 *     type: 'condition',
 *     conditionId: "...",
 *     branchUsed: "ALORS",             // Branche qui a été utilisée
 *     alorsResult: {...},              // Détails du résultat ALORS
 *     sinonResult: {...},              // Détails du résultat SINON
 *     selectedResult: {...}            // Détails du résultat sélectionné
 *   }
 * }
 * 
 * @param conditionId - ID de la condition (avec ou sans préfixe "condition:")
 * @param submissionId - ID de la soumission (ou "preview-xxx" en mode aperçu)
 * @param prisma - Instance Prisma Client pour accès BDD
 * @param valuesCache - Cache des valeurs déjà calculées (évite recalculs)
 * @param depth - Profondeur de récursion (protection contre boucles infinies)
 * @param valueMap - Map optionnelle des valeurs en preview (clé=nodeId, valeur=valeur)
 * @param labelMap - Map optionnelle des labels (clé=nodeId, valeur=label)
 * @returns Résultat interprété avec les deux branches évaluées
 */
async function interpretCondition(
  conditionId: string,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult>,
  depth: number,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  console.log(`[CONDITION] 🔀 Début interprétation condition: ${conditionId}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📥 ÉTAPE 1 : Récupérer la condition depuis la base de données
  // ═══════════════════════════════════════════════════════════════════════
  const cleanId = conditionId.replace('condition:', '');
  
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      name: true,
      conditionSet: true,
      nodeId: true
    }
  });
  
  if (!condition) {
    console.error(`[CONDITION] ❌ Condition introuvable: ${conditionId}`);
    return {
      result: '∅',
      humanText: `Condition introuvable: ${conditionId}`,
      details: { type: 'condition', error: 'Not found' }
    };
  }
  
  console.log(`[CONDITION] ✅ Condition trouvée: ${condition.name}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔍 ÉTAPE 2 : Extraire la structure WHEN et les branches
  // ═══════════════════════════════════════════════════════════════════════
  const condSet = condition.conditionSet as any;
  const branch = condSet.branches?.[0];
  const when = branch?.when;
  
  if (!when) {
    console.error(`[CONDITION] ❌ Structure WHEN manquante`);
    return {
      result: '∅',
      humanText: 'Structure condition invalide',
      details: { type: 'condition', error: 'Missing WHEN' }
    };
  }
  
  console.log(`[CONDITION] 🔍 WHEN extrait:`, JSON.stringify(when));
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 3 : Récupérer la valeur LEFT (côté gauche de la condition)
  // ═══════════════════════════════════════════════════════════════════════
  const leftRef = when.left?.ref;
  let leftValue: string | null = null;
  let leftLabel = 'Inconnu';
  
  if (leftRef) {
    const leftNodeId = leftRef.replace('@value.', '');
    leftValue = await getNodeValue(leftNodeId, submissionId, prisma, valueMap);
    leftLabel = await getNodeLabel(leftNodeId, prisma, labelMap);
    console.log(`[CONDITION] 📊 LEFT: ${leftLabel} = ${leftValue}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 4 : Récupérer la valeur RIGHT (côté droit de la condition)
  // ═══════════════════════════════════════════════════════════════════════
  const rightRef = when.right?.ref;
  let rightValue: string | null = null;
  let rightLabel = 'Inconnu';
  
  if (rightRef) {
    // C'est une référence à un autre champ
    const rightNodeId = rightRef.replace('@value.', '');
    rightValue = await getNodeValue(rightNodeId, submissionId, prisma, valueMap);
    rightLabel = await getNodeLabel(rightNodeId, prisma, labelMap);
    console.log(`[CONDITION] 📊 RIGHT (ref): ${rightLabel} = ${rightValue}`);
  } else if (when.right?.value !== undefined) {
    // C'est une valeur fixe
    rightValue = String(when.right.value);
    rightLabel = rightValue;
    console.log(`[CONDITION] 📊 RIGHT (value): ${rightValue}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // ⚖️ ÉTAPE 5 : Évaluer l'opérateur
  // ═══════════════════════════════════════════════════════════════════════
  const operator = when.op;
  const conditionMet = evaluateOperator(operator, leftValue, rightValue);
  
  console.log(`[CONDITION] ⚖️ Évaluation: ${leftValue} ${operator} ${rightValue} = ${conditionMet}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 ÉTAPE 6 : Déterminer quelle branche est vraie
  // ═══════════════════════════════════════════════════════════════════════
  const selectedBranch = conditionMet ? branch : condSet.fallback;
  const branchName = conditionMet ? 'ALORS' : 'SINON';
  
  console.log(`[CONDITION] 🎯 Branche sélectionnée: ${branchName}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔄 ÉTAPE 7 : Interpréter LES DEUX BRANCHES (ALORS + SINON)
  // ═══════════════════════════════════════════════════════════════════════
  
  // 📌 Interpréter la branche ALORS
  let alorsResult: InterpretResult = { result: '∅', humanText: 'Aucune action' };
  
  if (branch && branch.actions && branch.actions.length > 0) {
    const alorsAction = branch.actions[0];
    const alorsNodeId = alorsAction.nodeIds?.[0];
    
    if (alorsNodeId) {
      console.log(`[CONDITION] 🔄 Interprétation branche ALORS: ${alorsNodeId}`);
      alorsResult = await interpretReference(
        alorsNodeId,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap
      );
      console.log(`[CONDITION] ✅ Résultat ALORS: ${alorsResult.result}`);
    }
  }
  
  // 📌 Interpréter la branche SINON
  let sinonResult: InterpretResult = { result: '∅', humanText: 'Aucune action' };
  
  if (condSet.fallback && condSet.fallback.actions && condSet.fallback.actions.length > 0) {
    const sinonAction = condSet.fallback.actions[0];
    const sinonNodeId = sinonAction.nodeIds?.[0];
    
    if (sinonNodeId) {
      console.log(`[CONDITION] 🔄 Interprétation branche SINON: ${sinonNodeId}`);
      sinonResult = await interpretReference(
        sinonNodeId,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap
      );
      console.log(`[CONDITION] ✅ Résultat SINON: ${sinonResult.result}`);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📝 ÉTAPE 8 : Construire le texte humain COMPLET (les 2 branches)
  // ═══════════════════════════════════════════════════════════════════════
  const operatorText = getOperatorText(operator);
  const leftDisplay = `${leftLabel}(${leftValue || '∅'})`;
  const rightDisplay = rightLabel !== 'Inconnu' ? `${rightLabel}` : '';
  
  // Construction de la condition
  const conditionText = rightDisplay 
    ? `Si ${leftDisplay} ${operatorText} ${rightDisplay}`
    : `Si ${leftDisplay} ${operatorText}`;
  
  // Construction du texte avec les DEUX branches + indication de la branche sélectionnée
  // Note: alorsResult.humanText et sinonResult.humanText contiennent déjà le résultat (ex: "expression = 0.25")
  const humanText = `${conditionText}; ` +
    `ALORS: ${alorsResult.humanText}; ` +
    `SINON: ${sinonResult.humanText} ` +
    `→ [${branchName} SÉLECTIONNÉ] Result = ${conditionMet ? alorsResult.result : sinonResult.result}`;
  
  console.log(`[CONDITION] 📝 Texte généré: ${humanText}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📤 ÉTAPE 9 : Retourner le résultat structuré avec le résultat de la branche sélectionnée
  // ═══════════════════════════════════════════════════════════════════════
  const finalResult = conditionMet ? alorsResult.result : sinonResult.result;
  
  return {
    result: finalResult,
    humanText,
    details: {
      type: 'condition',
      conditionId: condition.id,
      conditionName: condition.name,
      when: {
        left: { ref: leftRef, label: leftLabel, value: leftValue },
        operator: operator,
        right: { ref: rightRef, label: rightLabel, value: rightValue },
        evaluated: conditionMet
      },
      branchUsed: branchName,
      alorsResult: alorsResult.details,
      sinonResult: sinonResult.details,
      selectedResult: conditionMet ? alorsResult.details : sinonResult.details
    }
  };
}

/**
 * ⚖️ Évalue un opérateur de condition
 * 
 * OPÉRATEURS SUPPORTÉS :
 * ----------------------
 * - isEmpty      : Vérifie si vide (null, undefined, '')
 * - isNotEmpty   : Vérifie si non vide
 * - eq (==)      : Égalité stricte
 * - ne (!=)      : Différent
 * - gt (>)       : Supérieur (numérique)
 * - gte (>=)     : Supérieur ou égal
 * - lt (<)       : Inférieur
 * - lte (<=)     : Inférieur ou égal
 * 
 * @param op - Opérateur à évaluer
 * @param left - Valeur de gauche
 * @param right - Valeur de droite
 * @returns true si condition vraie, false sinon
 */
function evaluateOperator(op: string, left: any, right: any): boolean {
  switch (op) {
    case 'isEmpty':
      return left === null || left === undefined || left === '';
    
    case 'isNotEmpty':
      return left !== null && left !== undefined && left !== '';
    
    case 'eq':
    case '==':
      return left === right;
    
    case 'ne':
    case '!=':
      return left !== right;
    
    case 'gt':
    case '>':
      return Number(left) > Number(right);
    
    case 'gte':
    case '>=':
      return Number(left) >= Number(right);
    
    case 'lt':
    case '<':
      return Number(left) < Number(right);
    
    case 'lte':
    case '<=':
      return Number(left) <= Number(right);
    
    default:
      console.warn(`[CONDITION] ⚠️ Opérateur inconnu: ${op}`);
      return false;
  }
}

/**
 * 📝 Traduit un opérateur en texte humain français
 * 
 * @param op - Opérateur technique
 * @returns Texte en français
 */
function getOperatorText(op: string): string {
  const texts: Record<string, string> = {
    'isEmpty': 'est vide',
    'isNotEmpty': "n'est pas vide",
    'eq': '=',
    'ne': '≠',
    'gt': '>',
    'gte': '≥',
    'lt': '<',
    'lte': '≤',
    '==': '=',
    '!=': '≠'
  };
  
  return texts[op] || op;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧮 MODULE 5 : INTERPRÉTATION DES FORMULES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🧮 INTERPRÈTE UNE FORMULE (Calcul mathématique)
 * 
 * Cette fonction évalue une formule mathématique en résolvant tous ses tokens.
 * 
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la formule depuis TreeBranchLeafNodeFormula
 * 2. 🔍 Parcourir les tokens un par un
 * 3. 🔄 Pour chaque @value.xxx, interpréter récursivement
 * 4. 🧮 Construire l'expression mathématique
 * 5. ⚡ Calculer le résultat final
 * 6. 📝 Générer le texte explicatif
 * 
 * FORMAT DES TOKENS :
 * -------------------
 * ["@value.xxx", "/", "@value.yyy"] → Champ1 / Champ2
 * [{ type: "ref", ref: "@value.xxx" }, "+", "100"] → Champ + 100
 * 
 * @param formulaId - ID de la formule
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs
 * @param depth - Profondeur de récursion
 * @returns Résultat interprété
 */
async function interpretFormula(
  formulaId: string,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult>,
  depth: number,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  console.log(`[FORMULE] 🧮 Début interprétation formule: ${formulaId}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📥 ÉTAPE 1 : Récupérer la formule depuis la base de données
  // ═══════════════════════════════════════════════════════════════════════
  const cleanId = formulaId.replace('node-formula:', '');
  
  let formula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      name: true,
      tokens: true,
      nodeId: true
    }
  });
  
  // 🔍 RÉSOLUTION IMPLICITE : Si pas trouvé par ID, chercher par nodeId (formule par défaut)
  if (!formula) {
    console.log(`[FORMULE] 🔍 Formule introuvable par ID, tentative résolution par nodeId: ${cleanId}`);
    try {
      const byNode = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { nodeId: cleanId },
        select: { id: true, name: true, tokens: true, nodeId: true },
        orderBy: { isDefault: 'desc' }
      });
      if (byNode) {
        formula = byNode;
        console.log(`[FORMULE] ✅ Formule résolue via nodeId → formula:${formula.id}`);
      }
    } catch (e) {
      console.warn('[FORMULE] ⚠️ Résolution implicite échouée:', e instanceof Error ? e.message : e);
    }
  }
  
  if (!formula) {
    console.error(`[FORMULE] ❌ Formule introuvable: ${formulaId}`);
    return {
      result: '∅',
      humanText: `Formule introuvable: ${formulaId}`,
      details: { type: 'formula', error: 'Not found' }
    };
  }
  
  console.log(`[FORMULE] ✅ Formule trouvée: ${formula.name}`);
  
  const tokens = formula.tokens as any[];
  console.log(`[FORMULE] 📋 Tokens:`, JSON.stringify(tokens));
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔍 ÉTAPE 2 : Parcourir et interpréter les tokens
  // ═══════════════════════════════════════════════════════════════════════
  let expression = '';        // Expression mathématique pure (ex: "1450/1000")
  let humanExpression = '';   // Expression avec labels (ex: "Prix(1450)/Conso(1000)")
  const tokenDetails = [];    // Détails de chaque token pour traçabilité
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(`[FORMULE] 🔍 Token ${i}:`, token);
    
    // ═══════════════════════════════════════════════════════════════════
    // CAS 1 : Token est une STRING (format: "@value.xxx" ou opérateur)
    // ═══════════════════════════════════════════════════════════════════
    if (typeof token === 'string') {
      
      // Vérifier si c'est une référence
      if (token.includes('@value.')) {
        // 🔄 RÉCURSION : Interpréter la référence
        const refMatch = token.match(/@value\.([A-Za-z0-9_:-]+)/);
        if (refMatch) {
          const ref = refMatch[1];
          console.log(`[FORMULE] 🔄 Interprétation récursive de: ${ref}`);
          
          const refResult = await interpretReference(
            ref,
            submissionId,
            prisma,
            valuesCache,
            depth + 1,  // ⚠️ IMPORTANT : Incrémenter la profondeur
            valueMap,
            labelMap
          );
          
          const label = await getNodeLabel(ref, prisma, labelMap);
          
          expression += refResult.result;
          humanExpression += `${label}(${refResult.result})`;
          
          tokenDetails.push({
            type: 'reference',
            ref,
            label,
            value: refResult.result,
            details: refResult.details
          });
          
          console.log(`[FORMULE] ✅ Référence résolue: ${label} = ${refResult.result}`);
        }
      } else {
        // C'est un opérateur ou nombre
        expression += token;
        humanExpression += token;
        tokenDetails.push({ type: 'operator', value: token });
        console.log(`[FORMULE] ➕ Opérateur ajouté: ${token}`);
      }
    }
    // ═══════════════════════════════════════════════════════════════════
    // CAS 2 : Token est un OBJECT (format: { type: "ref", ref: "..." })
    // ═══════════════════════════════════════════════════════════════════
    else if (token && typeof token === 'object' && token.type === 'ref') {
      const ref = token.ref.replace('@value.', '');
      console.log(`[FORMULE] 🔄 Interprétation récursive de (object): ${ref}`);
      
      const refResult = await interpretReference(
        ref,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap
      );
      
      const label = await getNodeLabel(ref, prisma, labelMap);
      
      expression += refResult.result;
      humanExpression += `${label}(${refResult.result})`;
      
      tokenDetails.push({
        type: 'reference',
        ref,
        label,
        value: refResult.result,
        details: refResult.details
      });
      
      console.log(`[FORMULE] ✅ Référence résolue (object): ${label} = ${refResult.result}`);
    }
  }
  
  console.log(`[FORMULE] 📝 Expression construite: ${expression}`);
  console.log(`[FORMULE] 📝 Expression humaine: ${humanExpression}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // ⚡ ÉTAPE 3 : Calculer le résultat de l'expression
  // ═══════════════════════════════════════════════════════════════════════
  const calculatedResult = calculateExpression(expression);
  console.log(`[FORMULE] ⚡ Résultat calculé: ${calculatedResult}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📝 ÉTAPE 4 : Construire le texte humain
  // ═══════════════════════════════════════════════════════════════════════
  const humanText = `${humanExpression} = ${calculatedResult}`;
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📤 ÉTAPE 5 : Retourner le résultat structuré
  // ═══════════════════════════════════════════════════════════════════════
  return {
    result: String(calculatedResult),
    humanText,
    details: {
      type: 'formula',
      formulaId: formula.id,
      formulaName: formula.name,
      tokens: tokenDetails,
      expression,
      humanExpression,
      calculatedResult
    }
  };
}

/**
 * 🧮 Calcule une expression mathématique de manière sécurisée
 * 
 * SÉCURITÉ :
 * ----------
 * - Nettoie l'expression (garde seulement nombres et opérateurs)
 * - Utilise Function() avec "use strict" pour évaluation sécurisée
 * - Gestion des erreurs avec fallback à 0
 * 
 * OPÉRATEURS SUPPORTÉS :
 * ----------------------
 * +, -, *, /, (), décimales (.)
 * 
 * @param expr - Expression à calculer (ex: "1450/1000")
 * @returns Résultat numérique
 * 
 * @example
 * calculateExpression("1450/1000") → 1.45
 * calculateExpression("(100+50)*2") → 300
 */
function calculateExpression(expr: string): number {
  try {
    // Nettoyer l'expression : garde seulement chiffres et opérateurs
    const cleanExpr = expr.replace(/[^0-9+\-*/.()]/g, '');
    
    console.log(`[CALCUL] 🧮 Expression nettoyée: ${cleanExpr}`);
    
    // Évaluer de manière sécurisée
    const result = Function(`"use strict"; return (${cleanExpr})`)();
    
    console.log(`[CALCUL] ✅ Résultat: ${result}`);
    
    return result;
  } catch (error) {
    console.error(`[CALCUL] ❌ Erreur calcul expression: ${expr}`, error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 MODULE 6 : INTERPRÉTATION DES TABLES (LOOKUP)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📊 INTERPRÈTE UNE TABLE (Lookup croisé)
 * 
 * Cette fonction effectue un lookup dans une table en croisant ligne × colonne.
 * 
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la table depuis TreeBranchLeafNodeTable
 * 2. 🔍 Extraire la config de lookup (selectors)
 * 3. 📊 Récupérer les valeurs sélectionnées (rowFieldId, columnFieldId)
 * 4. 🎯 Trouver les index dans rows[] et columns[]
 * 5. 📍 Faire le lookup dans data[rowIndex][colIndex]
 * 6. 📝 Générer le texte explicatif
 * 
 * STRUCTURE D'UNE TABLE :
 * -----------------------
 * columns: ["Orientation", "0", "5", "15", "25", ...]
 * rows: ["Orientation", "Nord", "Nord-Est", ...]
 * data: [[86, 82, 73, ...], [86, 83, 74, ...], ...]
 * meta.lookup.selectors: { rowFieldId, columnFieldId }
 * 
 * @param tableId - ID de la table
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @param valuesCache - Cache des valeurs
 * @param depth - Profondeur de récursion
 * @returns Résultat interprété
 */
async function interpretTable(
  tableId: string,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult>,
  depth: number,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  console.log(`[TABLE] 📊 Début interprétation table: ${tableId}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📥 ÉTAPE 1 : Récupérer la table depuis la base de données
  // ═══════════════════════════════════════════════════════════════════════
  const cleanId = tableId.replace('@table.', '').replace('node-table:', '');
  
  let table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: cleanId },
    select: {
      id: true,
      name: true,
      type: true,
      columns: true,
      rows: true,
      data: true,
      meta: true,
      nodeId: true
    }
  });
  
  // 🔍 RÉSOLUTION IMPLICITE : Si pas trouvé par ID, chercher par nodeId (table par défaut)
  if (!table) {
    console.log(`[TABLE] 🔍 Table introuvable par ID, tentative résolution par nodeId: ${cleanId}`);
    try {
      const byNode = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId: cleanId },
        select: { id: true, name: true, type: true, columns: true, rows: true, data: true, meta: true, nodeId: true },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
      });
      if (byNode) {
        table = byNode;
        console.log(`[TABLE] ✅ Table résolue via nodeId → table:${table.id}`);
      }
    } catch (e) {
      console.warn('[TABLE] ⚠️ Résolution implicite échouée:', e instanceof Error ? e.message : e);
    }
  }
  
  if (!table) {
    console.error(`[TABLE] ❌ Table introuvable: ${tableId}`);
    return {
      result: '∅',
      humanText: `Table introuvable: ${tableId}`,
      details: { type: 'table', error: 'Not found' }
    };
  }
  
  console.log(`[TABLE] ✅ Table trouvée: ${table.name} (type: ${table.type})`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔍 ÉTAPE 2 : Extraire la configuration de lookup
  // ═══════════════════════════════════════════════════════════════════════
  const meta = table.meta as any;
  const lookup = meta?.lookup;
  
  if (!lookup || !lookup.enabled) {
    console.error(`[TABLE] ❌ Lookup non configuré ou désactivé`);
    return {
      result: '∅',
      humanText: `Lookup non configuré pour table ${table.name}`,
      details: { type: 'table', error: 'Lookup not enabled' }
    };
  }
  
  console.log(`[TABLE] 🔍 Lookup config:`, JSON.stringify(lookup));
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 3 : Récupérer les selectors (champs de sélection) et les toggles
  // ═══════════════════════════════════════════════════════════════════════
  const rowFieldId = lookup.selectors?.rowFieldId;
  const colFieldId = lookup.selectors?.columnFieldId;
  const rowEnabled = lookup.rowLookupEnabled === true;
  const colEnabled = lookup.columnLookupEnabled === true;
  
  console.log(`[TABLE] 📋 Configuration détectée:`, {
    rowEnabled,
    colEnabled,
    rowFieldId,
    colFieldId,
    displayColumn: lookup.displayColumn,
    displayRow: lookup.displayRow
  });
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 DÉTECTION DU MODE (3 modes possibles)
  // ═══════════════════════════════════════════════════════════════════════
  
  // MODE 3 : Les DEUX toggles activés (système existant - croisement dynamique)
  if (rowEnabled && colEnabled && rowFieldId && colFieldId) {
    console.log(`[TABLE] 🎯 MODE 3 détecté: Croisement dynamique COLONNE × LIGNE`);
    // Le code existant continue ici (récupération des deux valeurs + croisement)
  }
  
  // MODE 1 : Seulement COLONNE activée (croisement avec displayColumn fixe)
  else if (colEnabled && !rowEnabled && colFieldId && lookup.displayColumn) {
    console.log(`[TABLE] 🎯 MODE 1 détecté: COLONNE × displayColumn fixe`);
    
    // Récupérer la valeur sélectionnée dans le SELECT colonne
    const colSelectorValue = await getNodeValue(colFieldId, submissionId, prisma, valueMap);
    const colLabel = await getNodeLabel(colFieldId, prisma, labelMap);
    
    // displayColumn peut être un string OU un array
    const displayColumns = Array.isArray(lookup.displayColumn) 
      ? lookup.displayColumn 
      : [lookup.displayColumn];
    
    console.log(`[TABLE] 📊 MODE 1 - Croisement: colonne=${colLabel}(${colSelectorValue}) × lignes=${displayColumns.join(', ')} (fixes)`);
    
    if (!colSelectorValue) {
      return {
        result: '∅',
        humanText: `Table "${table.name}" - Aucune sélection colonne`,
        details: { type: 'table', mode: 1, error: 'No column selection' }
      };
    }
    
    // Faire le lookup avec colSelectorValue et CHAQUE displayColumn
    const columns = table.columns as string[];
    const rows = table.rows as string[];
    const data = table.data as any[][];
    
    const results: Array<{ row: string; value: any }> = [];
    
    // Boucle sur CHAQUE ligne à afficher
    for (const fixedRowValue of displayColumns) {
      // Normalisation pour matching robuste
      const normalizedColSelector = String(colSelectorValue).trim().toLowerCase();
      const normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
      
      // Chercher dans colonnes ET lignes (auto-détection)
      const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedColSelector);
      const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedColSelector);
      const fixedRowInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedRow);
      const fixedRowInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedRow);
      
      // Déterminer les index finaux (privilégier le matching naturel)
      let colIndex = -1;
      let rowIndex = -1;
      
      if (colSelectorInCols !== -1 && fixedRowInRows !== -1) {
        // Configuration normale
        colIndex = colSelectorInCols;
        rowIndex = fixedRowInRows;
      } else if (colSelectorInRows !== -1 && fixedRowInCols !== -1) {
        // Configuration inversée (auto-correction)
        colIndex = fixedRowInCols;
        rowIndex = colSelectorInRows;
        console.log(`[TABLE] 🔄 MODE 1 - Inversion détectée et corrigée pour ${fixedRowValue}`);
      } else {
        // Matching partiel
        colIndex = colSelectorInCols !== -1 ? colSelectorInCols : colSelectorInRows;
        rowIndex = fixedRowInRows !== -1 ? fixedRowInRows : fixedRowInCols;
      }
      
      if (colIndex !== -1 && rowIndex !== -1) {
        // Lookup dans data (avec décalage header)
        const dataRowIndex = rowIndex - 1;
        const dataColIndex = colIndex - 1;
        const result = data[dataRowIndex]?.[dataColIndex];
        
        results.push({ row: fixedRowValue, value: result });
        console.log(`[TABLE] ✅ MODE 1 - ${fixedRowValue}: ${result}`);
      }
    }
    
    // Construire le résultat final
    const resultText = results.map(r => `${r.row}=${r.value}`).join(', ');
    const resultValues = results.map(r => r.value);
    const humanText = `Table "${table.name}"[${colLabel}=${colSelectorValue}, ${displayColumns.join('+')}(fixes)] = ${resultText}`;
    
    return {
      result: resultValues.length === 1 ? String(resultValues[0]) : JSON.stringify(resultValues),
      humanText,
      details: {
        type: 'table',
        mode: 1,
        tableId: table.id,
        tableName: table.name,
        lookup: {
          column: { field: colLabel, value: colSelectorValue },
          rows: results,
          multiple: results.length > 1
        }
      }
    };
  }
  
  // MODE 2 : Seulement LIGNE activée (croisement avec displayRow fixe)
  else if (rowEnabled && !colEnabled && rowFieldId && lookup.displayRow) {
    console.log(`[TABLE] 🎯 MODE 2 détecté: displayRow fixe × LIGNE`);
    
    // Récupérer la valeur sélectionnée dans le SELECT ligne
    const rowSelectorValue = await getNodeValue(rowFieldId, submissionId, prisma, valueMap);
    const rowLabel = await getNodeLabel(rowFieldId, prisma, labelMap);
    
    // displayRow peut être un string OU un array
    const displayRows = Array.isArray(lookup.displayRow) 
      ? lookup.displayRow 
      : [lookup.displayRow];
    
    console.log(`[TABLE] 📊 MODE 2 - Croisement: ligne=${rowLabel}(${rowSelectorValue}) × colonnes=${displayRows.join(', ')} (fixes)`);
    
    if (!rowSelectorValue) {
      return {
        result: '∅',
        humanText: `Table "${table.name}" - Aucune sélection ligne`,
        details: { type: 'table', mode: 2, error: 'No row selection' }
      };
    }
    
    // Faire le lookup avec rowSelectorValue et CHAQUE displayRow
    const columns = table.columns as string[];
    const rows = table.rows as string[];
    const data = table.data as any[][];
    
    const results: Array<{ column: string; value: any }> = [];
    
    // Boucle sur CHAQUE colonne à afficher
    for (const fixedColValue of displayRows) {
      // Normalisation
      const normalizedRowSelector = String(rowSelectorValue).trim().toLowerCase();
      const normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
      
      // Chercher dans colonnes ET lignes (auto-détection)
      const rowSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedRowSelector);
      const rowSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedRowSelector);
      const fixedColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedCol);
      const fixedColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedCol);
      
      // Déterminer les index finaux (privilégier le matching naturel)
      let rowIndex = -1;
      let colIndex = -1;
      
      if (rowSelectorInRows !== -1 && fixedColInCols !== -1) {
        // Configuration normale
        rowIndex = rowSelectorInRows;
        colIndex = fixedColInCols;
      } else if (rowSelectorInCols !== -1 && fixedColInRows !== -1) {
        // Configuration inversée (auto-correction)
        rowIndex = fixedColInRows;
        colIndex = rowSelectorInCols;
        console.log(`[TABLE] 🔄 MODE 2 - Inversion détectée et corrigée pour ${fixedColValue}`);
      } else {
        // Matching partiel
        rowIndex = rowSelectorInRows !== -1 ? rowSelectorInRows : rowSelectorInCols;
        colIndex = fixedColInCols !== -1 ? fixedColInCols : fixedColInRows;
      }
      
      if (rowIndex !== -1 && colIndex !== -1) {
        // Lookup dans data
        const dataRowIndex = rowIndex - 1;
        const dataColIndex = colIndex - 1;
        const result = data[dataRowIndex]?.[dataColIndex];
        
        results.push({ column: fixedColValue, value: result });
        console.log(`[TABLE] ✅ MODE 2 - ${fixedColValue}: ${result}`);
      }
    }
    
    // Construire le résultat final
    const resultText = results.map(r => `${r.column}=${r.value}`).join(', ');
    const resultValues = results.map(r => r.value);
    const humanText = `Table "${table.name}"[${rowLabel}=${rowSelectorValue}, ${displayRows.join('+')}(fixes)] = ${resultText}`;
    
    return {
      result: resultValues.length === 1 ? String(resultValues[0]) : JSON.stringify(resultValues),
      humanText,
      details: {
        type: 'table',
        mode: 2,
        tableId: table.id,
        tableName: table.name,
        lookup: {
          row: { field: rowLabel, value: rowSelectorValue },
          columns: results,
          multiple: results.length > 1
        }
      }
    };
  }
  
  // ❌ Configuration invalide
  else {
    console.error(`[TABLE] ❌ Configuration lookup invalide`);
    return {
      result: '∅',
      humanText: `Configuration lookup invalide pour table ${table.name}`,
      details: { type: 'table', error: 'Invalid configuration' }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 MODE 3 : Code existant (croisement dynamique colonne × ligne)
  // Ce code s'exécute SEULEMENT si on est en MODE 3
  // ═══════════════════════════════════════════════════════════════════════
  console.log(`[TABLE] 📋 Selectors MODE 3: row=${rowFieldId}, col=${colFieldId}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 4 : Récupérer les valeurs sélectionnées par l'utilisateur
  // ⚠️ ATTENTION : Les selectors peuvent être inversés par rapport aux rows/columns de la table !
  // rowFieldId peut contenir une valeur qui est en fait dans table.columns[]
  // et columnFieldId peut contenir une valeur qui est en fait dans table.rows[]
  // On récupère les deux valeurs d'abord, puis on détermine où les chercher
  // ═══════════════════════════════════════════════════════════════════════
  const rowSelectorValue = await getNodeValue(rowFieldId, submissionId, prisma, valueMap);
  const colSelectorValue = await getNodeValue(colFieldId, submissionId, prisma, valueMap);
  const rowLabel = await getNodeLabel(rowFieldId, prisma, labelMap);
  const colLabel = await getNodeLabel(colFieldId, prisma, labelMap);
  
  console.log(`[TABLE] 📊 Valeurs sélectionnées: row=${rowLabel}(${rowSelectorValue}), col=${colLabel}(${colSelectorValue})`);
  
  if (!rowSelectorValue || !colSelectorValue) {
    return {
      result: '∅',
      humanText: `Table "${table.name}"[${rowLabel}(${rowSelectorValue || '?'}), ${colLabel}(${colSelectorValue || '?'})] = aucune sélection`,
      details: { type: 'table', error: 'Missing selection' }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 ÉTAPE 5 : Trouver les index dans rows[] et columns[]
  // � AUTO-DÉTECTION : On cherche chaque valeur dans rows ET columns pour déterminer
  //    automatiquement où elle se trouve (inversion automatique si nécessaire)
  // ═══════════════════════════════════════════════════════════════════════
  const columns = table.columns as string[];
  const rows = table.rows as string[];
  const data = table.data as any[][];
  
  // �🐛 DEBUG : Afficher toutes les valeurs AVANT la normalisation
  console.log(`[TABLE] 🔍 DEBUG rowSelectorValue:`, {
    raw: rowSelectorValue,
    type: typeof rowSelectorValue,
    stringified: JSON.stringify(rowSelectorValue),
    asString: String(rowSelectorValue),
    length: String(rowSelectorValue).length
  });
  console.log(`[TABLE] 🔍 DEBUG colSelectorValue:`, {
    raw: colSelectorValue,
    type: typeof colSelectorValue,
    stringified: JSON.stringify(colSelectorValue),
    asString: String(colSelectorValue),
    length: String(colSelectorValue).length
  });
  
  // 🧹 NORMALISATION : Trim + lowercase pour matching robuste
  const normalizedRowSelector = String(rowSelectorValue).trim().toLowerCase();
  const normalizedColSelector = String(colSelectorValue).trim().toLowerCase();
  
  console.log(`[TABLE] 🔍 Recherche normalisée:`, {
    normalizedRowSelector,
    normalizedColSelector
  });
  
  // 🔍 Chercher rowSelectorValue dans rows ET columns
  const rowSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedRowSelector);
  const rowSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedRowSelector);
  
  // 🔍 Chercher colSelectorValue dans rows ET columns
  const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedColSelector);
  const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedColSelector);
  
  console.log(`[TABLE] 🔍 Auto-détection positions:`, {
    rowSelector: { value: rowSelectorValue, inRows: rowSelectorInRows, inCols: rowSelectorInCols },
    colSelector: { value: colSelectorValue, inRows: colSelectorInRows, inCols: colSelectorInCols }
  });
  
  // 🎯 Déterminer les index finaux (avec auto-correction de l'inversion)
  let finalRowIndex = -1;
  let finalColIndex = -1;
  let actualRowValue = '';
  let actualColValue = '';
  
  // Stratégie : Privilégier le matching le plus "naturel"
  // Si rowSelector est dans rows ET colSelector est dans columns → OK
  // Si rowSelector est dans columns ET colSelector est dans rows → INVERSION
  
  if (rowSelectorInRows !== -1 && colSelectorInCols !== -1) {
    // ✅ CAS NORMAL : pas d'inversion
    finalRowIndex = rowSelectorInRows;
    finalColIndex = colSelectorInCols;
    actualRowValue = String(rowSelectorValue);
    actualColValue = String(colSelectorValue);
    console.log(`[TABLE] ✅ Configuration normale détectée`);
  } else if (rowSelectorInCols !== -1 && colSelectorInRows !== -1) {
    // 🔄 CAS INVERSÉ : on utilise directement les bons index
    finalRowIndex = colSelectorInRows;
    finalColIndex = rowSelectorInCols;
    actualRowValue = String(colSelectorValue);
    actualColValue = String(rowSelectorValue);
    console.log(`[TABLE] 🔄 INVERSION DÉTECTÉE ET CORRIGÉE AUTOMATIQUEMENT`);
    console.log(`[TABLE] 🔄 rowSelector (${rowSelectorValue}) était dans columns → devient colValue`);
    console.log(`[TABLE] � colSelector (${colSelectorValue}) était dans rows → devient rowValue`);
  } else {
    // ❌ Aucun matching trouvé (ou matching partiel)
    finalRowIndex = rowSelectorInRows !== -1 ? rowSelectorInRows : colSelectorInRows;
    finalColIndex = rowSelectorInCols !== -1 ? rowSelectorInCols : colSelectorInCols;
    actualRowValue = String(rowSelectorValue);
    actualColValue = String(colSelectorValue);
  }
  
  // 🐛 DEBUG : Afficher toutes les lignes/colonnes disponibles
  console.log(`[TABLE] 📋 Lignes disponibles (${rows.length}):`, rows.map((r, i) => `[${i}]"${r}"`).join(', '));
  console.log(`[TABLE] 📋 Colonnes disponibles (${columns.length}):`, columns.map((c, i) => `[${i}]"${c}"`).join(', '));
  
  console.log(`[TABLE] 🎯 Index finaux après auto-détection: rowIndex=${finalRowIndex}, colIndex=${finalColIndex}`);
  console.log(`[TABLE] 🎯 Index finaux après auto-détection: rowIndex=${finalRowIndex}, colIndex=${finalColIndex}`);
  
  if (finalRowIndex === -1 || finalColIndex === -1) {
    console.error(`[TABLE] ❌ Valeur introuvable dans rows/columns`);
    return {
      result: '∅',
      humanText: `Table "${table.name}"[${actualRowValue}, ${actualColValue}] = valeur introuvable`,
      details: { type: 'table', error: 'Value not found in rows/columns' }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📍 ÉTAPE 6 : Faire le lookup dans data[][]
  // ═══════════════════════════════════════════════════════════════════════
  // IMPORTANT : data[0] correspond à rows[1] (décalage car rows[0] = header)
  const dataRowIndex = finalRowIndex - 1;
  const dataColIndex = finalColIndex - 1;
  
  console.log(`[TABLE] 📍 Index dans data[][]: [${dataRowIndex}][${dataColIndex}]`);
  
  if (dataRowIndex < 0 || dataColIndex < 0 || !data[dataRowIndex]) {
    console.error(`[TABLE] ❌ Index hors limites`);
    return {
      result: '∅',
      humanText: `Table "${table.name}"[${actualRowValue}, ${actualColValue}] = hors limites`,
      details: { type: 'table', error: 'Index out of bounds' }
    };
  }
  
  const result = data[dataRowIndex][dataColIndex];
  console.log(`[TABLE] ✅ Résultat du lookup: ${result}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📝 ÉTAPE 7 : Construire le texte humain
  // ═══════════════════════════════════════════════════════════════════════
  const humanText = `Table "${table.name}"[${rowLabel}=${actualRowValue}, ${colLabel}=${actualColValue}] = ${result}`;
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📤 ÉTAPE 8 : Retourner le résultat structuré
  // ═══════════════════════════════════════════════════════════════════════
  return {
    result: String(result),
    humanText,
    details: {
      type: 'table',
      tableId: table.id,
      tableName: table.name,
      lookup: {
        row: {
          field: rowLabel,
          fieldId: rowFieldId,
          value: actualRowValue,
          index: finalRowIndex
        },
        column: {
          field: colLabel,
          fieldId: colFieldId,
          value: actualColValue,
          index: finalColIndex
        },
        result
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 MODULE 7 : INTERPRÉTATION DES CHAMPS SIMPLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 📝 INTERPRÈTE UN CHAMP SIMPLE
 * 
 * Cette fonction récupère simplement la valeur d'un champ saisi par l'utilisateur.
 * C'est le cas le plus simple (pas de calcul, juste récupération).
 * 
 * @param fieldId - ID du champ
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma Client
 * @returns Résultat interprété
 */
async function interpretField(
  fieldId: string,
  submissionId: string,
  prisma: PrismaClient,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<InterpretResult> {
  
  console.log(`[CHAMP] 📝 Début interprétation champ: ${fieldId}`);
  
  // Récupérer la valeur et le label (priorité valueMap pour mode preview)
  const value = await getNodeValue(fieldId, submissionId, prisma, valueMap);
  const label = await getNodeLabel(fieldId, prisma, labelMap);
  
  console.log(`[CHAMP] 📊 ${label} = ${value || 'aucune donnée'}`);
  
  const humanText = `${label}(${value || 'aucune donnée'})`;
  
  return {
    result: value || '∅',
    humanText,
    details: {
      type: 'field',
      fieldId,
      label,
      value
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 MODULE 8 : POINT D'ENTRÉE PRINCIPAL (API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🎯 FONCTION PRINCIPALE : Évalue une variable et toutes ses opérations
 * 
 * C'est LA fonction à appeler depuis les routes API pour évaluer une variable.
 * Elle gère automatiquement toute la récursion et retourne un résultat complet.
 * 
 * PROCESSUS :
 * -----------
 * 1. 📥 Récupérer la variable depuis TreeBranchLeafNodeVariable
 * 2. 🔍 Vérifier le sourceType (fixed, tree, api, etc.)
 * 3. 🔄 Si tree, interpréter récursivement la sourceRef
 * 4. 📤 Retourner le résultat complet (value, detail, humanText)
 * 
 * UTILISATION DANS L'API :
 * ------------------------
 * ```typescript
 * const result = await evaluateVariableOperation(
 *   "10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e",  // nodeId de la variable
 *   "tbl-1759750447813-5n5y6oup4",            // submissionId
 *   prisma
 * );
 * 
 * // Stocker dans SubmissionData
 * await prisma.treeBranchLeafSubmissionData.upsert({
 *   where: { submissionId_nodeId: { submissionId, nodeId } },
 *   update: {
 *     value: result.value,
 *     operationDetail: result.operationDetail,
 *     operationResult: result.operationResult
 *   },
 *   create: { ... }
 * });
 * ```
 * 
 * @param variableNodeId - ID du nœud variable à évaluer
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @returns Résultat complet avec value, detail et humanText
 * 
 * @throws Error si variable introuvable
 */
export async function evaluateVariableOperation(
  variableNodeId: string,
  submissionId: string,
  prisma: PrismaClient,
  valueMap?: Map<string, unknown>
): Promise<{
  value: string;
  operationDetail: any;
  operationResult: string;
  operationSource: 'condition' | 'formula' | 'table' | 'field' | 'fixed';
  sourceRef: string;
}> {
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎯 ÉVALUATION VARIABLE: ${variableNodeId}`);
  console.log(`   Submission: ${submissionId}`);
  console.log(`${'═'.repeat(80)}\n`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📥 ÉTAPE 0 : Initialiser et enrichir les Maps (NOUVEAU)
  // ═══════════════════════════════════════════════════════════════════════
  const localValueMap = valueMap || new Map<string, unknown>();
  const labelMap = new Map<string, string>();
  
  // Enrichir automatiquement les données depuis la base
  await enrichDataFromSubmission(submissionId, prisma, localValueMap, labelMap);
  
  console.log(`✅ Maps enrichies: ${localValueMap.size} valeurs, ${labelMap.size} labels`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📥 ÉTAPE 1 : Récupérer la variable
  // ═══════════════════════════════════════════════════════════════════════
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: variableNodeId },
    select: {
      id: true,
      nodeId: true,
      exposedKey: true,
      displayName: true,
      sourceType: true,
      sourceRef: true,
      fixedValue: true,
      defaultValue: true
    }
  });
  
  if (!variable) {
    console.error(`❌ Variable introuvable: ${variableNodeId}`);
    throw new Error(`Variable introuvable: ${variableNodeId}`);
  }
  
  console.log(`✅ Variable trouvée: ${variable.displayName}`);
  console.log(`   SourceType: ${variable.sourceType}`);
  console.log(`   SourceRef: ${variable.sourceRef}`);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔍 ÉTAPE 2 : Traiter selon le sourceType
  // ═══════════════════════════════════════════════════════════════════════
  
  // CAS 1 : Valeur fixe
  if (variable.sourceType === 'fixed' && variable.fixedValue) {
    console.log(`📌 Valeur fixe: ${variable.fixedValue}`);
    return {
      value: variable.fixedValue,
      operationDetail: { type: 'fixed', value: variable.fixedValue },
      operationResult: `Valeur fixe: ${variable.fixedValue}`,
      operationSource: 'fixed',
      sourceRef: variable.sourceRef || ''
    };
  }
  
  // CAS 2 : Source depuis le tree (condition/formule/table)
  if (variable.sourceType === 'tree' && variable.sourceRef) {
    console.log(`🌲 Source tree, interprétation de: ${variable.sourceRef}`);
    
    // 🔄 INTERPRÉTATION RÉCURSIVE COMPLÈTE
    const valuesCache = new Map<string, InterpretResult>();
    const result = await interpretReference(
      variable.sourceRef,
      submissionId,
      prisma,
      valuesCache,
      0,  // Profondeur initiale = 0
      localValueMap,
      labelMap
    );
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`✅ RÉSULTAT FINAL:`);
    console.log(`   Value: ${result.result}`);
    console.log(`   HumanText: ${result.humanText}`);
    console.log(`${'─'.repeat(80)}\n`);
    
    // Déterminer l'operationSource
    let operationSource: 'condition' | 'formula' | 'table' | 'field' | 'fixed' = 'field';
    if (variable.sourceRef.includes('condition:')) operationSource = 'condition';
    else if (variable.sourceRef.includes('node-formula:')) operationSource = 'formula';
    else if (variable.sourceRef.includes('@table.')) operationSource = 'table';
    
    return {
      value: result.result,
      operationDetail: result.details,
      operationResult: result.humanText,
      operationSource,
      sourceRef: variable.sourceRef
    };
  }
  
  // CAS 3 : Valeur par défaut
  console.log(`📋 Utilisation valeur par défaut: ${variable.defaultValue || '∅'}`);
  return {
    value: variable.defaultValue || '∅',
    operationDetail: { type: 'default', value: variable.defaultValue },
    operationResult: `Valeur par défaut: ${variable.defaultValue || 'aucune'}`,
    operationSource: 'field',
    sourceRef: variable.sourceRef || ''
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  interpretReference,
  interpretCondition,
  interpretFormula,
  interpretTable,
  interpretField,
  identifyReferenceType,
  normalizeRef
};
