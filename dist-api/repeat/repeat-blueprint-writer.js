"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logVariableEvent = logVariableEvent;
exports.logCapacityEvent = logCapacityEvent;
exports.logTotalFieldConfig = logTotalFieldConfig;
var repeat_id_registry_js_1 = require("../registry/repeat-id-registry.js");
/**
 * Records the creation (or reuse) of a variable inside a duplication flow.
 * Provide as much metadata as possible so the blueprint builder can correlate
 * the variable with its display node and referenced capacities later on.
 */
function logVariableEvent(payload) {
    var _a;
    try {
        var input = {
            nodeId: payload.nodeId,
            variableId: payload.variableId,
            sourceRef: payload.sourceRef,
            sourceType: payload.sourceType,
            displayNodeId: payload.displayNodeId,
            metadata: (_a = payload.metadata) !== null && _a !== void 0 ? _a : undefined,
            copyContext: payload.context
        };
        (0, repeat_id_registry_js_1.registerVariable)(input);
    }
    catch (err) {
        console.warn('[repeat-blueprint-writer] Unable to log variable event:', err);
    }
}
/**
 * Records the presence of a capacity (formula/condition/table) that belongs to
 * the duplicated slice. Owner node ID is required so the instantiator can
 * predict which nodes need to exist before the capacity is copied.
 */
function logCapacityEvent(payload) {
    try {
        var input = {
            ownerNodeId: payload.ownerNodeId,
            capacityId: payload.capacityId,
            capacityType: payload.capacityType,
            referencedNodeIds: payload.referencedNodeIds,
            copyContext: payload.context
        };
        (0, repeat_id_registry_js_1.registerCapacityLink)(input);
    }
    catch (err) {
        console.warn('[repeat-blueprint-writer] Unable to log capacity event:', err);
    }
}
/**
 * Persists the target nodes/variables required to host repeater-level totals.
 * Calling this helper multiple times for the same repeater simply overwrites
 * the cached value, so it is safe to re-run during idempotent flows.
 */
function logTotalFieldConfig(payload) {
    try {
        (0, repeat_id_registry_js_1.recordTotalFieldConfig)(payload);
    }
    catch (err) {
        console.warn('[repeat-blueprint-writer] Unable to log total field config:', err);
    }
}
