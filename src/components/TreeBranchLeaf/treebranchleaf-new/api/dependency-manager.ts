import { Prisma, PrismaClient } from '@prisma/client';

// Utiliser TransactionClient lorsque disponible
type Tx = PrismaClient | Prisma.TransactionClient;

type LinkedField = 'linkedFormulaIds' | 'linkedConditionIds' | 'linkedTableIds' | 'linkedVariableIds';

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr.filter(Boolean)));

export function normalizeRef(ref?: string | null): string {
  if (!ref || typeof ref !== 'string') return '';
  return ref
    .replace('@value.', '')
    .replace('@table.', '')
    .replace('node-formula:', '')
    .replace('node-table:', '')
    .replace('node-condition:', '')
    .replace('condition:', '')
    .trim();
}

// Parcourt une structure JSON et ajoute tous les nodeIds référencés dans le Set
export function findAllReferencedNodeIds(data: unknown, out: Set<string>) {
  if (!data) return;
  if (Array.isArray(data)) {
    for (const item of data) findAllReferencedNodeIds(item, out);
    return;
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Cas connus (inspirés d'operation-interpreter)
    if (obj.type === 'ref' && typeof obj.ref === 'string') {
      const id = normalizeRef(obj.ref);
      if (id) out.add(id);
    }

    const left = (obj.left as any)?.ref; if (typeof left === 'string') out.add(normalizeRef(left));
    const right = (obj.right as any)?.ref; if (typeof right === 'string') out.add(normalizeRef(right));

    if (Array.isArray(obj.nodeIds)) {
      for (const r of obj.nodeIds as string[]) out.add(normalizeRef(r));
    }

    const lookup = obj.lookup as any;
    if (lookup?.selectors?.rowFieldId) out.add(String(lookup.selectors.rowFieldId));
    if (lookup?.selectors?.columnFieldId) out.add(String(lookup.selectors.columnFieldId));

    if (obj.hasOwnProperty('useAllChildren') && obj.nodeId) out.add(String(obj.nodeId));

    if ((obj as any).selectedNodeId) out.add(String((obj as any).selectedNodeId));

    for (const key of Object.keys(obj)) findAllReferencedNodeIds(obj[key], out);
    return;
  }
  if (typeof data === 'string') {
    if (data.startsWith('@value.')) {
      const id = normalizeRef(data);
      if (id) out.add(id);
    }
  }
}

async function getNodeLinkedField(client: Tx, nodeId: string, field: LinkedField): Promise<string[]> {
  const node = await client.treeBranchLeafNode.findUnique({ where: { id: nodeId }, select: { [field]: true } as any }) as any;
  return (node?.[field] ?? []) as string[];
}

async function setNodeLinkedField(client: Tx, nodeId: string, field: LinkedField, values: string[]) {
  await client.treeBranchLeafNode.update({ where: { id: nodeId }, data: { [field]: { set: uniq(values) } } as any });
}

export async function updateLinkedDependenciesForNode(client: Tx, nodeId: string) {
  // Charger capacités et éléments liés au nœud
  const [formulas, conditions, tables, variable, selectConfig] = await Promise.all([
    client.treeBranchLeafNodeFormula.findMany({ where: { nodeId }, select: { id: true, tokens: true } }),
    client.treeBranchLeafNodeCondition.findMany({ where: { nodeId }, select: { id: true, conditionSet: true } }),
    client.treeBranchLeafNodeTable.findMany({ where: { nodeId }, select: { id: true, meta: true } }),
    client.treeBranchLeafNodeVariable.findUnique({ where: { nodeId }, select: { id: true, metadata: true } }),
    client.treeBranchLeafSelectConfig.findFirst({ where: { nodeId } })
  ]);

  // Collecter tous les nodeIds référencés depuis les capacités/metadata
  const refNodeIds = new Set<string>();
  for (const f of formulas) findAllReferencedNodeIds(f.tokens as any, refNodeIds);
  for (const c of conditions) findAllReferencedNodeIds(c.conditionSet as any, refNodeIds);
  for (const t of tables) findAllReferencedNodeIds(t.meta as any, refNodeIds);
  if (variable) findAllReferencedNodeIds(variable.metadata as any, refNodeIds);
  if (selectConfig) findAllReferencedNodeIds(selectConfig as any, refNodeIds);

  refNodeIds.delete(nodeId);

  // Construire les nouveaux ensembles pour le nœud propriétaire
  const newLinked = {
    linkedFormulaIds: uniq(formulas.map(f => f.id)),
    linkedConditionIds: uniq(conditions.map(c => c.id)),
    linkedTableIds: uniq(tables.map(t => t.id)),
    linkedVariableIds: uniq([
      variable?.id,
      (node as any)?.data_activeId  // fallback: variable active même si linkedVariableIds est vide
    ].filter(Boolean) as string[]),
  };

  // Ajouter les variables des nœuds référencés
  if (refNodeIds.size > 0) {
    const refVars = await client.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: { in: Array.from(refNodeIds) } },
      select: { id: true, nodeId: true }
    });
    newLinked.linkedVariableIds = uniq([
      ...newLinked.linkedVariableIds,
      ...refVars.map(v => v.id)
    ]);
  }

  // Appliquer au nœud propriétaire (remplacement contrôlé)
  await Promise.all([
    setNodeLinkedField(client, nodeId, 'linkedFormulaIds', newLinked.linkedFormulaIds),
    setNodeLinkedField(client, nodeId, 'linkedConditionIds', newLinked.linkedConditionIds),
    setNodeLinkedField(client, nodeId, 'linkedTableIds', newLinked.linkedTableIds),
    setNodeLinkedField(client, nodeId, 'linkedVariableIds', newLinked.linkedVariableIds),
  ]);

  // MAJ inverse minimale: pour chaque nœud référencé, s'assurer qu'il liste
  // - la formule/condition/table du nœud courant dans ses linked*Ids (trace des usages)
  // - la variable du nœud courant dans linkedVariableIds
  const ownerVarId = variable?.id || (node as any)?.data_activeId;
  await Promise.all(Array.from(refNodeIds).map(async refId => {
    if (formulas.length) {
      const current = await getNodeLinkedField(client, refId, 'linkedFormulaIds');
      await setNodeLinkedField(client, refId, 'linkedFormulaIds', uniq([...current, ...formulas.map(f => f.id)]));
    }
    if (conditions.length) {
      const current = await getNodeLinkedField(client, refId, 'linkedConditionIds');
      await setNodeLinkedField(client, refId, 'linkedConditionIds', uniq([...current, ...conditions.map(c => c.id)]));
    }
    if (tables.length) {
      const current = await getNodeLinkedField(client, refId, 'linkedTableIds');
      await setNodeLinkedField(client, refId, 'linkedTableIds', uniq([...current, ...tables.map(t => t.id)]));
    }
    if (ownerVarId) {
      const current = await getNodeLinkedField(client, refId, 'linkedVariableIds');
      await setNodeLinkedField(client, refId, 'linkedVariableIds', uniq([...current, ownerVarId]));
    }
  }));
}
