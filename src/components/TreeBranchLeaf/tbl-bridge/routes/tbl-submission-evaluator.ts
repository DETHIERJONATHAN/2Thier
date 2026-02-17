/**
 * 🎯 TBL PRISMA SUBMISSION EVALUATOR - ENDPOINT POUR ÉVALUATION COMPLÈTE
 * 
 * Endpoint qui évalue TOUTES les capacités (conditions, formules, tableaux) 
 * d'une soumission avec operation-interpreter.ts (système unifié) et sauvegarde
 * les traductions intelligentes directement en base TreeBranchLeafSubmissionData.
 */

import { Router, Request } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../../../../lib/database';
import { randomUUID } from 'crypto';

type OperationSourceType = 'condition' | 'formula' | 'table' | 'neutral';

interface SubmissionDataEntry {
  id: string;
  submissionId: string;
  nodeId: string;
  value: string | null;
  sourceRef?: string | null;
  operationSource?: OperationSourceType | null;
  fieldLabel?: string | null;
  operationDetail?: Prisma.InputJsonValue | null;
  operationResult?: Prisma.InputJsonValue | null;
  lastResolved?: Date | null;
}
import { evaluateVariableOperation, interpretReference, InterpretResult } from '../../treebranchleaf-new/api/operation-interpreter';

interface AuthenticatedRequest extends Request {
  user?: {
    userId?: string;
    organizationId?: string;
    role?: string;
    isSuperAdmin?: boolean;
    roles?: string[];
  };
}

const router = Router();
const prisma = db;

// 🚀 CACHE: Trigger index par treeId pour éviter 6-7 requêtes prisma par évaluation
// Le trigger index dépend UNIQUEMENT de la structure de l'arbre (nœuds, formules, tables, variables, conditions)
// TTL: 60 secondes — suffisant pour couvrir les changements rapides de l'utilisateur
interface CachedTriggerIndex {
  triggerIndex: Map<string, Set<string>>;
  allLinkedNodes: Array<{ id: string; label: string | null; link_targetNodeId: string }>;
  optionToSelectMap: Map<string, string>;
  timestamp: number;
}
const triggerIndexCache = new Map<string, CachedTriggerIndex>();
const TRIGGER_INDEX_CACHE_TTL = 60_000; // 60 secondes

/** Invalider le cache du trigger index pour un treeId donné */
export function invalidateTriggerIndexCache(treeId?: string) {
  if (treeId) {
    triggerIndexCache.delete(treeId);
  } else {
    triggerIndexCache.clear();
  }
}

function normalizeRefForTriggers(ref?: unknown): string {
  if (!ref || typeof ref !== 'string') return '';
  return ref
    .replace(/^@value\./, '')
    .replace(/^@calculated\./, '')
    .replace(/^@table\./, '')
    .replace(/^@select\./, '')
    .replace(/^node-formula:/, '')
    .replace(/^node-table:/, '')
    .replace(/^node-condition:/, '')
    .replace(/^node-variable:/, '')
    .replace(/^condition:/, '')
    .replace(/^formula:/, '')
    .trim();
}

function collectReferencedNodeIdsForTriggers(data: unknown, out: Set<string>) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) collectReferencedNodeIdsForTriggers(item, out);
    return;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Cas fréquents
    if (typeof obj.ref === 'string') {
      const id = normalizeRefForTriggers(obj.ref);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }

    const leftRef = (obj as any)?.left?.ref;
    if (typeof leftRef === 'string') {
      const id = normalizeRefForTriggers(leftRef);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    const rightRef = (obj as any)?.right?.ref;
    if (typeof rightRef === 'string') {
      const id = normalizeRefForTriggers(rightRef);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }

    if (Array.isArray((obj as any).nodeIds)) {
      for (const raw of (obj as any).nodeIds as unknown[]) {
        if (typeof raw !== 'string') continue;
        const id = normalizeRefForTriggers(raw);
        if (id && isAcceptedNodeId(id)) out.add(id);
      }
    }

    const lookup = (obj as any).lookup as any;
    if (lookup?.selectors?.rowFieldId) {
      const id = String(lookup.selectors.rowFieldId);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    if (lookup?.selectors?.columnFieldId) {
      const id = String(lookup.selectors.columnFieldId);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }

    for (const key of Object.keys(obj)) {
      collectReferencedNodeIdsForTriggers(obj[key], out);
    }
    return;
  }
  if (typeof data === 'string') {
    const s = data.trim();
    if (!s) return;
    // 🔥 FIX R21: Gérer TOUS les préfixes de référence, y compris node-formula:, condition:, etc.
    // Avant ce fix, seuls @value., @table., @calculated., @select. étaient normalisés.
    // Les tokens node-formula:xxx, condition:xxx étaient ignorés → leurs dépendances
    // ne remontaient PAS dans le trigger index → cascade incomplète.
    // Ex: Onduleur TVAC avec token "node-formula:83d7d601..." n'avait PAS le trigger TVA → Onduleur TVAC.
    const id = normalizeRefForTriggers(s);
    if (id && isAcceptedNodeId(id)) {
      out.add(id);
      return;
    }
    // Fallback: accepter directement un nodeId explicite (déjà un UUID brut)
    if (isAcceptedNodeId(s)) out.add(s);
  }
}

function deriveTriggerNodeIdsFromCapacity(capacity: unknown, ownerNodeId: string): string[] {
  const c = capacity as any;
  const out = new Set<string>();
  // Formule: tokens; Table: meta; Condition: conditionSet
  collectReferencedNodeIdsForTriggers(c?.tokens, out);
  collectReferencedNodeIdsForTriggers(c?.meta, out);
  collectReferencedNodeIdsForTriggers(c?.conditionSet, out);
  collectReferencedNodeIdsForTriggers(c?.metadata, out);

  out.delete(ownerNodeId);
  // Éviter les clés virtuelles (lead.*, etc.) qui ne sont pas des nodeIds
  for (const id of Array.from(out)) {
    if (id.includes('.')) out.delete(id);
  }
  return Array.from(out);
}

function uniqStrings(items: string[]): string[] {
  return Array.from(new Set((items || []).filter((x) => typeof x === 'string' && x.trim())));
}

async function deriveTriggerNodeIdsFromNodeId(nodeId: string): Promise<string[]> {
  const out = new Set<string>();
  const [formulas, conditions, tables, variable, selectConfig] = await Promise.all([
    prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId }, select: { tokens: true } }),
    prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId }, select: { conditionSet: true } }),
    prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId }, select: { meta: true } }),
    prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId }, select: { metadata: true } }),
    prisma.treeBranchLeafSelectConfig.findFirst({ where: { nodeId } })
  ]);

  for (const f of formulas) collectReferencedNodeIdsForTriggers((f as any).tokens, out);
  for (const c of conditions) collectReferencedNodeIdsForTriggers((c as any).conditionSet, out);
  for (const t of tables) collectReferencedNodeIdsForTriggers((t as any).meta, out);
  if (variable) collectReferencedNodeIdsForTriggers((variable as any).metadata, out);
  if (selectConfig) collectReferencedNodeIdsForTriggers(selectConfig as any, out);

  out.delete(nodeId);
  for (const id of Array.from(out)) {
    if (id.includes('.')) out.delete(id);
  }
  return Array.from(out);
}

function isAdminOrSuperAdmin(req: Request): boolean {
  const u = (req as AuthenticatedRequest).user as
    | {
        role?: string;
        roles?: string[];
        isSuperAdmin?: boolean;
      }
    | undefined;

  if (!u) return false;
  if (u.isSuperAdmin) return true;

  const normalizedRole = typeof u.role === 'string' ? u.role.toLowerCase().replace(/_/g, '') : '';
  if (normalizedRole === 'superadmin' || normalizedRole === 'admin') return true;

  if (Array.isArray(u.roles)) {
    const normalizedRoles = u.roles
      .filter((r): r is string => typeof r === 'string')
      .map((r) => r.toLowerCase().replace(/_/g, ''));
    if (normalizedRoles.includes('superadmin') || normalizedRoles.includes('admin')) return true;
  }

  return false;
}

async function cloneCompletedSubmissionToDraft(params: {
  originalSubmissionId: string;
  requestedByUserId: string | null;
  targetStatus?: 'draft' | 'completed';
  providedName?: string | null;
}): Promise<string> {
  const { originalSubmissionId, requestedByUserId } = params;
  const now = new Date();

  const targetStatus = params.targetStatus ?? 'draft';
  const providedName = typeof params.providedName === 'string' ? params.providedName.trim() : '';

  return prisma.$transaction(async (tx) => {
    const original = await tx.treeBranchLeafSubmission.findUnique({
      where: { id: originalSubmissionId },
    });

    if (!original) {
      throw new Error(`Soumission introuvable: ${originalSubmissionId}`);
    }

    const newSubmissionId = `tbl-rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const originalSummary = (original.summary || {}) as Record<string, unknown>;
    const baseName =
      (typeof originalSummary.name === 'string' && originalSummary.name.trim())
        ? originalSummary.name.trim()
        : `Devis ${original.id.slice(0, 8)}`;
    const nextSummary: Record<string, unknown> = {
      ...originalSummary,
      name: providedName || `${baseName} (révision)`,
      revisionOfSubmissionId: original.id,
      revisionCreatedAt: now.toISOString(),
      revisionCreatedByUserId: requestedByUserId,
    };

    await tx.treeBranchLeafSubmission.create({
      data: {
        id: newSubmissionId,
        treeId: original.treeId,
        userId: original.userId,
        leadId: original.leadId,
        sessionId: original.sessionId,
        status: targetStatus,
        totalScore: original.totalScore,
        summary: nextSummary as unknown as Prisma.InputJsonValue,
        exportData: (original.exportData ?? {}) as unknown as Prisma.InputJsonValue,
        completedAt: targetStatus === 'completed' ? now : null,
        updatedAt: now,
        organizationId: original.organizationId,
        lastEditedBy: requestedByUserId,
        lockedBy: null,
        lockedAt: null,
        currentVersion: 1,
      },
    });

    const originalRows = await tx.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: original.id },
      orderBy: [{ lastResolved: 'desc' }, { createdAt: 'desc' }],
    });

    // ⚠️ Sécurité: certaines données legacy contiennent des doublons (submissionId,nodeId).
    // On déduplique ici pour éviter un crash lors de la création de la révision.
    const seenNodeIds = new Set<string>();
    const uniqueOriginalRows: typeof originalRows = [];
    let duplicateCount = 0;
    for (const r of originalRows) {
      if (!r.nodeId) continue;
      if (seenNodeIds.has(r.nodeId)) {
        duplicateCount++;
        continue;
      }
      seenNodeIds.add(r.nodeId);
      uniqueOriginalRows.push(r);
    }
    if (duplicateCount > 0) {
      console.warn('⚠️ [TBL][REVISION] Doublons TreeBranchLeafSubmissionData détectés, dédupliqués', {
        submissionId: original.id,
        duplicateCount,
        totalRows: originalRows.length,
        keptRows: uniqueOriginalRows.length,
      });
    }

    if (uniqueOriginalRows.length > 0) {
      await tx.treeBranchLeafSubmissionData.createMany({
        // ⚠️ Robustesse: même après déduplication, on sécurise contre un double appel concurrent.
        // (Prisma/Postgres) Empêche un crash si (submissionId,nodeId) existe déjà.
        skipDuplicates: true,
        data: uniqueOriginalRows.map((r) => ({
          id: randomUUID(),
          submissionId: newSubmissionId,
          nodeId: r.nodeId,
          value: r.value,
          createdAt: now,
          lastResolved: r.lastResolved,
          operationDetail: r.operationDetail,
          operationResult: r.operationResult,
          operationSource: r.operationSource,
          sourceRef: r.sourceRef,
          fieldLabel: r.fieldLabel,
          isVariable: r.isVariable,
          variableDisplayName: r.variableDisplayName,
          variableKey: r.variableKey,
          variableUnit: r.variableUnit,
        })),
      });
    }

    return newSubmissionId;
  });
}

function coerceOperationSource(value: unknown): OperationSourceType {
  const lowered = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (lowered === 'condition' || lowered === 'formula' || lowered === 'table' || lowered === 'neutral') return lowered;
  return 'formula';
}

async function upsertComputedValuesForSubmission(
  submissionId: string,
  rows: Array<{
    nodeId: string;
    value: string | null;
    sourceRef?: string | null;
    operationSource?: OperationSourceType | null;
    fieldLabel?: string | null;
    operationDetail?: Prisma.InputJsonValue | null;
    operationResult?: Prisma.InputJsonValue | null;
    calculatedBy?: string | null;
  }>
): Promise<number> {
  if (!submissionId || !rows.length) return 0;

  let stored = 0;
  for (const row of rows) {
    if (!row.nodeId) continue;
    await prisma.treeBranchLeafSubmissionData.upsert({
      where: { submissionId_nodeId: { submissionId, nodeId: row.nodeId } },
      create: {
        id: `${submissionId}-${row.nodeId}-calc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        submissionId,
        nodeId: row.nodeId,
        value: row.value,
        sourceRef: row.sourceRef ?? null,
        operationSource: row.operationSource ?? null,
        fieldLabel: row.fieldLabel ?? null,
        operationDetail: row.operationDetail ?? null,
        operationResult: row.operationResult ?? null,
        lastResolved: new Date()
      },
      update: {
        value: row.value,
        sourceRef: row.sourceRef ?? null,
        operationSource: row.operationSource ?? null,
        fieldLabel: row.fieldLabel ?? null,
        operationDetail: row.operationDetail ?? null,
        operationResult: row.operationResult ?? null,
        lastResolved: new Date()
      }
    });
    stored++;
  }
  return stored;
}

// Mémoire: staging des modifications (par session) pour ne pas écrire en base tant que non validé
type StageRecord = {
  id: string;
  organizationId: string;
  userId: string;
  treeId: string;
  submissionId?: string;
  formData: Record<string, unknown>;
  updatedAt: number; // epoch ms
};

const stagingStore = new Map<string, StageRecord>();
const STAGE_TTL_MS = 1000 * 60 * 60; // 1h

function pruneStages() {
  const now = Date.now();
  for (const [k, v] of stagingStore) {
    if (now - v.updatedAt > STAGE_TTL_MS) stagingStore.delete(k);
  }
}

