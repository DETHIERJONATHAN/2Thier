// Orchestrateur d'évaluation TBL – v1
// Focalisé sur la résolution améliorée des variables pour les formules.

export interface OrchestratorOptions {
  fieldValues: Record<string, unknown>;
  tokens: FormulaToken[];
  variableMap?: Record<string, { raw: unknown; numeric?: number; source?: string }>;
  rawExpression?: string;
  hasOperatorsOverride?: boolean;
}

export interface FormulaToken {
  type: 'value' | 'variable' | 'operator' | 'lparen' | 'rparen';
  value?: string | number;
  name?: string;
}

interface TraceEntry {
  step: string;
  input?: unknown;
  output?: unknown;
  meta?: Record<string, unknown>;
}

export interface OrchestratorResult {
  resolvedVariables: Record<string, number>;
  strategy: 'DIRECT_VALUE' | 'FULL_CALCULATION';
  operatorsDetected: boolean;
  trace: TraceEntry[];
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const isNumericLike = (v: unknown) => {
  if (v == null || v === '') return false;
  const str = String(v).trim().replace(/\s+/g, '').replace(/,/g, '.');
  return str !== '' && !isNaN(Number(str));
};

const toNumber = (v: unknown): number => {
  if (!isNumericLike(v)) return 0;
  const n = parseFloat(String(v).replace(/\s+/g, '').replace(/,/g, '.'));
  return isNaN(n) ? 0 : n;
};

export function evaluateFormulaOrchestrated(opts: OrchestratorOptions): OrchestratorResult {
  const trace: TraceEntry[] = [];
  const { fieldValues, tokens, variableMap, rawExpression, hasOperatorsOverride } = opts;

  const tokenVariables = tokens.filter(t => t.type === 'variable' && t.name).map(t => t.name!) as string[];
  trace.push({ step: 'extract_token_variables', output: tokenVariables });

  const operatorsDetected = hasOperatorsOverride ?? (rawExpression ? /[+\-*/]/.test(rawExpression) : tokens.some(t => t.type === 'operator'));
  trace.push({ step: 'detect_operators', output: operatorsDetected, meta: { rawExpression } });

  // Mirroirs
  const mirrors = Object.entries(fieldValues).filter(([k]) => k.startsWith('__mirror_data_'));
  const mirrorsByNorm: Record<string, { key: string; value: unknown }[]> = {};
  for (const [k, v] of mirrors) {
    const norm = normalize(k.replace(/^__mirror_data_/, ''));
    mirrorsByNorm[norm] = mirrorsByNorm[norm] || [];
    mirrorsByNorm[norm].push({ key: k, value: v });
  }
  trace.push({ step: 'collect_mirrors', output: Object.keys(mirrorsByNorm) });

  const resolvedVariables: Record<string, number> = {};

  const pickBest = (cands: { value: unknown; source: string }[]) => {
    const scored = cands.filter(c => isNumericLike(c.value)).map(c => ({ ...c, num: toNumber(c.value), len: String(c.value).length })).sort((a, b) => b.len - a.len);
    if (scored.length === 0) return { value: 0, source: 'none' };
    return { value: scored[0].num, source: scored[0].source };
  };

  for (const varName of tokenVariables) {
    const varTrace: TraceEntry = { step: 'resolve_variable', input: varName, meta: {} };
    const candidates: { value: unknown; source: string }[] = [];

    if (variableMap && variableMap[varName]) {
      candidates.push({ value: variableMap[varName].numeric ?? variableMap[varName].raw, source: 'variableMap' });
      varTrace.meta!.variableMap = true;
    }
    if (fieldValues[varName] != null) candidates.push({ value: fieldValues[varName], source: 'direct' });
    const suffixKey = `${varName}_field`;
    if (fieldValues[suffixKey] != null) candidates.push({ value: fieldValues[suffixKey], source: '_field_suffix' });

    // Contains pattern
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (k !== varName && k !== suffixKey && k.includes(varName) && v != null) {
        candidates.push({ value: v, source: 'contains_pattern' });
      }
    });

    const norm = normalize(varName);
    if (mirrorsByNorm[norm]) {
      mirrorsByNorm[norm].forEach(m => candidates.push({ value: m.value, source: 'mirror' }));
      varTrace.meta!.mirrorMatched = true;
    }

    // Generic fallback (legacy)
    if (!candidates.some(c => c.source === '_field_suffix')) {
      const anyField = Object.keys(fieldValues).find(k => k.endsWith('_field') && fieldValues[k] != null && fieldValues[k] !== '');
      if (anyField) candidates.push({ value: fieldValues[anyField], source: 'generic_field_fallback' });
    }

    const chosen = pickBest(candidates);
    resolvedVariables[varName] = chosen.value;
    varTrace.output = chosen.value;
    varTrace.meta!.candidates = candidates.slice(0, 6).map(c => ({ source: c.source, sample: String(c.value).slice(0, 20) }));
    varTrace.meta!.chosenSource = chosen.source;
    trace.push(varTrace);
  }

  let strategy: OrchestratorResult['strategy'] = 'FULL_CALCULATION';
  if (!operatorsDetected) {
    const nonZero = Object.values(resolvedVariables).filter(v => v !== 0);
    if (nonZero.length === 1 && tokenVariables.length === 1) strategy = 'DIRECT_VALUE';
  }
  trace.push({ step: 'select_strategy', output: strategy });

  return { resolvedVariables, strategy, operatorsDetected, trace };
}
