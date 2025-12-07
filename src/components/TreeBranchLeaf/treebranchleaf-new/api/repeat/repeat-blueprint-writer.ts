import {
  registerVariable,
  registerCapacityLink,
  recordTotalFieldConfig,
  type DuplicationContext,
  type RegisterVariableInput,
  type RegisterCapacityLinkInput,
  type TotalFieldConfig
} from '../registry/repeat-id-registry.js';

/**
 * Safe logging surface used by the legacy copier and by future repeat endpoints.
 *
 * The helpers intentionally swallow errors so that instrumentation can never
 * break critical copy flows. All payloads are forwarded to the in-memory
 * registry together with the duplication context that identifies the repeater
 * scope.
 */

export interface VariableEventPayload {
  nodeId: string;
  variableId: string;
  sourceRef?: string | null;
  sourceType?: string | null;
  displayNodeId?: string | null;
  metadata?: Record<string, unknown> | null;
  context?: DuplicationContext;
}

export interface CapacityEventPayload {
  ownerNodeId: string;
  capacityId: string;
  capacityType: RegisterCapacityLinkInput['capacityType'];
  referencedNodeIds?: string[];
  context?: DuplicationContext;
}

export interface TotalFieldPayload extends TotalFieldConfig {}

/**
 * Records the creation (or reuse) of a variable inside a duplication flow.
 * Provide as much metadata as possible so the blueprint builder can correlate
 * the variable with its display node and referenced capacities later on.
 */
export function logVariableEvent(payload: VariableEventPayload): void {
  try {
    const input: RegisterVariableInput = {
      nodeId: payload.nodeId,
      variableId: payload.variableId,
      sourceRef: payload.sourceRef,
      sourceType: payload.sourceType,
      displayNodeId: payload.displayNodeId,
      metadata: payload.metadata ?? undefined,
      copyContext: payload.context
    };
    registerVariable(input);
  } catch (err) {
    console.warn('[repeat-blueprint-writer] Unable to log variable event:', err);
  }
}

/**
 * Records the presence of a capacity (formula/condition/table) that belongs to
 * the duplicated slice. Owner node ID is required so the instantiator can
 * predict which nodes need to exist before the capacity is copied.
 */
export function logCapacityEvent(payload: CapacityEventPayload): void {
  try {
    const input: RegisterCapacityLinkInput = {
      ownerNodeId: payload.ownerNodeId,
      capacityId: payload.capacityId,
      capacityType: payload.capacityType,
      referencedNodeIds: payload.referencedNodeIds,
      copyContext: payload.context
    };
    registerCapacityLink(input);
  } catch (err) {
    console.warn('[repeat-blueprint-writer] Unable to log capacity event:', err);
  }
}

/**
 * Persists the target nodes/variables required to host repeater-level totals.
 * Calling this helper multiple times for the same repeater simply overwrites
 * the cached value, so it is safe to re-run during idempotent flows.
 */
export function logTotalFieldConfig(payload: TotalFieldPayload): void {
  try {
    recordTotalFieldConfig(payload);
  } catch (err) {
    console.warn('[repeat-blueprint-writer] Unable to log total field config:', err);
  }
}
