/**
 * 🔧 Système de copie des variables avec leurs capacités
 * 
 * Ce module gère la copie complète des variables (TreeBranchLeafNodeVariable)
 * et de leurs capacités associées (formules, conditions, tables).
 * 
 * PRINCIPES :
 * -----------
 * 1. Une variable peut avoir une "capacité" définie par sourceType + sourceRef
 * 2. Les formats de sourceRef sont :
 *    - "node-formula:ID" → Formule
 *    - "condition:ID" ou "node-condition:ID" → Condition
 *    - "@table.ID" ou "node-table:ID" → Table
 *    - UUID simple → Champ (field)
 * 3. Lors de la copie, on applique un suffixe sur TOUS les IDs
 * 4. Les références sont mises à jour pour pointer vers les capacités copiées
 * 5. Les colonnes linked... sont synchronisées dans les deux sens
 * 
 * ⚠️ PIÈGE CRITIQUE (Déjà cassé par le passé):
 * ------------------------------------------------
 * La variable newSourceRef DOIT être MUTABLE (let) car elle est réassignée
 * dans plusieurs branches (condition/table/field) lors de la copie.
 * Si on la repasse en const, la création plantera au runtime (reassignation d'un const)
 * et la variable ne sera PAS créée. Ne pas modifier "let newSourceRef" en const.
 * 
 * @author System TBL
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 IMPORTS DES MODULES DE COPIE DE CAPACITÉS
// ═══════════════════════════════════════════════════════════════════════════
import { copyFormulaCapacity } from './copy-capacity-formula.js';
import { copyConditionCapacity } from './copy-capacity-condition.js';
import { copyTableCapacity } from './copy-capacity-table.js';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Résultat d'un parsing de sourceRef
 */
export interface ParsedSourceRef {
  /** Type de référence : 'formula', 'condition', 'table', 'field' */
  type: 'formula' | 'condition' | 'table' | 'field';
  /** ID extrait (sans préfixe) */
  id: string;
  /** Préfixe original pour reconstruction */
  prefix: string;
}

/**
 * Résultat de la copie d'une variable
 */
export interface CopyVariableResult {
  /** ID de la variable copiée */
  variableId: string;
  /** Nouvelle exposedKey */
  exposedKey: string;
  /** Type de capacité copiée (null si fixe) */
  capacityType: 'formula' | 'condition' | 'table' | 'field' | null;
  /** Nouveau sourceRef */
  sourceRef: string | null;
  /** Succès de l'opération */
  success: boolean;
  /** Message d'erreur éventuel */
  error?: string;
  /** ID du nœud d'affichage créé (si applicable) */
  displayNodeId?: string;
}

/**
 * Options pour la copie de variable
 */
