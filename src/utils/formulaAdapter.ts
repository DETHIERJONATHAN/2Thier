import type { Formula, FormulaItem } from '../store/slices/types';

// Types étendus internes pour couvrir cond / switch profondément
interface AdaptedBase {
  id: string;
  type: string;
  value?: unknown;
  label?: string;
  fieldId?: string;
  valueType?: string;
}
interface AdaptedCond extends AdaptedBase {
  type: 'cond';
  elseBehavior?: 'zero' | 'ignore';
  condExpr?: AdaptedItem[];
  then?: AdaptedItem[];
  else?: AdaptedItem[];
}
interface AdaptedSwitchCase { value: string; label?: string; seq: AdaptedItem[]; }
interface AdaptedSwitch extends AdaptedBase {
  type: 'switch';
  switchFieldId?: string;
  switchPart?: 'selection' | 'extra' | 'nodeId';
  cases?: AdaptedSwitchCase[];
  defaultSeq?: AdaptedItem[];
}
type AdaptedItem = AdaptedBase | AdaptedCond | AdaptedSwitch;
interface AdaptedFormula { id: string; name: string; targetProperty: string; targetFieldId?: string; sequence: AdaptedItem[]; }

/**
 * Adaptateur pour convertir les types de formule du store vers les types utilisés par l'évaluateur
 * Cela nous permet d'éviter les conflits de type entre les deux systèmes
 */
export const adaptFormulaForEvaluation = (formula: Formula): AdaptedFormula | null => {
  if (!formula) return null;
  return {
    id: formula.id || '',
    name: formula.name || '',
    targetProperty: formula.targetProperty || '',
  targetFieldId: (formula as unknown as { targetFieldId?: string; fieldId?: string }).targetFieldId || (formula as unknown as { targetFieldId?: string; fieldId?: string }).fieldId || '',
  sequence: Array.isArray(formula.sequence) ? formula.sequence.map(adaptFormulaItemDeep) : [],
  };
};

/**
 * Adaptateur pour les éléments de formule
 */
const adaptFormulaItemDeep = (item: FormulaItem): AdaptedItem | null => {
  if (!item) return null;
  const baseId = item.id || `item-${Math.random().toString(36).slice(2,9)}`;
  // Champ: on doit utiliser fieldId OU value (pas l'id décoré style field-xxxx)
  if (item.type === 'field') {
    return {
      id: baseId,
      type: 'field',
      value: item.value || '',
      label: item.label || String(item.value || ''),
      fieldId: (item as unknown as { fieldId?: string }).fieldId || (typeof item.value === 'string' ? item.value : '')
    };
  }
  if (item.type === 'value') {
    return {
      id: baseId,
      type: 'value',
      value: item.value,
      label: item.label || String(item.value||''),
      valueType: (item as unknown as { valueType?: string }).valueType
    };
  }
  if (item.type === 'operator') {
    return { id: baseId, type: 'operator', value: item.value, label: item.label || String(item.value||'') };
  }
  if (item.type === 'formula_ref') {
    return { id: baseId, type: 'formula_ref', value: item.refFormulaId || item.value, refFormulaId: (item as unknown as { refFormulaId?: string }).refFormulaId };
  }
  if (item.type === 'adv_part') {
    const adv = item as unknown as { fieldId?: string; part?: 'selection'|'extra'|'nodeId' };
    return { id: baseId, type: 'adv_part', value: item.value, fieldId: adv.fieldId, part: adv.part };
  }
  if (item.type === 'cond') {
    const cond = item as unknown as { elseBehavior?: 'zero'|'ignore'; condExpr?: FormulaItem[]; then?: FormulaItem[]; else?: FormulaItem[] };
    return {
      id: baseId,
      type: 'cond',
      elseBehavior: cond.elseBehavior,
      condExpr: Array.isArray(cond.condExpr) ? cond.condExpr.map(adaptFormulaItemDeep).filter(Boolean) as AdaptedItem[] : [],
      then: Array.isArray(cond.then) ? cond.then.map(adaptFormulaItemDeep).filter(Boolean) as AdaptedItem[] : [],
      else: Array.isArray(cond.else) ? cond.else.map(adaptFormulaItemDeep).filter(Boolean) as AdaptedItem[] : [],
    };
  }
  if (item.type === 'switch') {
    const sw = item as unknown as { switchFieldId?: string; switchPart?: 'selection'|'extra'|'nodeId'; cases?: { value: string; label?: string; seq?: FormulaItem[] }[]; defaultSeq?: FormulaItem[] };
    return {
      id: baseId,
      type: 'switch',
      switchFieldId: sw.switchFieldId,
      switchPart: sw.switchPart,
      cases: Array.isArray(sw.cases) ? sw.cases.map(c => ({
        value: c.value,
        label: c.label,
        seq: Array.isArray(c.seq) ? c.seq.map(adaptFormulaItemDeep).filter(Boolean) as AdaptedItem[] : []
      })) : [],
      defaultSeq: Array.isArray(sw.defaultSeq) ? sw.defaultSeq.map(adaptFormulaItemDeep).filter(Boolean) as AdaptedItem[] : []
    };
  }
  // Fallback: renvoyer tel quel (value neutre)
  return { id: baseId, type: item.type, value: item.value, label: item.label || String(item.value||'') };
};

/**
 * Extrait les informations des champs depuis la formule pour générer des valeurs de test
 */
export const extractFieldInfoFromFormula = (formula: Formula): {
  fieldIds: string[];
  defaultValues: Record<string, number>;
  fieldLabels: Record<string, string>;
} => {
  const fieldIds: string[] = [];
  const defaultValues: Record<string, number> = {};
  const fieldLabels: Record<string, string> = {};
  const visitItems = (items?: FormulaItem[]) => {
    if (!Array.isArray(items)) return;
    for (const raw of items) {
      const it = raw as unknown as AdaptedItem & FormulaItem & { condExpr?: FormulaItem[]; then?: FormulaItem[]; else?: FormulaItem[]; cases?: { seq?: FormulaItem[] }[]; defaultSeq?: FormulaItem[] };
      if (!it) continue;
      switch (it.type) {
        case 'field': {
          const fid = (it as { fieldId?: string; value?: unknown; id?: string }).fieldId || (typeof it.value === 'string' ? it.value : (it.id || ''));
          if (fid) {
            if (!fieldIds.includes(fid)) {
              fieldIds.push(fid);
              defaultValues[fid] = 10;
              fieldLabels[fid] = it.label || fid;
            } else if (!fieldLabels[fid]) {
              fieldLabels[fid] = it.label || fid;
            }
          }
          break;
        }
        case 'adv_part': {
          const fid = (it as { fieldId?: string }).fieldId;
          if (fid && !fieldIds.includes(fid)) {
            fieldIds.push(fid);
            defaultValues[fid] = 10;
            fieldLabels[fid] = it.label || fid;
          }
          break;
        }
        case 'cond': {
          visitItems(it.condExpr as FormulaItem[]);
          visitItems(it.then as FormulaItem[]);
          visitItems(it.else as FormulaItem[]);
          break;
        }
        case 'switch': {
          const cases = it.cases || [];
          for (const c of cases) visitItems(c.seq as FormulaItem[]);
          visitItems(it.defaultSeq as FormulaItem[]);
          break;
        }
        default:
          break;
      }
    }
  };
  if (formula && Array.isArray(formula.sequence)) visitItems(formula.sequence);
  return { fieldIds, defaultValues, fieldLabels };
};
