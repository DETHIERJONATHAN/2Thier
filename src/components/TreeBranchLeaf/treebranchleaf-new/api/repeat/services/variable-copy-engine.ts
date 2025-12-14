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

import { PrismaClient, Prisma } from '@prisma/client';
import type { DuplicationContext } from '../../registry/repeat-id-registry.js';
import { logVariableEvent, logCapacityEvent } from '../repeat-blueprint-writer.js';
import {
  parseSourceRef,
  applySuffixToSourceRef,
  extractNodeIdFromSourceRef,
  type ParsedSourceRef
} from '../utils/source-ref.js';
import { linkVariableToAllCapacityNodes } from '../../universal-linking-system.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 IMPORTS DES MODULES DE COPIE DE CAPACITÉS
// ═══════════════════════════════════════════════════════════════════════════
import { copyFormulaCapacity } from '../../copy-capacity-formula.js';
import { copyConditionCapacity } from '../../copy-capacity-condition.js';
import { copyTableCapacity } from '../../copy-capacity-table.js';

// ═══════════════════════════════════════════════════════════════════════════
// 📋 TYPES ET INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

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
  /** ID du nœud d'affichage créé (si autoCreateDisplayNode=true) */
  displayNodeId?: string;
  /** Message d'erreur éventuel */
  error?: string;
  /** 🟢 NOUVEAU : Maps de capacités remplies pendant cette copie */
  formulaIdMap?: Map<string, string>;
  conditionIdMap?: Map<string, string>;
  tableIdMap?: Map<string, string>;
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
  /** ⚠️ CRITIQUE: Est-ce que le nœud d'affichage EST DÉJÀ CRÉÉ par deepCopyNodeInternal ? */
  displayNodeAlreadyCreated?: boolean;
  /** 🟢 Parent ID du nœud d'affichage (pris directement du deepCopyNodeInternal) */
  displayParentId?: string | null;
  /** 🔴 Flag pour indiquer que la copie est issue d'une duplication de repeater */
  isFromRepeaterDuplication?: boolean;
  /**
   * 🔁 Contexte structuré pour alimenter le repeat registry. Définir cette
   * valeur déclenche automatiquement la journalisation via
   * repeat-blueprint-writer.
   */
  repeatContext?: DuplicationContext;
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
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`�🚀🚀 [ENTRY] copyVariableWithCapacities APPELÉE !`);
  console.log(`�🔗 COPIE VARIABLE: ${originalVarId}`);
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
  console.log(`${'═'.repeat(80)}\n`);

  const {
    formulaIdMap = new Map(),
    conditionIdMap = new Map(),
    tableIdMap = new Map(),
    nodeIdMap = new Map(),
    variableCopyCache = new Map(),
    autoCreateDisplayNode = false,
    displaySectionLabel = 'Nouveau Section',
    linkToDisplaySection = false,
    displayParentId,
    isFromRepeaterDuplication = false,
    repeatContext,
  // displayNodeAlreadyCreated is not used anymore in this function; keep options API stable without reassigning
  } = options;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 ÉTAPE 1 : Vérifier le cache
    // 🚨 BUG FIX: Le cache doit être basé sur (originalVarId, newNodeId) pour que
    // chaque nœud ait SA PROPRE COPIE de variable avec suffixe correct!
    // ═══════════════════════════════════════════════════════════════════════
    const cacheKey = `${originalVarId}|${newNodeId}`;
    if (variableCopyCache.has(cacheKey)) {
      const cachedId = variableCopyCache.get(cacheKey)!;
      console.log(`♻️ Variable déjà copiée pour ce nœud (cache): ${originalVarId} → ${cachedId}`);
      
      // Récupérer les infos depuis la base pour retourner un résultat complet
      const cached = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: cachedId }
      });
      
      if (cached) {
        const parsed = parseSourceRef(cached.sourceRef);
        return {
          variableId: cached.id,
          exposedKey: cached.exposedKey,
          capacityType: parsed?.type || null,
          sourceRef: cached.sourceRef,
          success: true,
          displayNodeId: undefined
        };
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
      console.warn(`⚠️ Cette variable est ORPHELINE - elle ne peut pas être copiée`);
      
      // 🔧 FIX: Nettoyer les linkedVariableIds orphelins du nœud parent
      // pour que la prochaine création fonctionne sans référence invalide
      if (newNodeId) {
        try {
          const orphanLinkedVarIds = await prisma.treeBranchLeafNode.findMany({
            where: {
              linkedVariableIds: {
                hasSome: [originalVarId]
              }
            },
            select: { id: true, linkedVariableIds: true }
          });
          
          for (const node of orphanLinkedVarIds) {
            const cleaned = (node.linkedVariableIds || []).filter(id => id !== originalVarId);
            if (cleaned.length !== node.linkedVariableIds?.length) {
              await prisma.treeBranchLeafNode.update({
                where: { id: node.id },
                data: { linkedVariableIds: cleaned }
              });
              console.log(`🧹 Nettoyé linkedVariableIds orphelin de ${node.id}`);
            }
          }
        } catch (cleanErr) {
          console.warn(`⚠️ Impossible de nettoyer linkedVariableIds orphelins:`, (cleanErr as Error).message);
        }
      }
      
      return {
        variableId: '',
        exposedKey: '',
        capacityType: null,
        sourceRef: null,
        success: false,
        displayNodeId: undefined,
        error: `Variable introuvable: ${originalVarId}`
      };
    }

    console.log(`✅ Variable trouvée: ${originalVar.displayName}`);
    console.log(`   sourceType: ${originalVar.sourceType}`);
    console.log(`   sourceRef: ${originalVar.sourceRef || 'null'}`);
    console.log(`   📍 DEBUG: newVariable.displayName sera utilisé pour le label du nœud d'affichage`);

    const normalizedRepeatContext = repeatContext
      ? {
          ...repeatContext,
          templateNodeId: repeatContext.templateNodeId ?? originalVar.nodeId ?? undefined,
          suffix: repeatContext.suffix ?? suffix
        }
      : undefined;

  // ═══════════════════════════════════════════════════════════════════════
  // 🆔 ÉTAPE 3 : Préparer les IDs cibles (peuvent être adaptés plus loin si collision)
  // ═══════════════════════════════════════════════════════════════════════
  const suffixToken = `${suffix}`;
  const stripTrailingNumeric = (raw: string | null | undefined): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    // Enlever TOUTES les séquences finales "-<nombre>" (ex: "foo-1-1" → "foo")
    return trimmed.replace(/(?:-\d+)+\s*$/, '');
  };

  const appendSuffixOnce = (value: string | null | undefined) => {
    if (!value) return value ?? '';
    const base = stripTrailingNumeric(value);
    return base.endsWith(`-${suffixToken}`) ? base : `${base}-${suffixToken}`;
  };

  const forceSingleSuffix = (value: string | null | undefined) => {
    if (!value) return value ?? '';
    const base = stripTrailingNumeric(value);
    return `${base}-${suffixToken}`;
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
    const emitCapacityEvent = (
      capacityId: string | null | undefined,
      capacityKind: 'formula' | 'condition' | 'table'
    ) => {
      if (!normalizedRepeatContext || !capacityId) {
        return;
      }
      logCapacityEvent({
        ownerNodeId: newNodeId,
        capacityId,
        capacityType: capacityKind,
        context: normalizedRepeatContext
      });
    };

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
        const applySuffixOnceToSourceRef = (ref: string | null | undefined) => {
          const parsedRef = parseSourceRef(ref || '');
          if (!parsedRef) return ref;
          const baseId = stripTrailingNumeric(parsedRef.id);
          if (baseId.endsWith(`-${suffixToken}`)) return ref;
          return applySuffixToSourceRef(`${parsedRef.prefix}${baseId}`, suffix);
        };

        if (capacityType === 'formula') {
          console.log(`🧮 [COPY-VAR] Traitement FORMULE: ${parsed.id}`);
          // Vérifier si la formule a déjà été copiée
          if (formulaIdMap.has(parsed.id)) {
            const mappedFormulaId = formulaIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedFormulaId}`;
            console.log(`✅ [COPY-VAR] Formule déjà mappée: ${parsed.id} → ${mappedFormulaId}`);
            emitCapacityEvent(mappedFormulaId, 'formula');
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
                emitCapacityEvent(formulaResult.newFormulaId, 'formula');
              } else {
                newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                console.log(`⚠️ [COPY-VAR] Échec copie formule (${formulaResult.error}), suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ [COPY-VAR] Exception copie formule:`, (e as Error).message, (e as Error).stack);
              newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
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
            emitCapacityEvent(mappedConditionId, 'condition');
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
                emitCapacityEvent(conditionResult.newConditionId, 'condition');
              } else {
                newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                console.log(`⚠️ Échec copie condition, suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ Exception copie condition:`, (e as Error).message);
              newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
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
            emitCapacityEvent(mappedTableId, 'table');
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
                emitCapacityEvent(tableResult.newTableId, 'table');
              } else {
                newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
                console.log(`⚠️ Échec copie table, suffixe appliqué: ${newSourceRef}`);
              }
            } catch (e) {
              console.error(`❌ Exception copie table:`, (e as Error).message);
              newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
            }
          }
        }
  // ═══════════════════════════════════════════════════════════════════
  // 📝 CHAMP (pas de copie, juste mapping)
  // ═══════════════════════════════════════════════════════════════════
        else if (capacityType === 'field') {
          const isSharedRefField = parsed.id.startsWith('shared-ref-');
          // Mapper le nodeId du champ si disponible
          if (nodeIdMap.has(parsed.id)) {
            newSourceRef = nodeIdMap.get(parsed.id)!;
            console.log(`✅ Champ mappé: ${parsed.id} → ${newSourceRef}`);
          } else if (isSharedRefField) {
            // Ne pas suffixer une shared-ref si on n'a pas de mapping (elle reste partagée)
            newSourceRef = parsed.id;
            console.log(`⚪ Champ shared-ref conservé sans suffixe: ${newSourceRef}`);
          } else {
            newSourceRef = appendSuffixOnce(parsed.id);
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
    // 🔍 DEBUG: Vérifier l'état de nodeIdMap
    console.log(`🔍 [DEBUG-DISPLAY] originalVar.nodeId: ${originalVar.nodeId}`);
    console.log(`🔍 [DEBUG-DISPLAY] nodeIdMap exists: ${!!nodeIdMap}`);
    console.log(`🔍 [DEBUG-DISPLAY] nodeIdMap.size: ${nodeIdMap?.size || 0}`);
    console.log(`🔍 [DEBUG-DISPLAY] nodeIdMap.has(originalVar.nodeId): ${originalVar.nodeId ? nodeIdMap?.has(originalVar.nodeId) : 'N/A (no nodeId)'}`);
    if (nodeIdMap && nodeIdMap.size > 0) {
      console.log(`🔍 [DEBUG-DISPLAY] nodeIdMap keys (first 5):`, Array.from(nodeIdMap.keys()).slice(0, 5));
    }
    // ⚠️ TOUJOURS créer un display node dédié quand autoCreateDisplayNode=true
    // Même si la variable a un nodeId et même s'il est dans nodeIdMap,
    // on crée un nœud d'affichage séparé pour éviter les collisions et garantir
    // une structure de données cohérente lors de la copie
    if (autoCreateDisplayNode) {
      console.log(`🚀🚀🚀 [AUTO-CREATE-DISPLAY] DÉBUT - Variable: ${originalVar.id} (${originalVar.displayName}), nodeId: ${originalVar.nodeId}`);
      
      // ⚠️ VÉRIFICATION: La variable DOIT avoir un nodeId pour créer un display node
      if (!originalVar.nodeId) {
        console.warn(`⚠️ [AUTO-CREATE-DISPLAY] Variable ${originalVar.id} n'a PAS de nodeId! Impossible de créer display node. Fallback newNodeId.`);
        finalNodeId = newNodeId;
      } else {
        try {
        const parseJsonIfNeeded = (value: unknown): unknown => {
          if (typeof value !== 'string') return value ?? undefined;
          const trimmed = value.trim();
          if (!trimmed) return undefined;
          const first = trimmed[0];
          const last = trimmed[trimmed.length - 1];
          const looksJson = (first === '[' && last === ']') || (first === '{' && last === '}');
          if (!looksJson) return value;
          try {
            return JSON.parse(trimmed);
          } catch {
            return value;
          }
        };

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
            table_columns: true,
            table_data: true,
            table_importSource: true,
            table_isImported: true,
            table_meta: true,
            table_rows: true,
            table_type: true,
            metadata: true,
            subtab: true,
            subtabs: true,
            hasAPI: true,
            hasCondition: true,
            hasData: true,
            hasFormula: true,
            hasLink: true,
            hasMarkers: true,
            data_activeId: true,
            data_displayFormat: true,
            data_exposedKey: true,
            data_instances: true,
            data_precision: true,
            data_unit: true,
            data_visibleToUser: true,
            appearance_size: true,
            appearance_variant: true,
            appearance_width: true,
            fieldType: true,
            fieldSubType: true,
            field_label: true,
          }
        });

        const displayNodeSelect = {
          id: true,
          parentId: true,
          order: true,
          metadata: true,
          subtab: true,
          subtabs: true,
          linkedTableIds: true,
          hasTable: true,
          table_name: true,
          table_activeId: true,
          table_instances: true,
          table_columns: true,
          table_data: true,
          table_importSource: true,
          table_isImported: true,
          table_meta: true,
          table_rows: true,
          table_type: true,
          hasAPI: true,
          hasCondition: true,
          hasData: true,
          hasFormula: true,
          hasLink: true,
          hasMarkers: true,
          data_activeId: true,
          data_displayFormat: true,
          data_exposedKey: true,
          data_instances: true,
          data_precision: true,
          data_unit: true,
          data_visibleToUser: true,
          appearance_size: true,
          appearance_variant: true,
          appearance_width: true,
          fieldType: true,
          fieldSubType: true,
          field_label: true,
          createdAt: true,
        } satisfies Prisma.TreeBranchLeafNodeSelect;

        const hasRepeaterMetadata = (metadata?: Prisma.JsonValue | null): boolean => {
          if (!metadata || typeof metadata !== 'object') {
            return false;
          }
          return Boolean((metadata as Record<string, unknown>).repeater);
        };

        const pickDisplayCandidate = <T extends { metadata: Prisma.JsonValue | null }>(
          nodes: T[]
        ): T | null => {
          if (!nodes.length) {
            return null;
          }
          const withoutRepeater = nodes.find(node => !hasRepeaterMetadata(node.metadata));
          return withoutRepeater ?? nodes[0];
        };

        let originalDisplayNode = await prisma.treeBranchLeafNode.findFirst({
          where: {
            metadata: {
              path: ['fromVariableId'],
              equals: originalVar.id
            }
          },
          select: displayNodeSelect
        });

        if (!originalDisplayNode) {
          // 🔍 IMPORTANT: Pour les variables LIÉES, on cherche le display node
          // BUT on EXCLUT tous les nœuds template eux-mêmes (les nœuds qui LIENT la variable)
          // Sinon on récupère le nœud template comme "display node" ce qui est faux!
          //
          // PROBLÈME À ÉVITER:
          // - Les nœuds template (Inclinaison, Orientation) ont linkedVariableIds contenant la variable
          // - Ces nœuds SONT eux-mêmes de type leaf_field
          // - Si on les incluait dans la recherche, on trouverait le template au lieu d'un display node
          // - Le parent serait alors celui du template (Mesure) au lieu du propriétaire (Nouveau Section)
          //
          // SOLUTION:
          // - Chercher tous les nœuds ayant la variable dans linkedVariableIds
          // - Les identifier comme "template nodes"
          // - Les EXCLURE de la recherche du display node
          // - Chercher seulement les display nodes AUTRES que les templates
          
          // Les nœuds template sont ceux dans linkedVariableIds du nœud propriétaire
          const templateNodeIds = await prisma.treeBranchLeafNode.findMany({
            where: {
              linkedVariableIds: {
                has: originalVar.id
              }
            },
            select: { id: true }
          });
          
          const templateIds = new Set(templateNodeIds.map(t => t.id));
          console.log(`🔍 [DISPLAY_SEARCH] Template nodes to EXCLUDE: ${templateIds.size}`);
          
          const candidates = await prisma.treeBranchLeafNode.findMany({
            where: {
              linkedVariableIds: {
                has: originalVar.id
              },
              // ⚠️ CRITICAL: Exclude the template nodes themselves
              // This ensures we find TRUE display nodes, not the templates
              id: {
                notIn: Array.from(templateIds)
              },
              ...(originalVar.nodeId
                ? {
                    NOT: {
                      id: originalVar.nodeId
                    }
                  }
                : {})
            },
            select: displayNodeSelect,
            orderBy: {
              createdAt: 'asc'
            }
          });

          if (candidates.length === 0) {
            console.log(`⚠️ [DISPLAY_SEARCH] No display node found after excluding templates`);
          } else {
            console.log(`✅ [DISPLAY_SEARCH] Found ${candidates.length} candidates after excluding templates`);
          }

          originalDisplayNode = pickDisplayCandidate(candidates);
        }

        if (originalDisplayNode) {
          console.log(
            `✅ [AUTO-CREATE-DISPLAY] Original display trouvé: ${originalDisplayNode.id} (parent=${originalDisplayNode.parentId})`
          );
        } else {
          console.log(
            `⚠️  [AUTO-CREATE-DISPLAY] Aucun display original trouvé pour ${originalVar.id}`
          );
          
          // 🔧 FALLBACK: Si pas de display node trouvé, utiliser le parent du nœud PROPRIÉTAIRE
          // (qui est le nœud auquel la variable appartient)
          if (originalVar.nodeId && originalOwnerNode) {
            console.log(
              `📌 [AUTO-CREATE-DISPLAY] Fallback: utilisant parent du nœud propriétaire: ${originalOwnerNode.parentId}`
            );
          }
        }

        // 🔑 CRITIQUE: Charger le nœud DUPLIQUÉ pour obtenir son parentId
        // Le nœud dupliqué peut avoir un parentId différent du nœud original
        // (ex: parent suffixé lors d'une duplication de repeater)
        const duplicatedOwnerNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: newNodeId },
          select: {
            id: true,
            parentId: true,
          }
        });

        if (originalOwnerNode && duplicatedOwnerNode) {
          // ═══════════════════════════════════════════════════════════════════════════════════════
          // 🔑 RÈGLE CRITIQUE: Le champ d'affichage DOIT hériter du parent du nœud ORIGINAL
          // ═══════════════════════════════════════════════════════════════════════════════════════
          // 
          // EXPLICATION COMPLÈTE:
          // - Le nœud d'AFFICHAGE DOIT aller dans le MÊME parent que le nœud PROPRIÉTAIRE
          // - C'est là que visuellement le champ apparaît dans l'UI (dans la section)
          // - CELA S'APPLIQUE SURTOUT aux variables LIÉES qui n'ont pas de display node original
          // 
          // EXEMPLE CONCRET (Bug Résolu):
          // - Variable: "Orientation - inclinaison" (linkedVariableIds référencée par 2 templates)
          // - Nœud propriétaire original: "Orientation - inclinaison" 
          //   → parentId = c40d8353-923f-49ac-a3db-91284de99654 (Nouveau Section)
          // - Nœud dupliqué: "Orientation - inclinaison-1"
          //   → DOIT avoir parentId = Nouveau Section ✅ (même que propriétaire)
          // 
          // AVANT LE BUG:
          // - La copie était créée avec parentId du template (Mesure) ❌
          // - Raison: on trouvait les templates en cherchant des display nodes
          // - Résultat: "Orientation - inclinaison-1" apparaissait dans Mesure au lieu de Nouveau Section
          //
          // APRÈS LE FIX:
          // - On exclut les templates de la recherche (voir lignes 560-630)
          // - On utilise prioritairement le parentId du nœud PROPRIÉTAIRE
          // - Résultat: "Orientation - inclinaison-1" apparaît maintenant dans Nouveau Section ✅
          //
          // ORDRE DE PRIORITÉ (IMPORTANT):
          // 1. parentId du DISPLAY node original s'il existe
          //    → inheritedDisplayParentId (display node si trouvé)
          // 2. ⭐ parentId du nœud PROPRIÉTAIRE ORIGINAL (originalOwnerNode.parentId)
          //    → CRUCIAL pour variables LIÉES sans display node
          //    → Garantit affichage dans la MÊME section que l'original
          // 3. displayParentId (optionnel, fourni en options)
          // 4. parentId du nœud DUPLIQUÉ (duplicatedOwnerNode)
          // 5. null (dernier recours)
          // 
          // ═══════════════════════════════════════════════════════════════════════════════════════
          
          const inheritedDisplayParentId = originalDisplayNode?.parentId ?? null;
          
          let resolvedParentId = inheritedDisplayParentId
            ?? originalOwnerNode.parentId  // ⭐ PRIORITÉ 2: Parent du propriétaire original
            ?? displayParentId
            ?? duplicatedOwnerNode.parentId
            ?? null;
          
          console.log(`📌 [DISPLAY_NODE_PARENT] Résolution du parentId:`);
          console.log(`   - inheritedDisplayParentId: ${inheritedDisplayParentId}`);
          console.log(`   - originalOwnerNode.parentId: ${originalOwnerNode.parentId}`);
          console.log(`   - resolvedParentId final: ${resolvedParentId}`);
          
          // Vérifier que le parent existe si fourni, sinon fallback au parent du nœud dupliqué
          if (resolvedParentId && prisma) {
            try {
              const parentExists = await prisma.treeBranchLeafNode.findUnique({
                where: { id: resolvedParentId },
                select: { id: true }
              });
              if (!parentExists) {
                console.log(`⚠️  [DISPLAY_NODE_PARENT] Parent ${resolvedParentId} n'existe pas, fallback au parent du nœud dupliqué`);
                resolvedParentId = duplicatedOwnerNode.parentId ?? null;
              } else {
                console.log(`✅ [DISPLAY_NODE_PARENT] Parent ${resolvedParentId} existe, utilisation confirmée`);
              }
            } catch (parentCheckErr) {
              console.warn(`⚠️  [DISPLAY_NODE_PARENT] Erreur lors de la vérification du parent, fallback:`, (parentCheckErr as Error).message);
              resolvedParentId = duplicatedOwnerNode.parentId ?? null;
            }
          } else if (!resolvedParentId) {
            // Fallback: utiliser le parent du nœud dupliqué
            resolvedParentId = duplicatedOwnerNode.parentId ?? null;
            console.log(`📌 [DISPLAY_NODE_PARENT] Utilisation du parent du nœud dupliqué: ${resolvedParentId}`);
          }

          // Générer un ID unique pour le nœud d'affichage (ex: <oldVarNodeId>-<suffix>)
          // Conserver uniquement le suffixe demandé (pas de "-display" additionnel)
          const displayNodeBaseId = (originalVar.nodeId && nodeIdMap.get(originalVar.nodeId)) || originalVar.nodeId;
          // Strip suffix then force a single suffixToken
          const baseNormalized = stripTrailingNumeric(displayNodeBaseId);
          const displayNodeId = appendSuffixOnce(baseNormalized);
          finalNodeId = displayNodeId;

          const now = new Date();
          const cloneJson = (value: unknown): Record<string, unknown> => {
            if (!value || typeof value !== 'object') {
              return {};
            }
            return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
          };

          const ownerMetadata = cloneJson(originalOwnerNode.metadata);
          const inheritedMetadata = cloneJson(originalDisplayNode?.metadata);

          const metadataForDisplay: Record<string, unknown> = {
            ...ownerMetadata,
            ...inheritedMetadata,
            fromVariableId: forceSingleSuffix(originalVar.id),
            autoCreatedDisplayNode: true,
            ...(isFromRepeaterDuplication && { duplicatedFromRepeater: true }),
          };

          const ownerSubTabRaw = ownerMetadata?.subTab
            ?? ownerMetadata?.subTabKey
            ?? parseJsonIfNeeded(originalOwnerNode.subtab ?? undefined);
          const ownerSubTabsRaw = ownerMetadata?.subTabs
            ?? parseJsonIfNeeded(originalOwnerNode.subtabs ?? undefined);
          const ownerSubTabsArray = Array.isArray(ownerSubTabsRaw)
            ? (ownerSubTabsRaw as unknown[]).map(entry => String(entry))
            : undefined;

          const inheritedSubTab = inheritedMetadata?.subTab
            ?? parseJsonIfNeeded(originalDisplayNode?.subtab ?? undefined);
          const inheritedSubTabsRaw = inheritedMetadata?.subTabs
            ?? parseJsonIfNeeded(originalDisplayNode?.subtabs ?? undefined);
          const inheritedSubTabs = Array.isArray(inheritedSubTabsRaw)
            ? (inheritedSubTabsRaw as unknown[]).map(entry => String(entry))
            : undefined;

          if (inheritedSubTab !== undefined) {
            metadataForDisplay.subTab = inheritedSubTab;
          } else if (ownerSubTabRaw !== undefined) {
            metadataForDisplay.subTab = ownerSubTabRaw;
          }

          if (Array.isArray(inheritedSubTabs) && inheritedSubTabs.length) {
            metadataForDisplay.subTabs = inheritedSubTabs;
          } else if (ownerSubTabsArray?.length) {
            metadataForDisplay.subTabs = ownerSubTabsArray;
          }

          const appendSuffix = (value: string): string => appendSuffixOnce(value);

          const cloneAndSuffixInstances = (raw: unknown): unknown => {
            if (!raw) {
              return raw ?? null;
            }

            let rawInstances: Record<string, unknown>;
            if (typeof raw === 'object') {
              rawInstances = JSON.parse(JSON.stringify(raw));
            } else if (typeof raw === 'string') {
              try {
                rawInstances = JSON.parse(raw);
              } catch {
                return raw;
              }
            } else {
              return raw;
            }

            const updatedInstances: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(rawInstances)) {
              const newKey = appendSuffix(String(key));
              if (value && typeof value === 'object') {
                const nested = { ...(value as Record<string, unknown>) };
                if (typeof nested.tableId === 'string') {
                  nested.tableId = appendSuffix(nested.tableId);
                }
                updatedInstances[newKey] = nested;
              } else {
                updatedInstances[newKey] = value;
              }
            }
            return updatedInstances;
          };

          const formatSubTabColumn = (value: unknown): string | null => {
            if (value === null || value === undefined) return null;
            if (Array.isArray(value)) {
              return value.length ? JSON.stringify(value) : null;
            }
            return typeof value === 'string' ? value : String(value);
          };

          const tableSourceNode = originalDisplayNode ?? originalOwnerNode;
          const displayLabel = forceSingleSuffix(originalVar.displayName || 'Donnée');
          const resolvedOrder = originalDisplayNode?.order ?? (originalOwnerNode.order ?? 0) + 1;

          const resolvedSubTabsJson = (() => {
            const resolved = Array.isArray(inheritedSubTabs) && inheritedSubTabs.length
              ? inheritedSubTabs
              : ownerSubTabsArray;
            return resolved?.length ? JSON.stringify(resolved) : null;
          })();

          const displayNodeData = {
            id: displayNodeId,
            treeId: originalOwnerNode.treeId,
            parentId: resolvedParentId,
            type: 'leaf_field' as const,
            subType: null as any,
            label: displayLabel,
            description: null as string | null,
            value: null as string | null,
            order: resolvedOrder,
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
            metadata: metadataForDisplay as any,
            subtab: formatSubTabColumn(inheritedSubTab ?? ownerSubTabRaw),
            subtabs: resolvedSubTabsJson,
            createdAt: now,
            updatedAt: now,
            hasAPI: tableSourceNode.hasAPI ?? false,
            hasCondition: tableSourceNode.hasCondition ?? false,
            hasData: tableSourceNode.hasData ?? false,
            hasFormula: tableSourceNode.hasFormula ?? false,
            hasLink: tableSourceNode.hasLink ?? false,
            hasMarkers: tableSourceNode.hasMarkers ?? false,
            hasTable: tableSourceNode.hasTable ?? false,
            table_name: tableSourceNode.table_name,
            table_activeId: tableSourceNode.table_activeId ? appendSuffix(String(tableSourceNode.table_activeId)) : null,
            table_instances: cloneAndSuffixInstances(tableSourceNode.table_instances) as any,
            table_columns: tableSourceNode.table_columns as any,
            table_data: tableSourceNode.table_data as any,
            table_importSource: tableSourceNode.table_importSource as any,
            table_isImported: tableSourceNode.table_isImported ?? false,
            table_meta: tableSourceNode.table_meta as any,
            table_rows: tableSourceNode.table_rows as any,
            table_type: tableSourceNode.table_type as any,
            linkedTableIds: Array.isArray(tableSourceNode.linkedTableIds)
              ? tableSourceNode.linkedTableIds.map(id => appendSuffix(String(id)))
              : [] as any,
            linkedConditionIds: [] as any,
            linkedFormulaIds: [] as any,
            linkedVariableIds: [newVarId],
            data_activeId: tableSourceNode.data_activeId ? appendSuffix(String(tableSourceNode.data_activeId)) : null,
            data_displayFormat: tableSourceNode.data_displayFormat,
            data_exposedKey: tableSourceNode.data_exposedKey,
            data_instances: cloneAndSuffixInstances(tableSourceNode.data_instances) as any,
            data_precision: tableSourceNode.data_precision,
            data_unit: tableSourceNode.data_unit,
            data_visibleToUser: tableSourceNode.data_visibleToUser ?? false,
            appearance_size: tableSourceNode.appearance_size ?? 'md',
            appearance_variant: tableSourceNode.appearance_variant,
            appearance_width: tableSourceNode.appearance_width ?? '100%',
            fieldType: (tableSourceNode.fieldType as any) ?? 'TEXT',
            fieldSubType: tableSourceNode.fieldSubType as any,
            field_label: displayLabel as any,
          };

          const maybeExisting = await prisma.treeBranchLeafNode.findUnique({ where: { id: displayNodeId } });
          if (maybeExisting) {
            await prisma.treeBranchLeafNode.update({ where: { id: displayNodeId }, data: { ...displayNodeData, createdAt: maybeExisting.createdAt, updatedAt: now } });
            console.log(`✅✅✅ [AUTO-CREATE-DISPLAY] Nœud d'affichage existant mis à jour: ${displayNodeId} (label: ${originalVar.displayName}-${suffix})`);
          } else {
            await prisma.treeBranchLeafNode.create({ data: displayNodeData as any });
            console.log(`✅✅✅ [AUTO-CREATE-DISPLAY] Nœud d'affichage CRÉÉ AVEC SUCCÈS: ${displayNodeId} (label: ${originalVar.displayName}-${suffix})`);
          }

          // ═══════════════════════════════════════════════════════════════════════
          // 📋 COPIER LES FORMULES ET CONDITIONS du nœud propriétaire original
          // ═══════════════════════════════════════════════════════════════════════
          // Le nœud d'affichage doit hériter des formules et conditions
          // de son nœud source (originalVar.nodeId → originalOwnerNode.id)
          const copiedFormulaIds: string[] = [];
          const copiedConditionIds: string[] = [];

          try {
            // 🔢 COPIER LES FORMULES
            const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
              where: { nodeId: originalOwnerNode.id }
            });
            console.log(`📋 Formules à copier depuis ${originalOwnerNode.id}: ${originalFormulas.length}`);
            
            for (const f of originalFormulas) {
              const newFormulaId = appendSuffixOnce(stripTrailingNumeric(f.id));
              // Vérifier si la formule existe déjà (cas de ré-exécution)
              const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: newFormulaId } });
              if (existingFormula) {
                console.log(`   ♻️ Formule ${newFormulaId} déjà existante, skip`);
                copiedFormulaIds.push(newFormulaId);
                continue;
              }
              
              // Utiliser copyFormulaCapacity pour avoir la réécriture centralisée avec suffixes
              try {
                const formulaResult = await copyFormulaCapacity(
                  f.id,
                  displayNodeId,
                  suffix,
                  prisma,
                  { formulaIdMap, nodeIdMap }
                );

                if (formulaResult.success) {
                  formulaIdMap.set(f.id, formulaResult.newFormulaId);
                  copiedFormulaIds.push(formulaResult.newFormulaId);
                  console.log(`   ✅ Formule copiée (centralisée): ${f.id} → ${formulaResult.newFormulaId}`);
                } else {
                  console.error(`   ❌ Erreur copie formule: ${f.id}`);
                }
              } catch (error) {
                console.error(`   ❌ Exception copie formule ${f.id}:`, error);
              }
            }

            // 🔀 COPIER LES CONDITIONS
            const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
              where: { nodeId: originalOwnerNode.id }
            });
            console.log(`📋 Conditions à copier depuis ${originalOwnerNode.id}: ${originalConditions.length}`);
            
            for (const c of originalConditions) {
              const newConditionId = appendSuffixOnce(stripTrailingNumeric(c.id));
              // Vérifier si la condition existe déjà
              const existingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } });
              if (existingCondition) {
                console.log(`   ♻️ Condition ${newConditionId} déjà existante, skip`);
                copiedConditionIds.push(newConditionId);
                continue;
              }
              
              // Remplacer les IDs dans le conditionSet
              let newConditionSet = c.conditionSet;
              if (newConditionSet && nodeIdMap && nodeIdMap.size > 0) {
                const setStr = JSON.stringify(newConditionSet);
                let updatedStr = setStr;
                for (const [oldId, newId] of nodeIdMap.entries()) {
                  updatedStr = updatedStr.split(oldId).join(newId);
                }
                // Remplacer aussi les IDs de formules copiées
                for (const formulaId of copiedFormulaIds) {
                  const originalFormulaId = formulaId.replace(new RegExp(`-${suffix}$`), '');
                  updatedStr = updatedStr.split(originalFormulaId).join(formulaId);
                }
                newConditionSet = JSON.parse(updatedStr);
              }
              
              await prisma.treeBranchLeafNodeCondition.create({
                data: {
                  id: newConditionId,
                  nodeId: displayNodeId,
                  organizationId: c.organizationId,
                  name: c.name ? `${c.name} (${suffix})` : c.name,
                  conditionSet: newConditionSet as any,
                  description: c.description,
                  isDefault: c.isDefault,
                  order: c.order,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
              copiedConditionIds.push(newConditionId);
              console.log(`   ✅ Condition copiée: ${c.id} → ${newConditionId}`);
            }

            // 📊 METTRE À JOUR LE NŒUD avec hasFormula/hasCondition et linkedIds
            const updateData: Record<string, any> = {};
            if (copiedFormulaIds.length > 0) {
              updateData.hasFormula = true;
              updateData.linkedFormulaIds = copiedFormulaIds;
              console.log(`   📊 hasFormula=true, linkedFormulaIds=${copiedFormulaIds.join(', ')}`);
            }
            if (copiedConditionIds.length > 0) {
              updateData.hasCondition = true;
              updateData.linkedConditionIds = copiedConditionIds;
              console.log(`   📊 hasCondition=true, linkedConditionIds=${copiedConditionIds.join(', ')}`);
            }
            
            if (Object.keys(updateData).length > 0) {
              await prisma.treeBranchLeafNode.update({
                where: { id: displayNodeId },
                data: updateData
              });
              console.log(`✅ Nœud d'affichage ${displayNodeId} mis à jour avec formules/conditions`);
            }

          } catch (copyCapErr) {
            console.warn(`⚠️ Erreur lors de la copie des formules/conditions pour display node:`, (copyCapErr as Error).message);
          }
        } else {
          console.warn(`⚠️ Impossible de récupérer le nœud propriétaire original ${originalVar.nodeId}. Fallback newNodeId.`);
        }
        } catch (e) {
          console.warn(`⚠️ Erreur lors de la création du nœud d'affichage dédié:`, (e as Error).message);
        }
      }
      console.log(`🎉🎉🎉 [AUTO-CREATE-DISPLAY] TERMINÉ - Variable: ${originalVar.id} (${originalVar.displayName}), displayNodeId: ${finalNodeId}`);
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
    // ⚠️ CRITICAL: Ne réutiliser QUE si la variable a le BON suffixe !
    // Sinon, créer une nouvelle variable avec le suffixe correct.
    let _reusingExistingVariable = false;
    let _existingVariableForReuse: any = null;
    
    try {
      const existingForNode = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId: finalNodeId } });
      if (existingForNode) {
        // 🔍 Vérifier que la variable existante a le BON suffixe
        const expectedVarId = `${originalVarId}-${suffix}`;
        const hasSuffixMatch = existingForNode.id === expectedVarId || existingForNode.id === newVarId;
        
        if (hasSuffixMatch) {
          console.log(`♻️ Variable existante AVEC BON SUFFIXE pour ${finalNodeId}, réutilisation: ${existingForNode.id}`);
          _reusingExistingVariable = true;
          _existingVariableForReuse = existingForNode;
          
          // Harmoniser le nœud d'affichage avec les données de la variable existante
          try {
            const normalizedExistingName = forceSingleSuffix(existingForNode.displayName);
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
                label: normalizedExistingName || undefined,
                field_label: (normalizedExistingName as any) || undefined
              }
            });
            // 🔴 CRITIQUE: NE PAS ajouter la variable existante aux linkedVariableIds des nœuds ORIGINAUX (templates)
            const isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
            if (!isCopiedNode) {
              console.warn(`⚠️ SKIP addToNodeLinkedField (réutilisation): ${finalNodeId} est un nœud ORIGINAL, pas une copie`);
            } else {
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [existingForNode.id]);
            }
          } catch (e) {
            console.warn(`⚠️ Erreur MAJ display node (réutilisation):`, (e as Error).message);
          }

          // Mettre en cache l'ID réutilisé pour éviter d'autres créations
          const cacheKey = `${originalVarId}|${finalNodeId}`;
          variableCopyCache.set(cacheKey, existingForNode.id);
          
          // ⚠️ NE PAS RETOURNER ICI - Continuer pour copier les capacités de cette variable
          // pour ce nouveau nœud/contexte !
        } else {
          console.warn(`⚠️ Variable existante MAIS MAUVAIS SUFFIXE: ${existingForNode.id}, attendu: ${expectedVarId}`);
          console.warn(`   → Suppression de l'ancienne ET création nouvelle variable obligatoire`);
          
          // 🔧 CRITIQUE: Supprimer l'ancienne variable car contrainte UNIQUE sur nodeId
          // On NE PEUT PAS avoir 2 variables pour le même nodeId
          try {
            await prisma.treeBranchLeafNodeVariable.delete({ where: { id: existingForNode.id } });
            console.log(`🗑️ Ancienne variable supprimée: ${existingForNode.id}`);
          } catch (delError) {
            console.warn(`⚠️ Erreur suppression ancienne variable:`, (delError as Error).message);
          }
          
          // 🎯 FORCER la création d'une nouvelle variable
          _reusingExistingVariable = false;
          _existingVariableForReuse = null;
        }
      }
    } catch (e) {
      console.warn(`⚠️ Vérification variable existante par nodeId échouée:`, (e as Error).message);
    }

    // Utiliser la variable réutilisée ou en créer une nouvelle
    let newVariable: any;
    
    if (_reusingExistingVariable && _existingVariableForReuse) {
      console.log(`♻️ [COPY-VAR] Utilisation de variable existante: ${_existingVariableForReuse.id}`);
      newVariable = _existingVariableForReuse;
    } else {
      console.log(`\n🔨 [COPY-VAR] CRÉATION DE LA VARIABLE EN BASE...`);
      console.log(`   ID: ${newVarId}`);
      console.log(`   nodeId: ${finalNodeId}`);
      console.log(`   exposedKey: ${newExposedKey}`);
      const normalizedDisplayName = forceSingleSuffix(originalVar.displayName);
      console.log(`   displayName: ${normalizedDisplayName}`);
      console.log(`   sourceRef: ${newSourceRef}`);
      console.log(`   sourceType: ${originalVar.sourceType}`);
      
      // 🔍 Vérification CRITIQUE du finalNodeId
      if (!finalNodeId) {
        console.error(`❌ ERREUR CRITIQUE: finalNodeId est NULL/undefined!`);
        console.error(`   autoCreateDisplayNode: ${autoCreateDisplayNode}`);
        console.error(`   originalVar.nodeId: ${originalVar.nodeId}`);
        console.error(`   newNodeId: ${newNodeId}`);
        throw new Error(`Cannot create variable: finalNodeId is ${finalNodeId}. This indicates the display node was not created properly.`);
      }

      try {
        // 🔧 COPIER ET SUFFIXER les capacités liées
        
        // ⭐ CRITIQUE : Ajouter le mapping du nœud ORIGINAL au nœud NOUVEAU
        // Cela permet aux formules de réécrire correctement les @value.shared-ref-xxx
        if (originalVar.nodeId && finalNodeId && !nodeIdMap.has(originalVar.nodeId)) {
          nodeIdMap.set(originalVar.nodeId, finalNodeId);
          console.log(`📍 Mapping nœud ajouté: ${originalVar.nodeId} → ${finalNodeId}`);
        }
        
        // ⭐ FORMULES LIÉES : Copier récursivement
        const newLinkedFormulaIds: string[] = [];
        for (const formulaId of originalVar.linkedFormulaIds || []) {
          const mappedId = formulaIdMap.get(formulaId);
          if (mappedId) {
            newLinkedFormulaIds.push(mappedId);
          } else {
            // 🔀 COPIER LA FORMULE RÉCURSIVEMENT
            try {
              const formulaResult = await copyFormulaCapacity(
                formulaId,
                finalNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionIdMap }
              );
              if (formulaResult.success) {
                formulaIdMap.set(formulaId, formulaResult.newFormulaId);
                newLinkedFormulaIds.push(formulaResult.newFormulaId);
                console.log(`✅ Formule copiée (récursive): ${formulaId} → ${formulaResult.newFormulaId}`);
              } else {
                newLinkedFormulaIds.push(`${formulaId}-${suffix}`);
              }
            } catch (e) {
              console.error(`❌ Erreur copie formule récursive:`, (e as Error).message);
              newLinkedFormulaIds.push(`${formulaId}-${suffix}`);
            }
          }
        }
        
        // ⭐ CONDITIONS LIÉES : Copier récursivement
        const newLinkedConditionIds: string[] = [];
        for (const conditionId of originalVar.linkedConditionIds || []) {
          const mappedId = conditionIdMap.get(conditionId);
          if (mappedId) {
            newLinkedConditionIds.push(mappedId);
          } else {
            // 🔀 COPIER LA CONDITION RÉCURSIVEMENT
            try {
              const conditionResult = await copyConditionCapacity(
                conditionId,
                finalNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionIdMap }
              );
              if (conditionResult.success) {
                conditionIdMap.set(conditionId, conditionResult.newConditionId);
                newLinkedConditionIds.push(conditionResult.newConditionId);
                console.log(`✅ Condition copiée (récursive): ${conditionId} → ${conditionResult.newConditionId}`);
              } else {
                newLinkedConditionIds.push(`${conditionId}-${suffix}`);
              }
            } catch (e) {
              console.error(`❌ Erreur copie condition récursive:`, (e as Error).message);
              newLinkedConditionIds.push(`${conditionId}-${suffix}`);
            }
          }
        }
        
        // ⭐ TABLES LIÉES : Copier récursivement
        const newLinkedTableIds: string[] = [];
        for (const tableId of originalVar.linkedTableIds || []) {
          const mappedId = tableIdMap.get(tableId);
          if (mappedId) {
            newLinkedTableIds.push(mappedId);
          } else {
            // 🔀 COPIER LA TABLE RÉCURSIVEMENT
            try {
              const tableResult = await copyTableCapacity(
                tableId,
                finalNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionIdMap, tableIdMap }
              );
              if (tableResult.success) {
                tableIdMap.set(tableId, tableResult.newTableId);
                newLinkedTableIds.push(tableResult.newTableId);
                console.log(`✅ Table copiée (récursive): ${tableId} → ${tableResult.newTableId}`);
              } else {
                newLinkedTableIds.push(`${tableId}-${suffix}`);
              }
            } catch (e) {
              console.error(`❌ Erreur copie table récursive:`, (e as Error).message);
              newLinkedTableIds.push(`${tableId}-${suffix}`);
            }
          }
        }

        newVariable = await prisma.treeBranchLeafNodeVariable.create({
          data: {
            id: newVarId,
            nodeId: finalNodeId,
            exposedKey: newExposedKey,
            displayName: normalizedDisplayName,
            displayFormat: originalVar.displayFormat,
            unit: originalVar.unit,
            precision: originalVar.precision,
            visibleToUser: originalVar.visibleToUser,
            isReadonly: originalVar.isReadonly,
            defaultValue: originalVar.defaultValue,
            fixedValue: originalVar.fixedValue,
            selectedNodeId: originalVar.selectedNodeId 
              ? (nodeIdMap.get(originalVar.selectedNodeId) || `${originalVar.selectedNodeId}-${suffix}`)
              : null,
            sourceRef: newSourceRef,
            sourceType: originalVar.sourceType,
            metadata: originalVar.metadata as any,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      } catch (createError) {
        console.error(`❌❌❌ ERREUR LORS DE LA CRÉATION DE LA VARIABLE!`);
        console.error(`   Erreur Prisma: ${(createError as Error).message}`);
        console.error(`   Node ID tenté: ${finalNodeId}`);
        console.error(`   Variable ID: ${newVarId}`);
        console.error(`   ExposedKey: ${newExposedKey}`);
        console.error(`   Détails complets:`, createError);
        throw createError;
      }
    }

    if (normalizedRepeatContext) {
      const metadataPayload =
        newVariable.metadata && typeof newVariable.metadata === 'object'
          ? (newVariable.metadata as Record<string, unknown>)
          : undefined;

      logVariableEvent({
        nodeId: newVariable.nodeId,
        displayNodeId: finalNodeId,
        variableId: newVariable.id,
        sourceRef: newVariable.sourceRef,
        sourceType: newVariable.sourceType,
        metadata: metadataPayload,
        context: normalizedRepeatContext
      });
    }

    console.log(`✅✅✅ VARIABLE CRÉÉE AVEC SUCCÈS EN BASE !`);
    console.log(`   ID créé: ${newVariable.id}`);
    console.log(`   nodeId: ${newVariable.nodeId}`);
    console.log(`   exposedKey: ${newVariable.exposedKey}`);
    console.log(`   📍 DEBUG displayName créé: "${newVariable.displayName}"`);
    
    // 🔗 ÉTAPE CRITIQUE : LIAISON AUTOMATIQUE OBLIGATOIRE
    // 🔴 DÉSACTIVÉ lors de duplication de répéteur car:
    // - Les linkedVariableIds sont déjà copiés depuis les templates (ligne 598 deep-copy-service.ts)
    // - Appeler cette fonction ajouterait les variables COPIÉES aux linkedVariableIds des nœuds ORIGINAUX
    // - Cela pollue les templates originaux avec des IDs de copies (-1, -2, etc.)
    // 
    // Cette fonction ne doit être appelée QUE lors de création manuelle de variables,
    // PAS lors de duplication de répéteur.
    if (!isFromRepeaterDuplication) {
      try {
        await linkVariableToAllCapacityNodes(prisma, newVariable.id, newVariable.sourceRef);
      } catch (e) {
        console.error(`❌ Erreur LIAISON AUTOMATIQUE VARIABLE:`, (e as Error).message);
      }
    } else {
      console.log(`⏭️ SKIP linkVariableToAllCapacityNodes (duplication répéteur - linkedVariableIds déjà copiés)`);
    }
    
    // 🔍 VÉRIFICATION: Re-chercher la variable pour confirmer qu'elle existe bien
    const verification = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: newVariable.id }
    });
    if (verification) {
      console.log(`✅ VÉRIFICATION OK: Variable ${newVariable.id} existe bien en base`);
    } else {
      console.error(`❌❌❌ PROBLÈME GRAVE: Variable ${newVariable.id} N'EXISTE PAS après création !`);
      console.error(`❌❌❌ PROBLÈME GRAVE: Variable ${newVariable.id} N'EXISTE PAS après création !`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📝 ÉTAPE 5B : Mettre à jour le NŒUD D'AFFICHAGE (finalNodeId) avec les paramètres data
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const normalizedNodeLabel = forceSingleSuffix(newVariable.displayName);
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
          label: normalizedNodeLabel || undefined,
          field_label: (normalizedNodeLabel as any) || undefined
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
        // 🔴 CRITIQUE: NE PAS ajouter la variable copiée aux linkedVariableIds des nœuds ORIGINAUX (templates)
        // Seulement ajouter aux nœuds COPIÉS (qui ont un suffixe)
        // Vérifier que finalNodeId est bien un nœud copié (avec suffixe) et NON un template original
        const isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
        if (!isCopiedNode) {
          console.warn(`⚠️ SKIP addToNodeLinkedField: ${finalNodeId} est un nœud ORIGINAL (template), pas une copie. On ne doit PAS ajouter ${newVariable.id} à ses linkedVariableIds.`);
        } else {
          await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [newVariable.id]);
          console.log(`✅ Variable ${newVariable.id} ajoutée au linkedVariableIds du nœud copié ${finalNodeId}`);
        }
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

            // Keep the target node (template copy) linked to the NEW variable (suffixé) au lieu de l'original
            // This prevents copies comme Orientation-Inclinaison-1 de rester sur la variable de base
            try {
              if (newNodeId) {
                const suffixedVarId = `${originalVarId}-${suffix}`;
                const targetNode = await prisma.treeBranchLeafNode.findUnique({
                  where: { id: newNodeId },
                  select: { linkedVariableIds: true }
                });

                if (targetNode) {
                  const current = targetNode.linkedVariableIds || [];
                  const withoutOriginal = current.filter(id => id !== originalVarId);
                  // Forcer l'ID suffixé attendu, même si newVariable.id diffère (sécurité)
                  const candidates = [newVariable.id, suffixedVarId].filter(Boolean) as string[];
                  const next = Array.from(new Set([...withoutOriginal, ...candidates]));

                  // Only write if something changes to avoid noisy updates
                  const changed =
                    current.length !== next.length ||
                    current.some(id => !next.includes(id));

                  if (changed) {
                    await prisma.treeBranchLeafNode.update({
                      where: { id: newNodeId },
                      data: {
                        linkedVariableIds: { set: next }
                      }
                    });
                    console.log(`✅ linkedVariableIds updated on target node ${newNodeId}:`, next);
                  }
                }
              }
            } catch (e) {
              console.warn(`⚠️ Failed to sync linkedVariableIds on target node ${newNodeId}:`, (e as Error).message);
            }
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

    // Fallback supplémentaire: remplacer explicitement l'ID original par l'ID suffixé
    try {
      if (newNodeId) {
        await replaceLinkedVariableId(prisma, newNodeId, originalVarId, newVariable.id, suffix);
      }
      if (finalNodeId && finalNodeId !== newNodeId) {
        await replaceLinkedVariableId(prisma, finalNodeId, originalVarId, newVariable.id, suffix);
      }
    } catch (e) {
      console.warn(`⚠️ Failed to replace linkedVariableIds on nodes ${newNodeId} / ${finalNodeId}:`, (e as Error).message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ÉTAPE 6 : Mettre en cache
    // 🚨 BUG FIX: Utiliser cacheKey (originalVarId|finalNodeId) au lieu de originalVarId seul
    // ═══════════════════════════════════════════════════════════════════════
    const cacheKeyFinal = `${originalVarId}|${finalNodeId}`;
    variableCopyCache.set(cacheKeyFinal, newVariable.id);

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
          // Pour une formule/condition/table, on doit trouver le nodeId propriétaire
          // de cette capacité pour mettre à jour son linkedXxxIds
          
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
      displayNodeId: autoCreateDisplayNode ? finalNodeId : undefined,
      // 🟢 RETOURNER LES MAPS pour que repeat-executor puisse les agréger
      formulaIdMap,
      conditionIdMap,
      tableIdMap
    };

  } catch (error) {
    console.error(`\n${'═'.repeat(80)}`);
    console.error(`❌❌❌ ERREUR FATALE lors de la copie de la variable!`);
    console.error(`Variable ID: ${originalVarId}`);
    console.error(`Suffix: ${suffix}`);
    console.error(`Display Node ID: ${finalNodeId || 'undefined'}`);
    console.error(`Message d'erreur:`, error instanceof Error ? error.message : String(error));
    console.error(`Stack trace:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`${'═'.repeat(80)}\n`);
    
    // ⚠️ RE-JETER L'EXCEPTION au lieu de retourner silencieusement success: false
    // Cela force le problème à remonter et à être visible
    throw error;
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

// Remplace une variable liée par sa version suffixée sur un nœud donné
async function replaceLinkedVariableId(
  prisma: PrismaClient,
  nodeId: string,
  originalVarId: string,
  newVarId: string,
  suffix: string | number
): Promise<void> {
  const stripNumericSuffix = (raw: string): string => raw.replace(/-\d+(?:-\d+)*$/, '');
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { linkedVariableIds: true }
  });

  if (!node) return;

  const suffixedId = `${originalVarId}-${suffix}`;
  const current = node.linkedVariableIds || [];

  // 🔧 Nettoyer: retirer toutes les variantes (base ou suffixées) de la même variable
  const base = stripNumericSuffix(originalVarId);
  const filtered = current.filter(id => stripNumericSuffix(id) !== base);

  // Garder uniquement la nouvelle version
  const next = Array.from(new Set([...filtered, newVarId, suffixedId]));

  const changed =
    current.length !== next.length ||
    current.some(id => !next.includes(id));

  if (!changed) return;

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { linkedVariableIds: { set: next } }
  });
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
 