function newStageId() {
  return `stage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Utilitaire: nettoyer les formData des clés techniques (__mirror_, __formula_, __condition_, __*)
// ⚠️ GARDE les valeurs vides (null/undefined/"") pour permettre la suppression en base !
function sanitizeFormData(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(sanitizeFormData);
  }
  if (input && typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k.startsWith('__') || k.startsWith('__mirror_') || k.startsWith('__formula_') || k.startsWith('__condition_')) {
        continue;
      }
      // ✅ GARDER les valeurs vides pour permettre la suppression
      result[k] = sanitizeFormData(v);
    }
    return result;
  }
  return input;
}

const UUID_NODE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 🔥 NOUVEAU: Regex pour UUID avec suffixe de duplication (-1, -2, -3, etc.)
const UUID_WITH_SUFFIX_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+$/i;
// FIX R14c: Accepter les nodeIds sum-total (UUID-sum-total et UUID-N-sum-total)
const UUID_SUM_TOTAL_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d+)?-sum-total$/i;
const GENERATED_NODE_REGEX = /^node_[0-9]+_[a-z0-9]+$/i;
const SHARED_REFERENCE_REGEX = /^shared-ref-[a-z0-9-]+$/i;

function normalizeTriggerCandidate(trigger: string): string {
  const trimmed = String(trigger || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('@value.')) return trimmed.substring(7);
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed.slice(1, -1);
  return trimmed;
}

function extractNumericSuffix(nodeId: string): string | null {
  const m = String(nodeId || '').match(/-(\d+)$/);
  return m ? m[1] : null;
}

function applyCopyScopedInputAliases(valueMap: Map<string, unknown>, ownerNodeId: string, capacity: unknown): string[] {
  const suffix = extractNumericSuffix(ownerNodeId);
  if (!suffix) return [];

  const suffixToken = `-${suffix}`;
  const referenced = deriveTriggerNodeIdsFromCapacity(capacity, ownerNodeId);

  const injected: string[] = [];
  for (const refIdRaw of referenced) {
    const refId = normalizeTriggerCandidate(refIdRaw);
    if (!refId) continue;

    // Cas principal: la formule copie (ownerNodeId-1) référence un UUID de base,
    // mais l'utilisateur a modifié l'input suffixé (uuid-1).
    if (UUID_NODE_REGEX.test(refId)) {
      const suffixed = `${refId}${suffixToken}`;
      if (!valueMap.has(refId) && valueMap.has(suffixed)) {
        valueMap.set(refId, valueMap.get(suffixed));
        injected.push(refId);
      }
    }
  }

  if (injected.length) {
  }

  return injected;
}

function expandTriggersForCopy(displayNodeId: string, triggerIds: string[]): string[] {
  const suffix = extractNumericSuffix(displayNodeId);
  if (!suffix) return triggerIds;
  const suffixToken = `-${suffix}`;
  const out = new Set<string>();
  for (const raw of triggerIds || []) {
    const normalized = normalizeTriggerCandidate(raw);
    if (!normalized) continue;
    out.add(normalized);
    // Si trigger = UUID sans suffixe, ajouter version suffixée
    if (UUID_NODE_REGEX.test(normalized)) {
      out.add(`${normalized}${suffixToken}`);
    }
  }
  return Array.from(out);
}

function matchesChangedField(triggers: string[], changedFieldId: string): boolean {
  const normalizedChanged = normalizeTriggerCandidate(changedFieldId);
  if (!normalizedChanged) return false;
  for (const t of triggers || []) {
    const normalized = normalizeTriggerCandidate(t);
    if (!normalized) continue;
    if (normalized === normalizedChanged) return true;
  }
  return false;
}

function isSharedReferenceId(nodeId: string): boolean {
  return SHARED_REFERENCE_REGEX.test(nodeId);
}

function isAcceptedNodeId(nodeId: string): boolean {
  return (
    UUID_NODE_REGEX.test(nodeId) || 
    UUID_WITH_SUFFIX_REGEX.test(nodeId) ||  // 🔥 NOUVEAU: Accepter UUID avec suffixe -1, -2, etc.
    UUID_SUM_TOTAL_REGEX.test(nodeId) ||  // FIX R14c: Accepter UUID-sum-total
    GENERATED_NODE_REGEX.test(nodeId) || 
    isSharedReferenceId(nodeId)
  );
}

async function resolveSharedReferenceAliases(sharedRefs: string[], treeId?: string) {
  if (!sharedRefs.length) {
    return new Map<string, string[]>();
  }

  const where: Prisma.TreeBranchLeafNodeWhereInput = {
    sharedReferenceId: { in: sharedRefs }
  };

  if (treeId) {
    where.treeId = treeId;
  }

  const aliases = await prisma.treeBranchLeafNode.findMany({
    where,
    select: { id: true, sharedReferenceId: true }
  });

  const map = new Map<string, string[]>();
  for (const alias of aliases) {
    if (!alias.sharedReferenceId) continue;
    if (!map.has(alias.sharedReferenceId)) {
      map.set(alias.sharedReferenceId, []);
    }
    map.get(alias.sharedReferenceId)!.push(alias.id);
  }

  return map;
}

async function resolveAliasToSharedReferenceId(nodeIds: string[], treeId?: string) {
  const ids = (nodeIds || []).filter((id) => typeof id === 'string' && id.trim());
  if (!ids.length) return new Map<string, string>();

  const rows = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: ids },
      ...(treeId ? { treeId } : {}),
      sharedReferenceId: { not: null },
    },
    select: { id: true, sharedReferenceId: true },
  });

  const map = new Map<string, string>();
  for (const r of rows) {
    const sharedRef = (r as any).sharedReferenceId as string | null;
    if (sharedRef && typeof sharedRef === 'string' && sharedRef.trim()) {
      map.set(r.id, sharedRef);
    }
  }
  return map;
}

async function applySharedReferenceValues(
  target: Map<string, unknown>,
  entries: Array<[string, unknown]>,
  treeId?: string
) {
  if (!entries.length) return;

  const sharedRefKeys = entries
    .map(([key]) => key)
    .filter(isSharedReferenceId);

  const aliasMap = sharedRefKeys.length
    ? await resolveSharedReferenceAliases(sharedRefKeys, treeId)
    : new Map<string, string[]>();

  for (const [key, value] of entries) {
    target.set(key, value);
    if (!isSharedReferenceId(key)) continue;

    const aliases = aliasMap.get(key) || [];
    for (const alias of aliases) {
      target.set(alias, value);
    }
  }

  // 🔁 BONUS: résolution inverse (alias nodeId → shared-ref-*)
  // Cas réel: la formule référence un shared-ref, mais le frontend envoie seulement l'alias (nodeId).
  try {
    const aliasCandidates = entries
      .map(([key]) => key)
      .filter((k) => !isSharedReferenceId(k) && isAcceptedNodeId(k));
    if (aliasCandidates.length) {
      const reverse = await resolveAliasToSharedReferenceId(aliasCandidates, treeId);
      for (const [key, value] of entries) {
        if (isSharedReferenceId(key)) continue;
        const sharedRef = reverse.get(key);
        if (!sharedRef) continue;
        if (!target.has(sharedRef)) {
          target.set(sharedRef, value);
        }
      }
    }
  } catch {
    // best-effort: pas bloquant
  }
}

// Réutilisables: sauvegarde des entrées utilisateur (neutral) avec NO-OP
async function saveUserEntriesNeutral(
  submissionId: string,
  formData: Record<string, unknown> | undefined,
  treeId?: string
) {
  if (!formData || typeof formData !== 'object') return 0;

  let saved = 0;
  const entries = new Map<string, SubmissionDataEntry>();
  const entriesToDelete = new Set<string>(); // 🗑️ Champs à supprimer (vidés)

  // 🚫 ÉTAPE 1 : Récupérer les nodes à EXCLURE
  // IMPORTANT: ne JAMAIS exclure sur `calculatedValue != null`.
  // Certaines données historiques ont un calculatedValue sur des champs user-input.
  // On exclut les champs calculés pour éviter de les sauvegarder comme inputs.
  // 🔥 FIX E: AJOUTER hasFormula=true ET hasCondition=true comme critères d'exclusion.
  // AVANT: seuls fieldType='DISPLAY' ou subType='display' étaient exclus.
  // Mais beaucoup de champs calculés (ex: "Main d'œuvre TVAC") ont subType='TEXT' malgré hasFormula=true.
  // Résultat: saveUserEntriesNeutral les sauvegardait comme inputs "neutral", ÉCRASANT la valeur calculée.
  // Lors de l'autosave (mode='autosave', skip DISPLAY), cette valeur stale persistait.
  const excludedNodes = treeId
    ? await prisma.treeBranchLeafNode.findMany({
        where: {
          treeId,
          OR: [
            { fieldType: 'DISPLAY' },
            {
              type: { in: ['leaf_field', 'LEAF_FIELD'] },
              subType: { in: ['display', 'DISPLAY', 'Display'] },
            },
            // 🔥 FIX E: Exclure TOUT nœud ayant une formule ou condition active
            // Si hasFormula=true → c'est un champ calculé, pas un input utilisateur
            { hasFormula: true },
            { hasCondition: true },
          ],
        },
        select: { id: true, label: true },
      })
    : [];

  const excludedNodeIds = new Set(excludedNodes.map(n => n.id));

  // 🔧 FIX E2: RE-INCLURE les nœuds qui ont UNIQUEMENT des formules de CONTRAINTE
  // Une formule de contrainte a targetProperty non-null (ex: "number_max").
  // Ces champs restent éditables — la formule sert juste à limiter la valeur max/min.
  // On ne doit PAS les exclure de la sauvegarde utilisateur.
  if (treeId && excludedNodeIds.size > 0) {
    // Récupérer les nœuds exclus qui ont hasFormula=true
    const formulaExcludedIds = excludedNodes
      .filter(n => excludedNodeIds.has(n.id))
      .map(n => n.id);
    
    if (formulaExcludedIds.length > 0) {
      // Trouver les nœuds qui ont AU MOINS une formule de calcul (targetProperty IS NULL)
      const nodesWithCalcFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: {
          nodeId: { in: formulaExcludedIds },
          targetProperty: null, // formule de calcul (pas de contrainte)
        },
        select: { nodeId: true },
      });
      const nodesWithCalcSet = new Set(nodesWithCalcFormulas.map(f => f.nodeId));

      // Re-inclure les nœuds qui n'ont AUCUNE formule de calcul (uniquement contraintes)
      for (const nodeId of formulaExcludedIds) {
        if (!nodesWithCalcSet.has(nodeId)) {
          // Ce nœud a hasFormula=true mais toutes ses formules sont des contraintes → éditable
          excludedNodeIds.delete(nodeId);
        }
      }
    }
  }

  const sharedRefKeys = Object.keys(formData).filter(isSharedReferenceId);
  const sharedRefAliasMap = sharedRefKeys.length
    ? await resolveSharedReferenceAliases(sharedRefKeys, treeId)
    : new Map<string, string[]>();

  // 🔁 Résolution inverse: alias nodeId → sharedReferenceId (si le frontend n'a pas envoyé la clé shared-ref-*)
  const aliasKeys = Object.keys(formData)
    .filter((k) => !isSharedReferenceId(k) && isAcceptedNodeId(k));
  const aliasToSharedRefMap = aliasKeys.length
    ? await resolveAliasToSharedReferenceId(aliasKeys, treeId)
    : new Map<string, string>();

  for (const [key, value] of Object.entries(formData)) {
    if (key.startsWith('__mirror_') || key.startsWith('__formula_') || key.startsWith('__condition_')) {
      continue;
    }
    if (!isAcceptedNodeId(key)) continue;
    
    // 🚫 ÉTAPE 2 : Skip les champs calculés display (ne jamais les sauvegarder comme inputs)
    if (excludedNodeIds.has(key)) {
      continue; // Ne PAS sauvegarder les champs calculés
    }
    
    // ✅ ÉTAPE 3 : Gérer les valeurs (remplies OU vides)
    const isEmpty = value === null || value === undefined || value === '';

    const storageIds = isSharedReferenceId(key)
      ? [key, ...(sharedRefAliasMap.get(key) || [])]
      : [key, ...(aliasToSharedRefMap.get(key) ? [aliasToSharedRefMap.get(key)!] : [])];

    for (const nodeId of storageIds) {
      if (!isAcceptedNodeId(nodeId)) continue;

      if (isEmpty) {
        // 🗑️ Si vide → marquer pour SUPPRESSION
        entriesToDelete.add(nodeId);
      } else {
        // ✅ Si rempli → marquer pour SAUVEGARDE
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        const entry: SubmissionDataEntry = {
          id: `${submissionId}-${nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          submissionId,
          nodeId,
          value: serializedValue,
          operationSource: 'neutral',
          operationDetail: {
            inputValue: value,
            nodeId,
            action: 'user_input',
            sourceNodeId: key,
            aliasResolved: nodeId !== key
          } as Prisma.InputJsonValue
        };

        entries.set(nodeId, entry);
      }
    }
  }

  // ✅ SAUVEGARDER les entrées remplies
  for (const entry of entries.values()) {
    const key = { submissionId_nodeId: { submissionId: entry.submissionId, nodeId: entry.nodeId } } as const;
    const existing = await prisma.treeBranchLeafSubmissionData.findUnique({ where: key });
    const normalize = (v: unknown) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch { return String(v); }
    };
    if (existing) {
      // Idempotent: on ne considère que la valeur et la source; les détails/résultats neutres sont stables
      const changed = (
        normalize(existing.value) !== normalize(entry.value) ||
        (existing.operationSource || null) !== (entry.operationSource || null)
      );
      if (changed) {
        await prisma.treeBranchLeafSubmissionData.update({
          where: key,
          data: {
            value: entry.value,
            operationSource: 'neutral',
            operationDetail: entry.operationDetail
          }
        });
        saved++;
      }
    } else {
      await prisma.treeBranchLeafSubmissionData.create({ data: entry });
      saved++;
    }
  }

  // 🗑️ SUPPRIMER les entrées vidées
  for (const nodeId of entriesToDelete) {
    // Ne pas supprimer si on a aussi une entrée à sauvegarder (cas de mise à jour)
    if (entries.has(nodeId)) continue;
    
    const key = { submissionId_nodeId: { submissionId, nodeId } } as const;
    const existing = await prisma.treeBranchLeafSubmissionData.findUnique({ where: key });
    if (existing) {
      await prisma.treeBranchLeafSubmissionData.delete({ where: key });
      saved++;
    }
  }

  return saved;
}

/**
 * 🔥 FONCTION UNIFIÉE D'ÉVALUATION DES CAPACITÉS
 * 
 * Cette fonction évalue TOUTES les capacités (formules, conditions, tables) pour un arbre
 * et stocke les résultats :
 * - Display fields (leaf_field, DISPLAY) → UNIQUEMENT dans TreeBranchLeafNode.calculatedValue
 * - Autres capacités → dans SubmissionData (pour les champs non-display)
 * 
 * @param submissionId - ID de la soumission
 * @param organizationId - ID de l'organisation
 * @param userId - ID de l'utilisateur
 * @param treeId - ID de l'arbre
 * @param formData - 🔑 NOUVEAU: Données fraîches du formulaire pour évaluation réactive
 * @param mode - Mode d'évaluation: 'open' (ouverture, recalcul complet), 'autosave' (skip DISPLAY), 'change' (recalcul ciblé)
 * @param changedFieldId - ID du champ modifié (utilisé en mode 'change')
 */
type EvaluationMode = 'open' | 'autosave' | 'change';

