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
import { evaluateExpression } from './formulaEngine.js';

function formatDebugValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 120 ? `${serialized.slice(0, 117)}...` : serialized;
  } catch {
    return '[unserializable]';
  }
}

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
type ReferenceType = 'field' | 'formula' | 'condition' | 'table' | 'value';

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
  // 🆕 DÉTECTION RAPIDE - Vérifier les préfixes AVANT de nettoyer
  // Car @value. et @table. sont des indices cruciaux du type réel
  if (ref.startsWith('@value.condition:') || ref.startsWith('@value.node-condition:')) {
    return 'condition';
  }
  if (ref.startsWith('@value.node-formula:')) {
    return 'formula';
  }
  if (ref.startsWith('@value.node-table:')) {
    return 'table';
  }
  if (ref.startsWith('@value.')) {
    return 'value'; // 🆕 Reconnaître explicitement le type 'value'
  }
  if (ref.startsWith('@table.')) {
    return 'table';
  }
  
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
  if (cleaned.startsWith('node-table:')) {
    return 'table';
  }
  
  // 📝 Vérifier si c'est un champ généré automatiquement
  if (cleaned.startsWith('node_')) {
    return 'field';
  }
  
  // 📝 Vérifier si c'est une référence partagée
  if (cleaned.startsWith('shared-ref-')) {
    return 'field';
  }
  
  // ⚠️ IMPORTANT: Les UUIDs nus sont ambigus - peuvent être des fields, tables, ou conditions
  // On retourne 'field' comme défaut, mais le système devrait vérifier en base de données
  // si c'est vraiment un champ ou une table
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (uuidRegex.test(cleaned)) {
    // AMÉLIORATION FUTURE: Vérifier le type du nœud en base de données
    // Pour l'instant, retourner 'field' comme défaut
    return 'field';
  }
  
  // Par défaut, considérer comme un champ
  return 'field';
}

/**
 * 🔍 Identifie le type d'un UUID ambigu en interrogeant la base de données
 * 
 * Cette fonction vérifie si un UUID est une condition, formule, table, ou champ
 * en interrogeant Prisma.
 * 
 * @param id - UUID à vérifier
 * @param prisma - Client Prisma
 * @returns Type de référence trouvé ('condition' | 'formula' | 'table' | 'field')
 */
async function identifyReferenceTypeFromDB(id: string, prisma: PrismaClient): Promise<ReferenceType> {
  try {
    // ✅ Vérifier si c'est une condition
    const conditionNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id },
      select: { type: true }
    });
    
    if (conditionNode) {
      if (conditionNode.type === 'condition') {
        console.log(`[IDENTIFY] ✅ ${id} est une CONDITION`);
        return 'condition';
      }
      if (conditionNode.type === 'node_formula') {
        console.log(`[IDENTIFY] ✅ ${id} est une FORMULE`);
        return 'formula';
      }
      if (conditionNode.type === 'node_table') {
        console.log(`[IDENTIFY] ✅ ${id} est une TABLE`);
        return 'table';
      }
      console.log(`[IDENTIFY] ✅ ${id} est un CHAMP (type: ${conditionNode.type})`);
      return 'field';
    }
    
    console.log(`[IDENTIFY] ⚠️ ${id} non trouvé en BD, défaut: CHAMP`);
    return 'field';
  } catch (error) {
    console.error(`[IDENTIFY] ❌ Erreur lors de l'identification en BD:`, error);
    return 'field'; // Défaut : considérer comme champ
  }
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
 * ⚙️ OPTIONS :
 * - `preserveEmpty=true` → retourne `null` si aucune donnée réelle n'existe
 *   (utile pour les opérateurs `isEmpty` / `isNotEmpty`).
 * - Par défaut, la fonction continue de retourner "0" pour éviter de casser
 *   les formules numériques lorsqu'une valeur manque.
 * 
 * @param nodeId - ID du nœud à récupérer
 * @param submissionId - ID de la soumission en cours
 * @param prisma - Instance Prisma Client
 * @param valueMap - Map des valeurs (déjà enrichie par enrichDataFromSubmission)
 * @returns Valeur du nœud ou "0" si non trouvée
 * 
 * @example
 * await getNodeValue("702d1b09...", "tbl-1759750447813...", prisma, valueMap)
 * → "1450" (si présent) ou "0" (si absent)
 */
interface GetNodeValueOptions {
  /**
   * Lorsque true, la fonction retournera null/undefined si aucune donnée n'existe
   * réellement, au lieu de forcer la valeur de secours "0".
   */
  preserveEmpty?: boolean;
}

