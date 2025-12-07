/*
 * Repeat ID Registry
 * -------------------
 * Central place to track which IDs (variables, capacities, totals) are produced when
 * templates/repeaters duplicate nodes. For now it simply stores metadata in memory so
 * existing routes can start reporting events without changing the DB layer. Later this
 * registry will drive blueprint generation for the repeat button.
 */

export type CapacityKind = 'formula' | 'condition' | 'table';

export interface DuplicationContext {
  scopeId?: string;
  repeaterNodeId?: string;
  templateNodeId?: string;
  duplicatedFromNodeId?: string;
  suffix?: string | number;
  mode?: 'repeater' | 'shared-reference' | 'manual';
}

export interface RegisterVariableInput {
  nodeId: string;
  variableId: string;
  sourceRef?: string | null;
  sourceType?: string | null;
  displayNodeId?: string | null;
  metadata?: Record<string, unknown> | null;
  copyContext?: DuplicationContext;
}

export interface RegisterCapacityLinkInput {
  ownerNodeId: string;
  capacityId: string;
  capacityType: CapacityKind;
  referencedNodeIds?: string[];
  copyContext?: DuplicationContext;
}

export interface TotalFieldConfig {
  repeaterNodeId: string;
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count';
  targetDisplayNodeId?: string | null;
  targetVariableId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RepeatTemplateBlueprint {
  scopeId: string;
  variables: RegisterVariableInput[];
  capacities: RegisterCapacityLinkInput[];
  totalField?: TotalFieldConfig;
  capturedAt: string;
  lastUpdatedAt: string;
}

interface RepeatRegistryRecord {
  variables: RegisterVariableInput[];
  capacities: RegisterCapacityLinkInput[];
  totalField?: TotalFieldConfig;
  lastUpdatedAt: string;
}

const DEFAULT_SCOPE = 'global';
const registryStore = new Map<string, RepeatRegistryRecord>();

function resolveScopeId(ctx?: DuplicationContext): string {
  return (
    ctx?.scopeId ||
    ctx?.repeaterNodeId ||
    ctx?.templateNodeId ||
    ctx?.duplicatedFromNodeId ||
    DEFAULT_SCOPE
  );
}

function resolveRegistryScopes(ctx?: DuplicationContext): string[] {
  const scopes = new Set<string>();
  const primary = resolveScopeId(ctx);
  if (primary) {
    scopes.add(primary);
  }
  if (ctx?.repeaterNodeId) {
    scopes.add(ctx.repeaterNodeId);
  }
  return Array.from(scopes);
}

function appendVariableRecord(scopeId: string, input: RegisterVariableInput): void {
  const record = getRecord(scopeId);
  record.variables.push({ ...input, copyContext: { ...input.copyContext, scopeId } });
  record.lastUpdatedAt = new Date().toISOString();
}

function appendCapacityRecord(scopeId: string, input: RegisterCapacityLinkInput): void {
  const record = getRecord(scopeId);
  record.capacities.push({ ...input, copyContext: { ...input.copyContext, scopeId } });
  record.lastUpdatedAt = new Date().toISOString();
}

function getRecord(scopeId: string): RepeatRegistryRecord {
  const existing = registryStore.get(scopeId);
  if (existing) {
    return existing;
  }
  const fresh: RepeatRegistryRecord = {
    variables: [],
    capacities: [],
    lastUpdatedAt: new Date().toISOString()
  };
  registryStore.set(scopeId, fresh);
  return fresh;
}

export function registerVariable(input: RegisterVariableInput): void {
  if (!input?.nodeId || !input?.variableId) {
    return;
  }
  const scopeIds = resolveRegistryScopes(input.copyContext);
  scopeIds.forEach(scopeId => appendVariableRecord(scopeId, input));
}

export function registerCapacityLink(input: RegisterCapacityLinkInput): void {
  if (!input?.ownerNodeId || !input?.capacityId) {
    return;
  }
  const scopeIds = resolveRegistryScopes(input.copyContext);
  scopeIds.forEach(scopeId => appendCapacityRecord(scopeId, input));
}

export function recordTotalFieldConfig(config: TotalFieldConfig): void {
  if (!config?.repeaterNodeId) {
    return;
  }
  const scopeId = config.repeaterNodeId;
  const record = getRecord(scopeId);
  record.totalField = { ...config };
  record.lastUpdatedAt = new Date().toISOString();
}

export function captureRepeatTemplate(repeaterNodeId: string): RepeatTemplateBlueprint | null {
  if (!repeaterNodeId) {
    return null;
  }
  const record = registryStore.get(repeaterNodeId);
  if (!record) {
    return null;
  }
  return {
    scopeId: repeaterNodeId,
    variables: [...record.variables],
    capacities: [...record.capacities],
    totalField: record.totalField ? { ...record.totalField } : undefined,
    capturedAt: new Date().toISOString(),
    lastUpdatedAt: record.lastUpdatedAt
  };
}

export interface InstantiateRepeatBlueprintOptions {
  suffix?: string | number;
  targetParentId?: string | null;
  scopeId?: string;
}

export function instantiateRepeatBlueprint(
  repeaterNodeId: string,
  options: InstantiateRepeatBlueprintOptions = {}
): RepeatTemplateBlueprint | null {
  const blueprint = captureRepeatTemplate(repeaterNodeId);
  if (!blueprint) {
    return null;
  }
  const scopeId = options.scopeId || `${repeaterNodeId}:${options.suffix ?? ''}`.replace(/:+$/, '') || repeaterNodeId;
  const instantiated: RepeatTemplateBlueprint = {
    ...blueprint,
    scopeId,
    capturedAt: blueprint.capturedAt,
    lastUpdatedAt: new Date().toISOString()
  };
  registryStore.set(scopeId, {
    variables: [...instantiated.variables],
    capacities: [...instantiated.capacities],
    totalField: instantiated.totalField,
    lastUpdatedAt: instantiated.lastUpdatedAt
  });
  return instantiated;
}

export function resetRepeatRegistry(scopeId?: string): void {
  if (scopeId) {
    registryStore.delete(scopeId);
    return;
  }
  registryStore.clear();
}