async function evaluateCapacitiesForSubmission(
  submissionId: string,
  organizationId: string,
  userId: string | null,
  treeId: string,
  formData?: Record<string, unknown>,
  mode: EvaluationMode = 'change',
  changedFieldId?: string
) {
  // 🔑 ÉTAPE 1: Construire le valueMap avec les données fraîches du formulaire
  const valueMap = new Map<string, unknown>();

  // 🔑 FIX R22: Charger les données du Lead depuis la soumission pour les clés virtuelles (lead.postalCode, etc.)
  // Sans cela, les lookups de table qui utilisent lead.postalCode retournent "Aucune sélection colonne"
  try {
    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      select: { leadId: true }
    });
    if (submission?.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: submission.leadId },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          company: true, leadNumber: true, linkedin: true, website: true,
          status: true, notes: true, data: true
        }
      });
      if (lead) {
        valueMap.set('lead.id', lead.id);
        valueMap.set('lead.firstName', lead.firstName);
        valueMap.set('lead.lastName', lead.lastName);
        valueMap.set('lead.email', lead.email);
        valueMap.set('lead.phone', lead.phone);
        valueMap.set('lead.company', lead.company);
        valueMap.set('lead.leadNumber', lead.leadNumber);
        valueMap.set('lead.linkedin', lead.linkedin);
        valueMap.set('lead.website', lead.website);
        valueMap.set('lead.status', lead.status);
        valueMap.set('lead.notes', lead.notes);
        if (lead.data && typeof lead.data === 'object') {
          const leadData = lead.data as Record<string, unknown>;
          if (leadData.postalCode) {
            valueMap.set('lead.postalCode', leadData.postalCode);
          } else if (leadData.address && typeof leadData.address === 'object') {
            const addressObj = leadData.address as Record<string, unknown>;
            if (addressObj.zipCode) {
              valueMap.set('lead.postalCode', addressObj.zipCode);
            } else if (addressObj.postalCode) {
              valueMap.set('lead.postalCode', addressObj.postalCode);
            }
          } else if (leadData.address && typeof leadData.address === 'string') {
            const postalCodeMatch = leadData.address.match(/\b(\d{4,5})\b/);
            if (postalCodeMatch) {
              valueMap.set('lead.postalCode', postalCodeMatch[1]);
            }
          }
          if (leadData.address) valueMap.set('lead.address', leadData.address);
          if (leadData.city) valueMap.set('lead.city', leadData.city);
          if (leadData.country) valueMap.set('lead.country', leadData.country);
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ [EVALUATE] Chargement lead échoué (best-effort):', (e as Error)?.message || e);
  }

  // �️ FIX 2026-01-31: Collecter les DISPLAY nodeIds pour protéger leurs valeurs DB
  // Les DISPLAY fields sont CALCULÉS par le backend - le frontend ne fait que "cacher" les valeurs.
  // Lors d'une révision, le frontend peut envoyer des valeurs obsolètes (0, 1) pour les DISPLAY fields
  // qui servent de dépendances à d'autres calculs. On doit CONSERVER les valeurs DB pour ces champs.
  const displayNodeIds = new Set<string>();
  try {
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId,
        OR: [
          { fieldType: 'DISPLAY' },
          { type: { in: ['leaf_field', 'LEAF_FIELD'] }, subType: { in: ['display', 'DISPLAY', 'Display'] } },
        ],
      },
      select: { id: true },
    });
    for (const n of displayNodes) {
      displayNodeIds.add(n.id);
      displayNodeIds.add(`${n.id}-sum-total`);
    }
  } catch {
    // best-effort
  }
  
  // 🔁 IMPORTANT: Hydrater d'abord depuis la DB (submission scoped) pour éviter les régressions
  // quand le frontend envoie un payload partiel/vidé (ex: formData: {}).
  // ✅ FIX 2026-01-31: Charger TOUTES les données (y compris DISPLAY calculées) pour que les dépendances
  // soient disponibles lors du calcul. Les résultats calculés seront recalculés et écraseront les anciennes valeurs.
  const dbDisplayValues = new Map<string, unknown>(); // 🛡️ Mémoriser les valeurs DB des DISPLAY fields
  try {
    const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId },
      select: { nodeId: true, value: true, operationSource: true }
    });
    if (existingData.length) {
      const existingEntries = existingData.map(r => [r.nodeId, r.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, treeId);
      // 🛡️ Mémoriser les valeurs DB des DISPLAY fields pour les restaurer après formData
      for (const r of existingData) {
        if (displayNodeIds.has(r.nodeId)) {
          dbDisplayValues.set(r.nodeId, r.value);
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ [EVALUATE] Hydratation DB du valueMap échouée (best-effort):', (e as Error)?.message || e);
  }
  
  // 🛡️ FIX 2026-01-31 v2: Collecter les valeurs DB restaurées pour les renvoyer au frontend
  // Ces valeurs seront ajoutées à computedValuesToStore même si le champ est skippé par le trigger
  const restoredDbDisplayValues = new Map<string, unknown>();
  
  if (formData && typeof formData === 'object') {
    // Appliquer les données du formulaire au valueMap (avec résolution des sharedReferences)
    const entries = Object.entries(formData).filter(([k]) => !k.startsWith('__'));
    await applySharedReferenceValues(valueMap, entries as Array<[string, unknown]>, treeId);
    
    // 🛡️ FIX 2026-01-31 v3 (FIX C): RESTAURER les valeurs DB des DISPLAY fields
    // UNIQUEMENT si le frontend n'a PAS envoyé de valeur pour ce champ (clé absente du formData).
    // ⚠️ AVANT: l'heuristique considérait 0 et 1 comme "faibles" et les écrasait par les valeurs DB.
    // Cela cassait les calculs légitimes qui produisent 0 ou 1 (ex: TVA=0, quantité=1).
    // MAINTENANT: on ne restaure que si formData n'a PAS la clé → valeur réellement absente.
    let restoredCount = 0;
    for (const [nodeId, dbValue] of dbDisplayValues) {
      // 🔑 FIX C: Vérifier si la clé est ABSENTE du formData original (pas juste si la valeur est "faible")
      const formHasKey = formData && nodeId in formData;
      if (!formHasKey && dbValue !== undefined && dbValue !== null && dbValue !== '') {
        valueMap.set(nodeId, dbValue);
        // 🔑 Mémoriser pour renvoyer au frontend
        restoredDbDisplayValues.set(nodeId, dbValue);
        restoredCount++;
      }
    }
    if (restoredCount > 0) {
      console.log(`🛡️ [FIX C] Restauré ${restoredCount} valeurs DB DISPLAY (clés absentes du formData)`);
    }
  }
  
  // 🔥 FIX B (remplace FIX R8): Suppression CIBLÉE des valeurs DISPLAY du valueMap
  // AVANT: on supprimait TOUS les display values → si display B dépend de display C (non affecté),
  // C était supprimé du valueMap → B lisait undefined → calculait 0.
  // MAINTENANT: la suppression est DÉFÉRÉE après le calcul de affectedDisplayFieldIds (voir FIX B phase 2).
  // En mode 'open', on supprime TOUT (recalcul complet).
  if (mode === 'open') {
    for (const displayNodeId of displayNodeIds) {
      valueMap.delete(displayNodeId);
    }
  }
  // ⚠️ En mode 'change': la suppression ciblée se fait plus bas, après affectedDisplayFieldIds (FIX B phase 2)
  
  // � FIX R21b: Résoudre les valeurs LINK pour TOUS les modes (open, change, autosave)
  // PROBLÈME: En mode 'open', les LINK fields ne sont jamais résolus car le bloc trigger index
  // ne s'exécute qu'en mode 'change'. Si un DISPLAY field (ex: "Onduleur achat") fait un table
  // lookup qui dépend d'un LINK field (ex: "Onduleur" → pointe vers le select onduleur du repeater),
  // la valeur du LINK est absente du valueMap → le lookup retourne 0/null.
  // FIX: Charger tous les LINK fields, résoudre la valeur de leur cible dans le valueMap,
  // et injecter cette valeur sous l'ID du LINK. Supporte les suffixes repeater (-1, -2, etc.)
  try {
    const linkNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId, hasLink: true, link_targetNodeId: { not: null } },
      select: { id: true, label: true, link_targetNodeId: true }
    });
    let linkResolvedCount = 0;
    for (const ln of linkNodes) {
      const targetId = ln.link_targetNodeId!;
      // Si le valueMap a déjà une valeur pour ce LINK, ne pas écraser
      if (valueMap.has(ln.id) && valueMap.get(ln.id) !== null && valueMap.get(ln.id) !== undefined && valueMap.get(ln.id) !== '' && valueMap.get(ln.id) !== 0 && valueMap.get(ln.id) !== '0') {
        continue;
      }
      // Chercher la valeur de la cible dans le valueMap (ID de base)
      let targetValue = valueMap.get(targetId);
      // Si pas trouvé, chercher avec des suffixes repeater (-1, -2, etc.)
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        for (const [key, val] of valueMap) {
          if (key.startsWith(targetId + '-') && /^-\d+$/.test(key.slice(targetId.length))) {
            if (val !== undefined && val !== null && val !== '') {
              targetValue = val;
              break; // Prendre la première valeur trouvée (instance la plus récente)
            }
          }
        }
      }
      // Si pas trouvé dans valueMap, chercher dans SubmissionData
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        const targetSubmData = await prisma.treeBranchLeafSubmissionData.findFirst({
          where: { submissionId, nodeId: targetId },
          select: { value: true }
        });
        if (targetSubmData?.value) targetValue = targetSubmData.value;
      }
      // Si toujours pas trouvé, chercher SubmissionData avec suffixes repeater
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        const suffixedSubmData = await prisma.treeBranchLeafSubmissionData.findMany({
          where: { submissionId, nodeId: { startsWith: targetId } },
          select: { nodeId: true, value: true },
          orderBy: { lastResolved: 'desc' }
        });
        for (const sd of suffixedSubmData) {
          if (sd.nodeId !== targetId && /^-\d+$/.test(sd.nodeId.slice(targetId.length))) {
            if (sd.value !== null && sd.value !== '') {
              targetValue = sd.value;
              break;
            }
          }
        }
      }
      if (targetValue !== undefined && targetValue !== null && targetValue !== '') {
        valueMap.set(ln.id, targetValue);
        linkResolvedCount++;
      }
    }
    if (linkResolvedCount > 0) {
      console.log(`🔗 [FIX R21b] ${linkResolvedCount} LINK field(s) résolus dans le valueMap (mode: ${mode})`);
    }
  } catch (e) {
    console.warn('⚠️ [FIX R21b] Résolution LINK fields échouée (best-effort):', (e as Error)?.message || e);
  }
  
  // �🔥 RÉCUPÉRER LES VARIABLES ET LES FORMULES
  const [variablesRaw, formulasRaw] = await Promise.all([
    prisma.treeBranchLeafNodeVariable.findMany({
      where: { TreeBranchLeafNode: { treeId }, sourceRef: { not: null } },
      include: { TreeBranchLeafNode: { select: { id: true, label: true, fieldType: true, type: true } } }
    }),
    prisma.treeBranchLeafNodeFormula.findMany({
      where: { 
        nodeId: {
          in: (await prisma.treeBranchLeafNode.findMany({
            where: { treeId, hasFormula: true },
            select: { id: true }
          })).map(n => n.id)
        }
      }
    })
  ]);
  
  // 🔑 Récupérer les infos des nodes pour les formules
  const formulaNodeIds = formulasRaw.map(f => f.nodeId);
  const formulaNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: formulaNodeIds } },
    select: { id: true, label: true, fieldType: true, type: true, hasFormula: true }
  });
  const nodeMap = new Map(formulaNodes.map(n => [n.id, n]));
  
  // 🔑 COMBINER Variables + Formulas en un seul tableau avec sourceRef unifié
  const capacitiesRaw = [
    ...variablesRaw,
    ...formulasRaw.map(f => ({
      ...f,
      sourceRef: `formula:${f.id}`,
      TreeBranchLeafNode: nodeMap.get(f.nodeId)
    }))
  ];
  
  // 🔑 FIX R8: TRI TOPOLOGIQUE des capacities pour garantir l'ordre de dépendance
  // Les DISPLAY fields qui dépendent d'autres DISPLAY fields doivent être évalués APRÈS leurs dépendances.
  // Ex: prix_optimiseur dépend d'optimiseur qui dépend de n_panneau → n_panneau > optimiseur > prix_optimiseur
  const displayCapNodeIds = new Set(capacitiesRaw.filter(c => 
    c.TreeBranchLeafNode?.fieldType === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'DISPLAY' || c.TreeBranchLeafNode?.type === 'leaf_field'
  ).map(c => c.nodeId));
  
  // 🔥 FIX R14: Construire un graphe de dépendances inter-display FIABLE
  // L'ancien code ne détectait PAS les dépendances car:
  //   1. metadata.triggerNodeIds n'était jamais lu (metadata pas sélectionné dans la requête Prisma)
  //   2. sourceRef des formules = "formula:<id>" → pas de nodeIds utiles
  //   3. displayDeps.set() écrasait les deps quand un nodeId avait variable + formula
  // CONSÉQUENCE: ordre d'évaluation aléatoire → DISPLAY fields lisant des valeurs STALE
  // FIX: Utiliser le trigger index (construit plus bas) pour dériver les dépendances APRÈS sa construction.
  // Pour l'instant, initialiser displayDeps vide - il sera rempli APRÈS le trigger index.
  
  // FIX R14c: AJOUTER les sum-total fields dans displayCapNodeIds
  // Les sum-total (ex: e1007de0-...-sum-total) sont dans capacitiesRaw mais pas detectes comme DISPLAY.
  // Sans ca, le tri topologique ne peut pas les ordonner correctement par rapport aux fields qui en dependent.
  for (const cap of capacitiesRaw) {
    if (cap.nodeId.endsWith('-sum-total')) {
      displayCapNodeIds.add(cap.nodeId);
    }
  }

