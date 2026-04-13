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

/** 🔥 FIX: Détecte les sum-total nodes incluant les copies (-sum-total-1, -sum-total-2, etc.) */
function isSumTotalNodeId(nodeId: string): boolean {
  return /-sum-total(-\d+)?$/.test(nodeId);
}

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

/** Invalidation hook (no-op — plus de cache) */
export function invalidateTriggerIndexCache(_treeId?: string) { /* no-op */ }

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

    const leftRef = (obj as unknown)?.left?.ref;
    if (typeof leftRef === 'string') {
      const id = normalizeRefForTriggers(leftRef);
      if (id && isAcceptedNodeId(id)) out.add(id);
    }
    const rightRef = (obj as unknown)?.right?.ref;
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

    const lookup = (obj as any).lookup as unknown;
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
  const c = capacity as unknown;
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
  if (selectConfig) collectReferencedNodeIdsForTriggers(selectConfig as unknown, out);

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

  // 🚀 PERF FIX v2: ONE raw SQL batch upsert au lieu de N upserts séquentiels
  // Avant: N × upsert() dans $transaction = N round-trips DB × ~50ms = ~1-2s pour 25 champs
  // Après: 1 INSERT...ON CONFLICT = 1 round-trip DB = ~50ms
  const validRows = rows.filter(r => !!r.nodeId);
  if (validRows.length === 0) return 0;

  // Colonnes: id, submissionId, nodeId, value, sourceRef, operationSource, fieldLabel, operationDetail, operationResult, lastResolved
  const COLS_PER_ROW = 9; // lastResolved utilise NOW() côté SQL
  const params: (string | null)[] = [];
  const valuePlaceholders: string[] = [];

  for (const [i, row] of validRows.entries()) {
    const base = i * COLS_PER_ROW + 1;
    // ($1, $2, $3, $4, $5, ($6)::"OperationSource", $7, ($8)::jsonb, ($9)::jsonb, NOW())
    // ⚠️ CRITIQUE: le cast ::"OperationSource" est obligatoire car prisma.$executeRawUnsafe passe les strings en 'text'
    // ce qui cause l'erreur "column operationSource is of type OperationSource but expression is of type text"
    valuePlaceholders.push(
      `($${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4}, ($${base+5})::"OperationSource", $${base+6}, ($${base+7})::jsonb, ($${base+8})::jsonb, NOW())`
    );
    params.push(
      `${submissionId}-${row.nodeId}-calc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, // id
      submissionId,
      row.nodeId,
      row.value ?? null,
      row.sourceRef ?? null,
      row.operationSource ?? null,
      row.fieldLabel ?? null,
      row.operationDetail != null ? JSON.stringify(row.operationDetail) : null,   // cast ::jsonb
      row.operationResult != null ? JSON.stringify(row.operationResult) : null,   // cast ::jsonb
    );
  }

  const sql = `
    INSERT INTO "TreeBranchLeafSubmissionData"
      ("id", "submissionId", "nodeId", "value", "sourceRef", "operationSource", "fieldLabel", "operationDetail", "operationResult", "lastResolved")
    VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT ("submissionId", "nodeId") DO UPDATE SET
      "value"           = EXCLUDED."value",
      "sourceRef"       = EXCLUDED."sourceRef",
      "operationSource" = EXCLUDED."operationSource",
      "fieldLabel"      = EXCLUDED."fieldLabel",
      "operationDetail" = EXCLUDED."operationDetail",
      "operationResult" = EXCLUDED."operationResult",
      "lastResolved"    = EXCLUDED."lastResolved"
  `;

  await prisma.$executeRawUnsafe(sql, ...params);
  return validRows.length;
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
  // 🚀 Nœuds exclus per-tree (DISPLAY / hasFormula)
  let excludedNodeIds: Set<string>;
  if (treeId) {
    // Calcul: charger les nœuds exclus + affiner (FIX E2 contraintes)
    const excludedNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId,
        OR: [
          { fieldType: 'DISPLAY' },
          { type: { in: ['leaf_field', 'LEAF_FIELD'] }, subType: { in: ['display', 'DISPLAY', 'Display'] } },
          { hasFormula: true },
          { hasCondition: true },
        ],
      },
      select: { id: true, label: true },
    });
    const ids = new Set(excludedNodes.map(n => n.id));

    // 🔧 FIX E2: Re-inclure les nœuds avec UNIQUEMENT des formules de contrainte (targetProperty non-null)
    const formulaExcludedIds = excludedNodes.filter(n => ids.has(n.id)).map(n => n.id);
    if (formulaExcludedIds.length > 0) {
      const nodesWithCalcFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: { in: formulaExcludedIds }, targetProperty: null },
        select: { nodeId: true },
      });
      const nodesWithCalcSet = new Set(nodesWithCalcFormulas.map(f => f.nodeId));
      for (const nodeId of formulaExcludedIds) {
        if (!nodesWithCalcSet.has(nodeId)) ids.delete(nodeId);
      }
    }
    excludedNodeIds = ids;
  } else {
    excludedNodeIds = new Set<string>();
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

    // 🔥 FIX SHARED-REF SAVE: Vérifier aussi les storageIds résolus contre excludedNodeIds
    // Problème: si key="shared-ref-xxx" et que le vrai UUID résolu est un DISPLAY field,
    // excludedNodeIds.has("shared-ref-xxx") → false → la valeur stale est sauvegardée.
    // Fix: vérifier si N'IMPORTE QUEL storageId résolu est dans excludedNodeIds.
    if (storageIds.some(sid => excludedNodeIds.has(sid))) {
      continue; // Ne PAS sauvegarder: un des alias est un champ calculé display
    }

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

  // ✅ 🚀 PERF FIX: Batch save au lieu de N+1 queries séquentielles
  // Avant: 1 findUnique + 1 update/create par entrée = 70-140 queries
  // Après: 1 findMany batch + 1 transaction batch = 2-3 queries total
  const entryArray = Array.from(entries.values());
  const entryNodeIds = entryArray.map(e => e.nodeId);

  // Récupérer TOUS les existants en une seule requête
  const allExisting = entryNodeIds.length > 0
    ? await prisma.treeBranchLeafSubmissionData.findMany({
        where: { submissionId, nodeId: { in: entryNodeIds } },
        select: { nodeId: true, value: true, operationSource: true }
      })
    : [];
  const existingMap = new Map(allExisting.map(e => [e.nodeId, e]));

  const normalize = (v: unknown) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  };

  // Séparer creates et updates
  const toCreate: typeof entryArray = [];
  const toUpdate: typeof entryArray = [];
  for (const entry of entryArray) {
    const existing = existingMap.get(entry.nodeId);
    if (existing) {
      const changed = (
        normalize(existing.value) !== normalize(entry.value) ||
        (existing.operationSource || null) !== (entry.operationSource || null)
      );
      if (changed) toUpdate.push(entry);
    } else {
      toCreate.push(entry);
    }
  }

  // Exécuter creates + updates en une seule transaction
  if (toCreate.length > 0 || toUpdate.length > 0) {
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    // Batch create
    if (toCreate.length > 0) {
      ops.push(prisma.treeBranchLeafSubmissionData.createMany({ data: toCreate, skipDuplicates: true }));
    }
    // Updates individuels groupés dans la transaction (pas de updateMany pour des données différentes)
    for (const entry of toUpdate) {
      ops.push(prisma.treeBranchLeafSubmissionData.update({
        where: { submissionId_nodeId: { submissionId: entry.submissionId, nodeId: entry.nodeId } },
        data: {
          value: entry.value,
          operationSource: 'neutral',
          operationDetail: entry.operationDetail
        }
      }));
    }
    await prisma.$transaction(ops);
    saved += toCreate.length + toUpdate.length;
  }

  // 🗑️ SUPPRIMER les entrées vidées (batch)
  const nodeIdsToDelete = Array.from(entriesToDelete).filter(nodeId => !entries.has(nodeId));
  if (nodeIdsToDelete.length > 0) {
    const deleteResult = await prisma.treeBranchLeafSubmissionData.deleteMany({
      where: { submissionId, nodeId: { in: nodeIdsToDelete } }
    });
    saved += deleteResult.count;
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

  // � PERF: Lancer les 3 requêtes initiales EN PARALLÈLE au lieu de séquentiellement
  // Avant: submission → lead → displayNodes → existingData (4 requêtes séquentielles ~400-800ms)
  // Maintenant: tout en parallèle (~100-200ms)
  const [submissionForLead, displayNodesParallel, existingDataParallel] = await Promise.all([
    // 1. Charger la soumission pour obtenir leadId
    prisma.treeBranchLeafSubmission.findUnique({
      where: { id: submissionId },
      select: { leadId: true }
    }).catch(() => null),
    // 2. Charger les display nodes
    prisma.treeBranchLeafNode.findMany({
      where: {
        treeId,
        OR: [
          { fieldType: 'DISPLAY' },
          { type: { in: ['leaf_field', 'LEAF_FIELD'] }, subType: { in: ['display', 'DISPLAY', 'Display'] } },
        ],
      },
      select: { id: true },
    }).catch(() => [] as { id: string }[]),
    // 3. Charger les données existantes de la soumission
    prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId },
      select: { nodeId: true, value: true, operationSource: true }
    }).catch((e: Error) => { console.warn('⚠️ [EVALUATE] Hydratation DB échouée:', e?.message); return [] as { nodeId: string; value: string | null; operationSource: string | null }[]; })
  ]);

  // Charger le lead si leadId existe (requête séparée car pas de relation Prisma)
  const lead = submissionForLead?.leadId
    ? await prisma.lead.findUnique({
        where: { id: submissionForLead.leadId },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          company: true, leadNumber: true, linkedin: true, website: true,
          status: true, notes: true, data: true
        }
      }).catch(() => null)
    : null;

  // Injecter les données du Lead dans le valueMap
  try {
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
  } catch (e) {
    console.warn('⚠️ [EVALUATE] Chargement lead échoué (best-effort):', (e as Error)?.message || e);
  }

  // 🛡️ Collecter les DISPLAY nodeIds (déjà chargés en parallèle)
  const displayNodeIds = new Set<string>();
  for (const n of displayNodesParallel) {
    displayNodeIds.add(n.id);
    displayNodeIds.add(`${n.id}-sum-total`);
  }
  
  // 🔁 Hydrater depuis la DB (déjà chargé en parallèle)
  const dbDisplayValues = new Map<string, unknown>();
  try {
    if (existingDataParallel.length) {
      const existingEntries = existingDataParallel.map(r => [r.nodeId, r.value] as [string, unknown]);
      await applySharedReferenceValues(valueMap, existingEntries, treeId);
      for (const r of existingDataParallel) {
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
      // console.log(`🛡️ [FIX C] Restauré ${restoredCount} valeurs DB DISPLAY (clés absentes du formData)`);
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
    
    // 🚀 PERF: Pré-charger TOUTES les SubmissionData liées aux LINK targets en BATCH
    // Avant: 2 requêtes DB PAR link node (N+1) → avec 10 links = 20 queries
    // Maintenant: 1 seule requête batch
    const linkTargetIds = linkNodes
      .filter(ln => {
        const v = valueMap.get(ln.id);
        return !(v !== null && v !== undefined && v !== '' && v !== 0 && v !== '0');
      })
      .map(ln => ln.link_targetNodeId!)
      .filter(Boolean);
    
    // Charger toutes les SubmissionData dont le nodeId commence par un des targetIds
    const allLinkSubmissionData = linkTargetIds.length > 0
      ? await prisma.treeBranchLeafSubmissionData.findMany({
          where: { 
            submissionId,
            OR: linkTargetIds.map(tid => ({ nodeId: { startsWith: tid } }))
          },
          select: { nodeId: true, value: true },
          orderBy: { lastResolved: 'desc' }
        })
      : [];
    // Indexer par nodeId pour un lookup O(1)
    const linkSubmDataMap = new Map<string, string | null>();
    for (const sd of allLinkSubmissionData) {
      if (!linkSubmDataMap.has(sd.nodeId)) {
        linkSubmDataMap.set(sd.nodeId, sd.value);
      }
    }
    
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
              break;
            }
          }
        }
      }
      // 🚀 PERF: Utiliser le batch pré-chargé au lieu de requêtes individuelles
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        const sdValue = linkSubmDataMap.get(targetId);
        if (sdValue) targetValue = sdValue;
      }
      // Chercher avec suffixes repeater dans le batch
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        for (const [sdNodeId, sdValue] of linkSubmDataMap) {
          if (sdNodeId.startsWith(targetId + '-') && /^-\d+$/.test(sdNodeId.slice(targetId.length))) {
            if (sdValue !== null && sdValue !== '') {
              targetValue = sdValue;
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
      // console.log(`🔗 [FIX R21b] ${linkResolvedCount} LINK field(s) résolus dans le valueMap (mode: ${mode})`);
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
  // 🚀 PERF FIX: Dédupliquer par nodeId — un même node peut avoir variable + formula,
  // ce qui crée des doublons dans capacities (~120 entrées → ~40 après dédup).
  // On privilégie la formula (plus d'info) si les deux existent.
  // 🔧 FIX CONSTRAINT-VALUE: Exclure les formules de contrainte (targetProperty non-null)
  // Les formules avec targetProperty='number_max', 'number_min', 'step', 'visible', etc.
  // définissent les CONTRAINTES du champ (max/min/step), PAS sa valeur calculée.
  // Sans ce filtre, le résultat de la contrainte (ex: max=15 panneaux) était stocké
  // comme la VALEUR du champ → le champ affichait "15" automatiquement au lieu de rester vide.
  // Le frontend gère ces contraintes via useDynamicConstraints (lecture des formulas config + valeur source).
  const capacitiesRawUndeduplicated = [
    ...variablesRaw,
    ...formulasRaw
      .filter(f => !(f as any).targetProperty)
      .map(f => ({
        ...f,
        sourceRef: `formula:${f.id}`,
        TreeBranchLeafNode: nodeMap.get(f.nodeId)
      }))
  ];
  const seenNodeIds = new Set<string>();
  const capacitiesRaw = capacitiesRawUndeduplicated.filter(c => {
    if (seenNodeIds.has(c.nodeId)) return false;
    seenNodeIds.add(c.nodeId);
    return true;
  });
  // Mettre les formulas en premier (filtre garde la première occurrence),
  // donc inverser: formulas d'abord pour qu'elles soient prioritaires.
  // Non — on garde l'ordre: variables d'abord, mais la dédup via Set élimine les formulas en double.
  // C'est OK car les formulas sont traitées par processedDisplayFields de toute façon.
  
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
    if (isSumTotalNodeId(cap.nodeId)) {
      displayCapNodeIds.add(cap.nodeId);
    }
  }

const displayDeps = new Map<string, Set<string>>(); // nodeId → Set<dependsOn>

  // 🔥 FIX R27: Pré-charger les formula_tokens des sum-total nodes pour le tri topologique
  // Les sum-total nodes stockent leurs dépendances (@value.xxx) dans formula_tokens SUR LE NODE,
  // PAS dans les tables Formula/Variable. Sans ça, displayDeps reste vide pour les sum-total
  // → depth=0 → évaluation AVANT les nœuds de base → valeurs STALE ("one step behind").
  const sumTotalFormulaTokensMap = new Map<string, string[]>();
  {
    const sumTotalNodeIds = [...displayCapNodeIds].filter(id => isSumTotalNodeId(id));
    if (sumTotalNodeIds.length > 0) {
      const sumTotalNodes = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: sumTotalNodeIds } },
        select: { id: true, formula_tokens: true }
      });
      for (const n of sumTotalNodes) {
        if (Array.isArray(n.formula_tokens)) {
          sumTotalFormulaTokensMap.set(n.id, n.formula_tokens as string[]);
        }
      }
      // console.log(`🔗 [FIX R27] ${sumTotalFormulaTokensMap.size} sum-total nodes avec formula_tokens chargés`);
    }
  }

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

    // 🔥 FIX R23: Charger les CONDITIONS pour le tri topologique
    // AVANT ce fix: seules les formules et variables étaient analysées pour les dépendances.
    // Les conditions (ex: Rampant toiture qui dépend de Versant, Inclinaison, Base du triangle)
    // n'étaient PAS incluses → profondeur topo = 0 → évaluation avant leurs dépendances.
    const conditionsByNodeIdForTopo = new Map<string, Array<{ conditionSet: unknown; id: string }>>();
    {
      const displayNodeIdList = [...displayCapNodeIds];
      if (displayNodeIdList.length > 0) {
        const conditionsForTopo = await prisma.treeBranchLeafNodeCondition.findMany({
          where: { nodeId: { in: displayNodeIdList } },
          select: { id: true, nodeId: true, conditionSet: true }
        });
        for (const c of conditionsForTopo) {
          if (!conditionsByNodeIdForTopo.has(c.nodeId)) conditionsByNodeIdForTopo.set(c.nodeId, []);
          conditionsByNodeIdForTopo.get(c.nodeId)!.push({ conditionSet: c.conditionSet, id: c.id });
        }
      }
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

      // 2b. 🔥 FIX R28: Analyser le sourceRef de la variable pour les dépendances transitives
      // AVANT ce fix: seul le metadata (souvent vide {}) était scanné pour les dépendances.
      // Le sourceRef (ex: "node-formula:14a876ae...") n'était jamais analysé dans le tri topo.
      // CONSÉQUENCE: Un display field comme "Prix HTVA" dont la variable pointe vers une
      // formule cross-node (sur le nœud parent "Prix TVAC") obtenait profondeur topo = 0
      // → évalué AVANT ses dépendances → valeur manquante ou en retard.
      // FIX: Résoudre transitivement le sourceRef de la variable exactement comme on fait
      // pour les tokens des formules dans le step 4.
      if (variable && (variable as any).sourceRef) {
        const varSourceRef = String((variable as any).sourceRef).trim();
        // Extraire les dépendances directes du sourceRef
        collectReferencedNodeIdsForTriggers(varSourceRef, refs);
        // Si c'est un node-formula cross-node, résoudre ses tokens transitivement
        if (varSourceRef.startsWith('node-formula:')) {
          const fId = varSourceRef.slice('node-formula:'.length).trim();
          if (fId) {
            const crossFormula = formulasByIdForTopo.get(fId);
            if (crossFormula) {
              // Ajouter le nœud propriétaire de la formule comme dépendance
              if (crossFormula.nodeId && crossFormula.nodeId !== displayNodeId) {
                refs.add(crossFormula.nodeId);
              }
              // Résoudre les tokens de cette formule transitivement
              if (crossFormula.tokens) {
                collectReferencedNodeIdsForTriggers(crossFormula.tokens, refs);
              }
            }
          }
        }
      }

      // 3. 🔥 FIX R23: Collecter les refs depuis les conditionSets
      const conditions = conditionsByNodeIdForTopo.get(displayNodeId) || [];
      for (const condition of conditions) {
        collectReferencedNodeIdsForTriggers(condition.conditionSet, refs);
      }

      // 3b. 🔥 FIX R27: Pour les sum-total, extraire les deps depuis formula_tokens du NODE
      // Les sum-total ont des tokens ["@value.nodeId1", "+", "@value.nodeId2", ...]
      // stockés sur le node, PAS dans les tables Formula/Variable.
      if (isSumTotalNodeId(displayNodeId)) {
        const sumTokens = sumTotalFormulaTokensMap.get(displayNodeId);
        if (sumTokens) {
          for (const token of sumTokens) {
            if (typeof token === 'string' && token.startsWith('@value.')) {
              const refNodeId = token.slice(7); // "@value.xxx" → "xxx"
              if (refNodeId && refNodeId !== displayNodeId) {
                refs.add(refNodeId);
              }
            }
          }
        }
      }

      // 4. Résoudre les node-formula: cross-node de manière transitive
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

      // 4b. 🔥 FIX R28: Résoudre aussi transitivement le sourceRef de la variable
      // Sans ça, un sourceRef "node-formula:xxx" qui contient lui-même des node-formula:
      // n'avait pas ses dépendances profondes détectées.
      if (variable && (variable as any).sourceRef) {
        resolveTransitiveDeps((variable as any).sourceRef);
      }

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
      // console.log(`🔗 [FIX R14e] ${depsCountEarly} dépendances inter-display détectées depuis les formules (tous modes)`);
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
  
  // 🔥 FIX R26: Tri final CORRIGÉ — profondeur topologique en PRIMARY KEY, sum-total en tiebreaker.
  // AVANT: sum-total était en priorité absolue → un display qui dépend d'un sum-total
  // (ex: Prix TVAC = sum de 6 display + 2 sum-totals) était évalué AVANT les sum-totals
  // → lisait 0 dans le valueMap → résultat = 0. Aligné avec FIX R14b (mode 'change').
  const capacities = capacitiesRaw.sort((a, b) => {
    const aIsDisplay = displayCapNodeIds.has(a.nodeId) ? 1 : 0;
    const bIsDisplay = displayCapNodeIds.has(b.nodeId) ? 1 : 0;
    if (aIsDisplay !== bIsDisplay) return aIsDisplay - bIsDisplay; // Non-display d'abord
    
    // Entre display fields: trier par profondeur topologique (PRIMARY KEY)
    // 🔥 FIX R26: Même logique que FIX R14b — le depth est la clé primaire.
    const aDepth = topoOrder.get(a.nodeId) || 0;
    const bDepth = topoOrder.get(b.nodeId) || 0;
    if (aDepth !== bDepth) return aDepth - bDepth;
    
    // TIEBREAKER: à depth égal, sum-total après les bases (pour le cas naturel base→sum)
    const aIsSumFormula = a.sourceRef?.includes('sum-formula') || a.sourceRef?.includes('sum-total') ? 1 : 0;
    const bIsSumFormula = b.sourceRef?.includes('sum-formula') || b.sourceRef?.includes('sum-total') ? 1 : 0;
    return aIsSumFormula - bIsSumFormula;
  });

  const results: { updated: number; created: number; stored: number; displayFieldsUpdated: number; computedNodeIds: string[]; computedValues: Array<{ nodeId: string; value: string | null; operationResult?: Prisma.InputJsonValue | null; operationSource?: OperationSourceType | null; fieldLabel?: string | null }> } = { 
    updated: 0, created: 0, stored: 0, displayFieldsUpdated: 0, computedNodeIds: [], computedValues: [] 
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
  let allChangedFieldIds: string[] = changedFieldId 
    ? changedFieldId.split(',').map(s => s.trim()).filter(Boolean) 
    : [];
  
  // 🔥 FIX SHARED-REF TRIGGER: Résoudre les shared-ref-* ↔ vrais UUIDs dans les changedFieldIds
  // Problème: le frontend envoie changedFieldId="shared-ref-xxx" mais le triggerIndex
  // peut contenir le vrai UUID du nœud (ou vice-versa). Sans résolution bidirectionnelle,
  // les DISPLAY fields dépendants ne sont PAS trouvés → pas recalculés (ex: Rampant toiture).
  if (allChangedFieldIds.length > 0) {
    const sharedRefChangedIds = allChangedFieldIds.filter(isSharedReferenceId);
    const uuidChangedIds = allChangedFieldIds.filter(id => !isSharedReferenceId(id) && isAcceptedNodeId(id));
    
    // shared-ref → real UUIDs
    if (sharedRefChangedIds.length > 0) {
      const refToUuids = await resolveSharedReferenceAliases(sharedRefChangedIds, treeId);
      for (const [, uuids] of refToUuids) {
        for (const uuid of uuids) {
          if (!allChangedFieldIds.includes(uuid)) allChangedFieldIds.push(uuid);
        }
      }
    }
    // real UUID → shared-ref
    if (uuidChangedIds.length > 0) {
      const uuidToRef = await resolveAliasToSharedReferenceId(uuidChangedIds, treeId);
      for (const [, sharedRef] of uuidToRef) {
        if (!allChangedFieldIds.includes(sharedRef)) allChangedFieldIds.push(sharedRef);
      }
    }
  }
  
  const allChangedFieldIdBases: string[] = allChangedFieldIds
    .map(id => { const s = extractNumericSuffix(id); return s ? id.replace(/-\d+$/, '') : null; })
    .filter((b): b is string => b !== null);
  // Set O(1) pour les checks de LINK matching
  const changedFieldIdSet = new Set([...allChangedFieldIds, ...allChangedFieldIdBases]);
  
  if (allChangedFieldIds.length > 1) {
    // console.log(`🔥 [FIX A] Multi-changedFieldIds: ${allChangedFieldIds.length} champs modifiés pendant le debounce: ${allChangedFieldIds.map(id => id.substring(0,12)).join(', ')}`);
  }
  
  if (mode === 'change' && changedFieldId) {
    // ✅ Zéro cache — on reconstruit le trigger index à chaque évaluation depuis Cloud SQL
    {
      // Construire le trigger index complet (pour TOUS les changedFieldIds possibles)
      
      const displayFieldIds = capacities
        .filter(cap => {
          const isDisplayField = cap.TreeBranchLeafNode?.fieldType === 'DISPLAY' 
            || cap.TreeBranchLeafNode?.type === 'DISPLAY'
            || cap.TreeBranchLeafNode?.type === 'leaf_field';
          return isDisplayField;
        })
        .map(cap => cap.nodeId);
      
      // 🔧 FIX TRIGGER-COVERAGE: Inclure TOUS les display nodes dans le trigger index,
      // pas seulement ceux avec des records formula/variable dans capacitiesRaw.
      // Certains display nodes (copies repeat, table-lookup-only) peuvent avoir hasFormula:true
      // mais aucun record Formula/Variable en DB → absents de capacitiesRaw → absents du trigger index
      // → jamais recalculés quand leurs triggers changent.
      // displayNodesParallel (chargé plus haut) contient TOUS les display nodes par fieldType/subType.
      {
        const displayFieldIdSet = new Set(displayFieldIds);
        let addedCount = 0;
        for (const n of displayNodesParallel) {
          if (!displayFieldIdSet.has(n.id)) {
            displayFieldIds.push(n.id);
            displayFieldIdSet.add(n.id);
            addedCount++;
          }
        }
        if (addedCount > 0) {
          console.log(`🔧 [FIX TRIGGER-COVERAGE] ${addedCount} display nodes ajoutés au trigger index (absents de capacitiesRaw)`);
        }
      }
    
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
        
        // 🔥 FIX R31: Analyser le sourceRef de la variable pour le trigger index
        // AVANT ce fix: seul variable.metadata était scanné (souvent vide {}).
        // Le sourceRef (ex: "node-formula:14a876ae...") n'était JAMAIS analysé dans le trigger index.
        // CONSÉQUENCE: Un display field comme "Prix HTVA" dont la variable pointe vers une
        // formule cross-node (sur le nœud parent "Prix TVAC") n'avait AUCUN trigger auto-découvert
        // → obligation de configurer manuellement des triggerNodeIds dans le metadata du NODE.
        // FIX: Extraire les dépendances du sourceRef ET résoudre transitivement les node-formula:.
        if (nodeVar && nodeVar.sourceRef) {
          const varSourceRef = String(nodeVar.sourceRef).trim();
          // Extraire les dépendances directes du sourceRef
          extractAndAddTriggers(varSourceRef, node.id, triggerNodeIds);
          // Si c'est un node-formula: cross-node, extraire aussi les deps de CETTE formule
          if (varSourceRef.startsWith('node-formula:')) {
            const fId = varSourceRef.slice('node-formula:'.length).trim();
            if (fId) {
              const crossFormula = formulasById.get(fId);
              if (crossFormula) {
                // Ajouter le nœud propriétaire de la formule comme trigger
                if (crossFormula.nodeId && crossFormula.nodeId !== node.id) {
                  if (!triggerNodeIds.includes(crossFormula.nodeId)) {
                    triggerNodeIds.push(crossFormula.nodeId);
                  }
                }
                // Extraire les deps des tokens de la formule cross-node
                if (crossFormula.tokens) {
                  extractAndAddTriggers(crossFormula.tokens, node.id, triggerNodeIds);
                }
              }
            }
          }
        }

        // 🔥 FIX R21: Résoudre les dépendances transitives des node-formula: cross-node
        // Si un token "node-formula:formulaId" référence une formule d'un AUTRE noeud,
        // on extrait les dépendances de CETTE formule et on les ajoute comme triggers.
        const visitedFormulas = new Set<string>();
        if (nodeTokens.length > 0) resolveNodeFormulaTransitiveTriggers(nodeTokens, node.id, triggerNodeIds, visitedFormulas);
        for (const formula of nodeFormulas) resolveNodeFormulaTransitiveTriggers((formula as any).tokens, node.id, triggerNodeIds, visitedFormulas);
        // 🔥 FIX R31: Résoudre aussi transitivement le sourceRef de la variable
        if (nodeVar && nodeVar.sourceRef) {
          resolveNodeFormulaTransitiveTriggers(nodeVar.sourceRef, node.id, triggerNodeIds, visitedFormulas);
        }
        
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
        if (!isSumTotalNodeId(cap.nodeId)) continue;
        const sumTotalNodeId = cap.nodeId;
        // Extraire les references de la formule sum-total
        const sumFormulas = formulasByNodeId.get(sumTotalNodeId) || [];
        const sumVariable = variablesByNodeId.get(sumTotalNodeId);
        const sumRefs = new Set<string>();
        for (const formula of sumFormulas) collectReferencedNodeIdsForTriggers((formula as any).tokens, sumRefs);
        if (sumVariable) collectReferencedNodeIdsForTriggers(sumVariable.metadata, sumRefs);
        // 🔥 FIX R29a: Les sum-total stockent leurs deps @value.xxx dans TreeBranchLeafNode.formula_tokens,
        // PAS dans les tables Formula/Variable. Sans cette extraction, sumRefs reste VIDE
        // → le trigger index ne sait pas que KVA → KVA-sum-total
        // → la fermeture transitive ne propage pas → le sum-total est skippé par FIX R12
        // → valeur "one step behind" (toujours l'ancienne valeur au lieu de la fraîche).
        const nodeFormulaTokens = sumTotalFormulaTokensMap.get(sumTotalNodeId);
        if (nodeFormulaTokens) {
          for (const token of nodeFormulaTokens) {
            if (typeof token === 'string' && token.startsWith('@value.')) {
              const refNodeId = token.slice(7);
              if (refNodeId && refNodeId !== sumTotalNodeId) {
                sumRefs.add(refNodeId);
              }
            }
          }
        }
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
            
            // 🔥 FIX R23: Extraire TOUTES les références du conditionSet (pas seulement when.left/right)
            // AVANT ce fix: seuls when.left.ref et when.right.ref étaient extraits.
            // Les formules dans les actions/fallback (ex: @value.Base_du_triangle, @value.Inclinaison)
            // n'étaient PAS détectées → changer Inclinaison ne déclenchait PAS le recalcul de Rampant.
            // MAINTENANT: collectReferencedNodeIdsForTriggers parcourt TOUT le conditionSet récursivement.
            const allReferencedIds = new Set<string>();
            collectReferencedNodeIdsForTriggers(condition.conditionSet, allReferencedIds);
            // Retirer l'auto-référence
            allReferencedIds.delete(condition.nodeId);
            // Séparer les IDs: certains sont des refs d'input (triggers), d'autres des targets SHOW/HIDE
            const referencedFieldIds = new Set<string>();
            const targetShowNodeIds = new Set<string>();
            
            // Ajouter TOUTES les refs extraites comme triggers potentiels
            for (const refId of allReferencedIds) {
              if (refId.includes('.')) continue; // Ignorer les clés virtuelles
              referencedFieldIds.add(refId);
              // Résoudre les options vers leur parent select
              const parentSelectId = optionToSelectMap.get(refId);
              if (parentSelectId) referencedFieldIds.add(parentSelectId);
            }
            
            // Aussi extraire spécifiquement les targets SHOW/HIDE pour la cascade
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
    // console.log(`🔗 [FIX R14] ${depsCount} dépendances inter-display détectées via trigger index`);
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

  // 🔥 FIX R30: Corriger la profondeur des sum-totals après le topo sort
  // PROBLÈME: Quand il y a un cycle dans displayDeps (base ↔ sum-total), le cycle detection
  // retourne depth=0 pour le nœud cyclique, ce qui donne au sum-total une profondeur INFÉRIEURE
  // à son nœud source (ex: sum-total depth=1, base depth=2). Résultat: le sum-total s'évalue
  // AVANT sa source et lit submissionData (STALE) au lieu de valueMap (FRESH).
  // FIX: Après le topo sort, forcer chaque sum-total à avoir depth >= max(source_depths) + 1.
  {
    let fixedCount = 0;
    for (const [sumTotalNodeId, tokens] of sumTotalFormulaTokensMap) {
      const currentDepth = topoOrder.get(sumTotalNodeId) || 0;
      let maxSourceDepth = -1;
      for (const token of tokens) {
        if (typeof token === 'string' && token.startsWith('@value.')) {
          const sourceNodeId = token.slice(7);
          if (sourceNodeId && sourceNodeId !== sumTotalNodeId) {
            const sourceDepth = topoOrder.get(sourceNodeId);
            if (sourceDepth !== undefined && sourceDepth > maxSourceDepth) {
              maxSourceDepth = sourceDepth;
            }
          }
        }
      }
      if (maxSourceDepth >= 0 && currentDepth <= maxSourceDepth) {
        const newDepth = maxSourceDepth + 1;
        // console.log(`🔧 [FIX R30] ${sumTotalNodeId.substring(0, 12)}... depth ${currentDepth} → ${newDepth} (source maxDepth=${maxSourceDepth})`);
        topoOrder.set(sumTotalNodeId, newDepth);
        fixedCount++;
      }
    }
    if (fixedCount > 0) {
      // console.log(`🔧 [FIX R30] ${fixedCount} sum-total depth(s) corrigée(s)`);
    }
  }

  // 🔥 FIX R14: RE-TRIER les capacities avec les profondeurs FIABLES
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
    // console.log(`[FIX R14b] Eval order: ${displayOrder.join(' -> ')}`);
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

    // 🔥 FIX R28: Filet de sécurité pour les sum-total
    // Si un sum-total dépend d'un display field affecté (via ses formula_tokens),
    // le forcer dans affectedDisplayFieldIds même si le trigger index ne l'a pas trouvé.
    // Cela couvre les cas où le cache trigger-index est stale ou incomplet.
    for (const cap of capacitiesRaw) {
      if (!isSumTotalNodeId(cap.nodeId)) continue;
      if (affectedDisplayFieldIds.has(cap.nodeId)) continue; // Déjà inclus
      const sumTokens = sumTotalFormulaTokensMap.get(cap.nodeId);
      if (sumTokens) {
        for (const token of sumTokens) {
          if (typeof token === 'string' && token.startsWith('@value.')) {
            const refNodeId = token.slice(7);
            if (affectedDisplayFieldIds.has(refNodeId)) {
              affectedDisplayFieldIds.add(cap.nodeId);
              // console.log(`🔥 [FIX R28] sum-total ${cap.nodeId.substring(0,12)}... forcé dans affectedDisplayFieldIds (dep ${refNodeId.substring(0,12)}... affecté)`);
              break;
            }
          }
        }
      }
    }

    // 🔥 FIX R29b: Forcer INCONDITIONNELLEMENT tous les sum-total dans affectedDisplayFieldIds
    // Les sum-totals sont très légers à évaluer (simple somme de @value tokens, 0 requêtes DB)
    // et il n'y en a que ~13 dans un arbre typique. Le coût marginal est négligeable.
    // Cela élimine DÉFINITIVEMENT le bug "one step behind" causé par :
    //   - Un trigger index stale/caché qui ne mappe pas KVA → KVA-sum-total
    //   - FIX R14c PART 4 qui ne trouvait pas les refs car elles sont dans node.formula_tokens
    //     (corrigé par FIX R29a, mais le cache peut persister pendant 60s)
    //   - FIX R28 qui ne détecte pas certains cas edge
    // Résultat: les sum-totals lisent TOUJOURS les valeurs fraîches du valueMap (calculées
    // plus tôt dans la boucle grâce au tri topologique) au lieu des anciennes submissionData.
    {
      let forcedCount = 0;
      for (const cap of capacitiesRaw) {
        if (isSumTotalNodeId(cap.nodeId) && !affectedDisplayFieldIds.has(cap.nodeId)) {
          affectedDisplayFieldIds.add(cap.nodeId);
          forcedCount++;
        }
      }
      if (forcedCount > 0) {
        // console.log(`🔥 [FIX R29b] ${forcedCount} sum-total forcés dans affectedDisplayFieldIds (total sum-totals: ${[...affectedDisplayFieldIds].filter(id => isSumTotalNodeId(id)).length})`);
      }
    }

    // console.log(`🚀 [FIX R12] mode=change: ${affectedDisplayFieldIds.size} DISPLAY fields affectés sur ${displayCapNodeIds.size} total (skip ${displayCapNodeIds.size - affectedDisplayFieldIds.size})`);
    
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
      // console.log(`🔥 [FIX B] Suppression ciblée: ${affectedDisplayFieldIds.size} display values supprimés sur ${displayNodeIds.size} total`);
    } else {
      // Fallback complet (FIX D actif): supprimer TOUS les display values
      for (const displayNodeId of displayNodeIds) {
        valueMap.delete(displayNodeId);
      }
      // console.log(`🔥 [FIX B] Suppression COMPLÈTE: ${displayNodeIds.size} display values (fallback FIX D)`);
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
        // console.log(`🔗 [FIX R20/R21] valueMap LINK pre-refresh: ${linkedNodeId.substring(0,8)} = "${freshValue}" (source: ${linkInfo.targetNodeId.substring(0,8)}, changedField: ${changedFieldId?.substring(0,8) || 'N/A'})`);
      }
    }
  }

  // 🔥 OPTIMISATION GÉRER LA SURCHARGE DATABASE: Construire les maps une SEULE fois
  // Pour éviter des milliers de requêtes (N+1), on prépare tout en BATCH.
  const safeLabelMap = new Map<string, string>();
  // 1. Récupérer TOUS les noeuds de l'arbre pour avoir les labels (nécessaire pour interpretReference {{Label}})
  const allTreeNodesForLabels = await prisma.treeBranchLeafNode.findMany({
    where: { treeId },
    select: { id: true, label: true, field_label: true, sharedReferenceName: true, formula_tokens: true, calculatedValue: true }
  });
  for (const n of allTreeNodesForLabels) {
    safeLabelMap.set(n.id, n.sharedReferenceName || n.field_label || n.label || n.id);
  }

  // 🚀 PERF: Pré-charger les sum-total nodes et SubmissionData en batch
  // Avant: chaque sum-total faisait 1 findUnique(node) + N findUnique(submissionData) + N findUnique(calculatedValue) par token
  // Maintenant: tout est pré-chargé en 0 requêtes supplémentaires (réutilise allTreeNodesForLabels)
  const sumTotalNodeMap = new Map<string, { formula_tokens: unknown; label: string | null; calculatedValue: string | null }>();
  for (const n of allTreeNodesForLabels) {
    if (isSumTotalNodeId(n.id)) {
      sumTotalNodeMap.set(n.id, { 
        formula_tokens: n.formula_tokens, 
        label: n.label, 
        calculatedValue: n.calculatedValue 
      });
    }
  }
  // Index calculatedValue pour lookup rapide (fallback sum-total)
  const nodeCalculatedValueMap = new Map<string, string | null>();
  for (const n of allTreeNodesForLabels) {
    if (n.calculatedValue !== null && n.calculatedValue !== undefined) {
      nodeCalculatedValueMap.set(n.id, n.calculatedValue);
    }
  }
  // 🚀 PERF: Pré-charger TOUTES les SubmissionData pour les sum-total tokens
  // (existingDataParallel déjà chargé en parallèle au début)
  const submissionDataMap = new Map<string, string | null>();
  for (const sd of existingDataParallel) {
    submissionDataMap.set(sd.nodeId, sd.value);
  }

  // 2. Indexer les variables pour preloadedVariable (évite de ré-fetcher la variable dans evaluateVariableOperation)
  const preloadedVariablesMap = new Map<string, unknown>();
  for (const v of variablesRaw) {
    preloadedVariablesMap.set(v.nodeId, v);
  }

  // � FIX REFRESH: Si une valeur est dans valueMap (donnée fraîche calculée), on doit s'assurer
  // que la variable préchargée ne force pas une vieille valeur fixe/default.
  // On ne modifie pas preloadedVariablesMap ici car c'est la config statique, 
  // mais on s'assure que evaluateVariableOperation utilise bien le valueMap passé.

  // �🔥 DÉDUPLICATION: Un même nodeId peut apparaître plusieurs fois dans capacities
  // (ex: formula + autre capacité). On déduplique pour éviter de calculer 3 fois le même champ !
  const processedDisplayFields = new Set<string>();

  // 🚀 PERF: Accumuler les non-display upserts pour batch après la boucle
  const pendingNonDisplayUpserts: Array<{
    nodeId: string;
    value: string | null;
    sourceRef: string;
    operationSource: OperationSourceType;
    fieldLabel: string | null;
    operationDetail: Prisma.InputJsonValue | null;
    isUpdate: boolean;
  }> = [];

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
    // MAIS ATTENTION: Si "N° de panneau max" dépend d'une valeur calculée dynamiquement (qui vient de changer), 
    // il se peut que le graphe de dépendance statique (triggerIndex) n'ait pas vu le lien si c'est une formule complexe.
    // Pour l'instant, on désactive cette optimisation stricte pour les champs qui semblent importants ou calculés.
    // Ou on s'assure que si on a un doute, on calcule.
    
    if (isDisplayField && affectedDisplayFieldIds !== null) {
      if (!affectedDisplayFieldIds.has(capacity.nodeId)) {
        // 🚀 FIX R12 STRICT: Le trigger index + fermeture transitive (FIX R14/R14e/R23)
        // couvre désormais TOUTES les dépendances (formules, conditions, tables, cross-node formulas).
        // L'ancien override hasDynamicSource faisait évaluer ~38 fields au lieu de ~14,
        // annulant l'optimisation FIX R12. Supprimé pour performance.
        continue;
      }
    }
    
    // 🔥 DÉDUPLICATION: Un même display field peut apparaître N fois dans capacities
    if (isDisplayField) {
      if (processedDisplayFields.has(capacity.nodeId)) {
        continue;
      }
      processedDisplayFields.add(capacity.nodeId);
    }
    
    // 🔍 DIAGNOSTIC RAMPANT TOITURE — supprimé (FIX R23 corrige le skip des conditions)

    try {
      // 🔁 IMPORTANT: pour les copies (-1, -2, ...), certaines formules/conditions référencent encore
      // les IDs de base (sans suffixe). On injecte temporairement baseId -> baseId-<suffix>
      // dans le valueMap pour que l'évaluation lise les valeurs fraîches encodées.
      const injectedBaseKeys = applyCopyScopedInputAliases(valueMap, capacity.nodeId, capacity);
      
      let capacityResult: { value?: unknown; calculatedValue?: unknown; result?: unknown; operationSource?: unknown; operationDetail?: unknown; operationResult?: unknown };
      
      // 🎯 INTERCEPT SUM-TOTAL: Évaluation directe sans passer par evaluateVariableOperation
      // Les champs sum-total ont des formula_tokens ["@value.nodeId1", "+", "@value.nodeId2", ...]
      // On les évalue en sommant directement les valeurs depuis valueMap / SubmissionData
      const isSumTotalField = isSumTotalNodeId(capacity.nodeId);
      if (isSumTotalField) {
        try {
          // 🚀 PERF: Utiliser les données pré-chargées (0 requêtes DB ici!)
          // 🔥 FIX R28: Fallback multi-source pour les tokens
          // Source 1: sumTotalNodeMap (pré-chargé depuis allTreeNodesForLabels)
          // Source 2: formulasByNodeId (pré-chargé depuis TreeBranchLeafNodeFormula)
          // Source 3: sumTotalFormulaTokensMap (pré-chargé spécifiquement pour le topo sort)
          const sumTokensNode = sumTotalNodeMap.get(capacity.nodeId);
          let tokens = Array.isArray(sumTokensNode?.formula_tokens)
            ? (sumTokensNode!.formula_tokens as string[])
            : [];
          // Fallback: formulasRaw (formules chargées depuis TreeBranchLeafNodeFormula)
          if (tokens.length === 0) {
            const sumFormulasForEval = formulasRaw.filter(f => f.nodeId === capacity.nodeId);
            for (const sf of sumFormulasForEval) {
              if (Array.isArray((sf as any).tokens) && (sf as any).tokens.length > 0) {
                tokens = (sf as any).tokens;
                break;
              }
            }
          }
          // Fallback: sumTotalFormulaTokensMap (chargé au moment du topo sort)
          if (tokens.length === 0) {
            const topoTokens = sumTotalFormulaTokensMap.get(capacity.nodeId);
            if (topoTokens && topoTokens.length > 0) tokens = topoTokens;
          }

          let sum = 0;
          const debugParts: Array<{ refId: string; value: number; source: string }> = [];

          for (const token of tokens) {
            if (typeof token === 'string' && token.startsWith('@value.')) {
              const refNodeId = token.slice(7);
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

              // 2. Fallback: SubmissionData pré-chargée (0 requête DB!)
              if (val === null) {
                const sdValue = submissionDataMap.get(refNodeId);
                if (sdValue !== null && sdValue !== undefined && String(sdValue).trim() !== '') {
                  val = parseFloat(sdValue) || 0;
                  valSource = 'submissionData';
                }
              }

              // 3. Dernier fallback: calculatedValue pré-chargé (0 requête DB!)
              if (val === null) {
                const calcVal = nodeCalculatedValueMap.get(refNodeId);
                if (calcVal !== null && calcVal !== undefined) {
                  val = parseFloat(calcVal) || 0;
                  valSource = 'calculatedValue';
                }
              }

              const resolvedVal = val ?? 0;
              sum += resolvedVal;
              debugParts.push({ refId: refNodeId, value: resolvedVal, source: valSource });
            }
          }

          // 🔍 DEBUG SUM-TOTAL: Tracer les valeurs pour diagnostiquer le lag
          if (debugParts.length > 0) {
            // console.log(`🔍 [SUM-TOTAL DEBUG] ${capacity.nodeId.substring(0,12)}... tokens=${tokens.length} sum=${sum} parts=${JSON.stringify(debugParts.map(p => ({ ref: p.refId.substring(0,12), val: p.value, src: p.source })))}`);
          }

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
        // 🚀 FIX R22: Les capacités de type formule (sourceRef = 'formula:...') ont des nodes leaf_field
        // sans TreeBranchLeafNodeVariable. Appeler evaluateVariableOperation ferait une DB query inutile
        // et produirait le warning "VARIABLE MANQUANTE". On interprète directement la formule.
        if (capacity.sourceRef?.startsWith('formula:')) {
          const formulaValuesCache = new Map<string, InterpretResult>();
          const fResult = await interpretReference(
            capacity.sourceRef,
            submissionId,
            prisma,
            formulaValuesCache,
            0,
            valueMap,
            safeLabelMap // 🔥 OPTIMISATION: Passer safeLabelMap pour éviter N+1
          );
          capacityResult = {
            value: fResult.result,
            operationDetail: fResult.details,
            operationResult: fResult.humanText,
            operationSource: 'formula'
          };
        } else {
          // ✨ ÉVALUATION via le système variable (TreeBranchLeafNodeVariable)
          capacityResult = await evaluateVariableOperation(
            capacity.nodeId,
            submissionId,
            prisma,
            valueMap,  // 🔑 PASSER LE VALUEMAP avec les données fraîches !
            {
              treeId,
              labelMap: safeLabelMap,
              preloadedVariable: preloadedVariablesMap.get(capacity.nodeId), // 🔥 OPTIMISATION: Passer variable préchargée (évite N+1)
              organizationId, // 📋 Gestionnaire: permettre les overrides par org
            }
          );
          
          // 🔧 FIX R19: evaluateVariableOperation retourne { value: null } au lieu de throw
          // quand il n'y a pas de TreeBranchLeafNodeVariable. Le catch-block contient le
          // fallback vers condition/formula mais n'est jamais atteint → déclencher manuellement.
          if (capacityResult.value === null && (capacityResult as any).operationDetail?.type === 'missing-variable') {
            throw new Error(`[FIX R19] Variable manquante pour ${capacity.nodeId} - fallback condition/formula`);
          }
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
            valueMap,
            safeLabelMap // 🔥 OPTIMISATION
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
            valueMap,
            safeLabelMap // 🔥 OPTIMISATION
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

      //  AJOUTER la valeur au valueMap pour les calculs suivants (chaînage)
      if (hasValidValue) {
        valueMap.set(capacity.nodeId, rawValue);
      }

      // 🔍 DEBUG R26: Tracer Prix TVAC et ses deps sum-total
      if (capacity.nodeId === '2f0c0d37-ae97-405e-8fae-0a07680e2183' || capacity.nodeId.includes('-sum-total')) {
        const depthVal = topoOrder.get(capacity.nodeId) || 0;
        // console.log(`🔍 [FIX R26 DEBUG] ${capacity.nodeId.substring(0,12)}... depth=${depthVal} → rawValue=${rawValue} hasValid=${hasValidValue} sourceRef=${capacity.sourceRef?.substring(0,30)}`);
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
        // 🔥 FIX R28: Rollback des alias copy-scoped MÊME pour les display fields
        // AVANT ce fix: le `continue` ci-dessous sautait le cleanup des alias injectés
        // par applyCopyScopedInputAliases. Conséquence: quand kva-node-1 injectait
        // valueMap["baseId"] = valeur-de-copy-1, cet alias PERSISTAIT → kva-node-2
        // lisait la valeur de copy-1 au lieu de copy-2 → contamination croisée
        // → KVA total faux (double-comptage d'une copie).
        if (injectedBaseKeys.length) {
          for (const k of injectedBaseKeys) {
            valueMap.delete(k);
          }
        }
        continue;
      }
      
      // � PERF: Accumuler les non-display capacities au lieu de persister une par une
      // Avant: 1 findUnique + 1 update/create PAR capacité (N+1 pattern)
      // Maintenant: on utilise le submissionDataMap pré-chargé + batch upsert après la boucle
      const existingValue = submissionDataMap.get(capacity.nodeId);
      const normalizeVal = (v: unknown) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'string') return v;
        try { return JSON.stringify(v); } catch { return String(v); }
      };
      const newValueStr = hasValidValue ? String(rawValue) : null;
      const isExisting = existingValue !== undefined; // key exists in map (even if null)
      
      if (isExisting) {
        const changed = normalizeVal(existingValue) !== normalizeVal(newValueStr);
        if (changed) {
          pendingNonDisplayUpserts.push({
            nodeId: capacity.nodeId,
            value: newValueStr,
            sourceRef,
            operationSource: normalizedOperationSource,
            fieldLabel: capacity.TreeBranchLeafNode?.label || null,
            operationDetail: parsedDetail,
            isUpdate: true
          });
          results.updated++;
        }
      } else {
        pendingNonDisplayUpserts.push({
          nodeId: capacity.nodeId,
          value: newValueStr,
          sourceRef,
          operationSource: normalizedOperationSource,
          fieldLabel: capacity.TreeBranchLeafNode?.label || null,
          operationDetail: parsedDetail,
          isUpdate: false
        });
        results.created++;
      }
      // Mettre à jour le submissionDataMap pour les capacités chaînées
      submissionDataMap.set(capacity.nodeId, newValueStr);

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

  // 🚀 PERF: Exécuter les upserts non-display en batch (transaction Prisma)
  // Avant: N findUnique + N update/create séquentiels (~200ms par capacité)
  // Maintenant: 1 transaction batch (~50ms total)
  if (pendingNonDisplayUpserts.length > 0) {
    try {
      const now = new Date();
      const operations = pendingNonDisplayUpserts.map(op => {
        if (op.isUpdate) {
          return prisma.treeBranchLeafSubmissionData.update({
            where: { submissionId_nodeId: { submissionId, nodeId: op.nodeId } },
            data: {
              value: op.value,
              sourceRef: op.sourceRef,
              operationSource: op.operationSource,
              fieldLabel: op.fieldLabel,
              operationDetail: op.operationDetail,
              lastResolved: now
            }
          });
        } else {
          return prisma.treeBranchLeafSubmissionData.create({
            data: {
              id: `${submissionId}-${op.nodeId}-cap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              submissionId,
              nodeId: op.nodeId,
              value: op.value,
              sourceRef: op.sourceRef,
              operationSource: op.operationSource,
              fieldLabel: op.fieldLabel,
              operationDetail: op.operationDetail,
              lastResolved: now
            }
          });
        }
      });
      await prisma.$transaction(operations);
      // console.log(`🚀 [PERF] Batch upsert: ${pendingNonDisplayUpserts.length} non-display capacities en 1 transaction`);
    } catch (batchError) {
      console.error('[PERF] Batch upsert échoué, fallback séquentiel:', batchError);
      // Fallback séquentiel en cas d'erreur
      for (const op of pendingNonDisplayUpserts) {
        try {
          if (op.isUpdate) {
            await prisma.treeBranchLeafSubmissionData.update({
              where: { submissionId_nodeId: { submissionId, nodeId: op.nodeId } },
              data: { value: op.value, sourceRef: op.sourceRef, operationSource: op.operationSource, fieldLabel: op.fieldLabel, operationDetail: op.operationDetail, lastResolved: new Date() }
            });
          } else {
            await prisma.treeBranchLeafSubmissionData.create({
              data: { id: `${submissionId}-${op.nodeId}-cap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, submissionId, nodeId: op.nodeId, value: op.value, sourceRef: op.sourceRef, operationSource: op.operationSource, fieldLabel: op.fieldLabel, operationDetail: op.operationDetail, lastResolved: new Date() }
            });
          }
        } catch (seqError) {
          console.error(`[TBL CAPACITY UPSERT] ${op.nodeId}:`, seqError);
        }
      }
    }
  }

  // �🛡️ FIX 2026-01-31 v2: Ajouter les valeurs DISPLAY restaurées depuis DB qui n'ont pas été recalculées
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

  // 🔗 FIX R25: Persister les LINK DISPLAY fields résolus par FIX R21b mais HORS capacitiesRaw
  // PROBLÈME: Les DISPLAY fields avec hasLink=true mais SANS variable.sourceRef et SANS hasFormula
  // ne sont PAS dans capacitiesRaw → l'évaluateur ne les traite JAMAIS → pas de SubmissionData.
  // FIX R21b résout leurs valeurs dans le valueMap, mais ne les persiste pas.
  // FIX: Après la boucle d'évaluation, scanner les LINK fields résolus par R21b et les ajouter
  // à computedValuesToStore pour persister dans SubmissionData.
  {
    const alreadyComputed = new Set(computedValuesToStore.map(c => c.nodeId));
    // Re-charger les LINK nodes (déjà chargés dans FIX R21b, mais pas accessibles ici)
    const linkDisplayNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId, hasLink: true, link_targetNodeId: { not: null }, subType: 'display' },
      select: { id: true, label: true, link_targetNodeId: true }
    });
    let linkPersistedCount = 0;
    for (const ln of linkDisplayNodes) {
      if (alreadyComputed.has(ln.id)) continue; // Déjà persisté par le pipeline normal
      const resolvedValue = valueMap.get(ln.id);
      if (resolvedValue !== undefined && resolvedValue !== null && String(resolvedValue).trim() !== '') {
        computedValuesToStore.push({
          nodeId: ln.id,
          value: String(resolvedValue),
          sourceRef: `link:${ln.link_targetNodeId}`,
          operationSource: 'neutral' as OperationSourceType,
          fieldLabel: ln.label,
          operationDetail: { source: 'link-r25', targetNodeId: ln.link_targetNodeId } as Prisma.InputJsonValue,
          operationResult: null,
          calculatedBy: 'link-fix-r25'
        });
        linkPersistedCount++;
      }
    }
    if (linkPersistedCount > 0) {
      // console.log(`🔗 [FIX R25] ${linkPersistedCount} LINK DISPLAY field(s) persistés dans SubmissionData`);
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
        // 🚀 PERF: Utiliser submissionDataMap pré-chargé au lieu de requête DB
        const sdVal = submissionDataMap.get(linkInfo.targetNodeId);
        if (sdVal) linkValue = sdVal;
      }
      
      if (!linkValue) {
        // 🚀 PERF: Utiliser nodeCalculatedValueMap pré-chargé au lieu de requête DB
        const calcVal = nodeCalculatedValueMap.get(linkInfo.targetNodeId);
        if (calcVal) linkValue = calcVal;
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

  // 🔥 FIX BROADCAST-NULL 2026: Exposer les nodeIds freshement calculés (même si value=null)
  // Permet au client d'utiliser operationResult comme fallback pour les fields avec ∅/null
  // Cela évite le 🧯 safety GET +650ms pour des champs type table dont le lookup échoue

  // 🚀 FIX BROADCAST-COMPLET: En mode 'change' partiel, inclure AUSSI les valeurs existantes
  // des DISPLAY fields NON recalculés. Cela donne un broadcast COMPLET au frontend,
  // éliminant les dizaines de "safety GET différé" individuels (~20-50 requêtes HTTP inutiles).
  // Coût: 0 requêtes DB supplémentaires (submissionDataMap déjà en mémoire).
  if (mode === 'change' && affectedDisplayFieldIds !== null) {
    const computedNodeIdSet = new Set(computedValuesToStore.map(c => c.nodeId));
    let addedExistingCount = 0;
    for (const displayNodeId of displayNodeIds) {
      if (computedNodeIdSet.has(displayNodeId)) continue; // Déjà recalculé
      const existingValue = submissionDataMap.get(displayNodeId);
      if (existingValue !== undefined) {
        computedValuesToStore.push({
          nodeId: displayNodeId,
          value: existingValue,
          operationSource: null,
          fieldLabel: null,
          operationResult: null,
        });
        addedExistingCount++;
      }
    }
    if (addedExistingCount > 0) {
      // console.log(`🚀 [FIX BROADCAST-COMPLET] ${computedValuesToStore.length} valeurs dans la réponse (${computedValuesToStore.length - addedExistingCount} fraîches + ${addedExistingCount} existantes inchangées)`);
    }
  }

  results.computedNodeIds = computedValuesToStore.map(c => c.nodeId);
  // 🚀 PERF: Retourner les valeurs calculées directement pour éviter un findMany en fin de route
  results.computedValues = computedValuesToStore;

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
          prisma,
          undefined,
          { organizationId: organizationId as string } // 📋 Gestionnaire overrides
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
    // 🔥 FIX: Tous les utilisateurs peuvent éditer un devis completed in-place (pas de clonage/versioning)
    // Avant: seuls les admins pouvaient éditer en place, les autres créaient une révision -2, -3...
    // Maintenant: un devis enregistré se comporte comme un brouillon (édition directe)
    const canEditCompletedInPlace = true;
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
      // console.log('⚠️ [TBL CREATE-AND-EVALUATE] Aucun treeId fourni et pas de submissionId, recherche du premier arbre...');
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
    
    // 3. Préparer la validation user (parallélisée avec lead si possible)
    let effectiveUserId = userId;
    
    if (!clientId && !isDefaultDraft) {
      // console.log('❌ [TBL CREATE-AND-EVALUATE] Aucun leadId fourni - REQUIS (sauf pour default-draft)');
      return res.status(400).json({
        success: false,
        error: 'Lead obligatoire',
        message: 'Un lead doit être sélectionné pour créer un devis. Veuillez sélectionner ou créer un lead.'
      });
    }
    
    if (clientId) {
      // 🚀 PERF: Paralléliser la validation lead + user (2 queries indépendantes)
      const [leadExists, userExistsResult] = await Promise.all([
        prisma.lead.findUnique({
          where: { id: clientId },
          select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
        }),
        effectiveUserId ? prisma.user.findUnique({
          where: { id: effectiveUserId },
          select: { id: true, firstName: true, lastName: true }
        }) : Promise.resolve(null)
      ]);
      
      if (!leadExists) {
        // console.log(`❌ [TBL CREATE-AND-EVALUATE] Lead ${clientId} introuvable`);
        return res.status(404).json({
          success: false,
          error: 'Lead introuvable',
          message: `Le lead ${clientId} n'existe pas. Veuillez sélectionner un lead valide.`
        });
      }
      
      // Vérifier que le lead appartient bien à la même organisation (sauf pour Super Admin)
      if (!isSuperAdmin && leadExists.organizationId !== organizationId) {
        // console.log(`❌ [TBL CREATE-AND-EVALUATE] Le lead ${clientId} n'appartient pas à l'organisation ${organizationId}`);
        return res.status(403).json({
          success: false,
          error: 'Lead non autorisé',
          message: 'Le lead sélectionné n\'appartient pas à votre organisation.'
        });
      }
      
      if (isSuperAdmin && leadExists.organizationId !== organizationId) {
      }
      
      effectiveLeadId = leadExists.id;
      
      // User validation (résultat du Promise.all)
      if (effectiveUserId && !userExistsResult) {
        // console.log(`❌ [TBL CREATE-AND-EVALUATE] User ${effectiveUserId} introuvable, soumission sans utilisateur`);
        effectiveUserId = null;
      }
    } else {
      // Pas de clientId: valider l'user seul
      if (effectiveUserId) {
        const userExists = await prisma.user.findUnique({
          where: { id: effectiveUserId },
          select: { id: true, firstName: true, lastName: true }
        });
        if (!userExists) {
          // console.log(`❌ [TBL CREATE-AND-EVALUATE] User ${effectiveUserId} introuvable`);
          effectiveUserId = null;
        }
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
    // 🔥 FIX BROADCAST-NULL: Hisser evalStats pour l'inclure dans la réponse (freshlyComputedNodeIds)
    let evalStats: { updated: number; created: number; stored: number; displayFieldsUpdated: number; computedNodeIds: string[]; computedValues: Array<{ nodeId: string; value: string | null; operationResult?: Prisma.InputJsonValue | null; operationSource?: OperationSourceType | null; fieldLabel?: string | null }> } | null = null;
    if (cleanFormData && typeof cleanFormData === 'object') {
      // A. Sauvegarder les données utilisateur directes (réutilise NO-OP)
  const savedCount = await saveUserEntriesNeutral(submissionId!, cleanFormData, effectiveTreeId);
      
      // B. 🚀 PERF: findMany(capacities) supprimé (code mort ~300ms).
      // evaluateCapacitiesForSubmission charge ses propres données en interne.
      
      
      // � FIX R16: Le moteur de calcul est IDENTIQUE quel que soit le mode (brouillon, lead, enregistré).
      // Le clone copie toutes les données → les valeurs DISPLAY sont déjà correctes.
      // Seul le champ modifié par l'utilisateur déclenche un recalcul ciblé via triggers.
      // On ne force PLUS 'open' après révision → le mode 'change' fonctionne parfaitement.
      const effectiveMode = mode;
      
      // C. Évaluer et persister les capacités avec NO-OP - 🔑 PASSER LE FORMDATA pour réactivité !
      evalStats = await evaluateCapacitiesForSubmission(submissionId!, organizationId!, userId || null, effectiveTreeId, cleanFormData, effectiveMode, triggerFieldId);
    }
    
    // 3. Évaluation immédiate déjà effectuée via operation-interpreter ci-dessus.
    //    On évite une seconde passe redondante qui réécrit inutilement en base.
    
    // 4. 🚀 PERF: Retourner directement les valeurs calculées en mémoire
    // On ÉVITE les deux lectures DB redondantes (findUnique + findMany) qui prenaient 1-2s
    // Le client n'utilise que submission.id + TreeBranchLeafSubmissionData pour le broadcast
    return res.status(201).json({
      success: true,
      message: 'Soumission créée et évaluée avec TBL Prisma',
      submission: {
        id: submissionId,
        treeId: effectiveTreeId,
        leadId: effectiveLeadId,
        status: status || 'draft',
        // 🔥 Les valeurs calculées sont déjà en mémoire via evalStats → pas de findMany
        TreeBranchLeafSubmissionData: evalStats?.computedValues ?? []
      },
      // 🔥 FIX BROADCAST-NULL 2026: NodeIds des DISPLAY fields freshement calculés ce cycle
      // Permet au client d'utiliser operationResult comme valeur inline même si value=null (ex: table lookup ∅)
      freshlyComputedNodeIds: evalStats?.computedNodeIds ?? []
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
      include: { GeneratedDocument: true }
    });
    
    // Charger les SubmissionData séparément (pas de relation directe)
    const finalData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { submissionId }
    });

    return res.json({
      success: true,
      message: `Soumission mise à jour (${saved} entrées) et évaluée (${stats.updated} mises à jour, ${stats.created} créées, ${stats.displayFieldsUpdated} display fields réactifs)`,
      submission: { ...finalSubmission, submissionData: finalData }
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
    // 🔥 FIX: Récupérer tous les champs de label pour parité avec evaluateVariableOperation
    const nodes = await prisma.treeBranchLeafNode.findMany({ 
      where: { treeId: effectiveTreeId }, 
      select: { id: true, label: true, field_label: true, sharedReferenceName: true } 
    });
    const labelMap = new Map<string, string | null>();
    for (const n of nodes) labelMap.set(n.id, n.sharedReferenceName || n.field_label || n.label);

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
            const selectedOption = options.find((opt: Record<string, unknown>) => opt.value === value);
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
    // 🔧 FIX CONSTRAINT-VALUE: Exclure les formules de contrainte (targetProperty non-null)
    // Même logique que dans create-and-evaluate — les formules de contrainte (number_max, etc.)
    // ne doivent PAS être évaluées comme des valeurs calculées.
    const capacitiesRaw = [
      ...variablesRaw,
      ...formulasRaw
        .filter(f => !(f as any).targetProperty)
        .map(f => ({
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
    
    // 🔥 OPTIMISATION: Préparer le labelMap propre (string only) une seule fois pour tout le lot
    // Cela évite de le reconstruire à chaque appel de evaluateVariableOperation
    const safeLabelMap = new Map<string, string>();
    labelMap.forEach((v, k) => { if (v) safeLabelMap.set(k, v); });

    let evaluated = 0;
    for (const cap of capacities) {
      try {
        
        // 🚀 FIX R22: Pour les capacités de type formule (sourceRef = 'formula:...'), interpréter
        // directement la formule sans passer par evaluateVariableOperation (qui génère VARIABLE MANQUANTE)
        let evaluation: { value?: unknown; operationSource?: unknown; operationResult?: unknown; operationDetail?: unknown; displayFormat?: string; unit?: string | null; precision?: number; visibleToUser?: boolean };
        if (cap.sourceRef?.startsWith('formula:')) {
          const formulaValCache = new Map<string, InterpretResult>();
          const fRes = await interpretReference(
            cap.sourceRef,
            context.submissionId,
            prisma,
            formulaValCache,
            0,
            context.valueMap,
            safeLabelMap // 🔥 Pass optimized labelMap
          );
          evaluation = {
            value: fRes.result,
            operationSource: 'formula',
            operationResult: fRes.humanText,
            operationDetail: fRes.details
          };
        } else {
          // NOUVEAU : Utiliser le système universel operation-interpreter
          // La fonction attend maintenant 4 paramètres : (variableNodeId, submissionId, prisma, valueMap)
          
          evaluation = await evaluateVariableOperation(
            cap.nodeId,              // variableNodeId
            context.submissionId,     // submissionId
            prisma,                   // prismaClient
            context.valueMap,         // valueMap (données temporaires du formulaire)
            {
              treeId: context.treeId,
              labelMap: safeLabelMap, // 🔥 Use outer safeLabelMap
              preloadedVariable: cap, // Passer la variable déjà fetchée
              organizationId: context.organizationId, // 📋 Gestionnaire overrides
            }
          );
        }
        
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
          context.valueMap,
          { organizationId: context.organizationId } // 📋 Gestionnaire overrides
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
    const meta = table.meta as unknown;
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
