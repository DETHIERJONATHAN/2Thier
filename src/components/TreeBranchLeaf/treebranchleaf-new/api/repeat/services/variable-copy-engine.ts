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
// 📊 Import pour la mise à jour des champs Total après copie
import { updateSumDisplayFieldAfterCopyChange } from '../../sum-display-field-routes.js';

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
  
  // 🔇 Logs d'entrée supprimés pour lisibilité

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
      // Variable en cache, réutilisation silencieuse
      
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
              // Nettoyage silencieux linkedVariableIds
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

    // Variable trouvée, traitement en cours...

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

  // Préparation des IDs...

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

  // Analyse du sourceRef...
  if (originalVar.sourceRef) {
      const parsed = parseSourceRef(originalVar.sourceRef);
      
      if (parsed) {
        capacityType = parsed.type;

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
          // Traitement FORMULE
          if (formulaIdMap.has(parsed.id)) {
            const mappedFormulaId = formulaIdMap.get(parsed.id)!;
            newSourceRef = `${parsed.prefix}${mappedFormulaId}`;
            emitCapacityEvent(mappedFormulaId, 'formula');
          } else {
            // Copier la formule
            try {
              const formulaResult = await copyFormulaCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaCopyCache: formulaIdMap }
              );

              if (formulaResult.success) {
                formulaIdMap.set(parsed.id, formulaResult.newFormulaId);
                newSourceRef = `${parsed.prefix}${formulaResult.newFormulaId}`;
                emitCapacityEvent(formulaResult.newFormulaId, 'formula');
              } else {
                newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
              }
            } catch (e) {
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
            emitCapacityEvent(mappedConditionId, 'condition');
          } else {
            // Copier la condition
            try {
              const conditionResult = await copyConditionCapacity(
                parsed.id,
                newNodeId,
                suffix,
                prisma,
                { nodeIdMap, formulaIdMap, conditionCopyCache: conditionIdMap }
              );

              if (conditionResult.success) {
                conditionIdMap.set(parsed.id, conditionResult.newConditionId);
                newSourceRef = `${parsed.prefix}${conditionResult.newConditionId}`;
                emitCapacityEvent(conditionResult.newConditionId, 'condition');
              } else {
                newSourceRef = applySuffixOnceToSourceRef(originalVar.sourceRef);
              }
            } catch (e) {
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
            emitCapacityEvent(mappedTableId, 'table');
          } else {
            // Copier la table
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
          if (nodeIdMap.has(parsed.id)) {
            newSourceRef = nodeIdMap.get(parsed.id)!;
          } else if (isSharedRefField) {
            newSourceRef = parsed.id;
          } else {
            newSourceRef = appendSuffixOnce(parsed.id);
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 💾 ÉTAPE 5 : Créer la nouvelle variable
    // ═══════════════════════════════════════════════════════════════════════
    
    // 🔍 Déterminer le nodeId du nœud PROPRIÉTAIRE de la variable (nœud d'affichage)
    // 1) Si l'ancien nodeId de la variable a été copié (présent dans nodeIdMap), on utilise ce nouveau nodeId
    // 2) Sinon, si l'auto-création est activée, on crée un nœud d'affichage dédié et on l'utilise
    // 3) Sinon, fallback sur newNodeId (peut causer des collisions si plusieurs variables par nœud)
  let finalNodeId = newNodeId;
    // Détermination du nodeId du nœud d'affichage
    // ⚠️ TOUJOURS créer un display node dédié quand autoCreateDisplayNode=true
    // Même si la variable a un nodeId et même s'il est dans nodeIdMap,
    // on crée un nœud d'affichage séparé pour éviter les collisions et garantir
    // une structure de données cohérente lors de la copie
    if (autoCreateDisplayNode) {
      // Création du nœud d'affichage...
      
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
            linkedVariableIds: true,
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
            // 🔧 FIX 16/12/2025: Ajouter condition_activeId et formula_activeId pour la copie
            condition_activeId: true,
            formula_activeId: true,
            linkedConditionIds: true,
            linkedFormulaIds: true,
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
          linkedVariableIds: true,
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
          // 🔧 FIX 16/12/2025: Ajouter condition_activeId et formula_activeId pour la copie
          condition_activeId: true,
          formula_activeId: true,
          linkedConditionIds: true,
          linkedFormulaIds: true,
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

          originalDisplayNode = pickDisplayCandidate(candidates);
        }

        // Display node trouvé ou fallback vers parent du propriétaire

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
            ?? originalOwnerNode.parentId
            ?? displayParentId
            ?? duplicatedOwnerNode.parentId
            ?? null;
          
          // Vérifier que le parent existe
          if (resolvedParentId && prisma) {
            try {
              const parentExists = await prisma.treeBranchLeafNode.findUnique({
                where: { id: resolvedParentId },
                select: { id: true }
              });
              if (!parentExists) {
                resolvedParentId = duplicatedOwnerNode.parentId ?? null;
              }
            } catch (parentCheckErr) {
              resolvedParentId = duplicatedOwnerNode.parentId ?? null;
            }
          } else if (!resolvedParentId) {
            resolvedParentId = duplicatedOwnerNode.parentId ?? null;
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

          // 🔧 FIX 06/01/2026: Vérifier si la table appartient RÉELLEMENT à ce display node
          // AVANT de mettre hasTable: true. Si la variable a capacityType='table' mais que
          // la table appartient à un AUTRE node (ex: Orientation-inclinaison), on ne doit PAS
          // mettre hasTable: true sur Inclinaison-1 !
          let actuallyOwnsTable = false;
          if (capacityType === 'table' && newSourceRef) {
            const tableIdMatch = newSourceRef.match(/table:\/\/([^/:\s]+)/);
            if (tableIdMatch) {
              const tableId = tableIdMatch[1];
              // Vérifier si cette table appartient au node original
              const tableOwner = await prisma.treeBranchLeafNodeTable.findUnique({
                where: { id: tableId },
                select: { nodeId: true }
              });
              // La table appartient à ce node si son nodeId === le node de la variable OU
              // si le node copié sera le propriétaire de la copie de table
              actuallyOwnsTable = tableOwner?.nodeId === originalVar.nodeId;
            }
          }

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
            // 🔧 FIX: Ne pas hériter des flags hasFormula/hasCondition/hasTable du nœud source
            // si la variable actuelle n'a PAS de capacité de ce type.
            // Sinon un simple champ de saisie (variable simple) se transforme en cellule de calcul !
            hasCondition: capacityType === 'condition' ? (tableSourceNode.hasCondition ?? true) : false,
            hasData: tableSourceNode.hasData ?? false,
            hasFormula: capacityType === 'formula' ? (tableSourceNode.hasFormula ?? true) : false,
            hasLink: tableSourceNode.hasLink ?? false,
            hasMarkers: tableSourceNode.hasMarkers ?? false,
            // 🔧 FIX 06/01/2026: SEULEMENT mettre hasTable: true si:
            // 1) La variable référence une table (capacityType === 'table')
            // 2) ET le node est le PROPRIÉTAIRE de la table (actuallyOwnsTable === true)
            // Sinon Inclinaison-1 (qui affiche une valeur de table d'Orientation) aurait hasTable: true incorrectement
            hasTable: actuallyOwnsTable ? (tableSourceNode.hasTable ?? true) : false,
            table_name: actuallyOwnsTable ? tableSourceNode.table_name : null,
            table_activeId: actuallyOwnsTable && tableSourceNode.table_activeId ? appendSuffix(String(tableSourceNode.table_activeId)) : null,
            table_instances: actuallyOwnsTable ? cloneAndSuffixInstances(tableSourceNode.table_instances) as any : null,
            table_columns: actuallyOwnsTable ? tableSourceNode.table_columns as any : null,
            table_data: actuallyOwnsTable ? tableSourceNode.table_data as any : null,
            table_importSource: actuallyOwnsTable ? tableSourceNode.table_importSource as any : null,
            table_isImported: actuallyOwnsTable ? (tableSourceNode.table_isImported ?? false) : false,
            table_meta: actuallyOwnsTable ? tableSourceNode.table_meta as any : null,
            table_rows: actuallyOwnsTable ? tableSourceNode.table_rows as any : null,
            table_type: actuallyOwnsTable ? tableSourceNode.table_type as any : null,
            linkedTableIds: actuallyOwnsTable && Array.isArray(tableSourceNode.linkedTableIds)
              ? tableSourceNode.linkedTableIds.map(id => appendSuffix(String(id)))
              : [] as any,
            // 🔧 FIX 24/12/2025: Explicitement mettre à null/[] les IDs de capacités non pertinentes
            // pour éviter qu'un champ simple hérite des formules/conditions du nœud source
            formula_activeId: capacityType === 'formula' && tableSourceNode.formula_activeId 
              ? appendSuffix(String(tableSourceNode.formula_activeId)) 
              : null,
            condition_activeId: capacityType === 'condition' && tableSourceNode.condition_activeId 
              ? appendSuffix(String(tableSourceNode.condition_activeId)) 
              : null,
            linkedFormulaIds: [] as any,  // Sera rempli après si capacityType === 'formula'
            linkedConditionIds: [] as any,  // Sera rempli après si capacityType === 'condition'
            // 🔧 FIX 07/01/2026: Pour les composites (qui référencent d'autres variables via linkedVariableIds),
            // on doit copier les linkedVariableIds du nœud ORIGINAL en les suffixant,
            // pas seulement mettre [newVarId]. Exemple: Orientation-inclinaison-1 doit référencer
            // [Orientation-1, Inclinaison-1], pas seulement [Orientation-inclinaison-1]
            linkedVariableIds: Array.isArray(tableSourceNode.linkedVariableIds) && tableSourceNode.linkedVariableIds.length > 0
              ? tableSourceNode.linkedVariableIds.map(varId => appendSuffixOnce(String(varId)))
              : [newVarId],
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
          } else {
            await prisma.treeBranchLeafNode.create({ data: displayNodeData as any });
          }

          // ═══════════════════════════════════════════════════════════════════════
          // 📋 COPIER LES FORMULES ET CONDITIONS du nœud propriétaire original
          // ═══════════════════════════════════════════════════════════════════════
          // 🔧 FIX 16/12/2025: Utiliser tableSourceNode au lieu de originalOwnerNode
          // pour copier les formules/conditions depuis le bon nœud source
          // (peut être le display node original ou le nœud propriétaire)
          // 🔧 FIX 24/12/2025: Ne copier les formules/conditions QUE si la variable
          // a un capacityType correspondant. Sinon un champ simple se transforme en cellule de calcul !
          const copiedFormulaIds: string[] = [];
          const copiedConditionIds: string[] = [];

          try {
            // Copier les formules depuis tableSourceNode UNIQUEMENT si la variable a une capacité formule
            if (capacityType === 'formula') {
              const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
                where: { nodeId: tableSourceNode.id }
              });
              
              for (const f of originalFormulas) {
                const newFormulaId = appendSuffixOnce(stripTrailingNumeric(f.id));
                const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: newFormulaId } });
                
                if (existingFormula) {
                  if (existingFormula.nodeId === displayNodeId) {
                    copiedFormulaIds.push(newFormulaId);
                    continue;
                  }
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
                  }
                } catch (error) {
                  // Erreur copie formule silencieuse
                }
              }
            }

            // Copier les conditions depuis tableSourceNode UNIQUEMENT si la variable a une capacité condition
            if (capacityType === 'condition') {
              const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
                where: { nodeId: tableSourceNode.id }
              });
              
              for (const c of originalConditions) {
                const newConditionId = appendSuffixOnce(stripTrailingNumeric(c.id));
                const existingCondition = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } });
                
                if (existingCondition) {
                  if (existingCondition.nodeId === displayNodeId) {
                    copiedConditionIds.push(newConditionId);
                    continue;
                  }
                  continue;
                }
                
                // 🔧 FIX 16/12/2025: Utiliser copyConditionCapacity au lieu de créer manuellement
                // Cela garantit que le nodeId sera le bon propriétaire (suffixé)
                try {
                  const conditionResult = await copyConditionCapacity(
                    c.id,
                    displayNodeId,
                    suffix,
                    prisma,
                    { nodeIdMap, formulaIdMap, conditionCopyCache: conditionIdMap }
                  );

                  if (conditionResult.success) {
                    conditionIdMap.set(c.id, conditionResult.newConditionId);
                    copiedConditionIds.push(conditionResult.newConditionId);
                  }
                } catch (error) {
                  // Erreur copie condition silencieuse
                }
              }
            }

            // Mettre à jour le nœud avec hasFormula/hasCondition et linkedIds
            const updateData: Record<string, any> = {};
            if (copiedFormulaIds.length > 0) {
              updateData.hasFormula = true;
              updateData.linkedFormulaIds = copiedFormulaIds;
              if (tableSourceNode.formula_activeId) {
                const newFormulaActiveId = appendSuffixOnce(stripTrailingNumeric(String(tableSourceNode.formula_activeId)));
                updateData.formula_activeId = copiedFormulaIds.includes(newFormulaActiveId) ? newFormulaActiveId : copiedFormulaIds[0];
              } else if (copiedFormulaIds.length > 0) {
                updateData.formula_activeId = copiedFormulaIds[0];
              }
            }
            if (copiedConditionIds.length > 0) {
              updateData.hasCondition = true;
              updateData.linkedConditionIds = copiedConditionIds;
              if (tableSourceNode.condition_activeId) {
                const newConditionActiveId = appendSuffixOnce(stripTrailingNumeric(String(tableSourceNode.condition_activeId)));
                updateData.condition_activeId = copiedConditionIds.includes(newConditionActiveId) ? newConditionActiveId : copiedConditionIds[0];
              } else if (copiedConditionIds.length > 0) {
                updateData.condition_activeId = copiedConditionIds[0];
              }
            }
            
            if (Object.keys(updateData).length > 0) {
              await prisma.treeBranchLeafNode.update({
                where: { id: displayNodeId },
                data: updateData
              });
            }

            // 🔧 FIX 06/01/2026: NE PAS copier les tables ici si le displayNode n'est pas
            // le propriétaire original des tables. Les tables sont déjà copiées dans
            // deep-copy-service quand le node propriétaire est copié.
            // Sinon, les tables sont assignées au mauvais node (ex: Inclinaison au lieu d'Orientation)
            const copiedTableIds: string[] = [];
            
            // Seulement copier si le displayNode ORIGINAL possède les tables (pas un autre node)
            const originalDisplayNodeId = originalVar.nodeId;
            const tableOwnerIsSameAsDisplay = tableSourceNode.id === originalDisplayNodeId;
            
            if (tableOwnerIsSameAsDisplay && tableSourceNode.hasTable && Array.isArray(tableSourceNode.linkedTableIds) && tableSourceNode.linkedTableIds.length > 0) {
              for (const originalTableId of tableSourceNode.linkedTableIds) {
                const newTableId = appendSuffixOnce(stripTrailingNumeric(String(originalTableId)));
                const existingTable = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: newTableId } });
                
                if (existingTable) {
                  copiedTableIds.push(newTableId);
                  tableIdMap.set(String(originalTableId), newTableId);
                  continue;
                }
                
                try {
                  const tableResult = await copyTableCapacity(
                    String(originalTableId),
                    displayNodeId,
                    suffix,
                    prisma,
                    { nodeIdMap, tableCopyCache: tableIdMap, tableIdMap }
                  );
                  
                  if (tableResult.success) {
                    tableIdMap.set(String(originalTableId), tableResult.newTableId);
                    copiedTableIds.push(tableResult.newTableId);
                  }
                } catch (tableErr) {
                  // Erreur copie table silencieuse
                }
              }
              
              if (copiedTableIds.length > 0) {
                // 🔧 FIX 08/01/2026: SEULEMENT mettre hasTable: true si le nœud n'est pas un INPUT
                // Sinon Orienation-inclinaison-1 (un champ affichage/composite) aurait hasTable: true incorrectement
                // ce qui ferait que calculatedValue serait null (cf. deep-copy-service ligne 398)
                const displayNode = await prisma.treeBranchLeafNode.findUnique({
                  where: { id: displayNodeId },
                  select: { fieldType: true }
                });
                
                const isInputField = !displayNode || !displayNode.fieldType || displayNode.fieldType === '' || displayNode.fieldType === null;
                
                if (!isInputField) {
                  await prisma.treeBranchLeafNode.update({
                    where: { id: displayNodeId },
                    data: { hasTable: true, linkedTableIds: copiedTableIds }
                  });
                }
              }
            }

          } catch (copyCapErr) {
            // Erreur silencieuse copie formules/conditions
          }
        } else {
          // Fallback si nœud propriétaire introuvable
        }
        } catch (e) {
          // Erreur silencieuse création display node
        }
      }
    }
    
    // Éviter les collisions d'ID
    try {
      const existingById = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id: newVarId } });
      if (existingById) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        newVarId = `${originalVarId}-${suffix}-${tail}`;
      }
    } catch (e) {
      // Vérification collision silencieuse
    }

    try {
      const existingByKey = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { exposedKey: newExposedKey } });
      if (existingByKey) {
        const tail = (finalNodeId || newNodeId || '').slice(-6) || `${Date.now()}`;
        newExposedKey = `${originalVar.exposedKey}-${suffix}-${tail}`;
      }
    } catch (e) {
      // Vérification collision silencieuse
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
        const expectedVarId = `${originalVarId}-${suffix}`;
        const hasSuffixMatch = existingForNode.id === expectedVarId || existingForNode.id === newVarId;
        
        if (hasSuffixMatch) {
          _reusingExistingVariable = true;
          _existingVariableForReuse = existingForNode;
          
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
            const isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
            if (isCopiedNode) {
              await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [existingForNode.id]);
            }
          } catch (e) {
            // Erreur MAJ display node silencieuse
          }

          const cacheKey = `${originalVarId}|${finalNodeId}`;
          variableCopyCache.set(cacheKey, existingForNode.id);
        } else {
          try {
            await prisma.treeBranchLeafNodeVariable.delete({ where: { id: existingForNode.id } });
          } catch (delError) {
            // Erreur suppression silencieuse
          }
          _reusingExistingVariable = false;
          _existingVariableForReuse = null;
        }
      }
    } catch (e) {
      // Vérification silencieuse
    }

    // Utiliser la variable réutilisée ou en créer une nouvelle
    let newVariable: any;
    
    if (_reusingExistingVariable && _existingVariableForReuse) {
      newVariable = _existingVariableForReuse;
    } else {
      const normalizedDisplayName = forceSingleSuffix(originalVar.displayName);
      
      if (!finalNodeId) {
        throw new Error(`Cannot create variable: finalNodeId is ${finalNodeId}. This indicates the display node was not created properly.`);
      }

      // ✅ FIX 11/01/2026: Vérifier que le nœud existe réellement avant de créer la variable
      const nodeExists = await prisma.treeBranchLeafNode.findUnique({
        where: { id: finalNodeId },
        select: { id: true }
      });
      if (!nodeExists) {
        console.warn(`⚠️ Cannot create variable: node ${finalNodeId} does not exist in database. Skipping variable creation.`);
        return {
          success: false,
          error: `Node ${finalNodeId} does not exist`,
          originalVarId
        };
      }

      try {
        // Ajouter le mapping du nœud si nécessaire
        if (originalVar.nodeId && finalNodeId && !nodeIdMap.has(originalVar.nodeId)) {
          nodeIdMap.set(originalVar.nodeId, finalNodeId);
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
              } else {
                newLinkedFormulaIds.push(`${formulaId}-${suffix}`);
              }
            } catch (e) {
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
              } else {
                newLinkedConditionIds.push(`${conditionId}-${suffix}`);
              }
            } catch (e) {
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
              } else {
                newLinkedTableIds.push(`${tableId}-${suffix}`);
              }
            } catch (e) {
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

    // Liaison automatique si pas duplication répéteur
    if (!isFromRepeaterDuplication) {
      try {
        await linkVariableToAllCapacityNodes(prisma, newVariable.id, newVariable.sourceRef);
      } catch (e) {
        // Erreur liaison silencieuse
      }
    }
    
    // Vérification existence
    const verification = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: newVariable.id }
    });
    if (!verification) {
      console.error(`❌ Variable ${newVariable.id} N'EXISTE PAS après création !`);
    }

    // Mettre à jour le nœud d'affichage
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
          label: normalizedNodeLabel || undefined,
          field_label: (normalizedNodeLabel as any) || undefined
        }
      });
    } catch (e) {
      // Erreur MAJ display node silencieuse
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
          }
        }
      } catch (e) {
        // Erreur linkage section silencieuse
      }
    } else if (autoCreateDisplayNode) {
      // Déjà géré ci-dessus: finalNodeId pointe vers le nœud d'affichage (copié ou créé)
      // On s'assure simplement que le lien variable → nœud est en place
      try {
        // 🔴 CRITIQUE: NE PAS ajouter la variable copiée aux linkedVariableIds des nœuds ORIGINAUX (templates)
        // Seulement ajouter aux nœuds COPIÉS (qui ont un suffixe)
        // Vérifier que finalNodeId est bien un nœud copié (avec suffixe) et NON un template original
        const isCopiedNode = finalNodeId.includes('-') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-.+$/i.test(finalNodeId);
        if (isCopiedNode) {
          await addToNodeLinkedField(prisma, finalNodeId, 'linkedVariableIds', [newVariable.id]);
        }
      } catch (e) {
        // Erreur linkage silencieuse
      }
      // Hydratation capacités condition/table si applicable
      try {
        if (capacityType && newSourceRef) {
          const parsedCap = parseSourceRef(newSourceRef);
          const capId = parsedCap?.id;
          if (parsedCap && capId) {
            if (parsedCap.type === 'condition') {
              await prisma.treeBranchLeafNode.update({
                where: { id: finalNodeId },
                data: {
                  hasCondition: true,
                  condition_activeId: capId
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
                  }
                }
              }
            } catch (e) {
              // Erreur sync linkedVariableIds silencieuse
            }
            } else if (parsedCap.type === 'table') {
              // 🔧 FIX 06/01/2026: Vérifier que la table appartient bien à finalNodeId avant de mettre hasTable: true
              // Sinon, un node comme Inclinaison-1 qui ne possède PAS de table pourrait être marqué hasTable: true
              const tbl = await prisma.treeBranchLeafNodeTable.findUnique({ 
                where: { id: capId }, 
                select: { name: true, type: true, nodeId: true } 
              });
              
              // Seulement mettre hasTable: true si la table appartient vraiment à ce node
              const tableOwnerIsFinalNode = tbl?.nodeId === finalNodeId;
              
              if (tableOwnerIsFinalNode) {
                await prisma.treeBranchLeafNode.update({
                  where: { id: finalNodeId },
                  data: {
                    hasTable: true,
                    table_activeId: capId,
                    table_name: tbl?.name || null,
                    table_type: tbl?.type || null
                  }
                });
                await addToNodeLinkedField(prisma, finalNodeId, 'linkedTableIds', [capId]);
              }
            }
          }
        }
      } catch (e) {
        // Erreur sync capacités silencieuse
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
      // Erreur replace linkedVariableIds silencieuse
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
            }
          }
          else if (capacityType === 'condition') {
            const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (condition) {
              await addToNodeLinkedField(prisma, condition.nodeId, 'linkedConditionIds', [parsed.id]);
            }
          }
          else if (capacityType === 'table') {
            const table = await prisma.treeBranchLeafNodeTable.findUnique({
              where: { id: parsed.id },
              select: { nodeId: true }
            });
            if (table) {
              await addToNodeLinkedField(prisma, table.nodeId, 'linkedTableIds', [parsed.id]);
            }
          }
        } catch (e) {
          // Erreur MAJ bidirectionnelle silencieuse
        }
      }
    }

    // 📊 Mettre à jour le champ Total si activé sur le nœud source
    try {
      const originalVariable = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: originalVarId },
        select: { nodeId: true }
      });
      if (originalVariable?.nodeId) {
        updateSumDisplayFieldAfterCopyChange(originalVariable.nodeId, prisma).catch(() => {});
      }
    } catch (sumErr) {
      // Erreur mise à jour Total silencieuse
    }

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
  
  // 🔧 FIX 06/01/2026: Déterminer si la variable référence UNE TABLE (capacité table)
  // vs. si le nœud POSSÈDE une table. Une variable peut référencer une table sans posséder de table!
  // Ex: Inclinaison (variable) peut afficher une valeur de la table d'Orientation,
  // mais Inclinaison-1 ne POSSÈDE pas la table → hasTable doit être FALSE
  const variableHasTableCapacity = v.sourceType === 'table' || v.sourceRef?.includes('table:');
  
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
    // 📊 TABLE: SEULEMENT mettre hasTable: true si la VARIABLE a une capacité table
    // Sinon, une variable qui affiche une valeur de table (ex: Inclinaison) aurait incorrectement hasTable: true
    hasTable: variableHasTableCapacity ? (owner.hasTable ?? false) : false,
    table_name: variableHasTableCapacity ? owner.table_name : null,
    table_activeId: variableHasTableCapacity ? owner.table_activeId : null,
    table_instances: variableHasTableCapacity ? (owner.table_instances as any) : null,
    linkedTableIds: variableHasTableCapacity && Array.isArray(owner.linkedTableIds) ? owner.linkedTableIds : [] as any,
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
  try {
    // Récupérer le nœud source et ses linkedVariableIds
    const sourceNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sourceNodeId },
      select: { linkedVariableIds: true }
    });

    if (!sourceNode) {
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: false,
        error: `Nœud source introuvable: ${sourceNodeId}`
      };
    }

    const linkedVarIds = sourceNode.linkedVariableIds || [];
    
    if (linkedVarIds.length === 0) {
      return {
        count: 0,
        variableIdMap: new Map(),
        results: [],
        success: true
      };
    }

    // Copier chaque variable liée
    const variableIdMap = new Map<string, string>();
    const results: CopyVariableResult[] = [];

    for (let i = 0; i < linkedVarIds.length; i++) {
      const varId = linkedVarIds[i];

      try {
        const result = await copyVariableWithCapacities(
          varId,
          suffix,
          newNodeId,
          prisma,
          options
        );

        if (result.success) {
          variableIdMap.set(varId, result.variableId);
        }

        results.push(result);
      } catch (e) {
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

    // Mise à jour du nœud destination : linkedVariableIds
    const newVarIds = Array.from(variableIdMap.values());
    await addToNodeLinkedField(prisma, newNodeId, 'linkedVariableIds', newVarIds);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      count: successCount,
      variableIdMap,
      results,
      success: failureCount === 0
    };

  } catch (error) {
    console.error(`❌ Erreur globale copyLinkedVariablesFromNode:`, error);
    return {
      count: 0,
      variableIdMap: new Map(),
      results: [],
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
 