const displayDeps = new Map<string, Set<string>>(); // nodeId → Set<dependsOn>

  // 🔥 FIX R14e: Construire displayDeps dans TOUS les modes (pas seulement 'change')
  // PROBLÈME: Le trigger index est construit uniquement en mode 'change'.
  // En mode 'open' (nouveau devis/évaluation initiale), displayDeps restait VIDE
  // → tous les display fields avaient depth=0 → ordre d'évaluation ARBITRAIRE
  // → les chaînes @calculated (Transport achat → marge → TVAC) échouaient.
  // FIX: Analyser les tokens des formules pour détecter les dépendances display→display.
  {
    // Index des formules par nodeId et par formulaId
    const formulasByNodeIdForTopo = new Map<string, Array<{ tokens: unknown; id: string }>>();
    const formulasByIdForTopo = new Map<string, { tokens: unknown; nodeId: string }>();
    for (const f of formulasRaw) {
      if (!formulasByNodeIdForTopo.has(f.nodeId)) formulasByNodeIdForTopo.set(f.nodeId, []);
      formulasByNodeIdForTopo.get(f.nodeId)!.push({ tokens: (f as any).tokens, id: f.id });
      formulasByIdForTopo.set(f.id, { tokens: (f as any).tokens, nodeId: f.nodeId });
    }

    // Index des variables par nodeId
    const variablesByNodeIdForTopo = new Map<string, { metadata: unknown; sourceRef?: string | null }>();
    for (const v of variablesRaw) {
      variablesByNodeIdForTopo.set(v.nodeId, v);
    }

    for (const displayNodeId of displayCapNodeIds) {
      const refs = new Set<string>();

      // 1. Collecter les refs depuis les tokens des formules du noeud
      const formulas = formulasByNodeIdForTopo.get(displayNodeId) || [];
      for (const formula of formulas) {
        collectReferencedNodeIdsForTriggers(formula.tokens, refs);
      }

      // 2. Collecter les refs depuis le metadata de la variable
      const variable = variablesByNodeIdForTopo.get(displayNodeId);
      if (variable) {
        collectReferencedNodeIdsForTriggers((variable as any).metadata, refs);
      }

      // 3. Résoudre les node-formula: cross-node de manière transitive
      const visitedFormulas = new Set<string>();
      const resolveTransitiveDeps = (data: unknown) => {
        if (!data) return;
        if (Array.isArray(data)) {
          for (const item of data) resolveTransitiveDeps(item);
          return;
        }
        if (typeof data === 'string') {
          const s = data.trim();
          if (s.startsWith('node-formula:')) {
            const fId = s.slice('node-formula:'.length).trim();
            if (fId && !visitedFormulas.has(fId)) {
              visitedFormulas.add(fId);
              const crossFormula = formulasByIdForTopo.get(fId);
              if (crossFormula && crossFormula.tokens) {
                collectReferencedNodeIdsForTriggers(crossFormula.tokens, refs);
                resolveTransitiveDeps(crossFormula.tokens);
              }
            }
          }
        }
        if (typeof data === 'object' && data !== null) {
          for (const val of Object.values(data as Record<string, unknown>)) {
            resolveTransitiveDeps(val);
          }
        }
      };
      for (const formula of formulas) resolveTransitiveDeps(formula.tokens);

      // Retirer l'auto-référence
      refs.delete(displayNodeId);

      // 4. Ajouter les dépendances display→display
      for (const refId of refs) {
        if (refId.includes('.')) continue; // Ignorer les clés virtuelles (lead.*, etc.)
        if (displayCapNodeIds.has(refId)) {
          if (!displayDeps.has(displayNodeId)) displayDeps.set(displayNodeId, new Set());
          displayDeps.get(displayNodeId)!.add(refId);
        }
      }
    }

    const depsCountEarly = [...displayDeps.values()].reduce((sum, s) => sum + s.size, 0);
    if (depsCountEarly > 0) {
      console.log(`🔗 [FIX R14e] ${depsCountEarly} dépendances inter-display détectées depuis les formules (tous modes)`);
    }
  }

  // Tri topologique: calculer l'ordre (profondeur de dépendance)
  const topoOrder = new Map<string, number>(); // nodeId → depth
  const computeDepth = (nodeId: string, visited: Set<string>): number => {
    if (topoOrder.has(nodeId)) return topoOrder.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // Cycle détecté → couper
    visited.add(nodeId);
    const deps = displayDeps.get(nodeId);
    let maxDepth = 0;
    if (deps) {
      for (const dep of deps) {
        maxDepth = Math.max(maxDepth, computeDepth(dep, visited) + 1);
      }
    }
    topoOrder.set(nodeId, maxDepth);
    return maxDepth;
  };
  for (const nodeId of displayCapNodeIds) {
    computeDepth(nodeId, new Set());
  }
  
  // Tri final: non-display d'abord, puis display par profondeur, puis sum-total
  const capacities = capacitiesRaw.sort((a, b) => {
    const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
    const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
    if (aIsSumFormula !== bIsSumFormula) return aIsSumFormula - bIsSumFormula;
    
    const aIsDisplay = displayCapNodeIds.has(a.nodeId) ? 1 : 0;
    const bIsDisplay = displayCapNodeIds.has(b.nodeId) ? 1 : 0;
    if (aIsDisplay !== bIsDisplay) return aIsDisplay - bIsDisplay; // Non-display d'abord
    
    // Entre display fields: trier par profondeur de dépendance (0 = pas de deps = d'abord)
    const aDepth = topoOrder.get(a.nodeId) || 0;
    const bDepth = topoOrder.get(b.nodeId) || 0;
    return aDepth - bDepth;
  });

  const results: { updated: number; created: number; stored: number; displayFieldsUpdated: number } = { 
    updated: 0, created: 0, stored: 0, displayFieldsUpdated: 0 
  };
  
  // 🎯 Valeurs calculées par submissionId (inclut DISPLAY mais ne touche jamais aux neutral user inputs)
  const computedValuesToStore: Array<{
    nodeId: string;
    value: string | null;
    sourceRef?: string | null;
    operationSource?: OperationSourceType | null;
    fieldLabel?: string | null;
    operationDetail?: Prisma.InputJsonValue | null;
    operationResult?: Prisma.InputJsonValue | null;
    calculatedBy?: string | null;
  }> = [];

  // Cache par requête pour éviter de recharger les mêmes nœuds en boucle
  const triggerDerivationCache = new Map<string, string[]>();

  // 🚀 OPTIMISATION CRITIQUE: Index inversé des triggers avec CACHE par treeId
  // Au lieu de 6-7 requêtes prisma à chaque évaluation, on utilise un cache de 60s
  // Index: Map<changedFieldId, Set<displayFieldIdsToCalculate>>
  const triggerIndex = new Map<string, Set<string>>();
  
  // 🔗 Map pour stocker les valeurs des champs Link à retourner au frontend
  const linkedFieldsToRefresh = new Map<string, { targetNodeId: string; nodeLabel: string }>();
  
  // 🔧 FIX R21: Extraire l'ID de base si changedFieldId a un suffixe repeater (-1, -2, etc.)
  // Quand l'utilisateur modifie un champ dans un repeater (ex: onduleur-1), le LINK pointe vers
  // l'ID de base (onduleur). On doit chercher dans le triggerIndex avec les DEUX IDs.
  const changedFieldIdBase = changedFieldId ? (() => {
    const suffix = extractNumericSuffix(changedFieldId);
    return suffix ? changedFieldId.replace(/-\d+$/, '') : null;
  })() : null;
  
  // 🔥 FIX A (backend): Support multi-changedFieldIds (comma-separated depuis le frontend)
  // Si l'utilisateur modifie champ A puis champ B en <300ms, le frontend envoie "A,B"
  // On doit trouver les DISPLAY fields affectés par A ET par B (union)
  const allChangedFieldIds: string[] = changedFieldId 
    ? changedFieldId.split(',').map(s => s.trim()).filter(Boolean) 
    : [];
  const allChangedFieldIdBases: string[] = allChangedFieldIds
    .map(id => { const s = extractNumericSuffix(id); return s ? id.replace(/-\d+$/, '') : null; })
    .filter((b): b is string => b !== null);
  // Set O(1) pour les checks de LINK matching
  const changedFieldIdSet = new Set([...allChangedFieldIds, ...allChangedFieldIdBases]);
  
  if (allChangedFieldIds.length > 1) {
    console.log(`🔥 [FIX A] Multi-changedFieldIds: ${allChangedFieldIds.length} champs modifiés pendant le debounce: ${allChangedFieldIds.map(id => id.substring(0,12)).join(', ')}`);
  }
  
  if (mode === 'change' && changedFieldId) {
    // 🚀 CHECK CACHE: Réutiliser le trigger index si déjà construit pour ce tree
    const cached = triggerIndexCache.get(treeId);
    const cacheValid = cached && (Date.now() - cached.timestamp < TRIGGER_INDEX_CACHE_TTL);
    
    if (cacheValid) {
      // ✅ CACHE HIT: Copier l'index depuis le cache (O(1) lookup pré-construit)
      for (const [key, value] of cached.triggerIndex) {
        triggerIndex.set(key, new Set(value));
      }
      
      // Construire linkedFieldsToRefresh depuis le cache
      // 🔧 FIX R21 + FIX A: Matcher sur TOUS les changedFieldIds et leurs bases
      for (const ln of cached.allLinkedNodes) {
        if (changedFieldIdSet.has(ln.link_targetNodeId!)) {
          linkedFieldsToRefresh.set(ln.id, {
            targetNodeId: ln.link_targetNodeId!,
            nodeLabel: ln.label || ln.id
          });
        }
      }
      
      const affectedCount = allChangedFieldIds.reduce((sum, id) => sum + (triggerIndex.get(id)?.size || 0), 0);
      console.log(`🚀 [TRIGGER INDEX CACHE HIT] ${affectedCount} impactés par "${changedFieldId}" (cache age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    } else {
      // 🔧 CACHE MISS: Construire le trigger index complet (pour TOUS les changedFieldIds possibles)
      
      const displayFieldIds = capacities
        .filter(cap => {
          const isDisplayField = cap.TreeBranchLeafNode?.fieldType === 'DISPLAY' 
            || cap.TreeBranchLeafNode?.type === 'DISPLAY'
            || cap.TreeBranchLeafNode?.type === 'leaf_field';
          return isDisplayField;
        })
        .map(cap => cap.nodeId);
    
      // 🚀 PARALLÉLISER: charger options, display nodes, tables, links et conditions en parallèle
      const [selectFieldNodes, optionNodes, displayNodes, displayFieldTables, allLinkedNodes, allTreeNodeIds] = await Promise.all([
        prisma.treeBranchLeafNode.findMany({
          where: { treeId, type: 'leaf_option_field' },
          select: { id: true, parentId: true }
        }),
        prisma.treeBranchLeafNode.findMany({
          where: { treeId, type: 'leaf_option' },
          select: { id: true, parentId: true }
        }),
        displayFieldIds.length > 0 ? prisma.treeBranchLeafNode.findMany({
          where: { id: { in: displayFieldIds } },
          select: { id: true, metadata: true, hasLink: true, link_targetNodeId: true, formula_tokens: true }
        }) : Promise.resolve([]),
        displayFieldIds.length > 0 ? prisma.treeBranchLeafNodeTable.findMany({
          where: { nodeId: { in: displayFieldIds } },
          select: { nodeId: true, meta: true }
        }) : Promise.resolve([]),
        prisma.treeBranchLeafNode.findMany({
          where: { treeId, hasLink: true, link_targetNodeId: { not: null } },
          select: { id: true, label: true, link_targetNodeId: true }
        }),
        prisma.treeBranchLeafNode.findMany({
          where: { treeId },
          select: { id: true }
        })
      ]);
      
      // Construire optionToSelectMap
      const optionToSelectMap = new Map<string, string>();
      for (const optNode of selectFieldNodes) {
        if (optNode.parentId) optionToSelectMap.set(optNode.id, optNode.parentId);
      }
      for (const optNode of optionNodes) {
        if (optNode.parentId) optionToSelectMap.set(optNode.id, optNode.parentId);
      }
    
      // Grouper formules, tables, variables par nodeId
      const formulasByNodeId = new Map<string, Array<{ tokens: unknown }>>();
      // 🔥 FIX R21: Aussi indexer les formules par ID pour résoudre les node-formula: cross-node
      const formulasById = new Map<string, { tokens: unknown; nodeId: string }>();
      for (const f of formulasRaw) {
        if (!formulasByNodeId.has(f.nodeId)) formulasByNodeId.set(f.nodeId, []);
        formulasByNodeId.get(f.nodeId)!.push(f);
        formulasById.set(f.id, { tokens: (f as any).tokens, nodeId: f.nodeId });
      }
      const tablesByNodeId = new Map<string, Array<{ meta: unknown }>>();
      for (const t of displayFieldTables) {
        if (!tablesByNodeId.has(t.nodeId)) tablesByNodeId.set(t.nodeId, []);
        tablesByNodeId.get(t.nodeId)!.push(t);
      }
      const variablesByNodeId = new Map<string, { metadata: unknown; sourceRef?: string | null }>();
      for (const v of variablesRaw) {
        variablesByNodeId.set(v.nodeId, v);
      }
      
      
      // Helper: extraire les nodeIds référencés et les ajouter au trigger index
      const extractAndAddTriggers = (data: unknown, nodeId: string, triggerNodeIds: string[]) => {
        const refs = new Set<string>();
        collectReferencedNodeIdsForTriggers(data, refs);
        refs.delete(nodeId);
        for (const refId of refs) {
          if (!refId.includes('.') && !triggerNodeIds.includes(refId)) {
            triggerNodeIds.push(refId);
            const parentSelect = optionToSelectMap.get(refId);
            if (parentSelect && !triggerNodeIds.includes(parentSelect)) {
              triggerNodeIds.push(parentSelect);
            }
          }
        }
      };
      
      // 🔥 FIX R21: Résoudre les dépendances transitives des node-formula: cross-node
      // Quand un token "node-formula:formulaId" référence une formule d'un AUTRE noeud,
      // il faut aussi ajouter les dépendances de CETTE formule au trigger index du noeud courant.
      // Ex: Onduleur TVAC a "node-formula:83d7d601" (formule TVA de PV TVAC)
      //     → les dépendances de la formule TVA (comme @calculated.5e258abf = TVA node)
      //     doivent être triggers pour Onduleur TVAC.
      const resolveNodeFormulaTransitiveTriggers = (data: unknown, nodeId: string, triggerNodeIds: string[], visited: Set<string>) => {
        if (!data) return;
        if (Array.isArray(data)) {
          for (const item of data) resolveNodeFormulaTransitiveTriggers(item, nodeId, triggerNodeIds, visited);
          return;
        }
        if (typeof data === 'string') {
          const s = data.trim();
          // Détecter les tokens node-formula:formulaId
          if (s.startsWith('node-formula:')) {
            const formulaId = s.slice('node-formula:'.length).trim();
            if (formulaId && !visited.has(formulaId)) {
              visited.add(formulaId);
              // Chercher la formule dans le cache
              const referencedFormula = formulasById.get(formulaId);
              if (referencedFormula && referencedFormula.tokens) {
                // Extraire les dépendances de cette formule cross-node
                extractAndAddTriggers(referencedFormula.tokens, nodeId, triggerNodeIds);
                // Résoudre récursivement (formule qui référence une autre formule)
                resolveNodeFormulaTransitiveTriggers(referencedFormula.tokens, nodeId, triggerNodeIds, visited);
              }
            }
          }
        }
        if (typeof data === 'object' && data !== null) {
          for (const key of Object.keys(data as Record<string, unknown>)) {
            resolveNodeFormulaTransitiveTriggers((data as Record<string, unknown>)[key], nodeId, triggerNodeIds, visited);
          }
        }
      };
      
      // Construire l'index inversé avec TOUTES les sources de dépendances
      for (const node of displayNodes) {
        const metaTriggerNodeIds = (node.metadata as { triggerNodeIds?: string[] })?.triggerNodeIds;
        let triggerNodeIds = Array.isArray(metaTriggerNodeIds) ? metaTriggerNodeIds.filter(Boolean) : [];
        
        if (node.hasLink && node.link_targetNodeId) {
          triggerNodeIds.push(node.link_targetNodeId);
        }
        const nodeTokens = Array.isArray(node.formula_tokens) ? (node.formula_tokens as unknown[]) : [];
        if (nodeTokens.length > 0) extractAndAddTriggers(nodeTokens, node.id, triggerNodeIds);
        const nodeFormulas = formulasByNodeId.get(node.id) || [];
        for (const formula of nodeFormulas) extractAndAddTriggers((formula as any).tokens, node.id, triggerNodeIds);
        const nodeTables = tablesByNodeId.get(node.id) || [];
        for (const table of nodeTables) extractAndAddTriggers(table.meta, node.id, triggerNodeIds);
        const nodeVar = variablesByNodeId.get(node.id);
        if (nodeVar) extractAndAddTriggers(nodeVar.metadata, node.id, triggerNodeIds);
        
        // 🔥 FIX R21: Résoudre les dépendances transitives des node-formula: cross-node
        // Si un token "node-formula:formulaId" référence une formule d'un AUTRE noeud,
        // on extrait les dépendances de CETTE formule et on les ajoute comme triggers.
        const visitedFormulas = new Set<string>();
        if (nodeTokens.length > 0) resolveNodeFormulaTransitiveTriggers(nodeTokens, node.id, triggerNodeIds, visitedFormulas);
        for (const formula of nodeFormulas) resolveNodeFormulaTransitiveTriggers((formula as any).tokens, node.id, triggerNodeIds, visitedFormulas);
        
        const expandedTriggers = expandTriggersForCopy(node.id, triggerNodeIds);
        for (const triggerId of expandedTriggers) {
          if (!triggerIndex.has(triggerId)) triggerIndex.set(triggerId, new Set());
          triggerIndex.get(triggerId)!.add(node.id);
        }
      }
      
      // FIX R14c PART 4: Ajouter les formules sum-total au trigger index
      // Les sum-total ne sont PAS dans displayNodes (pas de vrais tree nodes)
      // mais leurs formules existent en DB. Il faut les ajouter pour que
      // e1007de0 -> e1007de0-sum-total -> dfc77f3d fonctionne.
      for (const cap of capacitiesRaw) {
        if (!cap.nodeId.endsWith('-sum-total')) continue;
        const sumTotalNodeId = cap.nodeId;
        // Extraire les references de la formule sum-total
        const sumFormulas = formulasByNodeId.get(sumTotalNodeId) || [];
        const sumVariable = variablesByNodeId.get(sumTotalNodeId);
        const sumRefs = new Set<string>();
        for (const formula of sumFormulas) collectReferencedNodeIdsForTriggers((formula as any).tokens, sumRefs);
        if (sumVariable) collectReferencedNodeIdsForTriggers(sumVariable.metadata, sumRefs);
        sumRefs.delete(sumTotalNodeId);
        for (const refId of sumRefs) {
          if (refId.includes('.')) continue;
          if (!triggerIndex.has(refId)) triggerIndex.set(refId, new Set());
          triggerIndex.get(refId)!.add(sumTotalNodeId);
        }
      }

      // Linked fields: ajouter au trigger index
      for (const linkedNode of allLinkedNodes) {
        const targetId = linkedNode.link_targetNodeId!;
        if (!triggerIndex.has(targetId)) triggerIndex.set(targetId, new Set());
        triggerIndex.get(targetId)!.add(linkedNode.id);
        
        // 🔧 FIX R21 + FIX A: Matcher sur TOUS les changedFieldIds et leurs bases
        if (changedFieldIdSet.has(targetId)) {
          linkedFieldsToRefresh.set(linkedNode.id, {
            targetNodeId: targetId,
            nodeLabel: linkedNode.label || linkedNode.id
          });
        }
      }
      
      // Conditions: construire l'index pour TOUS les changedFieldIds possibles (pas juste le courant)
      if (allTreeNodeIds.length > 0) {
        const nodeIds = allTreeNodeIds.map(n => n.id);
        const allConditions = await prisma.treeBranchLeafNodeCondition.findMany({
          where: { nodeId: { in: nodeIds } },
          select: { id: true, nodeId: true, conditionSet: true, name: true }
        });
        
        if (allConditions.length > 0) {
          
          for (const condition of allConditions) {
            const conditionSet = condition.conditionSet as {
              branches?: Array<{
                when?: { left?: { ref?: string }; right?: { ref?: string } };
                actions?: Array<{ type?: string; nodeIds?: string[] }>;
              }>;
              fallback?: { actions?: Array<{ type?: string; nodeIds?: string[] }> };
            };
            
            const referencedFieldIds = new Set<string>();
            const targetShowNodeIds = new Set<string>();
            
            for (const branch of conditionSet.branches || []) {
              const leftRef = branch.when?.left?.ref;
              const rightRef = branch.when?.right?.ref;
              if (leftRef) {
                const id = normalizeRefForTriggers(leftRef);
                if (id) {
                  referencedFieldIds.add(id);
                  if (typeof leftRef === 'string' && leftRef.startsWith('@select.')) {
                    const parentSelectId = optionToSelectMap.get(id);
                    if (parentSelectId) referencedFieldIds.add(parentSelectId);
                  }
                }
              }
              if (rightRef) {
                const id = normalizeRefForTriggers(rightRef);
                if (id) {
                  referencedFieldIds.add(id);
                  if (typeof rightRef === 'string' && rightRef.startsWith('@select.')) {
                    const parentSelectId = optionToSelectMap.get(id);
                    if (parentSelectId) referencedFieldIds.add(parentSelectId);
                  }
                }
              }
              for (const action of branch.actions || []) {
                if ((action.type === 'SHOW' || action.type === 'HIDE') && action.nodeIds) {
                  action.nodeIds.forEach(nid => targetShowNodeIds.add(nid));
                }
              }
            }
            for (const action of conditionSet.fallback?.actions || []) {
              if ((action.type === 'SHOW' || action.type === 'HIDE') && action.nodeIds) {
                action.nodeIds.forEach(nid => targetShowNodeIds.add(nid));
              }
            }
            
            // 🔥 FIX: Ajouter au trigger index pour CHAQUE champ référencé (pas juste changedFieldId)
            for (const refFieldId of referencedFieldIds) {
              if (!triggerIndex.has(refFieldId)) triggerIndex.set(refFieldId, new Set());
              triggerIndex.get(refFieldId)!.add(condition.nodeId);
              for (const rawShowNodeId of targetShowNodeIds) {
                const showNodeId = normalizeRefForTriggers(rawShowNodeId);
                if (showNodeId) triggerIndex.get(refFieldId)!.add(showNodeId);
              }
            }
            
            // 🔥 FIX R14d: Les SHOW nodeIds sont des DÉPENDANCES du condition.nodeId
            // La condition UTILISE/AFFICHE la valeur du SHOW nodeId comme résultat.
            // Ex: condition sur 410ad1e1 fait SHOW @calculated.e1007de0-sum-total
            //   → 410ad1e1 DÉPEND de e1007de0-sum-total (doit être évalué APRÈS)
            // Sans ça, la condition est évaluée AVANT sa dépendance → lit une valeur STALE.
            for (const rawShowNodeId of targetShowNodeIds) {
              const showNodeId = normalizeRefForTriggers(rawShowNodeId);
              if (showNodeId && isAcceptedNodeId(showNodeId)) {
                if (!triggerIndex.has(showNodeId)) triggerIndex.set(showNodeId, new Set());
                triggerIndex.get(showNodeId)!.add(condition.nodeId);
              }
            }
          }
        }
      }
      
      // 📦 STOCKER dans le cache pour les prochaines évaluations
      triggerIndexCache.set(treeId, {
        triggerIndex: new Map([...triggerIndex].map(([k, v]) => [k, new Set(v)])),
        allLinkedNodes: allLinkedNodes.map(ln => ({ id: ln.id, label: ln.label, link_targetNodeId: ln.link_targetNodeId! })),
        optionToSelectMap,
        timestamp: Date.now()
      });
      
      const affectedCount = triggerIndex.get(changedFieldId)?.size || 0;
    }
    
    // 🔍 DEBUG compact
    const optimiseurCheck = triggerIndex.get(changedFieldId);
    if (optimiseurCheck) {
    }
  }

  // 🔥 FIX R14: Dériver les dépendances inter-display depuis le trigger index
  // Le trigger index mappe: changedFieldId → Set<displayFieldIds qui doivent être recalculés>
  // On inverse: si triggerIndex.get(displayFieldA) contient displayFieldB,
  // alors B DÉPEND de A (B doit être recalculé quand A change)
  // → B doit être évalué APRÈS A dans le tri topologique
  if (triggerIndex.size > 0) {
    for (const [triggerId, targets] of triggerIndex) {
      // Seuls les triggers qui sont eux-mêmes des DISPLAY fields créent des dépendances inter-display
      if (!displayCapNodeIds.has(triggerId)) continue;
      for (const targetId of targets) {
        if (!displayCapNodeIds.has(targetId)) continue;
        if (targetId === triggerId) continue; // Pas de self-dep
        // targetId dépend de triggerId
        if (!displayDeps.has(targetId)) displayDeps.set(targetId, new Set());
        displayDeps.get(targetId)!.add(triggerId);
      }
    }
    const depsCount = [...displayDeps.values()].reduce((sum, s) => sum + s.size, 0);
    console.log(`🔗 [FIX R14] ${depsCount} dépendances inter-display détectées via trigger index`);
  }

  // 🔥 FIX R14: Recalculer la profondeur topologique avec les deps FIABLES
  // (remplace l'ancien calcul qui utilisait triggerNodeIds/sourceRef cassés)
  topoOrder.clear();
  const computeDepthFixed = (nodeId: string, visited: Set<string>): number => {
    if (topoOrder.has(nodeId)) return topoOrder.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // Cycle détecté → couper
    visited.add(nodeId);
    const deps = displayDeps.get(nodeId);
    let maxDepth = 0;
    if (deps) {
      for (const dep of deps) {
        maxDepth = Math.max(maxDepth, computeDepthFixed(dep, visited) + 1);
      }
    }
    topoOrder.set(nodeId, maxDepth);
    return maxDepth;
  };
  for (const nodeId of displayCapNodeIds) {
    computeDepthFixed(nodeId, new Set());
  }

  // � FIX R14: RE-TRIER les capacities avec les profondeurs FIABLES
  // Le sort initial (ligne ~950) a été fait avec des profondeurs = 0 car displayDeps était vide.
  // Maintenant que topoOrder est correct, on re-trie pour garantir l'ordre de dépendance.
  capacities.sort((a, b) => {
    const aIsDisplay = displayCapNodeIds.has(a.nodeId) ? 1 : 0;
    const bIsDisplay = displayCapNodeIds.has(b.nodeId) ? 1 : 0;
    if (aIsDisplay !== bIsDisplay) return aIsDisplay - bIsDisplay; // Non-display d'abord
    
    // Entre display fields: trier par profondeur topologique (PRIMARY KEY)
    // 🔥 FIX R14b: Le depth est la clé primaire. Le flag sum-formula n'est qu'un tiebreaker.
    // AVANT: sum-formula overridait le depth → un display qui dépend d'un sum-total
    // était évalué AVANT le sum-total → lisait la vieille valeur DB → bug "10→1"
    const aDepth = topoOrder.get(a.nodeId) || 0;
    const bDepth = topoOrder.get(b.nodeId) || 0;
    if (aDepth !== bDepth) return aDepth - bDepth;
    
    // TIEBREAKER: à depth égal, sum-total après les bases (pour le cas naturel base→sum)
    const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
    const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
    return aIsSumFormula - bIsSumFormula;
  });

  // FIX R14b DEBUG: Log eval order
  if (mode === 'change') {
    const displayOrder = capacities
      .filter(c => displayCapNodeIds.has(c.nodeId))
      .map(c => `${c.nodeId.substring(0,8)}(d=${topoOrder.get(c.nodeId)||0},sum=${c.sourceRef?.includes('sum-formula')||c.sourceRef?.includes('sum-total')?'Y':'N'})`);
    console.log(`[FIX R14b] Eval order: ${displayOrder.join(' -> ')}`);
  }

  // 🚀 FIX R12 + FIX A: Calculer la fermeture transitive des DISPLAY fields affectés
  // En mode 'change', seuls les DISPLAY fields directement/indirectement impactés
  // par TOUS les changedFieldIds doivent être recalculés (union)
  let affectedDisplayFieldIds: Set<string> | null = null;
  if (mode === 'change' && changedFieldId && triggerIndex.size > 0) {
    affectedDisplayFieldIds = new Set<string>();
    // 🔥 FIX A: Itérer sur TOUS les changedFieldIds (et leurs bases) pour l'union
    for (const cId of allChangedFieldIds) {
      const affected = triggerIndex.get(cId);
      if (affected) {
        for (const id of affected) affectedDisplayFieldIds.add(id);
      }
    }
    for (const cIdBase of allChangedFieldIdBases) {
      const baseAffected = triggerIndex.get(cIdBase);
      if (baseAffected) {
        for (const id of baseAffected) affectedDisplayFieldIds.add(id);
      }
    }
    // Fermeture transitive: si A dépend de changedField et B dépend de A, B est aussi affecté
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 50) {
      changed = false;
      iterations++;
      for (const fieldId of [...affectedDisplayFieldIds]) {
        const cascaded = triggerIndex.get(fieldId);
        if (cascaded) {
          for (const cid of cascaded) {
            if (!affectedDisplayFieldIds.has(cid)) {
              affectedDisplayFieldIds.add(cid);
              changed = true;
            }
          }
        }
      }
    }
    console.log(`🚀 [FIX R12] mode=change: ${affectedDisplayFieldIds.size} DISPLAY fields affectés sur ${displayCapNodeIds.size} total (skip ${displayCapNodeIds.size - affectedDisplayFieldIds.size})`);
    
    // 🔥 FIX D: Si aucun DISPLAY field affecté trouvé mais qu'on a un changedFieldId,
    // c'est que le triggerIndex ne couvre pas ce champ → fallback vers évaluation complète
    if (affectedDisplayFieldIds.size === 0) {
      console.warn(`⚠️ [FIX D] changedFieldId="${changedFieldId?.substring(0,12)}" n'est dans aucun trigger → fallback évaluation COMPLÈTE (comme mode='open')`);
      affectedDisplayFieldIds = null; // null = évaluer TOUS les display fields
    }
  }

  // 🔥 FIX B phase 2: Suppression CIBLÉE des valeurs DISPLAY du valueMap en mode 'change'
  // Seuls les display fields qui vont être recalculés (affectedDisplayFieldIds) sont supprimés.
  // Les display fields NON affectés GARDENT leur valeur dans le valueMap → les calculs
  // qui en dépendent lisent la bonne valeur au lieu de undefined/0.
  if (mode === 'change') {
    if (affectedDisplayFieldIds) {
      // Ciblé: ne supprimer que les display fields qu'on va recalculer
      for (const affectedId of affectedDisplayFieldIds) {
        if (displayNodeIds.has(affectedId)) {
          valueMap.delete(affectedId);
        }
      }
      console.log(`🔥 [FIX B] Suppression ciblée: ${affectedDisplayFieldIds.size} display values supprimés sur ${displayNodeIds.size} total`);
    } else {
      // Fallback complet (FIX D actif): supprimer TOUS les display values
      for (const displayNodeId of displayNodeIds) {
        valueMap.delete(displayNodeId);
      }
      console.log(`🔥 [FIX B] Suppression COMPLÈTE: ${displayNodeIds.size} display values (fallback FIX D)`);
    }
  }

  // 🔥 FIX R20: Mettre à jour le valueMap pour les champs LINK AVANT la boucle d'évaluation
  // PROBLÈME: Les champs Link (ex: 2c5e01cc "Onduleur" lié à 78c78d8d via JUMP) ne sont
  // rafraîchis qu'APRÈS la boucle d'évaluation (ligne ~1685). Mais si un DISPLAY field
  // (ex: 8906d529 "Prix onduleur") fait un table lookup qui utilise un champ LINK
  // comme columnSourceOption.sourceField, il lit la valeur STALE du Link dans le valueMap
  // → retourne le prix de l'ANCIEN onduleur au lieu du nouveau → toujours "un pas en arrière".
  // FIX: Injecter la valeur fraîche du champ source (changedFieldId) dans le valueMap
  // de tous les linked fields AVANT que les DISPLAY fields ne soient évalués.
  if (mode === 'change' && linkedFieldsToRefresh.size > 0 && formData) {
    for (const [linkedNodeId, linkInfo] of linkedFieldsToRefresh.entries()) {
      // La valeur fraîche du champ source est dans formData (c'est le champ que l'utilisateur a changé)
      // 🔧 FIX R21 + FIX A: Chercher la valeur dans formData sous targetNodeId OU sous TOUS les changedFieldIds (version suffixée)
      let freshValue: unknown = undefined;
      if (linkInfo.targetNodeId in formData) {
        freshValue = formData[linkInfo.targetNodeId];
      } else {
        // FIX A: Chercher parmi TOUS les changedFieldIds suffixés dont la base == targetNodeId
        for (const cId of allChangedFieldIds) {
          if (cId in formData) {
            const cBase = extractNumericSuffix(cId) ? cId.replace(/-\d+$/, '') : null;
            if (cBase === linkInfo.targetNodeId) {
              freshValue = formData[cId];
              break;
            }
          }
        }
      }
      if (freshValue !== null && freshValue !== undefined) {
        valueMap.set(linkedNodeId, freshValue);
        console.log(`🔗 [FIX R20/R21] valueMap LINK pre-refresh: ${linkedNodeId.substring(0,8)} = "${freshValue}" (source: ${linkInfo.targetNodeId.substring(0,8)}, changedField: ${changedFieldId?.substring(0,8) || 'N/A'})`);
      }
    }
  }

  // 🔥 DÉDUPLICATION: Un même nodeId peut apparaître plusieurs fois dans capacities
  // (ex: formula + autre capacité). On déduplique pour éviter de calculer 3 fois le même champ !
  const processedDisplayFields = new Set<string>();

  for (const capacity of capacities) {
    const sourceRef = capacity.sourceRef!;
    
    // 🎯 DÉTECTION des display fields: leaf_field copiés OU type DISPLAY
    const isDisplayField = capacity.TreeBranchLeafNode?.fieldType === 'DISPLAY' 
      || capacity.TreeBranchLeafNode?.type === 'DISPLAY'
      || capacity.TreeBranchLeafNode?.type === 'leaf_field';
    
    // MODE AUTOSAVE: Skip tous les display fields (perf: pas besoin de recalculer)
    if (isDisplayField && mode === 'autosave') {
      continue;
    }
    
    // 🚀 FIX R12: En mode 'change', skip les DISPLAY fields NON affectés par le changement
    if (isDisplayField && affectedDisplayFieldIds !== null) {
      if (!affectedDisplayFieldIds.has(capacity.nodeId)) {
        continue; // Ce DISPLAY field n'est pas impacté → skip pour gagner du temps
      }
    }
    
    // 🔥 DÉDUPLICATION: Un même display field peut apparaître N fois dans capacities
    if (isDisplayField) {
      if (processedDisplayFields.has(capacity.nodeId)) {
        continue;
      }
      processedDisplayFields.add(capacity.nodeId);
    }
    
    try {
      // 🔁 IMPORTANT: pour les copies (-1, -2, ...), certaines formules/conditions référencent encore
      // les IDs de base (sans suffixe). On injecte temporairement baseId -> baseId-<suffix>
      // dans le valueMap pour que l'évaluation lise les valeurs fraîches encodées.
      const injectedBaseKeys = applyCopyScopedInputAliases(valueMap, capacity.nodeId, capacity);
      
      let capacityResult: { value?: unknown; calculatedValue?: unknown; result?: unknown; operationSource?: unknown; operationDetail?: unknown; operationResult?: unknown };
      
      // 🎯 INTERCEPT SUM-TOTAL: Évaluation directe sans passer par evaluateVariableOperation
      // Les champs sum-total ont des formula_tokens ["@value.nodeId1", "+", "@value.nodeId2", ...]
      // On les évalue en sommant directement les valeurs depuis valueMap / SubmissionData
      const isSumTotalField = capacity.nodeId.endsWith('-sum-total');
      if (isSumTotalField) {
        try {
          const sumTokensNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: capacity.nodeId },
            select: { formula_tokens: true, label: true }
          });
          const tokens = Array.isArray(sumTokensNode?.formula_tokens)
            ? (sumTokensNode!.formula_tokens as string[])
            : [];

          let sum = 0;
          const debugParts: Array<{ refId: string; value: number; source: string }> = [];

          for (const token of tokens) {
            if (typeof token === 'string' && token.startsWith('@value.')) {
              const refNodeId = token.slice(7); // retirer '@value.'
              let val: number | null = null;
              let valSource = 'none';

              // 1. Essayer le valueMap (données fraîches en mémoire)
              if (valueMap.has(refNodeId)) {
                const mapVal = valueMap.get(refNodeId);
                if (mapVal !== null && mapVal !== undefined && String(mapVal).trim() !== '') {
                  val = parseFloat(String(mapVal)) || 0;
                  valSource = 'valueMap';
                }
              }

              // 2. Fallback: SubmissionData (valeur persistée)
              if (val === null) {
                const sd = await prisma.treeBranchLeafSubmissionData.findUnique({
                  where: { submissionId_nodeId: { submissionId, nodeId: refNodeId } },
                  select: { value: true }
                });
                if (sd?.value !== null && sd?.value !== undefined && String(sd.value).trim() !== '') {
                  val = parseFloat(sd.value) || 0;
                  valSource = 'submissionData';
                }
              }

              // 3. Dernier fallback: calculatedValue du nœud source
              if (val === null) {
                const srcNode = await prisma.treeBranchLeafNode.findUnique({
                  where: { id: refNodeId },
                  select: { calculatedValue: true }
                });
                if (srcNode?.calculatedValue !== null && srcNode?.calculatedValue !== undefined) {
                  val = parseFloat(srcNode.calculatedValue) || 0;
                  valSource = 'calculatedValue';
                }
              }

              const resolvedVal = val ?? 0;
              sum += resolvedVal;
              debugParts.push({ refId: refNodeId, value: resolvedVal, source: valSource });
            }
            // Les opérateurs "+", "-", etc. sont ignorés car on fait une somme simple
          }

          // Sum-total debug omitted for perf

          capacityResult = {
            value: sum,
            operationSource: 'formula',
            operationDetail: { tokens, parts: debugParts } as unknown as undefined,
            operationResult: `Somme = ${sum}`
          };
        } catch (sumError) {
          console.error(`❌ [SUM-TOTAL EVALUATOR] Erreur pour ${capacity.nodeId}:`, sumError);
          capacityResult = { value: 0, operationSource: 'formula' };
        }
      } else {
      // ── Chemin normal (non sum-total) ──
      try {
        // ✨ ÉVALUATION avec le valueMap contenant les données FRAÎCHES
        capacityResult = await evaluateVariableOperation(
          capacity.nodeId,
          submissionId,
          prisma,
          valueMap  // 🔑 PASSER LE VALUEMAP avec les données fraîches !
        );
        
        // 🔧 FIX R19: evaluateVariableOperation retourne { value: null } au lieu de throw
        // quand il n'y a pas de TreeBranchLeafNodeVariable. Le catch-block contient le
        // fallback vers condition/formula mais n'est jamais atteint → déclencher manuellement.
        if (capacityResult.value === null && (capacityResult as any).operationDetail?.type === 'missing-variable') {
          throw new Error(`[FIX R19] Variable manquante pour ${capacity.nodeId} - fallback condition/formula`);
        }
      } catch (varError) {
        // 🔧 FIX: Si pas de variable mais le noeud a une condition, évaluer la condition directement
        // Cas: noeud avec hasCondition=true et des formules mais SANS TreeBranchLeafNodeVariable
        const nodeForFallback = await prisma.treeBranchLeafNode.findUnique({
          where: { id: capacity.nodeId },
          select: { condition_activeId: true, linkedConditionIds: true, formula_activeId: true }
        });
        
        const rootConditionId = nodeForFallback?.linkedConditionIds?.[0] || nodeForFallback?.condition_activeId;
        
        if (rootConditionId) {
          // Fallback condition evaluation
          const valuesCache = new Map<string, InterpretResult>();
          const condResult = await interpretReference(
            `condition:${rootConditionId}`,
            submissionId,
            prisma,
            valuesCache,
            0,
            valueMap
          );
          capacityResult = {
            value: condResult.result,
            operationDetail: condResult.details,
            operationResult: condResult.humanText,
            operationSource: 'condition'
          };
        } else if (nodeForFallback?.formula_activeId) {
          // Fallback formula evaluation
          const valuesCache = new Map<string, InterpretResult>();
          const fResult = await interpretReference(
            `node-formula:${nodeForFallback.formula_activeId}`,
            submissionId,
            prisma,
            valuesCache,
            0,
            valueMap
          );
          capacityResult = {
            value: fResult.result,
            operationDetail: fResult.details,
            operationResult: fResult.humanText,
            operationSource: 'formula'
          };
        } else {
          throw varError; // Pas de fallback possible → re-throw
        }
      }
      } // fin du else (chemin non sum-total)
      
      // Extraire la valeur calculée
      const rawValue = (capacityResult as { value?: unknown; calculatedValue?: unknown; result?: unknown }).value
        ?? (capacityResult as { calculatedValue?: unknown }).calculatedValue
        ?? (capacityResult as { result?: unknown }).result;
      const stringified = rawValue === null || rawValue === undefined ? null : String(rawValue).trim();
      const hasValidValue = rawValue !== null && rawValue !== undefined && stringified !== '' && stringified !== '∅';
      
      // 🔑 AJOUTER la valeur au valueMap pour les calculs suivants (chaînage)
      if (hasValidValue) {
        valueMap.set(capacity.nodeId, rawValue);
      }

      const normalizedOperationSource: OperationSourceType = coerceOperationSource(
        (capacityResult as { operationSource?: unknown }).operationSource
      );

      let parsedDetail: Prisma.InputJsonValue | null = null;
      try {
        parsedDetail = typeof (capacityResult as any).operationDetail === 'string'
          ? (JSON.parse((capacityResult as any).operationDetail) as Prisma.InputJsonValue)
          : ((capacityResult as any).operationDetail as Prisma.InputJsonValue);
      } catch {
        parsedDetail = (capacityResult as any).operationDetail as Prisma.InputJsonValue;
      }

      let parsedResult: Prisma.InputJsonValue | null = null;
      try {
        parsedResult = typeof (capacityResult as any).operationResult === 'string'
          ? (JSON.parse((capacityResult as any).operationResult) as Prisma.InputJsonValue)
          : ((capacityResult as any).operationResult as Prisma.InputJsonValue);
      } catch {
        parsedResult = (capacityResult as any).operationResult as Prisma.InputJsonValue;
      }
      
      // 🎯 DISPLAY FIELDS: on stocke aussi, mais SCOPÉ par submissionId (pas global)
      if (isDisplayField) {
        computedValuesToStore.push({
          nodeId: capacity.nodeId,
          value: hasValidValue ? String(rawValue) : null,
          sourceRef,
          operationSource: normalizedOperationSource,
          fieldLabel: capacity.TreeBranchLeafNode?.label || null,
          operationDetail: parsedDetail,
          operationResult: parsedResult,
          calculatedBy: `reactive-${userId || 'unknown'}`
        });
        continue;
      }
      
      // 📦 AUTRES CAPACITÉS (non-display): Persister dans SubmissionData
      // 📦 AUTRES CAPACITÉS (non-display): Persister dans SubmissionData

      const key = { submissionId_nodeId: { submissionId, nodeId: capacity.nodeId } } as const;
      const existing = await prisma.treeBranchLeafSubmissionData.findUnique({ where: key });
      const normalize = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      if (existing) {
        const changed = (
          (existing.sourceRef || null) !== (sourceRef || null) ||
          (existing.operationSource || null) !== (normalizedOperationSource || null) ||
          (existing.fieldLabel || null) !== ((capacity.TreeBranchLeafNode?.label || null)) ||
          normalize(existing.operationDetail) !== normalize(parsedDetail)
        );
        if (changed) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: key,
            data: {
              value: hasValidValue ? String(rawValue) : null,
              sourceRef,
              operationSource: normalizedOperationSource,
              fieldLabel: capacity.TreeBranchLeafNode?.label || null,
              operationDetail: parsedDetail,
              lastResolved: new Date()
            }
          });
          results.updated++;
        }
      } else {
        await prisma.treeBranchLeafSubmissionData.create({
          data: {
            id: `${submissionId}-${capacity.nodeId}-cap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            submissionId,
            nodeId: capacity.nodeId,
            value: hasValidValue ? String(rawValue) : null,
            sourceRef,
            operationSource: normalizedOperationSource,
            fieldLabel: capacity.TreeBranchLeafNode?.label || null,
            operationDetail: parsedDetail,
            lastResolved: new Date()
          }
        });
        results.created++;
      }

      // Rollback des alias temporaires (évite la pollution cross-capacities)
      if (injectedBaseKeys.length) {
        for (const k of injectedBaseKeys) {
          valueMap.delete(k);
        }
      }
    } catch (error) {
      console.error(`[TBL CAPACITY ERROR] ${sourceRef}:`, error);
    }
  }

  // 🛡️ FIX 2026-01-31 v2: Ajouter les valeurs DISPLAY restaurées depuis DB qui n'ont pas été recalculées
  // Ces valeurs avaient été écrasées par le formData avec des valeurs obsolètes (0, 1)
  // Elles doivent être renvoyées au frontend pour corriger l'affichage
  if (restoredDbDisplayValues.size > 0) {
    const alreadyComputed = new Set(computedValuesToStore.map(c => c.nodeId));
    let addedFromDb = 0;
    for (const [nodeId, dbValue] of restoredDbDisplayValues) {
      if (!alreadyComputed.has(nodeId)) {
        computedValuesToStore.push({
          nodeId,
          value: String(dbValue),
          sourceRef: 'db-restored',
          operationSource: 'neutral' as OperationSourceType,
          fieldLabel: null,
          operationDetail: { source: 'db-restore', reason: 'formData had weak value' } as Prisma.InputJsonValue,
          operationResult: null,
          calculatedBy: 'db-restore-fix'
        });
        addedFromDb++;
      }
    }
    if (addedFromDb > 0) {
    }
  }

  // 🔗 NOUVEAU: Rafraîchir les champs Link dont le champ source a changé
  // Les valeurs Link sont récupérées depuis le champ cible et ajoutées aux résultats
  if (linkedFieldsToRefresh.size > 0) {
    const alreadyComputed = new Set(computedValuesToStore.map(c => c.nodeId));
    
    for (const [linkedNodeId, linkInfo] of linkedFieldsToRefresh.entries()) {
      if (alreadyComputed.has(linkedNodeId)) continue;
      
      let linkValue: string | null = null;
      
      // 🔧 FIX R21: Chercher dans formData sous targetNodeId OU sous changedFieldId (version suffixée repeater)
      if (formData && linkInfo.targetNodeId in formData) {
        const fv = formData[linkInfo.targetNodeId];
        linkValue = fv !== null && fv !== undefined ? String(fv) : null;
      }
      // FIX R21: Si pas trouvé avec l'ID de base, chercher avec les clés suffixées dans formData
      if (!linkValue && formData) {
        for (const [key, val] of Object.entries(formData)) {
          if (key.startsWith(linkInfo.targetNodeId + '-') && /^-\d+$/.test(key.slice(linkInfo.targetNodeId.length))) {
            if (val !== null && val !== undefined) {
              linkValue = String(val);
              break;
            }
          }
        }
      }
      
      if (!linkValue) {
        const submissionDataRecord = await prisma.treeBranchLeafSubmissionData.findFirst({
          where: { submissionId, nodeId: linkInfo.targetNodeId },
          orderBy: { lastResolved: 'desc' }
        });
        if (submissionDataRecord?.value) linkValue = submissionDataRecord.value;
      }
      
      if (!linkValue) {
        const targetNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: linkInfo.targetNodeId },
          select: { calculatedValue: true }
        });
        if (targetNode?.calculatedValue) linkValue = targetNode.calculatedValue;
      }
      
      if (linkValue !== null) {
        computedValuesToStore.push({
          nodeId: linkedNodeId,
          value: linkValue,
          sourceRef: `link:${linkInfo.targetNodeId}`,
          operationSource: 'neutral' as OperationSourceType,
          fieldLabel: linkInfo.nodeLabel,
          operationDetail: { source: 'link', targetNodeId: linkInfo.targetNodeId } as Prisma.InputJsonValue,
          operationResult: null,
          calculatedBy: 'link'
        });
      }
    }
  }

  // 🎯 STOCKER les valeurs calculées (DISPLAY inclus) dans SubmissionData (scopé devis/brouillon)
  if (computedValuesToStore.length > 0) {
    try {
      const stored = await upsertComputedValuesForSubmission(submissionId, computedValuesToStore);
      results.displayFieldsUpdated = stored;
    } catch (computedStoreError) {
      console.error('[COMPUTED VALUES] Erreur stockage:', computedStoreError);
    }
  }

  return results;
}

/**
 * 🔥 POST /api/tbl/submissions/:submissionId/evaluate-all
 * 
 * Évalue TOUTES les capacités d'une soumission avec TBL Prisma
 * et sauvegarde les traductions intelligentes en base
 */
router.post('/submissions/:submissionId/evaluate-all', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { forceUpdate = false } = req.body || {};
    
    // Récupérer l'organisation de l'utilisateur authentifié (endpoint PUT)
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    // 🔑 Récupérer userId depuis le header X-User-Id ou le middleware auth
    const userId = req.headers['x-user-id'] as string || (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organisation ID manquant - authentification requise'
      });
    }
    
    
    // 1. Récupérer toutes les données de soumission avec capacités
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId,
        sourceRef: { not: null }
      },
      include: {
        TreeBranchLeafNode: {
          select: { label: true, type: true }
        }
      }
    });
    
    
    if (submissionData.length === 0) {
      return res.json({
        success: true,
        message: 'Aucune capacité à évaluer',
        evaluated: 0
      });
    }
    
    // 2. Contexte d'évaluation (Maps initialisées)
  const _context = {
      submissionId,
      organizationId, // ✅ VRAIE ORGANISATION!
      userId, // ✅ VRAI UTILISATEUR!
      labelMap: new Map<string, string>(), // 🔥 MAPS INITIALISÉES
      valueMap: new Map<string, unknown>()
    };
    
  let evaluatedCount = 0;
  let errorCount = 0;
    const results = [];
    
    // 4. Évaluer chaque capacité avec TBL Prisma
    for (const data of submissionData) {
      try {
        // Skip si déjà évalué (sauf si forceUpdate)
        if (!forceUpdate && data.operationResult && data.lastResolved) {
          continue;
        }
        
        
        // ✨ Calculer avec operation-interpreter (système unifié)
        const calculationResult = await evaluateVariableOperation(
          data.nodeId,
          submissionId,
          prisma
        );
        

        // 5. Sauvegarder en base SEULEMENT si changement (NO-OP sinon)
        const normalize = (v: unknown) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'string') return v;
          try { return JSON.stringify(v); } catch { return String(v); }
        };

        const normalizedSource: Prisma.OperationSource = (
          typeof calculationResult.operationSource === 'string'
            ? calculationResult.operationSource.toLowerCase()
            : 'neutral'
        ) as Prisma.OperationSource;

        const nextDetail: Prisma.InputJsonValue = (() => {
          try {
            return typeof calculationResult.operationDetail === 'string'
              ? JSON.parse(calculationResult.operationDetail)
              : (calculationResult.operationDetail as unknown as Prisma.InputJsonValue);
          } catch { return calculationResult.operationDetail as unknown as Prisma.InputJsonValue; }
        })();

        const changed = (
          (data.operationSource || null) !== (normalizedSource || null) ||
          normalize(data.operationDetail) !== normalize(nextDetail)
        );

        if (changed) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: data.id },
            data: {
              operationDetail: nextDetail,
              operationSource: normalizedSource,
              lastResolved: new Date()
            }
          });
        } else {
        }
        
        results.push({
          id: data.id,
          sourceRef: data.sourceRef,
          nodeLabel: data.TreeBranchLeafNode?.label,
          operationResult: calculationResult.operationResult,
          success: true
        });
        
        evaluatedCount++;
        
      } catch (error) {
        console.error(`❌ [TBL EVALUATE ALL] Erreur pour ${data.sourceRef}:`, error);
        
        results.push({
          id: data.id,
          sourceRef: data.sourceRef,
          nodeLabel: data.TreeBranchLeafNode?.label,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          success: false
        });
        
        errorCount++;
      }
    }
    
    
    return res.json({
      success: true,
      submissionId,
      evaluated: evaluatedCount,
      errors: errorCount,
      total: submissionData.length,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL EVALUATE ALL] Erreur globale:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'évaluation complète',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * 📊 GET /api/tbl/submissions/:submissionId/verification
 * 
 * Vérifie que toutes les traductions intelligentes sont bien sauvegardées
 */
router.get('/submissions/:submissionId/verification', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    
    // Récupérer les lignes concernées et compter en mémoire (operationResult est un JSON)
    const rows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId, sourceRef: { not: null } },
      select: { operationResult: true }
    });

    const total = rows.length;
    const toStringSafely = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return val;
      try { return JSON.stringify(val); } catch { return String(val); }
    };

    let withIntelligentTranslations = 0; // heuristique: contient "Si " ou "(=) Result ("
    let withOldMessages = 0;            // heuristique: message legacy
    let withErrors = 0;                 // null/empty

    for (const r of rows) {
      const s = toStringSafely(r.operationResult).trim();
      if (!s) {
        withErrors++;
        continue;
      }
      if (s.includes('Évalué dynamiquement par TBL Prisma')) {
        withOldMessages++;
      }
      if (s.includes('Si ') || /(=) Result \(/.test(s) || s.includes('(/)')) {
        withIntelligentTranslations++;
      }
    }

    const successRate = total > 0 ? Math.round(((total - withOldMessages - withErrors) / total) * 100) : 100;

    return res.json({
      success: true,
      submissionId,
      verification: {
        total,
        withIntelligentTranslations,
        withOldMessages,
        withErrors,
        successRate: `${successRate}%`
      },
      status: withOldMessages === 0 && withErrors === 0 ? 'perfect' : 'needs_improvement',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [TBL VERIFICATION] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

/**
 * 🔥 POST /api/tbl/submissions/create-and-evaluate
 * 
 * ENDPOINT TOUT-EN-UN : Crée une soumission ET l'évalue avec TBL Prisma
 * SANS JAMAIS passer par les routes TreeBranchLeaf legacy !
 */
router.post('/submissions/create-and-evaluate', async (req, res) => {
  try {
    const {
      treeId,
      clientId,
      formData,
      status = 'draft',
      providedName,
      reuseSubmissionId,
      submissionId: requestedSubmissionId,
      changedFieldId,
      evaluationMode,
      forceNewSubmission,
    } = req.body;
    
    // 🎯 Déterminer le mode d'évaluation
    // - 'open': ouverture brouillon/devis, transfert lead → recalcul complet
    // - 'autosave': sauvegarde périodique → skip DISPLAY
    // - 'change': modification utilisateur → recalcul ciblé par triggers
    let mode: EvaluationMode = 'change';
    if (evaluationMode === 'open' || evaluationMode === 'autosave' || evaluationMode === 'change') {
      mode = evaluationMode;
    } else if (changedFieldId === 'NULL') {
      // Rétrocompatibilité: changedFieldId='NULL' sans mode explicite → autosave
      mode = 'autosave';
    }
    const cleanFormData = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : undefined;
    
    // 🎯 Récupérer le champ modifié pour filtrer les triggers (nouveau paramètre optionnel)
    const triggerFieldId = changedFieldId as string | undefined;

    // Permet de créer volontairement un nouveau brouillon (sans réutiliser le draft existant).
    // Utile pour "copier" / "nouveau brouillon" côté UI.
    const shouldForceNewSubmission = Boolean(forceNewSubmission);
    
    // Récupérer l'organisation de l'utilisateur authentifié
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = req.headers['x-user-id'] as string || (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    const canEditCompletedInPlace = isAdminOrSuperAdmin(req);
    const isSuperAdmin = Boolean((req as AuthenticatedRequest).user?.isSuperAdmin) || (req as AuthenticatedRequest).user?.role === 'super_admin';
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organisation ID manquant - authentification requise'
      });
    }
    
    
    // 1. Vérifier et récupérer l'arbre réel depuis la base de données
    let effectiveTreeId = treeId as string | undefined;
    const hasExistingSubmission = requestedSubmissionId || reuseSubmissionId;
    
    // 🚀 FIX R9: Si une submissionId est fournie, on récupérera le treeId depuis la soumission existante
    // → Pas besoin de faire un findFirst() coûteux ici
    if (!effectiveTreeId && !hasExistingSubmission) {
      console.log('⚠️ [TBL CREATE-AND-EVALUATE] Aucun treeId fourni et pas de submissionId, recherche du premier arbre...');
      const firstTree = await prisma.treeBranchLeafTree.findFirst({
        select: { id: true, name: true }
      });
      
      if (!firstTree) {
        throw new Error('Aucun arbre TreeBranchLeaf trouvé dans la base de données');
      }
      
      effectiveTreeId = firstTree.id;
    } else if (effectiveTreeId) {
      // treeId fourni: on fait confiance au frontend (skip la vérification DB pour la perf)
      // Le treeId sera de toute façon validé plus tard lors de l'évaluation
    }
    
    // 2. Vérifier et gérer le Lead (clientId)
    // 🔥 IMPORTANT: TOUT DEVIS DOIT AVOIR UN LEAD ASSOCIÉ (organizationId + treeId + leadId)
    // ⚠️ EXCEPTION: Les devis "default-draft" peuvent être créés sans lead (brouillon par défaut)
    
    let effectiveLeadId: string | null = clientId || null;
    
    // Pour les default-draft, on autorise la création sans lead
    const isDefaultDraft = status === 'default-draft';
    
    if (!clientId && !isDefaultDraft) {
      console.log('❌ [TBL CREATE-AND-EVALUATE] Aucun leadId fourni - REQUIS (sauf pour default-draft)');
      return res.status(400).json({
        success: false,
        error: 'Lead obligatoire',
        message: 'Un lead doit être sélectionné pour créer un devis. Veuillez sélectionner ou créer un lead.'
      });
    }
    
    if (clientId) {
      // Vérifier que le lead fourni existe bien
      const leadExists = await prisma.lead.findUnique({
        where: { id: clientId },
        select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
      });
      
      if (!leadExists) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] Lead ${clientId} introuvable`);
        return res.status(404).json({
          success: false,
          error: 'Lead introuvable',
          message: `Le lead ${clientId} n'existe pas. Veuillez sélectionner un lead valide.`
        });
      }
      
      // Vérifier que le lead appartient bien à la même organisation (sauf pour Super Admin)
      if (!isSuperAdmin && leadExists.organizationId !== organizationId) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] Le lead ${clientId} n'appartient pas à l'organisation ${organizationId}`);
        return res.status(403).json({
          success: false,
          error: 'Lead non autorisé',
          message: 'Le lead sélectionné n\'appartient pas à votre organisation.'
        });
      }
      
      if (isSuperAdmin && leadExists.organizationId !== organizationId) {
      }
      
      effectiveLeadId = leadExists.id;
    } else {
    }
    
    // 3. Vérifier l'utilisateur si fourni
    let effectiveUserId = userId;
    
    if (effectiveUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true, firstName: true, lastName: true }
      });
      
      if (!userExists) {
        console.log(`❌ [TBL CREATE-AND-EVALUATE] User ${effectiveUserId} introuvable, soumission sans utilisateur`);
        effectiveUserId = null;
      } else {
      }
    }
    
    // 4. Déterminer la soumission cible (compat: submissionId OU reuseSubmissionId)
    let submissionId = (requestedSubmissionId as string | undefined) || (reuseSubmissionId as string | undefined);
    let revisionJustCreated = false; // 🛡️ FIX 2026-01-31: Track si une révision vient d'être créée
    let existingSubmission:
      | {
          id: string;
          treeId: string;
          leadId: string | null;
          userId: string | null;
          status: string;
          organizationId: string | null;
          summary: Prisma.JsonValue;
          exportData: Prisma.JsonValue | null;
          completedAt: Date | null;
        }
      | null = null;

    if (submissionId) {
      existingSubmission = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          treeId: true,
          leadId: true,
          userId: true,
          status: true,
          organizationId: true,
          summary: true,
          exportData: true,
          completedAt: true,
        },
      });
      if (!existingSubmission) {
        submissionId = undefined;
      } else {
        // Sécurité org (sauf superadmin)
        if (!isSuperAdmin && existingSubmission.organizationId && existingSubmission.organizationId !== organizationId) {
          return res.status(403).json({
            success: false,
            error: 'Soumission non autorisée',
            message: 'Cette soumission n\'appartient pas à votre organisation.'
          });
        }

        // En mode édition d'une soumission existante: verrouiller tree/lead (évite cross-write)
        if (effectiveTreeId && effectiveTreeId !== existingSubmission.treeId) {
          return res.status(400).json({
            success: false,
            error: 'treeId invalide',
            message: 'treeId ne correspond pas à la soumission existante.'
          });
        }
        effectiveTreeId = existingSubmission.treeId;

        if (clientId && existingSubmission.leadId && clientId !== existingSubmission.leadId) {
          return res.status(400).json({
            success: false,
            error: 'leadId invalide',
            message: 'clientId ne correspond pas au lead de la soumission existante.'
          });
        }
        if (existingSubmission.leadId) {
          effectiveLeadId = existingSubmission.leadId;
        }

        const isCompleted = existingSubmission.status === 'completed';
        const isRealUserChange = Boolean(triggerFieldId && triggerFieldId !== 'NULL');

        const summaryObj = (existingSubmission.summary && typeof existingSubmission.summary === 'object')
          ? (existingSubmission.summary as Record<string, unknown>)
          : null;
        const summaryName = summaryObj && typeof summaryObj.name === 'string' ? summaryObj.name : '';
        const isRevision = Boolean(
          summaryObj && typeof summaryObj.revisionOfSubmissionId === 'string' && summaryObj.revisionOfSubmissionId.trim()
        ) || /-\d+\s*$/.test(summaryName);

        // ✅ VERSIONING
        // - Si `forceNewSubmission=true`: on clone la completed vers une nouvelle soumission au statut demandé (draft OU completed).
        // - Sinon: pour non-admin, on protège l'original completed en clonant en draft, MAIS on autorise l'édition in-place des révisions.
        if (isCompleted && !canEditCompletedInPlace && isRealUserChange) {
          if (shouldForceNewSubmission) {
            const newId = await cloneCompletedSubmissionToDraft({
              originalSubmissionId: existingSubmission.id,
              requestedByUserId: userId && userId !== 'unknown-user' ? userId : null,
              targetStatus: status === 'completed' ? 'completed' : 'draft',
              providedName: typeof providedName === 'string' ? providedName : null,
            });
            submissionId = newId;
            existingSubmission = null;
            revisionJustCreated = true; // 🛡️ FIX: Forcer mode 'open' pour recalculer tous les DISPLAY
          } else if (!isRevision) {
            const newId = await cloneCompletedSubmissionToDraft({
              originalSubmissionId: existingSubmission.id,
              requestedByUserId: userId && userId !== 'unknown-user' ? userId : null,
              targetStatus: 'draft',
            });
            submissionId = newId;
            existingSubmission = null;
            revisionJustCreated = true; // 🛡️ FIX: Forcer mode 'open' pour recalculer tous les DISPLAY
          }
        }
      }
    }
    
    // 🔥 NOUVEAU: Chercher une submission draft existante AVANT de créer une nouvelle
    // ⚠️ IMPORTANT: Pour default-draft, on cherche par userId + treeId + status
    // Pour les autres drafts, on cherche par organizationId + treeId + leadId
    if (!submissionId) {
      let existingDraft;
      
      if (isDefaultDraft) {
        // Pour default-draft: chercher par userId + treeId + status="default-draft"
        existingDraft = await prisma.treeBranchLeafSubmission.findFirst({
          where: {
            treeId: effectiveTreeId,
            userId: effectiveUserId,
            organizationId: organizationId,
            status: 'default-draft'
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true }
        });
        if (existingDraft) {
        }
      } else if (effectiveLeadId && !shouldForceNewSubmission) {
        // Pour les drafts normaux: chercher par leadId + treeId
        existingDraft = await prisma.treeBranchLeafSubmission.findFirst({
          where: {
            treeId: effectiveTreeId,
            leadId: effectiveLeadId,
            organizationId: organizationId,
            status: 'draft'
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true }
        });
        if (existingDraft) {
        }
      }
      
      if (existingDraft) {
        submissionId = existingDraft.id;
      }
    }
    
    if (!submissionId) {
      submissionId = `tbl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await prisma.treeBranchLeafSubmission.create({
        data: {
          id: submissionId,
          treeId: effectiveTreeId,
          userId: effectiveUserId,
          leadId: effectiveLeadId,
          organizationId: organizationId, // 🔥 IMPORTANT pour retrouver les drafts
          status: status || 'draft',
          summary: { name: providedName || `Devis TBL ${new Date().toLocaleDateString()}` },
          exportData: cleanFormData || {},
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date()
        }
      });
    } else {
      // Mettre à jour la submission existante (ou une révision fraîchement créée)
      const current = await prisma.treeBranchLeafSubmission.findUnique({
        where: { id: submissionId },
        select: { id: true, status: true, completedAt: true }
      });
      const keepCompleted = current?.status === 'completed' && canEditCompletedInPlace;
      const nextStatus = keepCompleted ? 'completed' : (status || 'draft');

      const updateData: Prisma.TreeBranchLeafSubmissionUpdateInput = {
        status: nextStatus,
        updatedAt: new Date(),
        completedAt: keepCompleted ? (current?.completedAt ?? new Date()) : (nextStatus === 'completed' ? new Date() : null),
      };

      if (providedName && typeof providedName === 'string' && providedName.trim()) {
        updateData.summary = { name: providedName.trim() } as unknown as Prisma.InputJsonValue;
      }

      // ⚠️ Ne pas écraser exportData si le frontend envoie formData vide ({})
      // (sinon on “efface” le devis et on réintroduit des valeurs figées).
      if (cleanFormData && typeof cleanFormData === 'object' && Object.keys(cleanFormData).length > 0) {
        updateData.exportData = cleanFormData as unknown as Prisma.InputJsonValue;
      }

      await prisma.treeBranchLeafSubmission.update({
        where: { id: submissionId },
        data: updateData
      });
    }
    
    // 5. Sauvegarder d'abord les données UTILISATEUR en base, puis évaluer et sauvegarder les CAPACITÉS
    if (cleanFormData && typeof cleanFormData === 'object') {
      // A. Sauvegarder les données utilisateur directes (réutilise NO-OP)
  const savedCount = await saveUserEntriesNeutral(submissionId!, cleanFormData, effectiveTreeId);
      
      // B. Récupérer toutes les capacités (conditions, formules, tables) depuis TreeBranchLeafNodeVariable
      const capacities = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          TreeBranchLeafNode: {
            treeId: effectiveTreeId
          },
          sourceRef: { not: null }
        },
        include: {
          TreeBranchLeafNode: {
            select: { id: true, label: true }
          }
        }
      });
      
      
      // � FIX R16: Le moteur de calcul est IDENTIQUE quel que soit le mode (brouillon, lead, enregistré).
      // Le clone copie toutes les données → les valeurs DISPLAY sont déjà correctes.
      // Seul le champ modifié par l'utilisateur déclenche un recalcul ciblé via triggers.
      // On ne force PLUS 'open' après révision → le mode 'change' fonctionne parfaitement.
      const effectiveMode = mode;
      
      // C. Évaluer et persister les capacités avec NO-OP - 🔑 PASSER LE FORMDATA pour réactivité !
      const evalStats = await evaluateCapacitiesForSubmission(submissionId!, organizationId!, userId || null, effectiveTreeId, cleanFormData, effectiveMode, triggerFieldId);
    }
    
    // 3. Évaluation immédiate déjà effectuée via operation-interpreter ci-dessus.
    //    On évite une seconde passe redondante qui réécrit inutilement en base.
    
    // 4. Retourner la soumission complète (sans include - pas de relation définie)
    const finalSubmission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId }
    });
    
    // Récupérer les données de soumission séparément
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId: submissionId }
    });
    
    return res.status(201).json({
      success: true,
      message: 'Soumission créée et évaluée avec TBL Prisma',
      submission: {
        ...finalSubmission,
        TreeBranchLeafSubmissionData: submissionData
      }
    });
    
  } catch (error) {
    console.error('❌ [TBL CREATE-AND-EVALUATE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur interne'
    });
  }
});

