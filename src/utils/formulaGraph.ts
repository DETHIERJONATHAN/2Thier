import type { Formula, FormulaItem } from '../types/formula';
import useCRMStore from '../store';

// Recherche toutes les formules du store sous forme map id -> sequence
export function getAllFormulasMap(): Record<string, Formula> {
  const store = useCRMStore.getState();
  const map: Record<string, Formula> = {};
  store.blocks.forEach(b => b.sections.forEach(sec => sec.fields.forEach(f => (f.formulas||[]).forEach(raw => {
    if (!raw) return;
    const seq: FormulaItem[] = Array.isArray(raw.sequence) ? (raw.sequence as FormulaItem[]) : [];
    map[raw.id] = { id: raw.id, name: raw.name || raw.id, sequence: seq, targetProperty: raw.targetProperty, targetFieldId: raw.targetFieldId };
  }))));
  return map;
}

// Détecte si ajouter une arête from -> to crée un cycle
export function wouldCreateCycle(fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  const formulas = getAllFormulasMap();
  // Construire graph adjacency: f -> refs
  const adjacency: Record<string, Set<string>> = {};
  Object.values(formulas).forEach(f => {
    const refs = new Set<string>();
    (f.sequence||[]).forEach(it => {
      if (!it) return;
      if (it.type === 'formula_ref' && it.refFormulaId) refs.add(it.refFormulaId);
      if (it.type === 'cond') {
        const walk = (arr?: FormulaItem[]) => arr?.forEach(sub => {
          if (sub?.type === 'formula_ref' && sub.refFormulaId) refs.add(sub.refFormulaId);
        });
        walk(it.then);
        walk(it.else);
      }
    });
    adjacency[f.id] = refs;
  });
  // Simuler ajout from->to
  if (!adjacency[fromId]) adjacency[fromId] = new Set();
  adjacency[fromId].add(toId);

  // DFS depuis toId pour voir si on revient à fromId
  const visited = new Set<string>();
  const stack: string[] = [toId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === fromId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    (adjacency[cur] || []).forEach(n => stack.push(n));
  }
  return false;
}
