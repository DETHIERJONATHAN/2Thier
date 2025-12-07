# Repeat Blueprint System

This folder houses the incremental replacement for the legacy repeater duplication logic. It breaks the feature down into explicit stages so that we can instrument the existing copy flows _right now_ and later drive a brand new endpoint without touching the monolithic router again.

```
Legacy copy (today) ──▶ blueprint writer ──▶ in-memory registry ──▶ blueprint builder ──▶ instantiator ──▶ future repeat endpoint
```

## Modules at a Glance

| Module | Responsibility | Key exports |
| --- | --- | --- |
| `registry/repeat-id-registry.ts` | Stores every variable/capacity/totals event grouped by a scope (usually the repeater node). | `registerVariable`, `registerCapacityLink`, `recordTotalFieldConfig`, `captureRepeatTemplate`, `instantiateRepeatBlueprint` |
| `repeat/repeat-blueprint-writer.ts` | Thin wrappers used by any flow (legacy or future) to push events into the registry without importing registry internals. | `logVariableEvent`, `logCapacityEvent`, `logTotalFieldConfig` |
| `repeat/repeat-blueprint-builder.ts` | Builds a full blueprint. It first replays the in-memory registry when available, otherwise it inspects Prisma directly to reconstruct the template. | `buildBlueprintForRepeater` |
| `repeat/repeat-instantiator.ts` | Pure planner that converts a blueprint to the IDs that should exist after duplication (nodes, variables, totals). | `createInstantiationPlan` |
| `repeat/repeat-executor.ts` | Runs the instantiation plan by calling `deepCopyNodeInternal`, selector/table copy helpers and the shared-reference sync so the response matches what the UI expects. | `runRepeatExecution` |

## Instrumentation Rules

1. **Never** mutate the registry directly from business code. Always call the writer helpers so logging cannot throw.
2. Every time the legacy copier creates a variable, call `logVariableEvent` with:
   - the new `variableId`
   - the `nodeId` (usually the display node we just created)
   - `sourceRef`/`sourceType` (lets the builder bind capacities later)
   - a `DuplicationContext` describing the repeater scope (suffix, template node ID, etc.)
3. When a capacity (formula/condition/table) gets copied, call `logCapacityEvent`. Use the owner node ID returned by the copy helper so we know where the capacity lives in the new tree.
4. Totals are optional; when we decide which node/variable hosts the aggregation we can call `logTotalFieldConfig` once per repeater scope.

The registry groups everything by `scopeId`. We currently use the repeater node ID, but any string will work as long as the builder/instantiator agree.

## Passing Context from the Legacy Flow

```ts
const repeatContext = {
  repeaterNodeId: 'node-repeater-root',
  templateNodeId: originalVar.nodeId,
  suffix: suffix,
  mode: 'repeater'
};

await copyVariableWithCapacities(originalVarId, suffix, targetNodeId, prisma, {
  ...options,
  repeatContext,
  isFromRepeaterDuplication: true
});
```

The `copyVariableWithCapacities` helper now logs the variable and the capacity that ends up referenced by the new variable. When we call it outside the repeater flow we simply skip the `repeatContext` field so no registry noise is produced.

## Blueprint Consumption Flow

1. **Build**: `const blueprint = await buildBlueprintForRepeater(prisma, repeaterNodeId);`
2. **Plan**: `const plan = createInstantiationPlan(blueprint, { suffix: '4', includeTotals: true });`
3. **Execute**: Use the plan inside the new endpoint to call the existing `copy*` helpers in a deterministic order (handled by `repeat-executor.ts`).

Because the builder reuses the in-memory registry first, we can safely warm it by triggering the legacy copy logic once (or by running a dry-run endpoint) and only then rely on the clean repeat endpoint.

## API Endpoints

| Route | Description |
| --- | --- |
| `POST /api/repeat/:repeaterNodeId/instances` | Plans the duplication. Returns the stabilized suffix, captured blueprint and the instantiation plan. |
| `POST /api/repeat/:repeaterNodeId/instances/execute` | Executes the instantiation plan immediately (node copies followed by variable copies) and returns the operations, duplicated payload and counts consumed by the UI. |

### Request body

```jsonc
{
  "suffix": 3,              // optional override, defaults to next increment
  "includeTotals": true,    // include repeater total nodes in the plan
  "targetParentId": null,   // future override for the parent section
  "scopeId": "custom"      // optional registry scope
}
```

Both routes share the same payload. The execute variant also returns `duplicated`, `nodes` and `count` so the UI can update optimistically without forcing a full tree reload.

## Validation & Manual Tests

1. **Warm the registry** by duplicating at least one template via the legacy route so variable/capacity events are recorded.
2. **Plan** the duplication: `curl -X POST http://localhost:5173/api/repeat/<repeaterId>/instances -H "Content-Type: application/json" -d '{"suffix":4}'` – confirm the response includes `plan.nodes` and `plan.variables`.
3. **Execute**: same payload but hit `/instances/execute`. Confirm the response includes `operations`, `duplicated`, `nodes`, `count`, and that the UI renders the new instance without forcing a full reload.
4. **Failure paths**: call the endpoint with a repeater that has no templates. The service returns HTTP 422 with a descriptive error thanks to the blueprint validation in `repeat-service.ts`.

## Migration Checklist

- [x] Registry, writer, builder, instantiator created.
- [x] Legacy copier instrumented to feed the registry (see `repeat/services/variable-copy-engine.ts`).
- [x] New `/repeat` endpoint that uses `buildBlueprintForRepeater` + `createInstantiationPlan`.
- [x] UI repeat button calling the new endpoint.

Until the checklist is fully green the old router keeps the functional logic, but because every duplication now emits structured events we can finish the migration without re-reading the historical file again.