/**
 * 🔄 PUT /api/tbl/submissions/:submissionId/update-and-evaluate
 * 
 * Met à jour les données utilisateur d'une soumission existante (sans recréer)
 * puis évalue toutes les capacités et sauvegarde les résultats (NO-OP).
 */
router.put('/submissions/:submissionId/update-and-evaluate', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { formData, status } = req.body || {};
    const cleanFormData = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : undefined;

    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    const userId = (req as AuthenticatedRequest).user?.userId || null;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' });
    }

    const submission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, treeId: true, status: true, exportData: true }
    });
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Soumission introuvable' });
    }

    // 1) Sauvegarder les données utilisateur (NO-OP)
  const saved = await saveUserEntriesNeutral(submissionId, cleanFormData, submission.treeId);

    // 2) Option: mettre à jour le statut de la soumission si fourni (NO-OP)
    const updateData: Prisma.TreeBranchLeafSubmissionUpdateInput = {};
    if (status && status !== submission.status) {
      updateData.status = status;
    }
    // 2b) Mettre à jour exportData si fourni (NO-OP)
    if (cleanFormData) {
      // ⚠️ Protéger contre les payloads vides ({}) qui ne représentent pas une intention de “wipe”.
      if (typeof cleanFormData === 'object' && Object.keys(cleanFormData).length === 0) {
        // no-op
      } else {
      const normalize = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      if (normalize(submission.exportData) !== normalize(cleanFormData)) {
        updateData.exportData = cleanFormData as unknown as Prisma.InputJsonValue;
      }
      }
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.treeBranchLeafSubmission.update({ where: { id: submissionId }, data: updateData });
    }

    // 3) Évaluer et persister les capacités liées à l'arbre - 🔑 PASSER LE FORMDATA pour réactivité !
    const stats = await evaluateCapacitiesForSubmission(submissionId, organizationId, userId, submission.treeId, cleanFormData, 'change');

    // 4) Retourner la soumission complète
    const finalSubmission = await prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      include: { TreeBranchLeafSubmissionData: true }
    });

    return res.json({
      success: true,
      message: `Soumission mise à jour (${saved} entrées) et évaluée (${stats.updated} mises à jour, ${stats.created} créées, ${stats.displayFieldsUpdated} display fields réactifs)`,
      submission: finalSubmission
    });

  } catch (error) {
    console.error('❌ [TBL UPDATE-AND-EVALUATE] Erreur:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

/**
 * 🧪 POST /api/tbl/submissions/preview-evaluate
 *
 * Évalue les capacités pour un arbre donné EN MÉMOIRE uniquement (aucune écriture en base).
 * Permet un flux "prévisualisation" pour un nouveau devis ou pour tester des changements
 * avant de sauvegarder. Peut fusionner les données d'une soumission existante (baseSubmissionId)
 * avec des overrides (formData) pour simuler l'état final sans persister.
 */
router.post('/submissions/preview-evaluate', async (req, res) => {
  try {
    const { treeId, formData, baseSubmissionId, leadId } = req.body || {};

    // 🔍 DEBUG: Log formData pour voir quelles clés sont envoyées par le frontend
    if (formData) {
      const keys = Object.keys(formData).filter(k => !k.startsWith('__'));
      const orientationKeys = keys.filter(k => k.includes('c071a466') || k.includes('Orientation'));
      const inclinaisonKeys = keys.filter(k => k.includes('76a40eb1') || k.includes('Inclinaison'));
    }

    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    // 🔑 Récupérer userId depuis le header X-User-Id ou le middleware auth
    const userId = req.headers['x-user-id'] as string || (req as AuthenticatedRequest).user?.userId || 'unknown-user';

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organisation ID manquant - authentification requise' });
    }

    // 1) Résoudre l'arbre
    let effectiveTreeId = treeId as string | undefined;
    if (!effectiveTreeId) {
      const firstTree = await prisma.treeBranchLeafTree.findFirst({ select: { id: true } });
      if (!firstTree) {
        return res.status(404).json({ success: false, error: 'Aucun arbre TreeBranchLeaf trouvé' });
      }
      effectiveTreeId = firstTree.id;
    } else {
      const exists = await prisma.treeBranchLeafTree.findUnique({ where: { id: effectiveTreeId }, select: { id: true } });
      if (!exists) {
        return res.status(404).json({ success: false, error: `Arbre introuvable: ${effectiveTreeId}` });
      }
    }

    // 2) Préparer labelMap pour tous les nodes de l'arbre
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: effectiveTreeId }, select: { id: true, label: true } });
    const labelMap = new Map<string, string | null>();
    for (const n of nodes) labelMap.set(n.id, n.label);

    // 3) Construire valueMap: données existantes (si baseSubmissionId) + overrides formData
    const valueMap = new Map<string, unknown>();
    
    // 3a) 🆕 Charger les données du Lead si présent
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId as string },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          leadNumber: true,
          linkedin: true,
          website: true,
          status: true,
          notes: true,
          data: true
        }
      });
      
      if (lead) {
        // Ajouter les champs du Lead dans le valueMap avec le préfixe "lead."
        valueMap.set('lead.id', lead.id);
        valueMap.set('lead.firstName', lead.firstName);
        valueMap.set('lead.lastName', lead.lastName);
        valueMap.set('lead.email', lead.email);
        valueMap.set('lead.phone', lead.phone);
        valueMap.set('lead.company', lead.company);
        valueMap.set('lead.leadNumber', lead.leadNumber);
        valueMap.set('lead.linkedin', lead.linkedin);
        valueMap.set('lead.website', lead.website);
        valueMap.set('lead.status', lead.status);
        valueMap.set('lead.notes', lead.notes);
        
        // ✅ Extraire les données de l'objet JSON `data` s'il existe
        if (lead.data && typeof lead.data === 'object') {
          const leadData = lead.data as Record<string, unknown>;
          
          // Ajouter le code postal s'il existe dans data
          // 🔥 FIX: Support multiple formats de données
          // 1. data.postalCode (format direct)
          // 2. data.address.zipCode (format structuré)
          // 3. Extraction depuis data.address (string)
          if (leadData.postalCode) {
            valueMap.set('lead.postalCode', leadData.postalCode);
          } else if (leadData.address && typeof leadData.address === 'object') {
            // Format structuré: data.address.zipCode
            const addressObj = leadData.address as Record<string, unknown>;
            if (addressObj.zipCode) {
              valueMap.set('lead.postalCode', addressObj.zipCode);
            } else if (addressObj.postalCode) {
              valueMap.set('lead.postalCode', addressObj.postalCode);
            }
          } else if (leadData.address && typeof leadData.address === 'string') {
            // 🆕 Extraire le code postal depuis l'adresse (format: "Rue..., 5150 Ville, Pays")
            const postalCodeMatch = leadData.address.match(/\b(\d{4,5})\b/);
            if (postalCodeMatch) {
              const extractedPostalCode = postalCodeMatch[1];
              valueMap.set('lead.postalCode', extractedPostalCode);
            }
          }
          
          if (leadData.address) {
            valueMap.set('lead.address', leadData.address);
          }
          if (leadData.city) {
            valueMap.set('lead.city', leadData.city);
          }
          if (leadData.country) {
            valueMap.set('lead.country', leadData.country);
          }
        }
      }
    }
    
    // 3b) Charger les données de la submission existante
    // 🔥 FIX 30/01/2026: Filtrer par operationSource pour ne charger QUE les inputs utilisateur
    // Les anciennes valeurs calculées (formula/condition/table) ne doivent PAS polluer le valueMap
    if (baseSubmissionId) {
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { 
          submissionId: baseSubmissionId,
          OR: [
            { operationSource: null },
            { operationSource: 'neutral' }
          ]
        },
        select: { nodeId: true, value: true }
      });

      const existingEntries = existingData.map(row => [row.nodeId, row.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, effectiveTreeId);
    }
    
    // 3c) Appliquer les overrides du formData
    if (formData && typeof formData === 'object') {
      const overrides = Object.entries(formData as Record<string, unknown>).filter(([k]) => !k.startsWith('__'));
      await applySharedReferenceValues(valueMap, overrides as Array<[string, unknown]>, effectiveTreeId);
    }

    // [Auto-Clean] Logique d'auto-nettoyage pour les sélections Plan/Inclinaison
    if (formData && typeof formData === 'object') {
      const formEntries = Object.entries(formData as Record<string, unknown>);
      
      // Mapping des références partagées pour chaque option
      const sharedReferenceMapping = {
        'plan': ['shared-ref-1764095668124-l53956', 'shared-ref-1764095679973-fad7d7', 'shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h'],
        'inclinaison': ['shared-ref-1764093957109-52vog', 'shared-ref-1764093355187-f83m8h']
      };

      for (const [nodeId, value] of formEntries) {
        if (!nodeId.startsWith('__') && value !== null && value !== undefined && value !== '') {
          // Récupérer le node pour vérifier s'il a des références partagées
          const nodeInfo = await prisma.treeBranchLeafNode.findUnique({
            where: { id: nodeId },
            select: { 
              id: true, 
              label: true, 
              sharedReferenceIds: true,
              TreeBranchLeafSelectConfig: {
                select: {
                  id: true,
                  options: true
                }
              }
            }
          });

          if (nodeInfo?.TreeBranchLeafSelectConfig?.options) {
            // Les options sont maintenant stockées dans un JSON
            const options = Array.isArray(nodeInfo.TreeBranchLeafSelectConfig.options) 
              ? nodeInfo.TreeBranchLeafSelectConfig.options 
              : [];
            
            // Trouver l'option sélectionnée
            const selectedOption = options.find((opt: any) => opt.value === value);
            if (selectedOption?.sharedReferenceIds?.length) {
              // Identifier le type d'option (plan ou inclinaison)
              let optionType: string | null = null;
              if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.plan)) {
                optionType = 'plan';
              } else if (JSON.stringify(selectedOption.sharedReferenceIds) === JSON.stringify(sharedReferenceMapping.inclinaison)) {
                optionType = 'inclinaison';
              }

              if (optionType) {
                // Identifier les références à nettoyer (les autres types)
                const referencesToClean = optionType === 'plan' 
                  ? sharedReferenceMapping.inclinaison 
                  : sharedReferenceMapping.plan;
                
                // Trouver tous les nodes qui utilisent ces références dans l'arbre
                const nodesToClean = await prisma.treeBranchLeafNode.findMany({
                  where: {
                    treeId: effectiveTreeId,
                    sharedReferenceIds: { hasSome: referencesToClean }
                  },
                  select: { id: true, label: true, sharedReferenceIds: true }
                });

                // Nettoyer ces nodes dans le valueMap (données temporaires)
                for (const nodeToClean of nodesToClean) {
                  if (valueMap.has(nodeToClean.id)) {
                    valueMap.delete(nodeToClean.id);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 4) Récupérer les capacités de l'arbre (VARIABLES + FORMULES)
    const [variablesRaw, formulasRaw] = await Promise.all([
      prisma.treeBranchLeafNodeVariable.findMany({
        where: { TreeBranchLeafNode: { treeId: effectiveTreeId }, sourceRef: { not: null } },
        include: { TreeBranchLeafNode: { select: { id: true, label: true } } }
      }),
      prisma.treeBranchLeafNodeFormula.findMany({
        where: { 
          nodeId: {
            in: (await prisma.treeBranchLeafNode.findMany({
              where: { treeId: effectiveTreeId, hasFormula: true },
              select: { id: true }
            })).map(n => n.id)
          }
        }
      })
    ]);
    
    // Récupérer les infos des nodes pour les formules
    const formulaNodeIds = formulasRaw.map(f => f.nodeId);
    const formulaNodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: formulaNodeIds } },
      select: { id: true, label: true }
    });
    const nodeMapForFormulas = new Map(formulaNodes.map(n => [n.id, n]));
    
    // Combiner Variables + Formulas
    const capacitiesRaw = [
      ...variablesRaw,
      ...formulasRaw.map(f => ({
        ...f,
        sourceRef: `formula:${f.id}`,
        TreeBranchLeafNode: nodeMapForFormulas.get(f.nodeId)
      }))
    ];
    
    // 🔑 TRIER les capacités: formules simples d'abord, formules composées (sum-total) ensuite
    // Cela garantit que les valeurs des formules simples sont dans le valueMap avant d'évaluer les sommes
    const capacities = capacitiesRaw.sort((a, b) => {
      const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
      const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
      return aIsSumFormula - bIsSumFormula; // Les sum-formulas sont évaluées en dernier
    });
    // Debug désactivé pour réduire le bruit des logs

    // 5) Contexte d'évaluation (submissionId fictif)
    const submissionId = baseSubmissionId || `preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // valueMap initialisé avec les données du formulaire
    
    const context = {
      submissionId,
      organizationId,
      userId,
      treeId: effectiveTreeId,
      labelMap,
      valueMap
    } as const;

    const results: Array<{ nodeId: string; nodeLabel: string | null; sourceRef: string; operationSource: string; operationResult: unknown; operationDetail: unknown }>= [];
    let evaluated = 0;
    for (const cap of capacities) {
      try {
        
        // NOUVEAU : Utiliser le système universel operation-interpreter
        // La fonction attend maintenant 4 paramètres : (variableNodeId, submissionId, prisma, valueMap)
        const evaluation = await evaluateVariableOperation(
          cap.nodeId,              // variableNodeId
          context.submissionId,     // submissionId
          prisma,                   // prismaClient
          context.valueMap          // valueMap (données temporaires du formulaire)
        );
        
        // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour que les formules suivantes puissent l'utiliser
        if (evaluation.value !== null && evaluation.value !== undefined && evaluation.value !== '∅') {
          context.valueMap.set(cap.nodeId, evaluation.value);
        }
        
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: evaluation.operationSource as string,
          // 🔥 STRUCTURE CORRECTE: value directement au niveau racine pour SmartCalculatedField
          value: evaluation.value,              // ✅ VALEUR CALCULÉE (utilisée par SmartCalculatedField)
          calculatedValue: evaluation.value,    // ✅ ALIAS pour compatibilité
          operationResult: {
            value: evaluation.value,            // ✅ Aussi dans operationResult pour traçabilité
            humanText: evaluation.operationResult,  // ✅ Le texte explicatif
            detail: evaluation.operationDetail
          },
          operationDetail: evaluation.operationDetail,
          // 🎨 NOUVEAU: Configuration d'affichage depuis TreeBranchLeafNodeVariable
          displayConfig: {
            displayFormat: cap.displayFormat || 'number',
            unit: cap.unit || null,
            precision: cap.precision ?? 2,
            visibleToUser: cap.visibleToUser ?? true
          }
        });
        evaluated++;
      } catch (e) {
        // Erreur d'évaluation silencieuse - ne bloque pas l'ensemble de la prévisualisation
        const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
        results.push({
          nodeId: cap.nodeId,
          nodeLabel: cap.TreeBranchLeafNode?.label || null,
          sourceRef: cap.sourceRef!,
          operationSource: 'error',
          value: null,                    // ✅ Valeur nulle pour les erreurs
          calculatedValue: null,          // ✅ ALIAS
          operationResult: { 
            value: null,                  // ✅ Valeur nulle
            humanText: errorMessage,      // ✅ Message d'erreur
            error: errorMessage 
          },
          operationDetail: null,
          // 🎨 Configuration d'affichage même en cas d'erreur
          displayConfig: {
            displayFormat: cap.displayFormat || 'number',
            unit: cap.unit || null,
            precision: cap.precision ?? 2,
            visibleToUser: cap.visibleToUser ?? true
          }
        });
      }
    }

    // Résultats prêts à envoyer

    // 💾 STOCKER LES VALEURS CALCULÉES (SCOPÉES PAR submissionId)
    try {
      // 🚨 IMPORTANT : Récupérer les infos des nodes pour identifier les DISPLAY fields
      const nodeIds = results.map(r => r.nodeId);
      const nodesInfo = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, fieldType: true, type: true }
      });
      const displayFieldIds = new Set(
        nodesInfo
          .filter(n => n.fieldType === 'DISPLAY' || n.type === 'DISPLAY' || n.type === 'leaf_field')
          .map(n => n.id)
      );
      
      const computedRows = results
        .map(r => {
          const candidate = r.value ?? (r as { calculatedValue?: unknown }).calculatedValue;
          return { ...r, candidate };
        })
        .filter(r => {
          if (r.candidate === null || r.candidate === undefined) return false;
          const strValue = String(r.candidate).trim();
          if (strValue === '' || strValue === '∅') return false;
          return true;
        })
        .map(r => ({
          nodeId: r.nodeId,
          value: String(r.candidate),
          sourceRef: (r as any).sourceRef || null,
          operationSource: coerceOperationSource((r as any).operationSource),
          fieldLabel: (r as any).nodeLabel || null,
          operationDetail: ((r as any).operationDetail ?? null) as Prisma.InputJsonValue | null,
          operationResult: ((r as any).operationResult ?? null) as Prisma.InputJsonValue | null,
          calculatedBy: `preview-${userId}`
        }));

      if (computedRows.length > 0) {
        await upsertComputedValuesForSubmission(submissionId, computedRows);
      }
    } catch (storeError) {
      // Silencieux - ne pas bloquer la réponse si le stockage échoue
      console.error('[PREVIEW] Erreur stockage:', storeError);
    }

    return res.json({
      success: true,
      mode: 'preview',
      submissionId,
      treeId: effectiveTreeId,
      evaluated,
      results
    });

  } catch (error) {
    console.error('❌ [TBL PREVIEW-EVALUATE] Erreur:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' });
  }
});

/**
 * 🧱 STAGING API — aucune écriture DB tant que non "commit"
 */
router.post('/submissions/stage', async (req, res) => {
  try {
    pruneStages();
    const { stageId, treeId, submissionId, formData } = req.body || {};
    const organizationId = req.headers['x-organization-id'] as string || (req as AuthenticatedRequest).user?.organizationId;
    // 🔑 Récupérer userId depuis le header X-User-Id ou le middleware auth
    const userId = req.headers['x-user-id'] as string || (req as AuthenticatedRequest).user?.userId || 'unknown-user';
    if (!organizationId) return res.status(400).json({ success: false, error: 'Organisation ID manquant' });

    // Résoudre treeId
    let effectiveTreeId = treeId as string | undefined;
    if (!effectiveTreeId) {
      const firstTree = await prisma.treeBranchLeafTree.findFirst({ select: { id: true } });
      if (!firstTree) return res.status(404).json({ success: false, error: 'Aucun arbre trouvé' });
      effectiveTreeId = firstTree.id;
    }

    const id = stageId || newStageId();
    const clean = formData && typeof formData === 'object' ? (sanitizeFormData(formData) as Record<string, unknown>) : {};
    const existing = stagingStore.get(id);
    const merged: StageRecord = {
      id,
      organizationId,
      userId,
      treeId: effectiveTreeId!,
      submissionId: submissionId || existing?.submissionId,
      formData: { ...(existing?.formData || {}), ...clean },
      updatedAt: Date.now()
    };
    stagingStore.set(id, merged);
    return res.json({ success: true, stage: merged });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/preview', async (req, res) => {
  try {
    pruneStages();
    const { stageId } = req.body || {};
    const stage = stageId ? stagingStore.get(stageId) : undefined;
    if (!stage) return res.status(404).json({ success: false, error: 'Stage introuvable' });

    // Utilise le même moteur que preview-evaluate
    const nodes = await prisma.treeBranchLeafNode.findMany({ where: { treeId: stage.treeId }, select: { id: true, label: true } });
    const labelMap = new Map(nodes.map(n => [n.id, n.label] as const));
    const valueMap = new Map<string, unknown>();
    if (stage.submissionId) {
      const existingData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId: stage.submissionId },
        select: { nodeId: true, value: true }
      });

      const existingEntries = existingData.map(r => [r.nodeId, r.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, stage.treeId);
    }

    const stageEntries = Object.entries(stage.formData) as Array<[string, unknown]>;
    await applySharedReferenceValues(valueMap, stageEntries, stage.treeId);

    // 🔑 TRIER les capacités: formules simples d'abord, formules composées (sum-total) ensuite
    const capacitiesRaw = await prisma.treeBranchLeafNodeVariable.findMany({ where: { TreeBranchLeafNode: { treeId: stage.treeId }, sourceRef: { not: null } }, include: { TreeBranchLeafNode: { select: { id: true, label: true } } } });
    const capacities = capacitiesRaw.sort((a, b) => {
      const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
      const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
      return aIsSumFormula - bIsSumFormula;
    });
    
    const context = { submissionId: stage.submissionId || `preview-${Date.now()}`, organizationId: stage.organizationId, userId: stage.userId, treeId: stage.treeId, labelMap, valueMap } as const;
    const results = [] as Array<{ nodeId: string; nodeLabel: string | null; sourceRef: string; operationSource: string; operationResult: unknown; operationDetail: unknown }>;
    for (const c of capacities) {
      try {
        // 🔁 IMPORTANT: appliquer le mapping baseId -> baseId-<suffix> pour les copies (-1, -2, ...)
        // afin que la prévisualisation lise les inputs suffixés au lieu des valeurs “originales”.
        const injectedBaseKeys = applyCopyScopedInputAliases(valueMap, c.nodeId, c);

        // ✨ Utilisation du système unifié operation-interpreter
        const r = await evaluateVariableOperation(
          c.nodeId,
          context.submissionId,
          prisma,
          context.valueMap
        );

        // Rollback des alias temporaires (évite la pollution cross-capacities)
        if (injectedBaseKeys.length) {
          for (const k of injectedBaseKeys) {
            context.valueMap.delete(k);
          }
        }
        
        // 🔑 CRITIQUE: Ajouter la valeur calculée au valueMap pour les formules suivantes
        if (r.value !== null && r.value !== undefined && r.value !== '∅') {
          context.valueMap.set(c.nodeId, r.value);
        }
        
        results.push({ 
          nodeId: c.nodeId, 
          nodeLabel: c.TreeBranchLeafNode?.label || null, 
          sourceRef: c.sourceRef!, 
          operationSource: (r.operationSource || 'neutral') as string,
          value: r.value,                     // ✅ VALEUR CALCULÉE
          calculatedValue: r.value,           // ✅ ALIAS
          operationResult: {
            value: r.value,
            humanText: r.operationResult,
            detail: r.operationDetail
          },
          operationDetail: r.operationDetail 
        });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Erreur';
        results.push({ 
          nodeId: c.nodeId, 
          nodeLabel: c.TreeBranchLeafNode?.label || null, 
          sourceRef: c.sourceRef!, 
          operationSource: 'error',
          value: null,                        // ✅ Valeur nulle
          calculatedValue: null,              // ✅ ALIAS
          operationResult: { 
            value: null,
            humanText: errorMessage,
            error: errorMessage 
          }, 
          operationDetail: null 
        });
      }
    }
    return res.json({ success: true, stageId: stage.id, results });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/commit', async (req, res) => {
  try {
    pruneStages();
    const { stageId, asNew } = req.body || {};
    const stage = stageId ? stagingStore.get(stageId) : undefined;
    if (!stage) return res.status(404).json({ success: false, error: 'Stage introuvable' });

    if (!asNew && stage.submissionId) {
      // commit sur devis existant
      const submission = await prisma.treeBranchLeafSubmission.findUnique({ where: { id: stage.submissionId } });
      if (!submission) return res.status(404).json({ success: false, error: 'Soumission introuvable' });
      // update exportData (NO-OP) + données neutral + évaluations
      await prisma.treeBranchLeafSubmission.update({ where: { id: stage.submissionId }, data: { exportData: stage.formData as unknown as Prisma.InputJsonValue } });
  const saved = await saveUserEntriesNeutral(stage.submissionId, stage.formData, stage.treeId);
      const stats = await evaluateCapacitiesForSubmission(stage.submissionId, stage.organizationId, stage.userId, stage.treeId, undefined, 'change');
      return res.json({ success: true, submissionId: stage.submissionId, saved, stats });
    }

    // commit en nouveau devis
    const submissionId = `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await prisma.treeBranchLeafSubmission.create({ data: { id: submissionId, treeId: stage.treeId, userId: stage.userId, status: 'draft', summary: { name: `Devis TBL ${new Date().toLocaleDateString()}` }, exportData: stage.formData as unknown as Prisma.InputJsonValue, updatedAt: new Date() } });
  const saved = await saveUserEntriesNeutral(submissionId, stage.formData, stage.treeId);
    const stats = await evaluateCapacitiesForSubmission(submissionId, stage.organizationId, stage.userId, stage.treeId, undefined, 'open');
    // attacher l’id créé au stage pour permettre des commit suivants sur ce même devis
    stage.submissionId = submissionId; stage.updatedAt = Date.now(); stagingStore.set(stage.id, stage);
    return res.status(201).json({ success: true, submissionId, saved, stats });
  } catch (e) {
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : 'Erreur interne' });
  }
});