export interface CopyVariableOptions {
  /** Maps des IDs de formules copiées (ancien ID → nouveau ID) */
  formulaIdMap?: Map<string, string>;
  /** Maps des IDs de conditions copiées (ancien ID → nouveau ID) */
  conditionIdMap?: Map<string, string>;
  /** Maps des IDs de tables copiées (ancien ID → nouveau ID) */
  tableIdMap?: Map<string, string>;
  /** Map globale des nœuds copiés (ancien ID → nouveau ID) */
  nodeIdMap?: Map<string, string>;
  /** Cache des variables déjà copiées pour éviter doublons */
  variableCopyCache?: Map<string, string>;
  /** Créer automatiquement un nœud d'affichage dans "Nouveau Section" */
  autoCreateDisplayNode?: boolean;
  /** Libellé de la section cible pour l'affichage (par défaut: "Nouveau Section") */
  displaySectionLabel?: string;
  /** Lier la variable copiée à la section d'affichage (sans créer de nœud/variable) */
  linkToDisplaySection?: boolean;
  /** Est-ce que le nœud d'affichage est déjà créé par deepCopyNodeInternal ? */
  displayNodeAlreadyCreated?: boolean;
  /** Parent ID du nœud d'affichage (utilisé par deep-copy-service) */
  displayParentId?: string | null;
  /** Flag indiquant que la copie provient d'une duplication par repeater */
  isFromRepeaterDuplication?: boolean;
  /** Contexte répéteur si applicable (pour journalisation) */
  repeatContext?: any;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES DE PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse un sourceRef pour extraire le type et l'ID
 * 
 * @param sourceRef - Référence à parser
 * @returns Objet avec type, id et prefix
 * 
 * @example
 * parseSourceRef("node-formula:abc123") 
 * → { type: 'formula', id: 'abc123', prefix: 'node-formula:' }
 * 
 * parseSourceRef("condition:def456")
 * → { type: 'condition', id: 'def456', prefix: 'condition:' }
 * 
 * parseSourceRef("@table.ghi789")
 * → { type: 'table', id: 'ghi789', prefix: '@table.' }
 * 
 * parseSourceRef("702d1b09-abc9-4096-9aaa-77155ac5294f")
 * → { type: 'field', id: '702d1b09...', prefix: '' }
 */
export function parseSourceRef(sourceRef: string | null | undefined): ParsedSourceRef | null {
  if (!sourceRef || typeof sourceRef !== 'string') return null;

  const cleaned = sourceRef.trim();
  if (!cleaned) return null;

  // 🧮 Formule
  if (cleaned.startsWith('node-formula:')) {
    return {
      type: 'formula',
      id: cleaned.replace('node-formula:', ''),
      prefix: 'node-formula:'
    };
  }

  // 🔀 Condition
  if (cleaned.startsWith('condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('condition:', ''),
      prefix: 'condition:'
    };
  }

  if (cleaned.startsWith('node-condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('node-condition:', ''),
      prefix: 'node-condition:'
    };
  }

  // 📊 Table
  if (cleaned.startsWith('@table.')) {
    return {
      type: 'table',
      id: cleaned.replace('@table.', ''),
      prefix: '@table.'
    };
  }

  if (cleaned.startsWith('node-table:')) {
    return {
      type: 'table',
      id: cleaned.replace('node-table:', ''),
      prefix: 'node-table:'
    };
  }

  // � Valeur calculée (calculatedValue d'un autre champ)
  if (cleaned.startsWith('@calculated.')) {
    return {
      type: 'calculated',
      id: cleaned.replace('@calculated.', ''),
      prefix: '@calculated.'
    };
  }

  // �📝 Champ (UUID ou node_xxx)
  return {
    type: 'field',
    id: cleaned,
    prefix: ''
  };
}

/**
 * Applique un suffixe à un sourceRef
 * 
 * @param sourceRef - Référence originale
 * @param suffix - Suffixe numérique à appliquer
 * @returns sourceRef avec suffixe appliqué
 * 
 * @example
 * applySuffixToSourceRef("node-formula:abc123", 1)
 * → "node-formula:abc123-1"
 * 
 * applySuffixToSourceRef("@table.def456", 2)
 * → "@table.def456-2"
 */
export function applySuffixToSourceRef(
  sourceRef: string | null | undefined,
  suffix: number
): string | null {
  if (!sourceRef) return null;

  const parsed = parseSourceRef(sourceRef);
  if (!parsed) return sourceRef;

  // Appliquer le suffixe à l'ID
  const newId = `${parsed.id}-${suffix}`;
  return `${parsed.prefix}${newId}`;
}

/**
 * Extrait le nodeId depuis un sourceRef
 * Utile pour mettre à jour les colonnes linked... bidirectionnellement
 * 
 * @param sourceRef - Référence
 * @returns nodeId extrait ou null
 */
export function extractNodeIdFromSourceRef(
  sourceRef: string | null | undefined
): string | null {
  const parsed = parseSourceRef(sourceRef);
  return parsed ? parsed.id : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔄 FONCTION PRINCIPALE DE COPIE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Copie une variable avec sa capacité associée
 * 
 * PROCESSUS :
 * -----------
 * 1. Récupère la variable originale
 * 2. Vérifie si déjà copiée (cache)
 * 3. Génère les nouveaux IDs avec suffixe
 * 4. Parse le sourceRef pour identifier la capacité
 * 5. Mappe vers la capacité copiée (si disponible dans les maps)
 * 6. Crée la nouvelle variable
 * 7. Met à jour linkedVariableIds du nœud propriétaire
 * 8. Met à jour linkedXxxIds de la capacité (bidirectionnel)
 * 
 * @param originalVarId - ID de la variable à copier
 * @param suffix - Suffixe numérique à appliquer
 * @param newNodeId - ID du nouveau nœud propriétaire
 * @param prisma - Instance Prisma Client
 * @param options - Options avec les maps de références
 * @returns Résultat de la copie
 */
export async function copyVariableWithCapacities(
  originalVarId: string,
  suffix: string | number,
  newNodeId: string,
  prisma: PrismaClient,
  options: CopyVariableOptions = {}
): Promise<CopyVariableResult> {
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[ENTRY] copyVariableWithCapacities called`);
  console.log(`[COPY] variable: ${originalVarId}`);
  console.log(`   Suffixe: ${suffix}`);
  console.log(`   Nouveau nœud: ${newNodeId}`);
  console.log(`   Options:`, {
    formulaIdMapSize: options.formulaIdMap?.size,
    conditionIdMapSize: options.conditionIdMap?.size,
    tableIdMapSize: options.tableIdMap?.size,
    nodeIdMapSize: options.nodeIdMap?.size,
    variableCopyCacheSize: options.variableCopyCache?.size,
    autoCreateDisplayNode: options.autoCreateDisplayNode
  });
  console.log(`${'='.repeat(80)}\n`);

  const {
    formulaIdMap = new Map(),
    conditionIdMap = new Map(),
    tableIdMap = new Map(),
    nodeIdMap = new Map(),
    variableCopyCache = new Map(),
    autoCreateDisplayNode = false,
    displaySectionLabel = 'Nouveau Section',
    linkToDisplaySection = false,
  // displayNodeAlreadyCreated is not used anymore in this function; keep options API stable without reassigning
  } = options;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 1 : Vérifier le cache
    // ═══════════════════════════════════════════════════════════════════════
    const cacheKey = `${originalVarId}|${newNodeId}`; // Scope le cache par nœud cible pour ne pas réutiliser une copie d'un autre nœud
    
    // Si trouvé en cache et autoCreateDisplayNode, on va réutiliser la variable du cache
    let cachedVariable: any = null;
    
    if (variableCopyCache.has(cacheKey)) {
      const cachedId = variableCopyCache.get(cacheKey)!;
      console.log(`♻️ Variable déjà copiée (cache): ${cacheKey} → ${cachedId}`);
      
      // Récupérer la variable en cache
      const cached = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: cachedId }
      });
      
      if (cached) {
        const parsed = parseSourceRef(cached.sourceRef);
        // ✅ IMPORTANT: Si autoCreateDisplayNode=true, on doit créer un display node même si la variable est en cache!
        // Cela permet à plusieurs templates de partager la même variable mais avoir chacun leur display node
        if (autoCreateDisplayNode) {
          console.log(`✅ [CACHE] Variable trouvée. Création du display node même si variable en cache...`);
          // STOCKER la variable du cache pour la réutiliser
          cachedVariable = cached;
          // Continuer le flow pour créer le display node!
          // Ne pas retourner ici
        } else {
          // Pas besoin de display node, retourner les infos de la variable
          return {
            variableId: cached.id,
            exposedKey: cached.exposedKey,
            capacityType: parsed?.type || null,
            sourceRef: cached.sourceRef,
            success: true
          };
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📥 ÉTAPE 2 : Récupérer la variable originale
    // ═══════════════════════════════════════════════════════════════════════
    const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: originalVarId }
    });

    if (!originalVar) {
      console.error(`❌ Variable introuvable: ${originalVarId}`);
      return {
        variableId: '',
        exposedKey: '',
        capacityType: null,
        sourceRef: null,
        success: false,
        error: `Variable introuvable: ${originalVarId}`
      };
    }

    console.log(`✅ Variable trouvée: ${originalVar.displayName}`);
    console.log(`   sourceType: ${originalVar.sourceType}`);
    console.log(`   sourceRef: ${originalVar.sourceRef || 'null'}`);
    console.log(`   📍 DEBUG: newVariable.displayName sera utilisé pour le label du nœud d'affichage`);

  // ═══════════════════════════════════════════════════════════════════════
  // 🆔 ÉTAPE 3 : Préparer les IDs cibles (peuvent être adaptés plus loin si collision)
  // ═══════════════════════════════════════════════════════════════════════
  const stripTrailingNumeric = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const trimmed = (raw as string).trim();
    // Remove all trailing -<number> sequences (eg: foo-1-1 -> foo)
    return trimmed.replace(/(?:-\d+)+\s*$/, '');
  };
  const appendSuffixOnce = (value: string | null | undefined) => {
    if (!value) return value ?? '';
    const base = stripTrailingNumeric(value);
    return `${base}-${suffix}`;
  };

  let newVarId = appendSuffixOnce(originalVarId);
  let newExposedKey = appendSuffixOnce(originalVar.exposedKey);

  console.log(`📝 Préparation des IDs:`);
  console.log(`   Variable (préliminaire): ${newVarId}`);
  console.log(`   ExposedKey (préliminaire): ${newExposedKey}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 4 : Analyser et COPIER la capacité si nécessaire
    // ═══════════════════════════════════════════════════════════════════════
    // ⚠️ IMPORTANT: On NE MODIFIE PAS le sourceRef ! Il reste identique à l'original
  // IMPORTANT: NE PAS convertir en const. Cette variable est réassignée plus bas.
  // Laisser "let" et ignorer les suggestions automatiques de "prefer-const".
  let newSourceRef = originalVar.sourceRef;
    let capacityType: 'formula' | 'condition' | 'table' | 'field' | null = null;

  console.log(`\n🔍 [COPY-VAR] Analyse sourceType="${originalVar.sourceType}" sourceRef="${originalVar.sourceRef}"`);
  // IMPORTANT: on traite TOUT sourceRef non vide (pas uniquement sourceType === 'tree').
  // Les conditions et tables peuvent avoir d'autres sourceType; on s'appuie sur parseSourceRef.
  if (originalVar.sourceRef) {
      const parsed = parseSourceRef(originalVar.sourceRef);
      
      if (parsed) {
        capacityType = parsed.type;
        console.log(`🔍 [COPY-VAR] Capacité détectée: ${capacityType} (ID: ${parsed.id})`);
        console.log(`📦 [COPY-VAR] Maps disponibles - formulas: ${formulaIdMap.size}, conditions: ${conditionIdMap.size}, tables: ${tableIdMap.size}, nodes: ${nodeIdMap.size}`);

        // ═══════════════════════════════════════════════════════════════════
        // 🧮 COPIE FORMULE
        // ═══════════════════════════════════════════════════════════════════
        if (capacityType === 'formula') {
          console.log(`🧮 [COPY-VAR] Traitement FORMULE: ${parsed.id}`);
          // Vérifier si la formule a déjà été copiée
          if (formulaIdMap.has(parsed.id)) {
            const mappedFormulaId = formulaIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedFormulaId}`;
            console.log(`✅ [COPY-VAR] Formule déjà mappée: ${parsed.id} → ${mappedFormulaId}`);
          } else {
            // ⭐ COPIER LA FORMULE MAINTENANT
            console.log(`\n🧮 [COPY-VAR] Lancement copie formule ${parsed.id}...`);
            try {
              const formulaResult = await copyFormulaCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaCopyCache: formulaIdMap }
              );

              if (formulaResult.success) {
                // Ajouter au map pour les prochaines copies
                formulaIdMap.set(parsed.id, formulaResult.newFormulaId);
                newSourceRef = `${parsed.prefix}${formulaResult.newFormulaId}`;
                console.log(`✅ [COPY-VAR] Formule copiée et mappée: ${parsed.id} → ${formulaResult.newFormulaId}`);
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, Number(suffix));
                console.log(`⚠️ [COPY-VAR] Échec copie formule (${formulaResult.error}), suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ [COPY-VAR] Exception copie formule:`, (e as Error).message, (e as Error).stack);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, Number(suffix));
            }
          }
        } 
        // ═══════════════════════════════════════════════════════════════════
        // 🔀 COPIE CONDITION
        // ═══════════════════════════════════════════════════════════════════
        else if (capacityType === 'condition') {
          if (conditionIdMap.has(parsed.id)) {
            const mappedConditionId = conditionIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedConditionId}`;
            console.log(`✅ Condition déjà mappée: ${parsed.id} → ${mappedConditionId}`);
          } else {
            // ⭐ COPIER LA CONDITION MAINTENANT
            console.log(`\n🔀 Copie de la condition ${parsed.id}...`);
            try {
              const conditionResult = await copyConditionCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionCopyCache: conditionIdMap }
              );

              if (conditionResult.success) {
                // Ajouter au map
                conditionIdMap.set(parsed.id, conditionResult.newConditionId);
                newSourceRef = `${parsed.prefix}${conditionResult.newConditionId}`;
                console.log(`✅ Condition copiée et mappée: ${parsed.id} → ${conditionResult.newConditionId}`);
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
                console.log(`⚠️ Échec copie condition, suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ Exception copie condition:`, (e as Error).message);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
            }
          }
        }
        // ═══════════════════════════════════════════════════════════════════
        // 📊 COPIE TABLE
        // ═══════════════════════════════════════════════════════════════════
        else if (capacityType === 'table') {
          if (tableIdMap.has(parsed.id)) {
            const mappedTableId = tableIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedTableId}`;
            console.log(`✅ Table déjà mappée: ${parsed.id} → ${mappedTableId}`);
          } else {
            // ⭐ COPIER LA TABLE MAINTENANT
            console.log(`\n📊 Copie de la table ${parsed.id}...`);
            try {
              const tableResult = await copyTableCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, tableCopyCache: tableIdMap, tableIdMap }
              );

              if (tableResult.success) {
                // Ajouter au map
                tableIdMap.set(parsed.id, tableResult.newTableId);
                newSourceRef = `${parsed.prefix}${tableResult.newTableId}`;
                console.log(`✅ Table copiée et mappée: ${parsed.id} → ${tableResult.newTableId}`);
                console.log(`   📋 ${tableResult.columnsCount} colonnes, ${tableResult.rowsCount} lignes, ${tableResult.cellsCount} cellules`);
              } else {
                newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
                console.log(`⚠️ Échec copie table, suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ Exception copie table:`, (e as Error).message);
              newSourceRef = applySuffixToSourceRef(originalVar.sourceRef, suffix);
            }
          }
        }
  // ═══════════════════════════════════════════════════════════════════
  // 📝 CHAMP (pas de copie, juste mapping)
  // ═══════════════════════════════════════════════════════════════════
        else if (capacityType === 'field') {
          // Mapper le nodeId du champ si disponible
          if (nodeIdMap.has(parsed.id)) {
            newSourceRef = nodeIdMap.get(parsed.id)!;
            console.log(`✅ Champ mappé: ${parsed.id} → ${newSourceRef}`);
          } else {
            newSourceRef = `${parsed.id}-${suffix}`;
            console.log(`⚠️ Champ non mappé, suffixe appliqué: ${newSourceRef}`);
          }
        }
      }
    }

    console.log(`📍 sourceRef final: ${newSourceRef}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 💾 ÉTAPE 5 : Créer la nouvelle variable
    // ═══════════════════════════════════════════════════════════════════════
    
    // 🔍 Déterminer le nodeId du nœud PROPRIÉTAIRE de la variable (nœud d'affichage)
    // 1) Si l'ancien nodeId de la variable a été copié (présent dans nodeIdMap), on utilise ce nouveau nodeId
    // 2) Sinon, si l'auto-création est activée, on crée un nœud d'affichage dédié et on l'utilise
    // 3) Sinon, fallback sur newNodeId (peut causer des collisions si plusieurs variables par nœud)
  let finalNodeId = newNodeId;
    if (originalVar.nodeId && nodeIdMap.has(originalVar.nodeId)) {
      finalNodeId = nodeIdMap.get(originalVar.nodeId)!;
      console.log(`📍 nodeId mappé: ${originalVar.nodeId} → ${finalNodeId}`);
    } else if (autoCreateDisplayNode) {
      console.log(`🔷 [DISPLAY_NODE_CREATE] ENTRANT dans création display node. originalVar.nodeId="${originalVar.nodeId}", autoCreateDisplayNode=${autoCreateDisplayNode}, cachedVariable=${cachedVariable ? 'YES' : 'NO'}`);
      // Créer un nœud d'affichage DÉDIÉ avec un ID unique dérivé de l'ancien nodeId + suffixe
      try {
        const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: originalVar.nodeId! },
          select: { 
            id: true, 
            parentId: true, 
            treeId: true, 
            order: true, 
            linkedTableIds: true, 
            hasTable: true, 
            table_name: true, 
            table_activeId: true, 
            table_instances: true,
            // 🔑 IMPORTANT: Récupérer subtab pour que la copie soit dans le bon sous-onglet
            subtab: true,
            subtabs: true,
            metadata: true,
          }
        });
        if (originalOwnerNode) {
          // ═══════════════════════════════════════════════════════════════════════════════════════
          // 🔑 RÈGLE: Déterminer le parent du display node
          // ═══════════════════════════════════════════════════════════════════════════════════════
          // 
          // CONTEXTE DE REPEATER (isFromRepeaterDuplication): 
          //   - Si c'est une variable LIÉE (originalVar.nodeId != newNodeId), le parent DOIT être newNodeId
          //   - Cela crée le display node comme enfant du nœud instance
          //
          // CONTEXTE NORMAL:
          //   - Le parent = le parent de l'original (même section)
          // 
          // ═══════════════════════════════════════════════════════════════════════════════════════
          
          // 🔍 Déterminer si c'est une variable LIÉE (dans repeatContext, la variable appartient à un autre nœud)
          const isLinkedVariable = options.isFromRepeaterDuplication && 
                                   originalVar.nodeId !== newNodeId;
          
          let displayParentId: string | null;
          if (isLinkedVariable) {
            // 🔗 Variable LIÉE: créer le display node COMME ENFANT du nœud instance (newNodeId)
            displayParentId = newNodeId;
            console.log(`📌 [LINKED_VAR] Display node pour variable liée sera enfant de: ${newNodeId}`);
          } else {
            // 📍 Variable DIRECTE: créer le display node dans la même section que l'original
            displayParentId = originalOwnerNode.parentId || null;
            console.log(`📌 [DIRECT_VAR] Display node pour variable directe sera dans même parent: ${displayParentId}`);
          }

          // Générer un ID unique pour le nœud d'affichage (ex: <oldVarNodeId>-<suffix>)
          // ⚠️ Important: si le nodeId original porte déjà un suffixe numérique, on le retire d'abord
          // afin d'éviter des IDs en double-suffixe (ex: foo-1-1 → foo-1).
          const baseDisplayNodeId = stripTrailingNumeric(originalVar.nodeId) || originalVar.nodeId;
          const displayNodeId = `${baseDisplayNodeId}-${suffix}`;
          finalNodeId = displayNodeId;

          const now = new Date();
          const displayNodeData = {
            id: displayNodeId,
            treeId: originalOwnerNode.treeId,
            parentId: displayParentId,
            type: 'leaf_field' as const,
            subType: null as any,
            label: originalVar.displayName || 'Donnée',
            description: null as string | null,
            value: null as string | null,
            order: (originalOwnerNode.order ?? 0) + 1,
            isRequired: false,
            isVisible: true,
            isActive: true,
            isMultiple: false as any,
            fieldConfig: null as any,
            conditionConfig: null as any,
            formulaConfig: null as any,
            tableConfig: null as any,
            apiConfig: null as any,
            linkConfig: null as any,
            defaultValue: null as any,
            calculatedValue: null as any,
            metadata: { fromVariableId: appendSuffixOnce(originalVar.id) } as any,
            // 🔑 IMPORTANT: Copier le subtab pour que la copie soit dans le bon sous-onglet
            subtab: originalOwnerNode.subtab,
            subtabs: originalOwnerNode.subtabs,
            createdAt: now,
            updatedAt: now,
            hasAPI: false,
            hasCondition: false,
            hasData: false,
            hasFormula: false,
            hasLink: false,
            hasMarkers: false,
            // 📊 TABLE: Copier les colonnes table du nœud original
            // ✅ IMPORTANT: Ajouter le suffixe aux IDs de table pour pointer aux tables copiées
            hasTable: originalOwnerNode.hasTable ?? false,
            table_name: originalOwnerNode.table_name,
            table_activeId: originalOwnerNode.table_activeId ? `${originalOwnerNode.table_activeId}-${suffix}` : null,
            table_instances: (() => {
              if (!originalOwnerNode.table_instances) {
                return originalOwnerNode.table_instances;
              }
              // 🔑 CRITIQUE: Gérer les deux cas - objet ou STRING JSON (Prisma retourne parfois string)
              let rawInstances: Record<string, unknown>;
              if (typeof originalOwnerNode.table_instances === 'object') {
                rawInstances = JSON.parse(JSON.stringify(originalOwnerNode.table_instances));
              } else if (typeof originalOwnerNode.table_instances === 'string') {
                // Si c'est une string JSON, parser d'abord
                try {
                  rawInstances = JSON.parse(originalOwnerNode.table_instances);
                } catch {
                  // Si parse échoue, retourner tel quel
                  return originalOwnerNode.table_instances;
                }
              } else {
                return originalOwnerNode.table_instances;
              }
              
              const updatedInstances: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(rawInstances)) {
                // ✅ FIX: Vérifier si la clé a DÉJÀ un suffixe numérique (-1, -2, etc.)
                // Ne pas utiliser includes('-') car UUIDs contiennent des tirets!
                const hasSuffixRegex = /-\d+$/;  // Suffixe numérique à la fin
                const newKey = hasSuffixRegex.test(key) ? key : `${key}-${suffix}`;
                
                // AUSSI ajouter le suffixe au tableId INTÉRIEUR si présent
                if (value && typeof value === 'object') {
                  const tableInstanceObj = value as Record<string, unknown>;
                  const updatedObj = { ...tableInstanceObj };
                  if (tableInstanceObj.tableId && typeof tableInstanceObj.tableId === 'string') {
                    // ✅ FIX: Même chose pour le tableId
                    updatedObj.tableId = hasSuffixRegex.test(tableInstanceObj.tableId)
                      ? tableInstanceObj.tableId 
                      : `${tableInstanceObj.tableId}-${suffix}`;
                  }
                  updatedInstances[newKey] = updatedObj;
                } else {
                  updatedInstances[newKey] = value;
                }
              }
              return updatedInstances;
            })() as any,
            linkedTableIds: Array.isArray(originalOwnerNode.linkedTableIds) 
              // ✅ AJOUTER LES SUFFIXES aux IDs de table ici aussi!
              ? originalOwnerNode.linkedTableIds.map(id => `${id}-${suffix}`)
              : [] as any,
            linkedConditionIds: [] as any,
            linkedFormulaIds: [] as any,
            linkedVariableIds: [] as any,
            appearance_size: 'md' as any,
            appearance_variant: null as any,
            appearance_width: '100%' as any,
            fieldType: 'TEXT' as any,
            fieldSubType: null as any,
            field_label: originalVar.displayName as any,
          };

          const maybeExisting = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
          if (maybeExisting) {
            await prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: { ...displayNodeData, createdAt: maybeExisting.createdAt, updatedAt: now } });
            console.log('[CREATE DISPLAY] Nœud d\'affichage existant mis à jour:', { id: displayNodeId, parentId: displayParentId, metadata: displayNodeData.metadata });
          } else {
            await prisma.treeBranchLeafNode.create({ data: displayNodeData as any });
            console.log('[CREATE DISPLAY] Nœud d\'affichage créé:', { id: displayNodeId, parentId: displayParentId, metadata: displayNodeData.metadata });
          }

          // ═══════════════════════════════════════════════════════════════════════
          // 📊 ÉTAPE CRITIQUE: COPIER LES TABLES LIÉES AU NŒUD ORIGINAL
          // ═══════════════════════════════════════════════════════════════════════
          // Si le nœud original a des tables (hasTable=true et linkedTableIds non vide),
          // on doit copier ces tables pour que la copie fonctionne correctement
          if (originalOwnerNode.hasTable && Array.isArray(originalOwnerNode.linkedTableIds) && originalOwnerNode.linkedTableIds.length > 0) {
            console.log(`\n📊 [COPY-TABLES] Nœud original a ${originalOwnerNode.linkedTableIds.length} tables à copier`);
            
            for (const originalTableId of originalOwnerNode.linkedTableIds) {
              const newTableId = `${originalTableId}-${suffix}`;
              
              // Vérifier si la table existe déjà
              const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({
                where: { id: newTableId }
              });
              
              if (existingTable) {
                console.log(`📊 [COPY-TABLES] Table ${newTableId} existe déjà, skip`);
                tableIdMap.set(originalTableId, newTableId);
                continue;
              }
              
              // Copier la table via copyTableCapacity
              try {
                const tableResult = await copyTableCapacity(
                  originalTableId,
                  displayNodeId,  // La nouvelle table appartient au display node copié
                  Number(suffix),
                  prisma,
                  { nodeIdMap, tableCopyCache: tableIdMap, tableIdMap }
                );
                
                if (tableResult.success) {
                  tableIdMap.set(originalTableId, tableResult.newTableId);
                  console.log(`✅ [COPY-TABLES] Table copiée: ${originalTableId} → ${tableResult.newTableId} (${tableResult.columnsCount} cols, ${tableResult.rowsCount} rows)`);
                } else {
                  console.warn(`⚠️ [COPY-TABLES] Échec copie table ${originalTableId}: ${tableResult.error}`);
                }
              } catch (e) {
                console.error(`❌ [COPY-TABLES] Exception copie table ${originalTableId}:`, (e as Error).message);
              }
            }
            
            // Mettre à jour hasTable sur le display node créé
            await prisma.treeBranchLeafNode.update({
              where: { id: displayNodeId },
              data: { hasTable: true }
            });
            console.log(`✅ [COPY-TABLES] hasTable mis à true sur ${displayNodeId}`);
          }
        } else {
          console.warn(`⚠️ Impossible de récupérer le nœud propriétaire original ${originalVar.nodeId}. Fallback newNodeId.`);
        }
      } catch (e) {
        console.warn(`⚠️ Erreur lors de la création du nœud d'affichage dédié:`, (e as Error).message);
      }
      console.log(`📍 nodeId utilisé (display auto): ${finalNodeId}`);
    } else {
      console.log(`📍 nodeId utilisé (fallback): ${finalNodeId}`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🛡️ ÉTAPE 5A : Éviter les collisions d'ID (conflits inter-templates)
    // ═══════════════════════════════════════════════════════════════════════
    // Cas rencontré: plusieurs templates peuvent référencer la même variable d'origine
    // et utiliser le même suffixe numérique (ex: 1), provoquant un conflit unique
    // sur id et/ou exposedKey. On sécurise en ajoutant un discriminant basé sur
    // le nœud d'affichage final si collision détectée.
    try {
      const existingById = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: newVarId } });
      if (existingById) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        const adjusted = `${originalVarId}-${suffix}-${tail}`;
        console.warn(`⚠️ Conflit sur id variable (${newVarId}), ajustement → ${adjusted}`);
        newVarId = adjusted;
      }
    } catch (e) {
      console.warn(`⚠️ Vérification collision id variable échouée:`, (e as Error).message);
    }

    try {
      const existingByKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: newExposedKey } });
      if (existingByKey) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        const adjustedKey = `${originalVar.exposedKey}-${suffix}-${tail}`;
        console.warn(`⚠️ Conflit sur exposedKey (${newExposedKey}), ajustement → ${adjustedKey}`);
        newExposedKey = adjustedKey;
      }
    } catch (e) {
      console.warn(`⚠️ Vérification collision exposedKey échouée:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔁 ÉTAPE 5A-bis : Réutiliser une variable existante pour ce nœud si présente
    // ═══════════════════════════════════════════════════════════════════════
    // Évite la violation d'unicité sur nodeId (1 variable par nœud) quand
    // plusieurs duplications pointent vers le même nœud d'affichage dédié.
    let _reusingExistingVariable = false;
    let _existingVariableForReuse: any = null;
    
    try {
      const existingForNode = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: finalNodeId } });
      if (existingForNode) {
        console.log(`♻️ Variable déjà existante pour display node ${finalNodeId}, réutilisation: ${existingForNode.id}`);
        _reusingExistingVariable = true;
        _existingVariableForReuse = existingForNode;
        
        // Harmoniser le nœud d'affichage avec les données de la variable existante
        try {
          await prisma.treeBranchLeafNode.update({
            where: { id: finalNodeId },
            data: {
              hasData: true,
              data_activeId: existingForNode.id,
              data_exposedKey: existingForNode.exposedKey,
              data_displayFormat: existingForNode.displayFormat,
              data_precision: existingForNode.precision,
              data_unit: existingForNode.unit,
              data_visibleToUser: existingForNode.visibleToUser,
              label: existingForNode.displayName || undefined,
              field_label: (existingForNode.displayName as any) || undefined
            }
          });
          await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [existingForNode.id]);
        } catch (e) {
          console.warn(`⚠️ Erreur MAJ display node (réutilisation):`, (e as Error).message);
        }

        // Mettre en cache l'ID réutilisé pour éviter d'autres créations
        variableCopyCache.set(originalVarId, existingForNode.id);
        
        // ⚠️ NE PAS RETOURNER ICI - Continuer pour copier les capacités de cette variable
        // pour ce nouveau nœud/contexte !
      }
    } catch (e) {
      console.warn(`⚠️ Vérification variable existante par nodeId échouée:`, (e as Error).message);
    }

    // Utiliser la variable réutilisée, la variable en cache, ou en créer une nouvelle
    let newVariable: any;
    
    if (cachedVariable) {
      console.log(`♻️ [COPY-VAR] Réutilisation de variable du cache: ${cachedVariable.id} pour créer display node`);
      newVariable = cachedVariable;
    } else if (_reusingExistingVariable && _existingVariableForReuse) {
      console.log(`♻️ [COPY-VAR] Utilisation de variable existante: ${_existingVariableForReuse.id}`);
      newVariable = _existingVariableForReuse;
    } else {
      console.log(`\n🔨 [COPY-VAR] CRÉATION DE LA VARIABLE EN BASE...`);
      console.log(`   ID: ${newVarId}`);
      console.log(`   nodeId: ${finalNodeId}`);
      console.log(`   exposedKey: ${newExposedKey}`);
      console.log(`   displayName: ${originalVar.displayName ? `${originalVar.displayName}-${suffix}` : originalVar.displayName}`);
      console.log(`   sourceRef: ${newSourceRef}`);
      console.log(`   sourceType: ${originalVar.sourceType}`);
      
      newVariable = await prisma.treeBranchLeafNodeVariable.create({
        data: {
          id: newVarId,
          nodeId: finalNodeId,
          exposedKey: newExposedKey,
          displayName: originalVar.displayName ? `${originalVar.displayName}-${suffix}` : originalVar.displayName,
          displayFormat: originalVar.displayFormat,
          unit: originalVar.unit,
          precision: originalVar.precision,
          visibleToUser: originalVar.visibleToUser,
          isReadonly: originalVar.isReadonly,
          defaultValue: originalVar.defaultValue,
          fixedValue: originalVar.fixedValue,
          selectedNodeId: originalVar.selectedNodeId 
            ? (nodeIdMap.get(originalVar.selectedNodeId) || appendSuffixOnce(originalVar.selectedNodeId))
            : null,
          sourceRef: newSourceRef,
          sourceType: originalVar.sourceType,
          metadata: originalVar.metadata as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅✅✅ VARIABLE CRÉÉE AVEC SUCCÈS EN BASE !`);
    console.log(`   ID créé: ${newVariable.id}`);
    console.log(`   nodeId: ${newVariable.nodeId}`);
    console.log(`   exposedKey: ${newVariable.exposedKey}`);
    console.log(`   📍 DEBUG displayName créé: "${newVariable.displayName}"`);
    
    // 🔍 VÉRIFICATION: Re-chercher la variable pour confirmer qu'elle existe bien
    const verification = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: newVariable.id }
    });
    if (verification) {
      console.log(`✅ VÉRIFICATION OK: Variable ${newVariable.id} existe bien en base`);
    } else {
      console.error(`❌❌❌ PROBLÈME GRAVE: Variable ${newVariable.id} N'EXISTE PAS après création !`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 ÉTAPE 5B : Mettre à jour le NŒUD D'AFFICHAGE (finalNodeId) avec les paramètres data
    // ═══════════════════════════════════════════════════════════════════════
    try {
      await prisma.treeBranchLeafNode.update({
        where: { id: finalNodeId },
        data: {
          hasData: true,
          data_activeId: newVariable.id,
          data_exposedKey: newVariable.exposedKey,
          data_displayFormat: newVariable.displayFormat,
          data_precision: newVariable.precision,
          data_unit: newVariable.unit,
          data_visibleToUser: newVariable.visibleToUser,
          // Harmoniser le label du nœud d'affichage sur le displayName de la variable
          label: newVariable.displayName || undefined,
          field_label: (newVariable.displayName as any) || undefined
        }
      });
      console.log(`✅ Paramètres capacité (data) mis à jour pour nœud d'affichage ${finalNodeId}`);
    } catch (e) {
      console.warn(`⚠️ Erreur lors de la mise à jour des paramètres capacité (display node):`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧩 ÉTAPE 5C : Lier à la section d'affichage (sans création) OU créer un nœud d'affichage
    // ═══════════════════════════════════════════════════════════════════════
    if (linkToDisplaySection) {
      try {
        // Trouver la section d'affichage "Nouveau Section" dans le contexte du parent d'origine
        const originalOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: originalVar.nodeId },
          select: { parentId: true, treeId: true }
        });
        if (originalOwnerNode?.parentId) {
          const displaySection = await prisma.treeBranchLeafNode.findFirst({
            where: {
              treeId: originalOwnerNode.treeId,
              parentId: originalOwnerNode.parentId,
              type: 'section',
              label: { equals: displaySectionLabel }
            },
            select: { id: true }
          });
          if (displaySection) {
            await addToNodeLinkedField(prisma, displaySection.id, 'linkedVariableIds', [newVariable.id]);
            console.log(`✅ Variable liée à la section d'affichage ${displaySectionLabel}: ${displaySection.id}`);
          } else {
            console.log(`ℹ️ Section d'affichage "${displaySectionLabel}" introuvable sous le parent.`);
          }
        }
      } catch (e) {
        console.warn(`⚠️ Erreur lors du linkage vers la section d'affichage:`, (e as Error).message);
      }
    } else if (autoCreateDisplayNode) {
      // Déjà géré ci-dessus: finalNodeId pointe vers le nœud d'affichage (copié ou créé)
      // On s'assure simplement que le lien variable → nœud est en place
      try {
        await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [newVariable.id]);
      } catch (e) {
        console.warn(`⚠️ Erreur linkage variable→display node:`, (e as Error).message);
      }
      // Hydratation capacités condition/table si applicable
      try {
        if (capacityType && newSourceRef) {
          const parsedCap = parseSourceRef(newSourceRef);
          const capId = parsedCap?.id;
          if (parsedCap && capId) {
            if (parsedCap.type === 'condition') {
              const cond = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: capId }, select: { name: true, description: true } });
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasCondition: true,
                  condition_activeId: capId,
                  condition_name: cond?.name || null,
                  condition_description: cond?.description || null
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedConditionIds', [capId]);
            } else if (parsedCap.type === 'formula') {
              const frm = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: capId }, select: { name: true, description: true } });
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasFormula: true,
                  formula_activeId: capId,
                  formula_name: frm?.name || null,
                  formula_description: frm?.description || null
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedFormulaIds', [capId]);
            } else if (parsedCap.type === 'table') {
              const tbl = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: capId }, select: { name: true, description: true, type: true } });
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasTable: true,
                  table_activeId: capId,
                  table_name: tbl?.name || null,
                  table_description: tbl?.description || null,
                  table_type: (tbl?.type as any) || null
                }
              });
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedTableIds', [capId]);
            }
          }
        }
      } catch (e) {
        console.warn(`⚠️ Synchronisation capacités condition/table sur le nœud d'affichage:`, (e as Error).message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 6 : Mettre en cache
    // ═══════════════════════════════════════════════════════════════════════
    variableCopyCache.set(cacheKey, newVariable.id);

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 ÉTAPE 7 : Mise à jour bidirectionnelle des linked...
    // ═══════════════════════════════════════════════════════════════════════
    
    // NOTE: linkedVariableIds du nœud propriétaire est géré par le code appelant
    // (treebranchleaf-routes.ts) qui fait un UPDATE global après toutes les copies
    
    // 7B. Mise à jour inverse : ajouter dans la capacité référencée
    if (capacityType && newSourceRef) {
      const parsed = parseSourceRef(newSourceRef);
      if (parsed && parsed.id) {
        try {
          if (capacityType === 'formula') {
            const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (formula) {
              await addToNodeLinkedField(prisma, formula.nodeId, 'linkedFormulaIds', [parsed.id]);
              console.log(`✅ linkedFormulaIds mis à jour pour formule ${parsed.id}`);
            }
          }
          else if (capacityType === 'condition') {
            const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (condition) {
              await addToNodeLinkedField(prisma, condition.nodeId, 'linkedConditionIds', [parsed.id]);
              console.log(`✅ linkedConditionIds mis à jour pour condition ${parsed.id}`);
            }
          }
          else if (capacityType === 'table') {
            const table = await prisma.treeBranchLeafNodeTable.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (table) {
              await addToNodeLinkedField(prisma, table.nodeId, 'linkedTableIds', [parsed.id]);
              console.log(`✅ linkedTableIds mis à jour pour table ${parsed.id}`);
            }
          }
        } catch (e) {
          console.warn(`⚠️ Erreur MAJ bidirectionnelle:`, (e as Error).message);
        }
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ COPIE VARIABLE TERMINÉE`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      variableId: newVariable.id,
      exposedKey: newExposedKey,
      capacityType,
      sourceRef: newSourceRef,
      success: true,
      displayNodeId: finalNodeId  // 🔑 IMPORTANT: Retourner l'ID du display node créé!
    };

  } catch (error) {
    console.error(`❌ Erreur lors de la copie de la variable:`, error);
    return {
      variableId: '',
      exposedKey: '',
      capacityType: null,
      sourceRef: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      displayNodeId: undefined  // Pas de display node en cas d'erreur
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧩 CRÉER UN NŒUD D'AFFICHAGE POUR UNE VARIABLE EXISTANTE
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Crée (ou met à jour) un nœud d'affichage pour une variable existante.
 * N'implique pas de duplication de variable.
 */
export async function createDisplayNodeForExistingVariable(
  variableId: string,
  prisma: PrismaClient,
  displaySectionLabel = 'Nouveau Section',
  suffix: string | number = 'nouveau'
): Promise<{ displayNodeId: string; created: boolean }>
{
  const v = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: variableId } });
  if (!v) throw new Error(`Variable introuvable: ${variableId}`);

  const owner = await prisma.treeBranchLeafNode.findUnique({
    where: { id: v.nodeId },
    select: { 
      id: true, 
      parentId: true, 
      treeId: true, 
      order: true, 
      linkedTableIds: true, 
      hasTable: true, 
      table_name: true, 
      table_activeId: true, 
      table_instances: true,
      // 🔑 IMPORTANT: Récupérer subtab pour que la copie soit dans le bon sous-onglet
      subtab: true,
      subtabs: true,
    }
  });
  if (!owner) throw new Error(`Nœud propriétaire introuvable: ${v.nodeId}`);

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 🔑 RÈGLE FONDAMENTALE: Les copies doivent rester DANS LA MÊME SECTION que l'original
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 
  // PRINCIPE: Chaque copie doit être placée dans la même section que le champ original.
  // PAS de création de Section-1, Section-2, etc.
  // Le parent de la copie = le parent de l'original (TOUJOURS)
  // 
  // ═══════════════════════════════════════════════════════════════════════════════════════
  const displayParentId: string | null = owner.parentId;
  console.log(`📌 [createDisplayNodeForExistingVariable] RÈGLE: Copie dans le MÊME parent que l'original: ${displayParentId}`);

  const now = new Date();
  const baseData = {
    id: displayNodeId,
    treeId: owner.treeId,
    parentId: displayParentId,
    type: 'leaf_field' as const,
    subType: null as any,
    label: v.displayName || 'Donnée',
    description: null as string | null,
    value: null as string | null,
    order: (owner.order ?? 0) + 1,
    isRequired: false,
    isVisible: true,
    isActive: true,
    isMultiple: false as any,
    fieldConfig: null as any,
    conditionConfig: null as any,
    formulaConfig: null as any,
    tableConfig: null as any,
    apiConfig: null as any,
    linkConfig: null as any,
    defaultValue: null as any,
    calculatedValue: null as any,
    metadata: { fromVariableId: variableId } as any,
    // 🔑 IMPORTANT: Copier le subtab pour que la copie soit dans le bon sous-onglet
    subtab: owner.subtab,
    subtabs: owner.subtabs,
    createdAt: now,
    updatedAt: now,
    hasAPI: false,
    hasCondition: false,
    hasData: false,
    hasFormula: false,
    hasLink: false,
    hasMarkers: false,
    // 📊 TABLE: Copier les colonnes table du nœud original
    hasTable: owner.hasTable ?? false,
    table_name: owner.table_name,
    table_activeId: owner.table_activeId,
    table_instances: owner.table_instances as any,
    linkedTableIds: Array.isArray(owner.linkedTableIds) ? owner.linkedTableIds : [] as any,
    linkedConditionIds: [] as any,
    linkedFormulaIds: [] as any,
    linkedVariableIds: [variableId] as any,
    appearance_size: 'md' as any,
    appearance_variant: null as any,
    appearance_width: '100%' as any,
    fieldType: 'TEXT' as any,
    fieldSubType: null as any,
    field_label: v.displayName as any,
  };

  const existing = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
  if (existing) {
    await prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: { ...baseData, createdAt: existing.createdAt, updatedAt: now } });
  } else {
    await prisma.treeBranchLeafNode.create({ data: baseData as any });
  }

  await prisma.treeBranchLeafNode.update({
    where: { id: displayNodeId },
    data: {
      hasData: true,
      data_activeId: variableId,
      data_exposedKey: v.exposedKey,
      data_displayFormat: v.displayFormat,
      data_precision: v.precision,
      data_unit: v.unit,
      data_visibleToUser: v.visibleToUser
    }
  });

  return { displayNodeId, created: !existing };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 FONCTIONS UTILITAIRES POUR LINKED FIELDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ajoute des IDs à un champ linked... d'un nœud (sans doublons)
 * 
 * @param prisma - Instance Prisma
 * @param nodeId - ID du nœud
 * @param field - Nom du champ ('linkedFormulaIds', 'linkedConditionIds', etc.)
 * @param idsToAdd - IDs à ajouter
 */
async function addToNodeLinkedField(
  prisma: PrismaClient,
  nodeId: string,
  field: 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds',
  idsToAdd: string[]
): Promise<void> {
  if (!idsToAdd || idsToAdd.length === 0) return;

  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { [field]: true }
  });

  if (!node) {
    console.warn(`⚠️ Nœud ${nodeId} introuvable pour MAJ ${field}`);
    return;
  }

  const current = (node[field] || []) as string[];
  const newIds = [...new Set([...current, ...idsToAdd])]; // Dédupliquer

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { [field]: { set: newIds } }
  });
}