async function getNodeValue(
  nodeId: string,
  submissionId: string,
  prisma: PrismaClient,
  valueMap?: Map<string, unknown>,
  options?: GetNodeValueOptions
): Promise<string | null> {
  // 🎯 PRIORITÉ 1: Vérifier dans valueMap si fourni
  if (valueMap && valueMap.has(nodeId)) {
    const val = valueMap.get(nodeId);
    console.log(`[INTERPRETER][getNodeValue] valueMap hit ${nodeId} → ${formatDebugValue(val)}`);
    if (val === null || val === undefined) {
      return options?.preserveEmpty ? null : "0";
    }
    return String(val);
  }

  console.log(`[INTERPRETER][getNodeValue] DB fallback ${nodeId}`);
  
  // 🎯 PRIORITÉ 2: Requête Prisma pour récupérer depuis TreeBranchLeafSubmissionData
  const data = await prisma.treeBranchLeafSubmissionData.findFirst({
    where: {
      nodeId,
      submissionId
    },
    select: {
      value: true
    }
  });

  if (data?.value !== null && data?.value !== undefined) {
    console.log(`[INTERPRETER][getNodeValue] SubmissionData hit ${nodeId} → ${formatDebugValue(data.value)}`);
    return String(data.value);
  }
  
  // 🎯 PRIORITÉ 3 (NOUVEAU): Récupérer depuis TreeBranchLeafNode.calculatedValue
  // Ceci permet de récupérer les valeurs calculées d'autres formules (ex: Mur, Mur-1)
  // même si elles ne sont pas dans le valueMap ou SubmissionData
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { calculatedValue: true, label: true }
  });

  if (node?.calculatedValue !== null && node?.calculatedValue !== undefined && node?.calculatedValue !== '') {
    console.log(`[INTERPRETER][getNodeValue] 🆕 TreeBranchLeafNode.calculatedValue hit ${nodeId} (${node.label}) → ${formatDebugValue(node.calculatedValue)}`);
    return String(node.calculatedValue);
  }

  console.log(`[INTERPRETER][getNodeValue] No value found for ${nodeId}, returning "0"`);
  
  // Retourner "0" par défaut si aucune valeur trouvée
  return options?.preserveEmpty ? null : "0";
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
  labelMap?: Map<string, string>,
  knownType?: ReferenceType  // 🆕 Type connu du contexte (p.ex. 'table' depuis @table.xxx)
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
  // 🆕 Si le type est connu du contexte (p.ex. @table.xxx), l'utiliser en priorité
  let type = knownType || identifyReferenceType(ref);
  
  // 🔍 Si c'est un UUID ambigu (pas de préfixe), vérifier en BD
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  
  if (type === 'field' && uuidRegex.test(cleanRef)) {
    console.log(`[INTERPRÉTATION] 🔍 UUID ambigu détecté: ${cleanRef}, vérification en BD...`);
    type = await identifyReferenceTypeFromDB(cleanRef, prisma);
  }
  
  console.log(`[INTERPRÉTATION] 🔍 Type identifié: ${type} pour ref: ${ref} (depth=${depth}${knownType ? `, contexte: ${knownType}` : ''})`);
  
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
      
      case 'value':
      case 'field':
        console.log(`[INTERPRÉTATION] 📝 Délégation vers interpretField (type: ${type})`);
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
  const resolveOperandReference = async (ref: string | undefined): Promise<{ value: string | null; label: string }> => {
    if (!ref) {
      return { value: null, label: 'Inconnu' };
    }

    const operandType = identifyReferenceType(ref);
    if (operandType === 'field' || operandType === 'value') {
      const operandId = normalizeRef(ref);
      const value = await getNodeValue(operandId, submissionId, prisma, valueMap, { preserveEmpty: true });
      const label = await getNodeLabel(operandId, prisma, labelMap);
      return { value, label };
    }

    const interpreted = await interpretReference(
      ref,
      submissionId,
      prisma,
      valuesCache,
      depth + 1,
      valueMap,
      labelMap,
      operandType
    );

    const labelFromDetails = interpreted.details?.conditionName
      || interpreted.details?.formulaName
      || interpreted.details?.tableName
      || interpreted.details?.label
      || interpreted.details?.name
      || `Référence ${operandType}`;

    return {
      value: interpreted.result,
      label: labelFromDetails
    };
  };

  const leftRef = when.left?.ref;
  let leftValue: string | null = null;
  let leftLabel = 'Inconnu';

  if (leftRef) {
    const leftInfo = await resolveOperandReference(leftRef);
    leftValue = leftInfo.value;
    leftLabel = leftInfo.label;
    console.log(`[CONDITION] 📊 LEFT: ${leftLabel} = ${leftValue}`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 4 : Récupérer la valeur RIGHT (côté droit de la condition)
  // ═══════════════════════════════════════════════════════════════════════
  const rightRef = when.right?.ref;
  let rightValue: string | null = null;
  let rightLabel = 'Inconnu';
  
  if (rightRef) {
    const rightInfo = await resolveOperandReference(rightRef);
    rightValue = rightInfo.value;
    rightLabel = rightInfo.label;
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
  const _selectedBranch = conditionMet ? branch : condSet.fallback;
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

function compareValuesByOperator(op: string | undefined | null, cellValue: any, targetValue: any): boolean {
  if (!op) return false;
  switch (op) {
    case 'equals':
    case '==':
      return String(cellValue) === String(targetValue);
    case 'notEquals':
    case '!=':
      return String(cellValue) !== String(targetValue);
    case 'greaterThan':
    case '>':
      return Number(cellValue) > Number(targetValue);
    case 'greaterOrEqual':
    case '>=':
      return Number(cellValue) >= Number(targetValue);
    case 'lessThan':
    case '<':
      return Number(cellValue) < Number(targetValue);
    case 'lessOrEqual':
    case '<=':
      return Number(cellValue) <= Number(targetValue);
    case 'contains':
      return String(cellValue).includes(String(targetValue));
    case 'notContains':
      return !String(cellValue).includes(String(targetValue));
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🧰 UTILITAIRES COMMUNS POUR LES LOOKUP (normalisation + recherche numérique)
// ═══════════════════════════════════════════════════════════════════════

const normalizeLookupValue = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const parseNumericLookupValue = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const sanitized = raw.replace(/,/g, '.').replace(/[^0-9+\-\.]/g, '');
  if (!sanitized) return NaN;
  return Number(sanitized);
};

function findClosestIndexInLabels(
  targetValue: unknown,
  labels: Array<unknown>,
  allowedIndices?: number[]
): { index: number; matchType: 'text' | 'numeric'; matchedValue?: unknown } | null {
  const indices = allowedIndices && allowedIndices.length ? allowedIndices : labels.map((_, idx) => idx);
  const normalizedTarget = normalizeLookupValue(targetValue);

  for (const idx of indices) {
    const label = labels[idx];
    if (normalizeLookupValue(label) === normalizedTarget || label === targetValue) {
      return { index: idx, matchType: 'text', matchedValue: label };
    }
  }

  const numericTarget = parseNumericLookupValue(targetValue);
  if (isNaN(numericTarget)) {
    return null;
  }

  let exactIndex = -1;
  let upperIndex = -1;
  let upperValue = Infinity;
  let lowerIndex = -1;
  let lowerValue = -Infinity;

  for (const idx of indices) {
    const labelValue = parseNumericLookupValue(labels[idx]);
    if (isNaN(labelValue)) continue;

    if (labelValue === numericTarget) {
      exactIndex = idx;
      break;
    }

    if (labelValue >= numericTarget && labelValue < upperValue) {
      upperValue = labelValue;
      upperIndex = idx;
    }

    if (labelValue <= numericTarget && labelValue > lowerValue) {
      lowerValue = labelValue;
      lowerIndex = idx;
    }
  }

  if (exactIndex !== -1) {
    return { index: exactIndex, matchType: 'numeric', matchedValue: numericTarget };
  }

  if (upperIndex !== -1) {
    return { index: upperIndex, matchType: 'numeric', matchedValue: upperValue };
  }

  if (lowerIndex !== -1) {
    return { index: lowerIndex, matchType: 'numeric', matchedValue: lowerValue };
  }

  return null;
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

type FormulaExpressionPart =
  | { type: 'literal'; value: string }
  | { type: 'placeholder'; encoded: string };

interface FormulaReferenceMeta {
  refId: string;
  refType: ReferenceType;
  rawToken: string;
}

interface FormulaExpressionBuildResult {
  expression: string;
  parts: FormulaExpressionPart[];
  roleToEncoded: Record<string, string>;
  encodedMeta: Record<string, FormulaReferenceMeta>;
}

const RE_NODE_FORMULA = /node-formula:[a-z0-9-]+/i;
const RE_LEGACY_FORMULA = /formula:[a-z0-9-]+/i;
const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

function encodeRef(refType: ReferenceType, refId: string): string {
  return `${refType}::${refId}`;
}

function tryParseTokenReference(token?: string | null): FormulaReferenceMeta | null {
  if (!token || typeof token !== 'string') return null;

  const rawToken = token;
  let normalizedToken = token.trim();
  const wrapperMatch = normalizedToken.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (wrapperMatch && wrapperMatch[1]) {
    normalizedToken = wrapperMatch[1];
  }

  const createMeta = (refType: ReferenceType, refId: string): FormulaReferenceMeta => ({ refType, refId, rawToken });

  if (normalizedToken.startsWith('@value.condition:')) {
    return createMeta('condition', normalizedToken.slice('@value.condition:'.length));
  }
  if (normalizedToken.startsWith('@value.node-condition:')) {
    return createMeta('condition', normalizedToken.slice('@value.node-condition:'.length));
  }
  if (normalizedToken.startsWith('@value.')) {
    return createMeta('value', normalizedToken.slice('@value.'.length));
  }
  if (normalizedToken.startsWith('@table.')) {
    return createMeta('table', normalizedToken.slice('@table.'.length));
  }
  if (normalizedToken.startsWith('@condition.')) {
    return createMeta('condition', normalizedToken.slice('@condition.'.length));
  }
  if (normalizedToken.startsWith('@select.')) {
    const cleaned = normalizedToken.slice('@select.'.length).split('.')[0];
    return cleaned ? createMeta('value', cleaned) : null;
  }

  const formulaMatch = normalizedToken.match(RE_NODE_FORMULA) || normalizedToken.match(RE_LEGACY_FORMULA);
  if (formulaMatch && formulaMatch[0]) {
    const normalized = formulaMatch[0].startsWith('node-formula:')
      ? formulaMatch[0].slice('node-formula:'.length)
      : formulaMatch[0].slice('formula:'.length);
    return createMeta('formula', normalized);
  }

  if (normalizedToken.startsWith('node-formula:')) {
    return createMeta('formula', normalizedToken.slice('node-formula:'.length));
  }
  // Support aussi "formula:" sans préfixe "node-"
  if (normalizedToken.startsWith('formula:') && !normalizedToken.startsWith('formula:node-')) {
    return createMeta('formula', normalizedToken.slice('formula:'.length));
  }
  if (normalizedToken.startsWith('node-table:')) {
    return createMeta('table', normalizedToken.slice('node-table:'.length));
  }
  // Support aussi "table:" sans préfixe "node-"
  if (normalizedToken.startsWith('table:') && !normalizedToken.startsWith('table:node-')) {
    return createMeta('table', normalizedToken.slice('table:'.length));
  }
  if (normalizedToken.startsWith('node-condition:')) {
    return createMeta('condition', normalizedToken.slice('node-condition:'.length));
  }
  // Support aussi "condition:" sans préfixe "node-"
  if (normalizedToken.startsWith('condition:') && !normalizedToken.startsWith('condition:node-')) {
    return createMeta('condition', normalizedToken.slice('condition:'.length));
  }

  if (normalizedToken.startsWith('shared-ref-') || normalizedToken.startsWith('node_') || UUID_REGEX.test(normalizedToken)) {
    return createMeta('field', normalizedToken);
  }

  return null;
}

function buildFormulaExpression(tokens: any[]): FormulaExpressionBuildResult {
  const parts: FormulaExpressionPart[] = [];
  const roleToEncoded: Record<string, string> = {};
  const encodedMeta: Record<string, FormulaReferenceMeta> = {};
  const exprSegments: string[] = [];
  let varIndex = 0;

  const appendLiteral = (value: string) => {
    exprSegments.push(value);
    parts.push({ type: 'literal', value });
  };

  const registerReference = (meta: FormulaReferenceMeta) => {
    const encoded = encodeRef(meta.refType, meta.refId);
    if (!encodedMeta[encoded]) encodedMeta[encoded] = meta;
    const role = `var_${varIndex++}`;
    roleToEncoded[role] = encoded;
    const placeholder = `{{${role}}}`;
    exprSegments.push(placeholder);
    parts.push({ type: 'placeholder', encoded });
  };

  for (const rawToken of tokens) {
    if (typeof rawToken === 'string') {
      const refMeta = tryParseTokenReference(rawToken);
      if (refMeta) {
        registerReference(refMeta);
        continue;
      }
      if (rawToken === 'CONCAT') {
        appendLiteral('&');
        continue;
      }
      appendLiteral(rawToken);
    } else if (rawToken && typeof rawToken === 'object') {
      const refStr = typeof rawToken.ref === 'string'
        ? rawToken.ref
        : typeof rawToken.value === 'string'
          ? rawToken.value
          : typeof rawToken.nodeId === 'string'
            ? rawToken.nodeId
            : '';
      if (refStr) {
        const refMeta = tryParseTokenReference(refStr) || { refType: 'field', refId: refStr, rawToken: refStr };
        registerReference(refMeta);
      }
    }
  }

  const expression = exprSegments.join(' ');
  return { expression, parts, roleToEncoded, encodedMeta };
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
  
  const tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
  console.log(`[FORMULE] 📋 Tokens:`, JSON.stringify(tokens));

  const buildResult = buildFormulaExpression(tokens);
  if (!buildResult.expression.trim()) {
    console.warn('[FORMULE] ⚠️ Expression vide, retour 0');
    return {
      result: '0',
      humanText: '0',
      details: {
        type: 'formula',
        formulaId: formula.id,
        formulaName: formula.name,
        tokens: [],
        expression: '',
        humanExpression: '',
        calculatedResult: 0
      }
    };
  }

  const valueCacheByEncoded = new Map<string, number>();
  const labelCacheByEncoded = new Map<string, string>();
  const detailCacheByEncoded = new Map<string, InterpretResult>();

  const resolveVariable = async (encoded: string): Promise<number> => {
    if (valueCacheByEncoded.has(encoded)) {
      return valueCacheByEncoded.get(encoded)!;
    }
    const meta = buildResult.encodedMeta[encoded];
    if (!meta || !meta.refId) {
      valueCacheByEncoded.set(encoded, 0);
      labelCacheByEncoded.set(encoded, meta?.rawToken || encoded);
      return 0;
    }

    try {
      const refResult = await interpretReference(
        meta.refId,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap,
        meta.refType
      );
      detailCacheByEncoded.set(encoded, refResult);
      const numeric = Number(refResult.result);
      const safeValue = Number.isFinite(numeric) ? numeric : 0;
      valueCacheByEncoded.set(encoded, safeValue);

      if (meta.refType === 'formula') {
        const label = refResult.details?.formulaName || refResult.details?.label || `Formule ${meta.refId}`;
        labelCacheByEncoded.set(encoded, label);
      } else {
        const label = await getNodeLabel(meta.refId, prisma, labelMap).catch(() => meta.refId);
        labelCacheByEncoded.set(encoded, label || meta.refId);
      }

      return safeValue;
    } catch (error) {
      console.error('[FORMULE] ❌ Erreur résolution variable:', { encoded, error });
      valueCacheByEncoded.set(encoded, 0);
      labelCacheByEncoded.set(encoded, meta?.rawToken || encoded);
      return 0;
    }
  };

  let evaluation: { value: number; errors: string[] };
  try {
    evaluation = await evaluateExpression(buildResult.expression, buildResult.roleToEncoded, {
      resolveVariable,
      divisionByZeroValue: 0,
      strictVariables: false
    });
  } catch (error) {
    console.error('[FORMULE] ❌ Erreur evaluateExpression:', error);
    return {
      result: '∅',
      humanText: 'Erreur de calcul de la formule',
      details: {
        type: 'formula',
        formulaId: formula.id,
        formulaName: formula.name,
        tokens: tokens.map(token => ({ type: 'raw', value: token })),
        expression: buildResult.expression,
        humanExpression: buildResult.expression,
        calculatedResult: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }

  const humanExpression = buildResult.parts
    .map(part => {
      if (part.type === 'literal') return part.value;
      const label = labelCacheByEncoded.get(part.encoded) || buildResult.encodedMeta[part.encoded]?.refId || part.encoded;
      const value = valueCacheByEncoded.get(part.encoded) ?? 0;
      return `${label}(${value})`;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const calculatedResult = evaluation.value;
  const humanText = `${humanExpression} = ${calculatedResult}`;

  const tokenDetails = buildResult.parts.map(part => {
    if (part.type === 'literal') {
      return { type: 'literal', value: part.value };
    }
    const meta = buildResult.encodedMeta[part.encoded];
    return {
      type: 'reference',
      ref: meta?.refId,
      refType: meta?.refType,
      label: labelCacheByEncoded.get(part.encoded) || meta?.refId,
      value: valueCacheByEncoded.get(part.encoded) ?? 0,
      details: detailCacheByEncoded.get(part.encoded)?.details || null
    };
  });

  return {
    result: String(calculatedResult),
    humanText,
    details: {
      type: 'formula',
      formulaId: formula.id,
      formulaName: formula.name,
      tokens: tokenDetails,
      expression: buildResult.expression,
      humanExpression,
      calculatedResult,
      evaluationErrors: evaluation.errors
    }
  };
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
// ═══════════════════════════════════════════════════════════════════════════
// 🔥 NOUVEAU: Gestion des 3 options de source (SELECT/CHAMP/CAPACITÉ)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 🔥 Récupère la valeur source selon le type configuré
 * 
 * Supporte les 3 options :
 * 1. SELECT (columnSourceOption?.type === 'select'): Utilise le champ configuré
 * 2. CHAMP (columnSourceOption?.type === 'field'): Récupère la valeur d'un autre champ
 * 3. CAPACITÉ (columnSourceOption?.type === 'capacity'): Exécute une capacité
 * 
 * @param sourceOption - Configuration de la source (columnSourceOption ou rowSourceOption)
 * @param lookupConfig - Configuration lookup complète (fallback pour mode SELECT)
 * @param fieldId - ID du champ pour le mode SELECT (fallback)
 * @param submissionId - ID de la soumission
 * @param prisma - Instance Prisma
 * @param valuesCache - Cache des interprétations
 * @param depth - Profondeur de récursion
 * @param valueMap - Map des valeurs
 * @param labelMap - Map des labels
 * @returns Valeur source | null
 */
async function getSourceValue(
  sourceOption: any,
  lookupConfig: any,
  fieldId: string | null | undefined,
  submissionId: string,
  prisma: PrismaClient,
  valuesCache: Map<string, InterpretResult>,
  depth: number,
  valueMap?: Map<string, unknown>,
  labelMap?: Map<string, string>
): Promise<string | null> {
  // Par défaut (ou option SELECT): utiliser le fieldId configuré
  if (!sourceOption || sourceOption.type === 'select') {
    return fieldId ? await getNodeValue(fieldId, submissionId, prisma, valueMap) : null;
  }
  
  // Option 2 (CHAMP): récupérer la valeur du champ source
  if (sourceOption.type === 'field' && sourceOption.sourceField) {
    console.log(`[TABLE] 🔍 DEBUG CHAMP: sourceOption=`, JSON.stringify(sourceOption, null, 2));
    console.log(`[TABLE] 🔍 DEBUG CHAMP: submissionId=${submissionId}, sourceField=${sourceOption.sourceField}`);
    console.log(`[TABLE] 🔍 DEBUG CHAMP: valueMap has ${valueMap?.size || 0} entries:`, valueMap ? Array.from(valueMap.keys()).slice(0, 5) : 'NO_VALUE_MAP');
    
    const result = await getNodeValue(sourceOption.sourceField, submissionId, prisma, valueMap);
    console.log(`[TABLE] 🔥 Option 2 CHAMP: sourceField=${sourceOption.sourceField} → ${result}`);
    return result;
  }
  
  // Option 3 (CAPACITÉ): exécuter la capacité et récupérer son résultat
  if (sourceOption.type === 'capacity' && sourceOption.capacityRef) {
    try {
      const capacityResult = await interpretReference(
        sourceOption.capacityRef,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap
      );
      console.log(`[TABLE] 🔥 Option 3 CAPACITÉ: capacityRef=${sourceOption.capacityRef} → ${capacityResult.result}`);
      return capacityResult.result;
    } catch (error) {
      console.error(`[TABLE] ❌ Erreur exécution capacité ${sourceOption.capacityRef}:`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * 🏷️ Récupère le label de la source selon le type configuré
 * 
 * @param sourceOption - Configuration de la source
 * @param lookupConfig - Configuration lookup complète (fallback)
 * @param fieldId - ID du champ pour fallback
 * @param prisma - Instance Prisma
 * @param labelMap - Map des labels
 * @returns Label de la source
 */
async function getSourceLabel(
  sourceOption: any,
  lookupConfig: any,
  fieldId: string | null | undefined,
  prisma: PrismaClient,
  labelMap?: Map<string, string>
): Promise<string> {
  // Option SELECT: label du champ sélectionné
  if (!sourceOption || sourceOption.type === 'select') {
    return fieldId ? await getNodeLabel(fieldId, prisma, labelMap) : 'Source';
  }
  
  // Option CHAMP: label du champ source
  if (sourceOption.type === 'field' && sourceOption.sourceField) {
    return await getNodeLabel(sourceOption.sourceField, prisma, labelMap);
  }
  
  // Option CAPACITÉ: label de la capacité
  if (sourceOption.type === 'capacity' && sourceOption.capacityRef) {
    // Essayer de récupérer le label depuis labelMap ou retourner la référence
    const capacityId = sourceOption.capacityRef.replace('@value.', '').replace('formula:', '').replace('condition:', '').replace('table:', '');
    if (labelMap && labelMap.has(capacityId)) {
      return labelMap.get(capacityId) || capacityId;
    }
    return `Capacité: ${sourceOption.capacityRef}`;
  }
  
  return 'Source';
}

// ═══════════════════════════════════════════════════════════════════════════

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
      rowCount: true,
      columnCount: true,
      meta: true,
      nodeId: true,
      tableColumns: {
        orderBy: { columnIndex: 'asc' },
        select: {
          id: true,
          columnIndex: true,
          name: true,
          type: true,
          width: true,
          format: true,
          metadata: true
        }
      },
      tableRows: {
        orderBy: { rowIndex: 'asc' },
        select: {
          id: true,
          rowIndex: true,
          cells: true
        }
      }
    }
  });
  
  // 🔍 RÉSOLUTION IMPLICITE : Si pas trouvé par ID, chercher par nodeId (table par défaut)
  if (!table) {
    console.log(`[TABLE] 🔍 Table introuvable par ID, tentative résolution par nodeId: ${cleanId}`);
    try {
      const byNode = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId: cleanId },
        select: {
          id: true,
          name: true,
          type: true,
          rowCount: true,
          columnCount: true,
          meta: true,
          nodeId: true,
          tableColumns: {
            orderBy: { columnIndex: 'asc' },
            select: { id: true, columnIndex: true, name: true, type: true, width: true, format: true, metadata: true }
          },
          tableRows: {
            orderBy: { rowIndex: 'asc' },
            select: { id: true, rowIndex: true, cells: true }
          }
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
      });
      console.log(`[TABLE] 🔍 Résultat findFirst par nodeId:`, byNode ? `TROUVÉ id=${byNode.id}` : 'NULL');
      if (byNode) {
        table = byNode;
        console.log(`[TABLE] ✅ Table résolue via nodeId → table:${table.id}`);
      } else {
        console.log(`[TABLE] ⚠️ Aucune table avec nodeId="${cleanId}" trouvée`);
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
  // � RECONSTRUCTION DES DONNÉES depuis la structure normalisée
  // ═══════════════════════════════════════════════════════════════════════
  // Reconstituer columns, rows, data depuis les relations
  const columns = table.tableColumns.map(col => col.name);
  const rows: string[] = [];
  const data: any[][] = [];
  
  // 🔄 Parser cells avec support hybride (JSON array OU plain string)
  table.tableRows.forEach(row => {
    try {
      let cellsData: any;
      
      // 🔍 Tentative 1: Parse JSON si c'est une string
      if (typeof row.cells === 'string') {
        try {
          cellsData = JSON.parse(row.cells);
        } catch {
          // 🔧 Fallback: Si ce n'est PAS du JSON, c'est juste une valeur simple (première colonne uniquement)
          // Cela arrive pour les anciennes données où cells = "Orientation" au lieu de ["Orientation", ...]
          cellsData = [row.cells]; // Envelopper dans un array
        }
      } else {
        cellsData = row.cells || [];
      }
      
      // ⚠️ IMPORTANT: IGNORER rowIndex=0 car c'est la ligne HEADER (noms de colonnes)
      // Dans le nouveau système normalisé, rowIndex=0 contient ["Orientation", "0°", "5°", ...]
      // qui sont déjà extraits dans tableColumns
      if (row.rowIndex === 0) {
        console.log(`[TABLE] 🔍 Header row détecté (rowIndex=0), ignoré. Cells:`, JSON.stringify(cellsData).substring(0, 100));
        return; // Skip cette ligne
      }
      
      if (Array.isArray(cellsData) && cellsData.length > 0) {
        // 🔑 cellsData[0] = label de ligne (colonne A) : "Nord", "Sud", etc.
        // 📊 cellsData[1...] = données (colonnes B, C, D...) : [86, 82, 73, ...]
        const rowLabel = String(cellsData[0] || '');
        const rowData = cellsData.slice(1); // Données sans le label
        
        rows.push(rowLabel);
        data.push(rowData);
      } else {
        rows.push(`Row ${row.rowIndex}`);
        data.push([]);
      }
    } catch (error) {
      console.error('[TABLE] ⚠️ Erreur parsing cells:', error);
      rows.push(`Row ${row.rowIndex}`);
      data.push([]);
    }
  });
  
  // ═══════════════════════════════════════════════════════════════════════
  // �🔍 ÉTAPE 2 : Extraire la configuration de lookup
  // ═══════════════════════════════════════════════════════════════════════
  const meta = table.meta as any;
  const lookup = meta?.lookup;
  
  // 🔥 FIX: lookup.enabled peut être undefined si seulement columnLookupEnabled/rowLookupEnabled sont définis
  const isLookupActive = lookup && (lookup.enabled === true || lookup.columnLookupEnabled === true || lookup.rowLookupEnabled === true);
  
  if (!isLookupActive) {
    console.error(`[TABLE] ❌ Lookup non configuré ou désactivé`);
    return {
      result: '∅',
      humanText: `Lookup non configuré pour table ${table.name}`,
      details: { type: 'table', error: 'Lookup not enabled' }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 📊 ÉTAPE 3 : Récupérer les selectors (champs de sélection) et les toggles
  // ═══════════════════════════════════════════════════════════════════════
  const rowFieldId = lookup.selectors?.rowFieldId;
  const colFieldId = lookup.selectors?.columnFieldId;
  const rowEnabled = lookup.rowLookupEnabled === true;
  const colEnabled = lookup.columnLookupEnabled === true;
  const rowSourceOption = lookup.rowSourceOption;
  const colSourceOption = lookup.columnSourceOption;

  const hasRowSelector = Boolean(rowFieldId || (rowSourceOption && rowSourceOption.type && rowSourceOption.type !== 'select'));
  const hasColSelector = Boolean(colFieldId || (colSourceOption && colSourceOption.type && colSourceOption.type !== 'select'));
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🎯 DÉTECTION DU MODE (3 modes possibles)
  // ═══════════════════════════════════════════════════════════════════════
  
  // MODE 3 : Les DEUX toggles activés ET les deux fieldIds configurés (croisement dynamique complet)
  if (rowEnabled && colEnabled && hasRowSelector && hasColSelector) {
    console.log(`[TABLE] 🎯 MODE 3 détecté: Croisement dynamique COLONNE × LIGNE`);
    // Le code existant continue ici (récupération des deux valeurs + croisement)
  }
  
  // MODE 1 : COLONNE activée avec displayColumn (peut avoir ligne activée mais sans rowFieldId)
  else if (colEnabled && (colFieldId || colSourceOption) && lookup.displayColumn && !(rowEnabled && colEnabled && hasRowSelector && hasColSelector)) {
    console.log(`[TABLE] 🎯 MODE 1 détecté: COLONNE × displayColumn fixe (rowEnabled=${rowEnabled}, rowFieldId=${rowFieldId})`);
    
    // 🔥 NOUVEAU: Support des 3 options de source (SELECT/CHAMP/CAPACITÉ)
    const colSelectorValue = await getSourceValue(
      colSourceOption,
      lookup,
      colFieldId,
      submissionId,
      prisma,
      valuesCache,
      depth,
      valueMap,
      labelMap
    );
    const colLabel = await getSourceLabel(colSourceOption, lookup, colFieldId, prisma, labelMap);
    
    // displayColumn peut être un string OU un array
    const displayColumns = Array.isArray(lookup.displayColumn) 
      ? lookup.displayColumn 
      : [lookup.displayColumn];
    
    if (!colSelectorValue) {
      return {
        result: '∅',
        humanText: `Table "${table.name}" - Aucune sélection colonne`,
        details: { type: 'table', mode: 1, error: 'No column selection' }
      };
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🔥 ÉTAPE 2.5 : FILTRAGE DES LIGNES (si configuré)
    // ═══════════════════════════════════════════════════════════════════════
    let validRowIndices: number[] = Array.from({ length: rows.length }, (_, i) => i); // Tous les indices au départ
    
    if (colSourceOption?.filterColumn && colSourceOption?.filterOperator && colSourceOption?.filterValueRef) {
      console.log(`[TABLE] 🔥 ÉTAPE 2.5 - Filtrage détecté: colonne="${colSourceOption.filterColumn}", op="${colSourceOption.filterOperator}", ref="${colSourceOption.filterValueRef}"`);
      
      // 1️⃣ Récupérer la valeur de comparaison (celle à droite de l'opérateur)
      const filterRefResult = await interpretReference(
        colSourceOption.filterValueRef,
        submissionId,
        prisma,
        valuesCache,
        depth + 1,
        valueMap,
        labelMap
      );
      const filterComparisonValue = filterRefResult.result;
      console.log(`[TABLE] 🔥 ÉTAPE 2.5 - Valeur de comparaison: "${colSourceOption.filterValueRef}" → ${filterComparisonValue}`);
      
      // 2️⃣ Trouver l'index de la colonne à filtrer
      const normalizedFilterColName = String(colSourceOption.filterColumn).trim().toLowerCase();
      const filterColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFilterColName);
      const filterColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFilterColName);
      
      let filterColIndex = -1;
      if (filterColInCols !== -1) filterColIndex = filterColInCols;
      else if (filterColInRows !== -1) filterColIndex = filterColInRows;
      
      if (filterColIndex !== -1) {
        // 3️⃣ Filtrer les lignes basées sur l'opérateur
        const dataColIndexForFilter = filterColIndex - 1;
        validRowIndices = validRowIndices.filter((rowIdx) => {
          // Récupérer la valeur de la cellule à filtrer
          const cellValue = filterColIndex === 0 ? rows[rowIdx] : data[rowIdx]?.[dataColIndexForFilter];
          
          // Appliquer l'opérateur de comparaison
          const matches = compareValuesByOperator(colSourceOption.filterOperator, cellValue, filterComparisonValue);
          
          if (matches) {
            console.log(`[TABLE] ✅ ÉTAPE 2.5 - Ligne ${rowIdx} ("${rows[rowIdx]}"): ${cellValue} ${colSourceOption.filterOperator} ${filterComparisonValue} = TRUE`);
          } else {
            console.log(`[TABLE] ❌ ÉTAPE 2.5 - Ligne ${rowIdx} ("${rows[rowIdx]}"): ${cellValue} ${colSourceOption.filterOperator} ${filterComparisonValue} = FALSE (EXCLUE)`);
          }
          
          return matches;
        });
        
        console.log(`[TABLE] 🔥 ÉTAPE 2.5 - Résultat du filtrage: ${validRowIndices.length} lignes sur ${rows.length} conservées`);
      } else {
        console.warn(`[TABLE] ⚠️ ÉTAPE 2.5 - Colonne de filtrage non trouvée: "${colSourceOption.filterColumn}"`);
      }
    }
    
    // Faire le lookup avec colSelectorValue et CHAQUE displayColumn
    // columns, rows, data déjà reconstruits plus haut
    // validRowIndices contient les indices des lignes à traiter (filtrées ou toutes)
    
    const results: Array<{ row: string; value: any }> = [];
    
    // Mode extract: si lookup.extractValueRef est configuré, on cherche la première ligne
    // qui satisfait l'opérateur pour la colonne sélectionnée
    if (lookup.extractValueRef) {
      console.log(`[TABLE] 🔎 MODE 1 - extractValueRef détecté: ${lookup.extractValueRef}, op=${lookup.extractOperator}`);
      const refResult = await interpretReference(lookup.extractValueRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap);
      const targetValue = refResult.result;
      // Déterminer la colonne cible (colIndex) à partir du colSelectorValue
      const normalizedColSelector = String(colSelectorValue || '').trim().toLowerCase();
      const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedColSelector);
      const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedColSelector);
      let finalColIndex = -1;
      if (colSelectorInCols !== -1) finalColIndex = colSelectorInCols; else finalColIndex = colSelectorInRows;
      if (finalColIndex === -1) {
        console.warn(`[TABLE] ⚠️ MODE 1 extract - colonne non trouvée pour selector ${colSelectorValue}`);
      } else {
        const dataColIndex = finalColIndex - 1;
        // Chercher la première ligne où data[row][dataColIndex] match l'opérateur
        // 🔥 ÉTAPE 2.5: Boucler SEULEMENT sur les indices filtrés
        let foundRowIndex = -1;
        for (const rIdx of validRowIndices) {
          // dataRowIndex = rIdx (rows includes headers)
          const potentialVal = data[rIdx]?.[dataColIndex];
          if (compareValuesByOperator(lookup.extractOperator, potentialVal, targetValue)) {
            foundRowIndex = rIdx;
            break;
          }
        }
        if (foundRowIndex !== -1) {
          // Construire results à partir de displayColumns pour la ligne trouvée
          for (const fixedRowValue of displayColumns) {
            const normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
            const fixedRowInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedRow);
            const fixedRowInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedRow);
            let rowIndex = -1;
            if (fixedRowInRows !== -1) rowIndex = fixedRowInRows;
            else if (fixedRowInCols !== -1) rowIndex = fixedRowInCols; // fallback
            if (rowIndex !== -1) {
              const dataRowIndex = rowIndex;
              const dataColIndexForDisplay = finalColIndex - 1;
              const result = data[dataRowIndex]?.[dataColIndexForDisplay];
              results.push({ row: fixedRowValue, value: result });
              console.log(`[TABLE] ✅ MODE 1 - extract result ${fixedRowValue}: ${result}`);
            }
          }
          const resultText = results.map(r => `${r.row}=${r.value}`).join(', ');
          const resultValues = results.map(r => r.value);
          const humanText = `Table "${table.name}"[extract ${lookup.extractValueRef} ${lookup.extractOperator} -> row=${rows[foundRowIndex]}] = ${resultText}`;
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
                multiple: results.length > 1,
                extract: { ref: lookup.extractValueRef, operator: lookup.extractOperator, target: targetValue }
              }
            }
          };
        }
      }
    }

    // 🔥 NOUVEAU: Pour Option 2 (CHAMP) et Option 3 (CAPACITÉ) avec opérateur, chercher la ligne qui match l'opérateur
    let targetColIndex = -1;
    if ((colSourceOption?.type === 'field' || colSourceOption?.type === 'capacity') && colSourceOption?.operator && colSourceOption?.comparisonColumn) {
      console.log(`[TABLE] 🔥 MODE 1 - Option ${colSourceOption.type === 'field' ? '2' : '3'} avec opérateur: ${colSourceOption.operator} sur colonne "${colSourceOption.comparisonColumn}"`);
      
      // Utiliser directement comparisonColumn au lieu de deviner
      const comparisonColName = colSourceOption.comparisonColumn;
      const normalizedComparisonCol = String(comparisonColName).trim().toLowerCase();
      const colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedComparisonCol);
      const colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedComparisonCol);
      
      let colSelectorIndex = -1;
      if (colSelectorInCols !== -1) colSelectorIndex = colSelectorInCols;
      else if (colSelectorInRows !== -1) colSelectorIndex = colSelectorInRows;
      
      if (colSelectorIndex !== -1) {
        // 🔥 FIX: Si colSelectorIndex = 0 (première colonne), les valeurs sont dans rows[], pas data[]
        const dataColIndex = colSelectorIndex - 1;
        let foundRowIndex = -1;
        // 🔥 ÉTAPE 2.5: Boucler SEULEMENT sur les indices filtrés
        for (const rIdx of validRowIndices) {
          // Si on compare la première colonne (index 0), prendre la valeur depuis rows[]
          const cellValue = colSelectorIndex === 0 ? rows[rIdx] : data[rIdx]?.[dataColIndex];
          if (compareValuesByOperator(colSourceOption.operator, cellValue, colSelectorValue)) {
            foundRowIndex = rIdx;
            console.log(`[TABLE] ✅ MODE 1 Option ${colSourceOption.type === 'field' ? '2' : '3'} - Trouvé à ligne ${rIdx}: ${cellValue} ${colSourceOption.operator} ${colSelectorValue}`);
            break;
          }
        }
        
        if (foundRowIndex !== -1) {
          // On a trouvé la ligne avec l'opérateur, récupérer la valeur depuis cette ligne pour chaque colonne à afficher
          for (const fixedColValue of displayColumns) {
            const normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
            const fixedColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedCol);
            const fixedColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedCol);
            let colIndexForDisplay = -1;
            if (fixedColInCols !== -1) colIndexForDisplay = fixedColInCols;
            else if (fixedColInRows !== -1) colIndexForDisplay = fixedColInRows;
            
            if (colIndexForDisplay !== -1) {
              // Utiliser foundRowIndex (la ligne trouvée par l'opérateur) et colIndexForDisplay
              const dataColIndexForDisplay = colIndexForDisplay - 1;
              const result = data[foundRowIndex]?.[dataColIndexForDisplay];
              results.push({ row: fixedColValue, value: result });
              console.log(`[TABLE] ✅ MODE 1 Option ${colSourceOption.type === 'field' ? '2' : '3'} - Résultat ${fixedColValue}: ${result} (à partir de ligne trouvée ${foundRowIndex})`);
            }
          }
          targetColIndex = colSelectorIndex; // Marquer qu'on a traité avec l'opérateur
        }
      } else {
        console.warn(`[TABLE] ⚠️ MODE 1 - Colonne de comparaison non trouvée: ${comparisonColName}`);
      }
    }

    // Boucle sur CHAQUE ligne à afficher (UNIQUEMENT si Option 2 n'a pas trouvé de match)
    if (targetColIndex === -1) {
      // 🔥 NOUVEAU: Pour les options CHAMP / CAPACITÉ sans opérateur, lire la valeur numérique et trouver la ligne la plus proche (priorité au supérieur)
      const hasOperatorConfig = Boolean(colSourceOption?.operator && colSourceOption?.comparisonColumn);
      const isNumericSourceWithoutOperator = (colSourceOption?.type === 'capacity' || colSourceOption?.type === 'field') && !hasOperatorConfig;
      if (isNumericSourceWithoutOperator) {
        const optionLabel = colSourceOption?.type === 'field' ? 'Option 2' : 'Option 3';
        console.log(`[TABLE] 🔥 MODE 1 ${optionLabel} SANS opérateur - Recherche intelligente de ligne pour ${colSelectorValue}`);

        const match = findClosestIndexInLabels(colSelectorValue, rows, validRowIndices);
        if (match) {
          const foundRowIndex = match.index;
          console.log(`[TABLE] ✅ MODE 1 ${optionLabel} - Ligne trouvée ${foundRowIndex} (${rows[foundRowIndex]}) via ${match.matchType}`);

          for (const fixedColValue of displayColumns) {
            const normalizedFixedCol = normalizeLookupValue(fixedColValue);
            const fixedColInCols = columns.findIndex(c => normalizeLookupValue(c) === normalizedFixedCol);
            const fixedColInRows = rows.findIndex(r => normalizeLookupValue(r) === normalizedFixedCol);
            let colIndexForDisplay = -1;
            if (fixedColInCols !== -1) colIndexForDisplay = fixedColInCols;
            else if (fixedColInRows !== -1) colIndexForDisplay = fixedColInRows;

            if (colIndexForDisplay !== -1) {
              const dataColIndexForDisplay = colIndexForDisplay - 1;
              const result = data[foundRowIndex]?.[dataColIndexForDisplay];
              results.push({ row: fixedColValue, value: result });
              console.log(`[TABLE] ✅ MODE 1 ${optionLabel} - Résultat ${fixedColValue}: ${result} (ligne ${foundRowIndex})`);
            }
          }
          targetColIndex = 0;
        } else {
          console.warn(`[TABLE] ⚠️ MODE 1 ${optionLabel} - Impossible de trouver une ligne pour ${colSelectorValue}`);
        }
      }
      
      // Cas standard: Option 1/2 où colSelectorValue est un nom de colonne
      if (targetColIndex === -1) {
        for (const fixedRowValue of displayColumns) {
          // Normalisation pour matching robuste
          // 🔧 FIX: Enlever le suffixe (-1, -2, etc.) pour les champs copiés dans les repeaters
          const colSelectorWithoutSuffix = String(colSelectorValue).replace(/-\d+$/, '');
          const normalizedColSelector = colSelectorWithoutSuffix.trim().toLowerCase();
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
            const dataRowIndex = rowIndex;
            const dataColIndex = colIndex - 1;
            const result = data[dataRowIndex]?.[dataColIndex];
            
            results.push({ row: fixedRowValue, value: result });
            console.log(`[TABLE] ✅ MODE 1 - ${fixedRowValue}: ${result}`);
          }
        }
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
  else if (rowEnabled && !colEnabled && hasRowSelector && lookup.displayRow) {
    console.log(`[TABLE] 🎯 MODE 2 détecté: displayRow fixe × LIGNE`);
    
    // 🔥 NOUVEAU: Support des 3 options de source (SELECT/CHAMP/CAPACITÉ)
    const rowSelectorValue = await getSourceValue(
      rowSourceOption,
      lookup,
      rowFieldId,
      submissionId,
      prisma,
      valuesCache,
      depth,
      valueMap,
      labelMap
    );
    const rowLabel = await getSourceLabel(rowSourceOption, lookup, rowFieldId, prisma, labelMap);
    
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
    // columns, rows, data déjà reconstruits plus haut
    
    const results: Array<{ column: string; value: any }> = [];
    
    // Mode extract : si lookup.extractValueRef est configuré, chercher la première colonne qui match dans la ligne choisie
    if (lookup.extractValueRef) {
      console.log(`[TABLE] 🔎 MODE 2 - extractValueRef detected: ${lookup.extractValueRef}, op=${lookup.extractOperator}`);
      const refResult = await interpretReference(lookup.extractValueRef, submissionId, prisma, valuesCache, depth + 1, valueMap, labelMap);
      const targetValue = refResult.result;
      // Determining row index from rowSelectorValue
      const normalizedRowSelector = String(rowSelectorValue || '').trim().toLowerCase();
      const rowSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedRowSelector);
      const rowSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedRowSelector);
      let finalRowIndex = -1;
      if (rowSelectorInRows !== -1) finalRowIndex = rowSelectorInRows; else finalRowIndex = rowSelectorInCols;
      if (finalRowIndex === -1) {
        console.warn(`[TABLE] ⚠️ MODE 2 extract - ligne non trouvée pour selector ${rowSelectorValue}`);
      } else {
        const dataRowIndex = finalRowIndex;
        // iterate across columns
        let foundColIndex = -1;
        for (let cIdx = 0; cIdx < columns.length; cIdx++) {
          const valueAt = data[dataRowIndex]?.[cIdx - 1];
          if (compareValuesByOperator(lookup.extractOperator, valueAt, targetValue)) {
            foundColIndex = cIdx;
            break;
          }
        }
        if (foundColIndex !== -1) {
          // now build results: for each fixedColValue, get value from data[dataRowIndex][foundColIndex-1]
          for (const fixedColValue of displayRows) {
            const normalizedFixedCol = String(fixedColValue).trim().toLowerCase();
            const fixedColInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedCol);
            const fixedColInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedCol);
            let colIndex = -1;
            if (fixedColInCols !== -1) colIndex = fixedColInCols;
            else if (fixedColInRows !== -1) colIndex = fixedColInRows; // fallback if reversed
            if (colIndex !== -1) {
              const dataColIndex = colIndex - 1;
              const result = data[dataRowIndex]?.[dataColIndex];
              results.push({ column: fixedColValue, value: result });
              console.log(`[TABLE] ✅ MODE 2 - extract result ${fixedColValue}: ${result}`);
            }
          }
          const resultText = results.map(r => `${r.column}=${r.value}`).join(', ');
          const resultValues = results.map(r => r.value);
          const humanText = `Table "${table.name}"[extract ${lookup.extractValueRef} ${lookup.extractOperator} -> col=${columns[foundColIndex]}] = ${resultText}`;
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
                multiple: results.length > 1,
                extract: { ref: lookup.extractValueRef, operator: lookup.extractOperator, target: targetValue }
              }
            }
          };
        }
      }
    }

    // 🔥 NOUVEAU: Pour Option 2 (CHAMP) et Option 3 (CAPACITÉ) avec opérateur, chercher la colonne qui match l'opérateur
    let targetRowIndex = -1;
    if ((rowSourceOption?.type === 'field' || rowSourceOption?.type === 'capacity') && rowSourceOption?.operator && rowSourceOption?.comparisonColumn) {
      console.log(`[TABLE] 🔥 MODE 2 - Option ${rowSourceOption.type === 'field' ? '2' : '3'} avec opérateur: ${rowSourceOption.operator} sur ligne "${rowSourceOption.comparisonColumn}"`);
      
      // Utiliser directement comparisonColumn au lieu de deviner
      const comparisonRowName = rowSourceOption.comparisonColumn;
      const normalizedComparisonRow = String(comparisonRowName).trim().toLowerCase();
      const rowSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedComparisonRow);
      const rowSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedComparisonRow);
      
      let rowSelectorIndex = -1;
      if (rowSelectorInRows !== -1) rowSelectorIndex = rowSelectorInRows;
      else if (rowSelectorInCols !== -1) rowSelectorIndex = rowSelectorInCols;
      
      if (rowSelectorIndex !== -1) {
        // 🔥 FIX: Si rowSelectorIndex = 0 (première ligne), les valeurs sont dans rows[], pas data[]
        // Pour data[], on doit mapper l'index correctement
        let foundColIndex = -1;
        for (let cIdx = 0; cIdx < columns.length; cIdx++) {
          // Si on compare la première ligne (index 0), prendre la valeur depuis columns[], pas data[]
          const cellValue = rowSelectorIndex === 0 ? columns[cIdx] : data[rowSelectorIndex - 1]?.[cIdx - 1];
          if (compareValuesByOperator(rowSourceOption.operator, cellValue, rowSelectorValue)) {
            foundColIndex = cIdx;
            console.log(`[TABLE] ✅ MODE 2 Option ${rowSourceOption.type === 'field' ? '2' : '3'} - Trouvé à colonne ${cIdx}: ${cellValue} ${rowSourceOption.operator} ${rowSelectorValue}`);
            break;
          }
        }
        
        if (foundColIndex !== -1) {
          // On a trouvé la colonne avec l'opérateur, récupérer la valeur depuis chaque ligne pour cette colonne
          const dataColIndexForFound = foundColIndex - 1;
          for (const fixedRowValue of displayRows) {
            const normalizedFixedRow = String(fixedRowValue).trim().toLowerCase();
            const fixedRowInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedFixedRow);
            const fixedRowInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedFixedRow);
            let rowIndexForDisplay = -1;
            if (fixedRowInRows !== -1) rowIndexForDisplay = fixedRowInRows;
            else if (fixedRowInCols !== -1) rowIndexForDisplay = fixedRowInCols;
            
            if (rowIndexForDisplay !== -1) {
              // Utiliser rowIndexForDisplay (la ligne à afficher) et la colonne trouvée par l'opérateur
              // 🔥 FIX: Gérer le cas où rowIndexForDisplay === 0
              const result = rowIndexForDisplay === 0 ? columns[foundColIndex] : data[rowIndexForDisplay - 1]?.[dataColIndexForFound];
              results.push({ column: fixedRowValue, value: result });
              console.log(`[TABLE] ✅ MODE 2 Option ${rowSourceOption.type === 'field' ? '2' : '3'} - Résultat ${fixedRowValue}: ${result} (depuis colonne trouvée ${foundColIndex})`);
            }
          }
          targetRowIndex = rowSelectorIndex; // Marquer qu'on a traité avec l'opérateur
        }
      } else {
        console.warn(`[TABLE] ⚠️ MODE 2 - Ligne de comparaison non trouvée: ${comparisonRowName}`);
      }
    }

    // Boucle sur CHAQUE colonne à afficher (UNIQUEMENT si Option 2 n'a pas trouvé de match)
    if (targetRowIndex === -1) {
      const hasRowOperatorConfig = Boolean(rowSourceOption?.operator && rowSourceOption?.comparisonColumn);
      const isRowNumericSource = (rowSourceOption?.type === 'field' || rowSourceOption?.type === 'capacity') && !hasRowOperatorConfig;

      if (isRowNumericSource) {
        const optionLabel = rowSourceOption?.type === 'field' ? 'Option 2' : 'Option 3';
        console.log(`[TABLE] 🔥 MODE 2 ${optionLabel} SANS opérateur - Recherche intelligente de colonne pour ${rowSelectorValue}`);

        const match = findClosestIndexInLabels(rowSelectorValue, rows);
        if (match) {
          const foundRowIndex = match.index;
          console.log(`[TABLE] ✅ MODE 2 ${optionLabel} - Ligne trouvée ${foundRowIndex} (${rows[foundRowIndex]}) via ${match.matchType}`);

          for (const fixedColValue of displayRows) {
            const normalizedFixedCol = normalizeLookupValue(fixedColValue);
            const fixedColInCols = columns.findIndex(c => normalizeLookupValue(c) === normalizedFixedCol);
            const fixedColInRows = rows.findIndex(r => normalizeLookupValue(r) === normalizedFixedCol);
            let colIndexForDisplay = -1;
            if (fixedColInCols !== -1) colIndexForDisplay = fixedColInCols;
            else if (fixedColInRows !== -1) colIndexForDisplay = fixedColInRows;

            if (colIndexForDisplay !== -1) {
              const dataColIndexForDisplay = colIndexForDisplay - 1;
              const result = data[foundRowIndex]?.[dataColIndexForDisplay];
              results.push({ column: fixedColValue, value: result });
              console.log(`[TABLE] ✅ MODE 2 ${optionLabel} - Résultat ${fixedColValue}: ${result} (ligne ${foundRowIndex})`);
            }
          }

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
        } else {
          console.warn(`[TABLE] ⚠️ MODE 2 ${optionLabel} - Impossible de trouver une ligne pour ${rowSelectorValue}`);
        }
      }

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
          const dataRowIndex = rowIndex;
          const dataColIndex = colIndex - 1;
          const result = data[dataRowIndex]?.[dataColIndex];
          
          results.push({ column: fixedColValue, value: result });
          console.log(`[TABLE] ✅ MODE 2 - ${fixedColValue}: ${result}`);
        }
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
  // 🔥 NOUVEAU: Support des 3 options de source (SELECT/CHAMP/CAPACITÉ)
  // ═══════════════════════════════════════════════════════════════════════
  let rowSelectorValue = await getSourceValue(
    rowSourceOption,
    lookup,
    rowFieldId,
    submissionId,
    prisma,
    valuesCache,
    depth,
    valueMap,
    labelMap
  );
  let colSelectorValue = await getSourceValue(
    colSourceOption,
    lookup,
    colFieldId,
    submissionId,
    prisma,
    valuesCache,
    depth,
    valueMap,
    labelMap
  );
  const rowLabel = await getSourceLabel(rowSourceOption, lookup, rowFieldId, prisma, labelMap);
  const colLabel = await getSourceLabel(colSourceOption, lookup, colFieldId, prisma, labelMap);
  const rowSourceType = rowSourceOption?.type || (rowFieldId ? 'select' : undefined);
  const colSourceType = colSourceOption?.type || (colFieldId ? 'select' : undefined);
  
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
  // columns, rows, data déjà reconstruits plus haut
  
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
  let rowSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedRowSelector);
  let rowSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedRowSelector);
  
  // 🔍 Chercher colSelectorValue dans rows ET columns
  let colSelectorInRows = rows.findIndex(r => String(r).trim().toLowerCase() === normalizedColSelector);
  let colSelectorInCols = columns.findIndex(c => String(c).trim().toLowerCase() === normalizedColSelector);

  if (rowSelectorInRows === -1 && rowSelectorInCols === -1 && (rowSourceType === 'field' || rowSourceType === 'capacity')) {
    const rowMatch = findClosestIndexInLabels(rowSelectorValue, rows);
    if (rowMatch) {
      rowSelectorInRows = rowMatch.index;
      rowSelectorValue = String(rows[rowMatch.index]);
    } else {
      const columnIndices = columns.map((_, idx) => idx).filter(idx => idx > 0);
      const colMatch = findClosestIndexInLabels(rowSelectorValue, columns, columnIndices);
      if (colMatch) {
        rowSelectorInCols = colMatch.index;
        rowSelectorValue = String(columns[colMatch.index]);
      }
    }
  }

  if (colSelectorInCols === -1 && colSelectorInRows === -1 && (colSourceType === 'field' || colSourceType === 'capacity')) {
    const columnIndices = columns.map((_, idx) => idx).filter(idx => idx > 0);
    const colMatch = findClosestIndexInLabels(colSelectorValue, columns, columnIndices);
    if (colMatch) {
      colSelectorInCols = colMatch.index;
      colSelectorValue = String(columns[colMatch.index]);
    } else {
      const rowMatch = findClosestIndexInLabels(colSelectorValue, rows);
      if (rowMatch) {
        colSelectorInRows = rowMatch.index;
        colSelectorValue = String(rows[rowMatch.index]);
      }
    }
  }
  
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
  // IMPORTANT : rows[] a été construit en SKIPPANT rowIndex=0 (header) → pas de décalage
  // MAIS columns[] contient TOUTES les colonnes y compris columns[0]="Orientation" (label)
  // alors que data[][] a été construit avec cellsData.slice(1) → décalage de -1 sur les colonnes
  // Exemple : "25" trouvé à columns[4] → data[x][3] car data ne contient pas la colonne de labels
  const dataRowIndex = finalRowIndex;
  const dataColIndex = finalColIndex - 1;
  
  console.log(`[TABLE] 📍 Index dans data[][]: [${dataRowIndex}][${dataColIndex}] (finalRow=${finalRowIndex}, finalCol=${finalColIndex})`);
  
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
  
  // ⚠️ FALLBACK: Si l'UUID nu n'est pas un champ valide, vérifier si c'est une table
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: fieldId },
    select: { type: true, label: true }
  });
  
  console.log(`[CHAMP] 🔍 Nœud trouvé: ${node ? `type=${node.type}, label=${node.label}` : 'INTROUVABLE'}`);
  
  // Si c'est une table (identifiée comme table en base), rediriger vers interpretTable
  if (node && node.type) {
    if (node.type.startsWith('leaf_table_')) {
      console.log(`[CHAMP] ✅ REDIRECTION - Le nœud est une TABLE (type: ${node.type})`);
      return await interpretTable(fieldId, submissionId, prisma, new Map(), 0, valueMap, labelMap);
    }
    
    // Vérifier aussi les autres prefixes de table
    if (node.type.includes('table')) {
      console.log(`[CHAMP] ✅ REDIRECTION - Le nœud contient 'table' dans son type (type: ${node.type})`);
      return await interpretTable(fieldId, submissionId, prisma, new Map(), 0, valueMap, labelMap);
    }
  }
  
  // Récupérer la valeur et le label (priorité valueMap pour mode preview)
  const value = await getNodeValue(fieldId, submissionId, prisma, valueMap);
  const label = await getNodeLabel(fieldId, prisma, labelMap);
  
  // 📌 NOUVEAU: value ne peut jamais être null/undefined car getNodeValue retourne "0" par défaut
  console.log(`[CHAMP] 📊 ${label} = ${value}`);
  
  const humanText = `${label}(${value})`;
  
  return {
    result: value || '0',
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
  
  // CAS 2b : 🆕 Source formule directe (sourceType === 'formula')
  if (variable.sourceType === 'formula' && variable.sourceRef) {
    console.log(`🧮 Source FORMULA directe, interprétation de: ${variable.sourceRef}`);
    
    // 🔄 INTERPRÉTATION DE LA FORMULE
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
    console.log(`✅ RÉSULTAT FORMULE:`);
    console.log(`   Value: ${result.result}`);
    console.log(`   HumanText: ${result.humanText}`);
    console.log(`${'─'.repeat(80)}\n`);
    
    return {
      value: result.result,
      operationDetail: result.details,
      operationResult: result.humanText,
      operationSource: 'formula',
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