router.post('/submissions/stage/discard', (req, res) => {
  pruneStages();
  const { stageId } = req.body || {};
  if (!stageId || !stagingStore.has(stageId)) return res.json({ success: true, discarded: false });
  stagingStore.delete(stageId);
  return res.json({ success: true, discarded: true });
});

/**
 * 🔥 GET /api/tbl/tables/:tableId
 * 
 * Récupère les informations complètes d'une table (structure + lookup config)
 * Utilisé par SmartCalculatedField pour les références @table.xxx
 */
router.get('/tables/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    
    // ✅ CORRIGÉ: Récupérer la table depuis TreeBranchLeafNodeTable
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      select: {
        id: true,
        name: true,
        nodeId: true,
        meta: true,
      }
    });
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table introuvable'
      });
    }
    
    
    // Extraire la configuration de lookup depuis meta
    const meta = table.meta as any;
    const lookupConfig = meta?.lookup || {};
    
    // Extraire les données de la table (colonnes, lignes, data matrix)
    const tableData = meta?.data || {};
    const columns = tableData.columns || [];
    const rows = tableData.rows || [];
    const data = tableData.matrix || [];
    
    // Retourner les informations de la table AVEC les données
    return res.json({
      success: true,
      table: {
        id: table.id,
        nodeId: table.nodeId,
        name: table.name || null,
        type: 'matrix', // Type de table
        sourceRef: `@table.${table.id}`,
        // 🔥 DONNÉES DE LA TABLE (colonnes, lignes, data)
        columns: columns,
        rows: rows,
        data: data,
        // 🔥 CONFIGURATION DE LOOKUP
        meta: {
          lookup: {
            enabled: lookupConfig.rowLookupEnabled || lookupConfig.columnLookupEnabled || false,
            mode: lookupConfig.mode || 'columns',
            rowLookupEnabled: lookupConfig.rowLookupEnabled || false,
            columnLookupEnabled: lookupConfig.columnLookupEnabled || false,
            selectors: {
              rowFieldId: lookupConfig.selectors?.rowFieldId || null,
              columnFieldId: lookupConfig.selectors?.columnFieldId || null,
            },
            displayRow: lookupConfig.displayRow || null,
            displayColumn: lookupConfig.displayColumn || null
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [GET TABLE] Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la table',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