/**
 * Version simplifiée pour compatibilité avec l'ancien code
 * qui passe parseSourceRef et addToNodeLinkedField en paramètres
 */
export async function copyVariableWithCapacitiesLegacy(
  originalVarId: string,
  suffix: number,
  newNodeId: string,
  prisma: PrismaClient,
  _parseSourceRefFn: typeof parseSourceRef,
  _addToNodeLinkedFieldFn: typeof addToNodeLinkedField
): Promise<CopyVariableResult> {
  // Appeler la version moderne
  return copyVariableWithCapacities(originalVarId, suffix, newNodeId, prisma);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 COPIE DES VARIABLES LIÉES DEPUIS linkedVariableIds
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Résultat de la copie de variables liées
 */
export interface CopyLinkedVariablesResult {
  /** Nombre de variables copiées */
  count: number;
  /** Map des anciennes IDs vers les nouvelles IDs */
  variableIdMap: Map<string, string>;
  /** Résultats individuels de copie */
  results: CopyVariableResult[];
  /** Succès global */
  success: boolean;
  /** Message d'erreur éventuel */
  error?: string;
}

/**
 * 🔗 COPIE MASSIVE DE VARIABLES LIÉES
 * 
 * Cette fonction :
 * 1. Lit l'ID du nœud source avec ses linkedVariableIds
 * 2. Pour chaque ID de variable lié, récupère la variable
 * 3. Copie la variable avec son suffixe
 * 4. Copie les données associées (capacités, formules, conditions, tables)
 * 5. Met à jour les références bidirectionnelles
 * 
 * CONTEXTE D'UTILISATION :
 * Si un nœud a des linkedVariableIds = ['varA', 'varB', 'varC'],
 * cette fonction va copier ces 3 variables + toutes leurs capacités.
 * Les champs existent déjà dans le nouveau nœud avec le suffixe.
 * 
 * @param sourceNodeId - ID du nœud source (contient linkedVariableIds)
 * @param newNodeId - ID du nouveau nœud destination
 * @param suffix - Suffixe numérique à appliquer
 * @param prisma - Instance Prisma Client
 * @param options - Options avec maps de références (formules, conditions, tables)
 * @returns Résultat de la copie massif
 * 
 * @example
 * // Copier toutes les variables liées du nœud 'node-abc' vers 'node-abc-1'
 * const result = await copyLinkedVariablesFromNode(
 *   'node-abc',
 *   'node-abc-1',
 *   1,
 *   prisma,
 *   { formulaIdMap, conditionIdMap, tableIdMap }
 * );
 * console.log(`${result.count} variables copiées`);
 * // Accéder à la map : result.variableIdMap.get('oldVarId') → 'oldVarId-1'
 */
export async function copyLinkedVariablesFromNode(
  sourceNodeId: string,
  newNodeId: string,
  suffix: number,
  prisma: PrismaClient,
  options: CopyVariableOptions = {}
): Promise<CopyLinkedVariablesResult> {

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔗 COPIE VARIABLES LIÉES DU NŒUD`);
  console.log(`   Source: ${sourceNodeId}`);
  console.log(`   Destination: ${newNodeId}`);
  console.log(`   Suffixe: ${suffix}`);
  console.log(`${'═'.repeat(80)}\n`);

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1️⃣ RÉCUPÉRER LE NŒUD SOURCE ET SES linkedVariableIds
    // ═══════════════════════════════════════════════════════════════════════
    const sourceNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sourceNodeId },
      select: { linkedVariableIds: true }
    });

    if (!sourceNode) {
      console.error(`❌ Nœud source introuvable: ${sourceNodeId}`);
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: false,
        error: `Nœud source introuvable: ${sourceNodeId}`
      };
    }

    const linkedVarIds = sourceNode.linkedVariableIds || [];
    console.log(`📋 ${linkedVarIds.length} variables liées trouvées`);
    
    if (linkedVarIds.length === 0) {
      console.log(`⚠️ Aucune variable liée à copier`);
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: true
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2️⃣ COPIER CHAQUE VARIABLE LIÉE
    // ═══════════════════════════════════════════════════════════════════════
    const variableIdMap = new Map<string, string>();
    const results: CopyVariableResult[] = [];

    console.log(`\n📝 Copie de ${linkedVarIds.length} variables...`);

    for (let i = 0; i < linkedVarIds.length; i++) {
      const varId = linkedVarIds[i];
      console.log(`\n[${i + 1}/${linkedVarIds.length}] 🔄 Copie variable: ${varId}`);

      try {
        // Copier la variable avec toutes ses capacités
        const result = await copyVariableWithCapacities(
          varId,
          suffix,
          newNodeId,
          prisma,
          options
        );

        if (result.success) {
          variableIdMap.set(varId, result.variableId);
          console.log(`✅ Variable copiée: ${varId} → ${result.variableId}`);
        } else {
          console.error(`❌ Échec copie: ${result.error}`);
        }

        results.push(result);
      } catch (e) {
        console.error(`❌ Exception lors de la copie: ${(e as Error).message}`);
        results.push({
          variableId: '',
          exposedKey: '',
          capacityType: null,
          sourceRef: null,
          success: false,
          error: (e as Error).message
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3️⃣ MISE À JOUR DU NŒUD DESTINATION : linkedVariableIds
    // ═══════════════════════════════════════════════════════════════════════
    const newVarIds = Array.from(variableIdMap.values());
    
    console.log(`\n🔗 Mise à jour linkedVariableIds du nœud destination...`);
    console.log(`   IDs à ajouter: ${newVarIds.join(', ')}`);

    await addToNodeLinkedField(prisma, newNodeId, 'linkedVariableIds', newVarIds);
    
    console.log(`✅ linkedVariableIds mis à jour pour le nœud ${newNodeId}`);

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 RÉSUMÉ
    // ═══════════════════════════════════════════════════════════════════════
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`📊 RÉSUMÉ COPIE VARIABLES LIÉES`);
    console.log(`   ✅ Succès: ${successCount}/${linkedVarIds.length}`);
    console.log(`   ❌ Échecs: ${failureCount}/${linkedVarIds.length}`);
    console.log(`   🗺️ Map: ${variableIdMap.size} entrées`);
    console.log(`${'═'.repeat(80)}\n`);

    return {
      count: successCount,
      variableIdMap,
      results,
      success: failureCount === 0
    };

  } catch (error) {
    console.error(`❌ Erreur globale lors de la copie de variables liées:`, error);
    return {
      count: 0,
      variableIdMap: new Map(),
      results: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
 