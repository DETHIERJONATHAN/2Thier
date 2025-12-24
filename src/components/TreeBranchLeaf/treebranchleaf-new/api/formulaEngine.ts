// Formula Engine avec prÃƒÂ©cÃƒÂ©dence, parenthÃƒÂ¨ses et variables nodeId
// Fournit parsing d'expressions dÃƒÂ©jÃƒÂ  "templatisÃƒÂ©es" sous forme de tokens ou string.
// ConÃƒÂ§u pour remplacer l'ÃƒÂ©valuation gauche->droite simpliste.

export type FormulaToken =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string } // name = nodeId
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'func'; name: string; argCount?: number }
  | { type: 'comma' }
  | { type: 'string'; value: string };

export interface EvaluateOptions {
  resolveVariable: (nodeId: string) => Promise<number | null> | number | null;
  onError?: (code: string, context?: Record<string, unknown>) => void;
  divisionByZeroValue?: number; // dÃƒÂ©faut 0
  strictVariables?: boolean; // erreur unknown_variable si variable non rÃƒÂ©solue
  enableCache?: boolean; // activer cache RPN (par dÃƒÂ©faut true)
  maxExpressionLength?: number; // sÃƒÂ©curitÃƒÂ© (dÃƒÂ©faut 500)
  allowedCharsRegex?: RegExp; // whitelist (dÃƒÂ©faut fourni)
  precisionScale?: number; // si dÃƒÂ©fini (>1), applique un scaling entier pour + - * / et round (sauf pow) pour rÃƒÂ©duire erreurs FP
}

// Ajout: opÃƒÂ©rateurs comparaison gÃƒÂ©rÃƒÂ©s en phase de parsing (transformÃƒÂ©s en fonctions boolÃƒÂ©ennes)
// Ils ne sont PAS ajoutÃƒÂ©s ÃƒÂ  OP_PRECEDENCE pour ÃƒÂ©viter de modifier la logique arithmÃƒÂ©tique: au lieu de cela,
// on rÃƒÂ©ÃƒÂ©crit 'a > b' en gt(a,b) directement sous forme de tokens fonction.
const OP_PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
  '^': 3,
  '&': 1,
  and: 0,
  or: 0
};
const OP_ASSOC: Record<string, 'L' | 'R'> = {
  '+': 'L',
  '-': 'L',
  '*': 'L',
  '/': 'L',
  '^': 'R',
  '&': 'L',
  and: 'L',
  or: 'L'
};

// Cache RPN basÃƒÂ© sur empreinte des tokens
const rpnCache = new Map<string, FormulaToken[]>();
let rpnParseCount = 0; // compteur pour tests / diagnostics
export function getRpnCacheStats() { return { entries: rpnCache.size, parseCount: rpnParseCount }; }
export function clearRpnCache() { rpnCache.clear(); }

// ---- Metrics Logique ----
interface LogicMetrics {
  evaluations: number;
  totalEvalMs: number;
  functions: Record<string, number>;
  divisionByZero: number;
  unknownVariables: number;
  parseErrors: number;
  invalidResults: number;
}
const logicMetrics: LogicMetrics = {
  evaluations: 0,
  totalEvalMs: 0,
  functions: {},
  divisionByZero: 0,
  unknownVariables: 0,
  parseErrors: 0,
  invalidResults: 0
};
export function getLogicMetrics() {
  return { ...logicMetrics, avgEvalMs: logicMetrics.evaluations ? logicMetrics.totalEvalMs / logicMetrics.evaluations : 0 };
}
export function resetLogicMetrics() {
  logicMetrics.evaluations = 0;
  logicMetrics.totalEvalMs = 0;
  logicMetrics.functions = {};
  logicMetrics.divisionByZero = 0;
  logicMetrics.unknownVariables = 0;
  logicMetrics.parseErrors = 0;
  logicMetrics.invalidResults = 0;
}

function tokensFingerprint(tokens: FormulaToken[]): string {
  return tokens.map(t => {
    switch (t.type) {
      case 'number': return `n:${t.value}`;
      case 'variable': return `v:${t.name}`;
      case 'operator': return `o:${t.value}`;
      case 'paren': return `p:${t.value}`;
      case 'func': return `f:${t.name}:${t.argCount ?? '?'}`;
      case 'comma': return 'c';
    }
  }).join('|');
}

// Validation sÃƒÂ©curitÃƒÂ©
function validateExpression(expr: string, opts?: EvaluateOptions) {
  const maxLen = opts?.maxExpressionLength ?? 500;
  if (expr.length > maxLen) throw new Error('Expression trop longue');
  // Ajout de @ pour supporter @table.xxx et @value.xxx
  const allowed = opts?.allowedCharsRegex || /^[0-9A-Za-z_\s+*\-/^(),.{}:<>!=&"\\@]+$/;
  if (!allowed.test(expr)) throw new Error('CaractÃƒÂ¨res non autorisÃƒÂ©s dans l\'expression');
}

export function parseExpression(expr: string, roleToNodeId: Record<string,string>, opts?: EvaluateOptions): FormulaToken[] {
  validateExpression(expr, opts);
  // Remplacer {{role}} par un marqueur unique pour scanning
  let working = expr.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, v) => `__VAR__${v.trim()}__`);
  // Ãƒâ€°galement remplacer @table.xxx et @value.xxx par des marqueurs variables
  working = working.replace(/@(table|value)\.([a-zA-Z0-9_-]+)/g, (_, type, id) => `__VAR__${type}.${id}__`);
  const tokens: FormulaToken[] = [];
  let i = 0;
  let parenBalance = 0;
  // Stack des fonctions en cours pour compter les arguments (liaison par parenthÃƒÂ¨se)
  const funcParenStack: Array<{ name: string; argCount: number }> = [];
  let lastToken: FormulaToken | null = null;
  while (i < working.length) {
    const ch = working[i];
    if (/\s/.test(ch)) { i++; continue; }
    // Variable marquÃƒÂ©e
    if (working.startsWith('__VAR__', i)) {
      const end = working.indexOf('__', i + 7);
      if (end === -1) throw new Error('Marqueur variable mal formÃƒÂ©');
      const role = working.substring(i + 7, end);
      // Essayer d'abord roleToNodeId, sinon utiliser le role directement (pour @table.xxx)
      const nodeId = roleToNodeId[role] || role;
      tokens.push({ type: 'variable', name: nodeId });
      i = end + 2;
      lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Nombre
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < working.length && /[0-9.]/.test(working[j])) j++;
      const numStr = working.slice(i, j);
      tokens.push({ type: 'number', value: parseFloat(numStr) });
      i = j; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // LittÃƒÂ©ral string
    if (ch === '"') {
      let j = i + 1;
      let str = '';
      while (j < working.length) {
        const cc = working[j];
        if (cc === '\\' && j + 1 < working.length) {
          str += working[j + 1];
          j += 2;
          continue;
        }
        if (cc === '"') break;
        str += cc;
        j++;
      }
      if (j >= working.length) throw new Error('ChaÃƒÂ®ne non terminÃƒÂ©e');
      tokens.push({ type: 'string', value: str });
      i = j + 1;
      lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Identifiant (potentiellement fonction)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < working.length && /[A-Za-z0-9_]/.test(working[j])) j++;
      const ident = working.slice(i, j);
      const lowerIdent = ident.toLowerCase();
      if (lowerIdent === 'true' || lowerIdent === 'false') {
        tokens.push({ type: 'number', value: lowerIdent === 'true' ? 1 : 0 });
        i = j; lastToken = tokens[tokens.length - 1];
        continue;
      }
      const canUseAsBinary = Boolean(lastToken && (
        (lastToken.type === 'number') ||
        (lastToken.type === 'variable') ||
        (lastToken.type === 'paren' && lastToken.value === ')')
      ));
      if ((lowerIdent === 'and' || lowerIdent === 'or') && canUseAsBinary) {
        tokens.push({ type: 'operator', value: lowerIdent });
        i = j; lastToken = tokens[tokens.length - 1];
        continue;
      }
      // Fonction si prochaine non-espace est (
      let k = j; while (k < working.length && /\s/.test(working[k])) k++;
      if (working[k] === '(') {
        tokens.push({ type: 'func', name: lowerIdent });
        // La parenthÃƒÂ¨se sera traitÃƒÂ©e dans cycle suivant
        i = j; lastToken = tokens[tokens.length - 1];
        continue;
      } else {
        // Identifiant seul non supportÃƒÂ© (on pourrait l'ÃƒÂ©tendre plus tard)
        throw new Error('Identifiant inattendu: ' + ident);
      }
    }
    // ParenthÃƒÂ¨ses
    if (ch === '(') {
      tokens.push({ type: 'paren', value: '(' });
      // Lier ÃƒÂ  une fonction prÃƒÂ©cÃƒÂ©dente (si lastToken func sans paren encore ouverte)
      const prev = lastToken;
      if (prev && prev.type === 'func') {
        funcParenStack.push({ name: prev.name, argCount: 0 });
      }
      parenBalance++;
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'paren', value: ')' });
      parenBalance--;
      if (parenBalance < 0) throw new Error('ParenthÃƒÂ¨ses dÃƒÂ©sÃƒÂ©quilibrÃƒÂ©es');
      // Si on ferme une fonction: incrÃƒÂ©menter argCount si la derniÃƒÂ¨re chose n'ÃƒÂ©tait pas '(' (i.e. au moins une expr)
      if (funcParenStack.length) {
        // On dÃƒÂ©cidera dans toRPN lequel associer
      }
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Virgule
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      // IncrÃƒÂ©menter compteur arg de la fonction en haut de pile
      if (funcParenStack.length) {
        const top = funcParenStack[funcParenStack.length - 1];
        top.argCount++;
      }
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // OpÃƒÂ©rateurs simples arithmÃƒÂ©tiques + concat (&)
    if ('+-*/^&'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // OpÃƒÂ©rateurs comparaison multi-caractÃƒÂ¨res (>=, <=, ==, !=)
    if ((ch === '>' || ch === '<' || ch === '=' || ch === '!') && i + 1 < working.length) {
      const two = working.slice(i, i + 2);
      if (['>=', '<=', '==', '!='].includes(two)) {
        tokens.push({ type: 'operator', value: two });
        i += 2; lastToken = tokens[tokens.length - 1];
        continue;
      }
    }
    // OpÃƒÂ©rateurs comparaison simples (>, <)
    if (ch === '>' || ch === '<') {
      tokens.push({ type: 'operator', value: ch });
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    throw new Error('CaractÃƒÂ¨re inattendu: ' + ch);
  }
  if (parenBalance !== 0) throw new Error('ParenthÃƒÂ¨ses dÃƒÂ©sÃƒÂ©quilibrÃƒÂ©es');
  // RÃƒÂ©ÃƒÂ©criture comparaison Ã¢â€ â€™ fonctions (gt, gte, lt, lte, eq, neq)
  if (tokens.some(t => t.type === 'operator' && ['>','>=','<','<=','==','!='].includes((t as { type:'operator'; value:string }).value))) {
    const rewritten: FormulaToken[] = [];
    for (let idx = 0; idx < tokens.length; idx++) {
      const tk = tokens[idx];
      if (tk.type === 'operator' && ['>','>=','<','<=','==','!='].includes(tk.value)) {
        // On suppose forme binaire: prÃƒÂ©cÃƒÂ©dent est une valeur/variable/paren fermante ou fonction dÃƒÂ©jÃƒÂ  sortie,
        // suivant est une valeur/variable/paren ouvrante ou fonction; on va transformer A op B en func(A,B)
        // StratÃƒÂ©gie: On remonte ÃƒÂ  l'ÃƒÂ©lÃƒÂ©ment immÃƒÂ©diatement prÃƒÂ©cÃƒÂ©dent dans rewritten pour extraire l'opÃƒÂ©rande gauche
        const op = tk.value;
        const left = rewritten.pop();
        const right = tokens[idx + 1];
        if (!left || !right) throw new Error('Expression comparaison mal formÃƒÂ©e');
        // Consommer le token de droite en avanÃƒÂ§ant idx
        idx++;
        // Construire tokens fonction: name(left,right)
        const funcName = op === '>' ? 'gt'
          : op === '>=' ? 'gte'
          : op === '<' ? 'lt'
          : op === '<=' ? 'lte'
          : op === '==' ? 'eq'
          : op === '!=' ? 'neq' : 'eq';
        // ModÃƒÂ¨le: func( left , right ) => [func, '(', left, ',', right, ')']
        rewritten.push({ type: 'func', name: funcName });
        rewritten.push({ type: 'paren', value: '(' });
        rewritten.push(left);
        rewritten.push({ type: 'comma' });
        rewritten.push(right);
        rewritten.push({ type: 'paren', value: ')' });
      } else {
        rewritten.push(tk);
      }
    }
    return rewritten;
  }
  return tokens;
}

export function toRPN(tokens: FormulaToken[]): FormulaToken[] {
  const output: FormulaToken[] = [];
  const stack: FormulaToken[] = [];
  // pile pour compter les arguments par fonction (index alignÃƒÂ© avec parenthÃƒÂ¨se ouvrante associÃƒÂ©e)
  const funcStack: Array<{ name: string; argCount: number }> = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    switch (tk.type) {
      case 'number':
      case 'variable':
      case 'string':
        output.push(tk);
        // Si nous sommes dans une fonction et que le token prÃƒÂ©cÃƒÂ©dent est '(' ou ',' on compte cet argument
        if (funcStack.length) {
          // incrÃƒÂ©ment implicite si dernier arg dÃƒÂ©marre; on gÃƒÂ¨re en sortie parenthÃƒÂ¨se
        }
        break;
      case 'func':
        stack.push(tk); // fonction en pile
        break;
      case 'operator': {
        while (stack.length) {
          const top = stack[stack.length - 1];
            if (top.type === 'operator') {
              const pTop = OP_PRECEDENCE[top.value] || 0;
              const pCur = OP_PRECEDENCE[tk.value] || 0;
              if ((OP_ASSOC[tk.value] === 'L' && pCur <= pTop) || (OP_ASSOC[tk.value] === 'R' && pCur < pTop)) {
                output.push(stack.pop() as FormulaToken);
                continue;
              }
            }
          break;
        }
        stack.push(tk);
        break; }
      case 'paren':
        if (tk.value === '(') {
          stack.push(tk);
          // Si le token prÃƒÂ©cÃƒÂ©dent sur la pile est une fonction, initialiser compteur args=1 provisoire
          const prev = stack[stack.length - 2];
          if (prev && prev.type === 'func') {
            funcStack.push({ name: prev.name, argCount: 1 });
          }
        } else { // ')'
          let found = false;
          while (stack.length) {
            const top = stack.pop() as FormulaToken;
            if (top.type === 'paren' && top.value === '(') { found = true; break; }
            output.push(top);
          }
          if (!found) throw new Error('ParenthÃƒÂ¨ses dÃƒÂ©sÃƒÂ©quilibrÃƒÂ©es');
          // Si juste aprÃƒÂ¨s '(' il y avait une fonction
          const maybeFunc = stack[stack.length - 1];
          if (maybeFunc && maybeFunc.type === 'func') {
            // Finaliser fonction (argCount obtenu)
            stack.pop();
            const fMeta = funcStack.pop();
            const argCount = fMeta ? fMeta.argCount : 0;
            output.push({ type: 'func', name: maybeFunc.name, argCount });
          }
        }
        break;
      case 'comma':
        // vider la pile jusqu'ÃƒÂ  la parenthÃƒÂ¨se ouvrante
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === 'paren' && top.value === '(') break;
          output.push(stack.pop() as FormulaToken);
        }
        // IncrÃƒÂ©menter compteur args
        if (funcStack.length) funcStack[funcStack.length - 1].argCount++;
        break;
    }
  }
  while (stack.length) {
    const top = stack.pop() as FormulaToken;
    if (top.type === 'paren') throw new Error('ParenthÃƒÂ¨ses dÃƒÂ©sÃƒÂ©quilibrÃƒÂ©es (fin)');
    output.push(top);
  }
  return output;
}

export async function evaluateTokens(tokens: FormulaToken[], opts: EvaluateOptions): Promise<{ value: number; errors: string[] }> {
  const errors: string[] = [];
  const pushError = (c: string, ctx?: Record<string, unknown>) => {
    errors.push(c);
    if (opts.onError) opts.onError(c, ctx);
    if (c === 'division_by_zero') logicMetrics.divisionByZero++;
    else if (c === 'unknown_variable') logicMetrics.unknownVariables++;
    else if (c === 'invalid_result') logicMetrics.invalidResults++;
  };
  const t0 = Date.now();
  const useCache = opts.enableCache !== false;
  let rpn: FormulaToken[] | undefined;
  if (useCache) {
    const fp = tokensFingerprint(tokens);
    const cached = rpnCache.get(fp);
    if (cached) rpn = cached;
    else {
      rpn = toRPN(tokens);
      rpnCache.set(fp, rpn);
      rpnParseCount++;
    }
  } else {
    rpn = toRPN(tokens);
    rpnParseCount++;
  }

  type StackValue = number | number[] | string;
  interface StackEntry {
    value: StackValue;
    hadError: boolean;
  }

  const stack: StackEntry[] = [];
  const pushEntry = (value: StackValue, hadError: boolean) => {
    stack.push({ value, hadError });
  };
  const popEntry = (): StackEntry | undefined => stack.pop();

  const scale = (opts.precisionScale && opts.precisionScale > 1) ? Math.floor(opts.precisionScale) : null;
  const toInternal = (v: number) => scale ? Math.round(v * scale) : v;
  const fromInternal = (v: number) => scale ? v / scale : v;

  const normalizeNumber = (num: number): number => (Number.isFinite(num) ? num : 0);
  const stringToNumber = (value: string): number => {
    if (!value) return 0;
    const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const toNumber = (value: StackValue): number => {
    if (Array.isArray(value)) return normalizeNumber(value[0] ?? 0);
    if (typeof value === 'number') return normalizeNumber(value);
    return stringToNumber(value);
  };
  const valueToArray = (value: StackValue): number[] => {
    if (Array.isArray(value)) return value.map(normalizeNumber);
    return [toNumber(value)];
  };
  const normalizeArrayResult = (values: number[]): StackValue => (values.length === 1 ? values[0] : values);
  const mapNumericValue = (value: StackValue, mapper: (n: number) => number): StackValue => {
    const mapped = valueToArray(value).map(mapper);
    return normalizeArrayResult(mapped);
  };
  const broadcastNumericValues = (
    a: StackValue,
    b: StackValue,
    mapper: (x: number, y: number) => number
  ): StackValue | null => {
    const arrA = valueToArray(a);
    const arrB = valueToArray(b);
    const lenA = arrA.length;
    const lenB = arrB.length;
    const len = Math.max(lenA, lenB);
    if (lenA > 1 && lenB > 1 && lenA !== lenB) return null;
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      const va = arrA[lenA === 1 ? 0 : i];
      const vb = arrB[lenB === 1 ? 0 : i];
      result.push(mapper(va, vb));
    }
    return normalizeArrayResult(result);
  };
  const flattenNumericArgs = (args: StackValue[]): number[] => args.flatMap(valueToArray);
  const valueToString = (value: StackValue): string => {
    if (Array.isArray(value)) return value.length === 1 ? String(value[0]) : value.join(',');
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
    return value;
  };
  const sanitizeNumericResult = (value: StackValue, ctx?: Record<string, unknown>): StackValue => {
    if (Array.isArray(value)) {
      const sanitized = value.map(v => {
        if (!Number.isFinite(v)) {
          pushError('invalid_result', ctx);
          return 0;
        }
        return v;
      });
      return normalizeArrayResult(sanitized);
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      pushError('invalid_result', ctx);
      return 0;
    }
    return value;
  };
  const valueHasNumericError = (value: StackValue): boolean => {
    if (Array.isArray(value)) return value.some(v => !Number.isFinite(v));
    if (typeof value === 'number') return !Number.isFinite(value);
    return false;
  };

  for (const tk of rpn) {
    if (tk.type === 'number') pushEntry(tk.value, false);
    else if (tk.type === 'string') pushEntry(tk.value, false);
    else if (tk.type === 'variable') {
      let v: number | null;
      const beforeErrors = errors.length;
      try { v = await opts.resolveVariable(tk.name); } catch { v = null; }
      if (v == null || !Number.isFinite(v)) {
        if (opts.strictVariables) pushError('unknown_variable', { nodeId: tk.name });
        v = 0;
      }
      const hadError = errors.length > beforeErrors;
      pushEntry(v, hadError);
    } else if (tk.type === 'operator') {
      const entryB = popEntry();
      const entryA = popEntry();
      if (!entryA || !entryB) { pushError('stack_underflow', { op: tk.value }); return { value: 0, errors }; }
      const beforeErrors = errors.length;
      let resultValue: StackValue = 0;
      switch (tk.value) {
        case '+': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => {
            if (scale) return fromInternal(toInternal(a) + toInternal(b));
            return a + b;
          });
          if (res === null) {
            pushError('array_length_mismatch', { op: '+' });
            resultValue = 0;
          } else {
            resultValue = sanitizeNumericResult(res, { op: '+' });
          }
          break;
        }
        case '-': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => {
            if (scale) return fromInternal(toInternal(a) - toInternal(b));
            return a - b;
          });
          if (res === null) {
            pushError('array_length_mismatch', { op: '-' });
            resultValue = 0;
          } else {
            resultValue = sanitizeNumericResult(res, { op: '-' });
          }
          break;
        }
        case '*': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => {
            if (scale) return fromInternal(Math.round(toInternal(a) * toInternal(b) / scale));
            return a * b;
          });
          if (res === null) {
            pushError('array_length_mismatch', { op: '*' });
            resultValue = 0;
          } else {
            resultValue = sanitizeNumericResult(res, { op: '*' });
          }
          break;
        }
        case '/': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => {
            if (b === 0) {
              pushError('division_by_zero', { a, b });
              return opts.divisionByZeroValue ?? 0;
            }
            if (scale) return fromInternal(Math.round(toInternal(a) * scale / toInternal(b)));
            return a / b;
          });
          if (res === null) {
            pushError('array_length_mismatch', { op: '/' });
            resultValue = 0;
          } else {
            resultValue = sanitizeNumericResult(res, { op: '/' });
          }
          break;
        }
        case '^': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => Math.pow(a, b));
          if (res === null) {
            pushError('array_length_mismatch', { op: '^' });
            resultValue = 0;
          } else {
            resultValue = sanitizeNumericResult(res, { op: '^' });
          }
          break;
        }
        case 'and': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => (a !== 0 && b !== 0 ? 1 : 0));
          resultValue = res === null ? 0 : res;
          if (res === null) pushError('array_length_mismatch', { op: 'and' });
          break;
        }
        case 'or': {
          const res = broadcastNumericValues(entryA.value, entryB.value, (a, b) => (a !== 0 || b !== 0 ? 1 : 0));
          resultValue = res === null ? 0 : res;
          if (res === null) pushError('array_length_mismatch', { op: 'or' });
          break;
        }
        case '&': {
          const str = valueToString(entryA.value) + valueToString(entryB.value);
          resultValue = str;
          break;
        }
        default:
          pushError('unknown_operator', { op: tk.value });
          resultValue = 0;
      }
      const hadError = entryA.hadError || entryB.hadError || errors.length > beforeErrors;
      pushEntry(resultValue, hadError);
    } else if (tk.type === 'func') {
      const argc = tk.argCount ?? 0;
      if (stack.length < argc) { pushError('stack_underflow', { func: tk.name }); return { value: 0, errors }; }
      const argEntries: StackEntry[] = [];
      for (let i = 0; i < argc; i++) {
        const entry = popEntry();
        if (!entry) { pushError('stack_underflow', { func: tk.name }); return { value: 0, errors }; }
        argEntries.unshift(entry);
      }
      const args = argEntries.map(e => e.value);
      let r: StackValue = 0;
      logicMetrics.functions[tk.name] = (logicMetrics.functions[tk.name] || 0) + 1;
      const beforeErrors = errors.length;
      switch (tk.name) {
        case 'min':
          r = Math.min(...flattenNumericArgs(args));
          break;
        case 'max':
          r = Math.max(...flattenNumericArgs(args));
          break;
        case 'eq':
          r = toNumber(args[0] ?? 0) === toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'neq':
          r = toNumber(args[0] ?? 0) !== toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'gt':
          r = toNumber(args[0] ?? 0) > toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'gte':
          r = toNumber(args[0] ?? 0) >= toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'lt':
          r = toNumber(args[0] ?? 0) < toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'lte':
          r = toNumber(args[0] ?? 0) <= toNumber(args[1] ?? 0) ? 1 : 0;
          break;
        case 'round': {
          const decimals = Math.max(0, Math.min(12, Math.floor(toNumber(args[1] ?? 0))));
          const factor = Math.pow(10, decimals);
          r = mapNumericValue(args[0] ?? 0, value => {
            const rounded = Math.round(value * factor) / factor;
            return scale ? fromInternal(toInternal(rounded)) : rounded;
          });
          break; }
        case 'abs':
          r = mapNumericValue(args[0] ?? 0, Math.abs);
          break;
        case 'ceil':
          r = mapNumericValue(args[0] ?? 0, Math.ceil);
          break;
        case 'floor':
          r = mapNumericValue(args[0] ?? 0, Math.floor);
          break;
        case 'int':
          r = mapNumericValue(args[0] ?? 0, Math.floor);
          break;
        case 'if': {
          const cond = toNumber(args[0] ?? 0);
          const aVal = args[1] ?? 0;
          const bVal = args[2] ?? 0;
          if (argc < 2) { pushError('invalid_result', { func: 'if', reason: 'missing_args' }); r = 0; }
          else r = cond !== 0 ? aVal : bVal;
          break; }
        case 'and':
          r = flattenNumericArgs(args).every(v => v !== 0) ? 1 : 0;
          break;
        case 'or':
          r = flattenNumericArgs(args).some(v => v !== 0) ? 1 : 0;
          break;
        case 'not':
          r = toNumber(args[0] ?? 0) === 0 ? 1 : 0;
          break;
        case 'present':
          r = toNumber(args[0] ?? 0) !== 0 ? 1 : 0;
          break;
        case 'empty':
          r = toNumber(args[0] ?? 0) === 0 ? 1 : 0;
          break;
        case 'sum':
          r = flattenNumericArgs(args).reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
          break;
        case 'avg': {
          const flat = flattenNumericArgs(args).filter(v => Number.isFinite(v));
          r = flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : 0;
          break; }
        case 'ifnull':
          r = toNumber(args[0] ?? 0) !== 0 ? args[0] ?? 0 : args[1] ?? 0;
          break;
        case 'coalesce': {
          let found: StackValue = 0;
          let hasFound = false;
          for (const v of args) {
            if (toNumber(v ?? 0) !== 0) { found = v ?? 0; hasFound = true; break; }
          }
          r = hasFound ? found : 0;
          break; }
        case 'safediv': {
          const aVal = toNumber(args[0] ?? 0);
          const bVal = toNumber(args[1] ?? 0);
          const fb = toNumber(args[2] ?? 0);
          r = bVal === 0 ? fb : aVal / bVal;
          break; }
        case 'percentage': {
          const part = toNumber(args[0] ?? 0);
          const total = toNumber(args[1] ?? 0);
          r = total === 0 ? 0 : (part / total) * 100;
          break; }
        case 'ratio': {
          const aVal = toNumber(args[0] ?? 0);
          const bVal = toNumber(args[1] ?? 0);
          r = bVal === 0 ? 0 : aVal / bVal;
          break; }
        case 'radians':
        case 'rad':
          r = mapNumericValue(args[0] ?? 0, angle => angle * (Math.PI / 180));
          break;
        case 'sqrt':
        case 'racine':
          r = mapNumericValue(args[0] ?? 0, value => {
            if (value < 0) {
              pushError('invalid_result', { func: tk.name, value });
              return 0;
            }
            return Math.sqrt(value);
          });
          break;
        case 'cos':
        case 'cosinus':
          r = mapNumericValue(args[0] ?? 0, Math.cos);
          break;
        case 'atan':
        case 'arctan':
          r = mapNumericValue(args[0] ?? 0, Math.atan);
          break;
        case 'pi': {
          const factor = argc >= 1 ? toNumber(args[0]) : 1;
          r = Math.PI * factor;
          break; }
        case 'row': {
          if (!args.length) {
            pushError('invalid_result', { func: 'row', reason: 'missing_args' });
            r = 0;
            break;
          }
          const target = args[0];
          if (Array.isArray(target)) r = target;
          else r = mapNumericValue(target, value => value);
          break; }
        case 'indirect': {
          const source = valueToString(args[0] ?? '');
          const match = source.match(/^(-?\d+)\s*:\s*(-?\d+)$/);
          if (match) {
            const start = parseInt(match[1], 10);
            const end = parseInt(match[2], 10);
            const step = start <= end ? 1 : -1;
            const length = Math.min(1000, Math.abs(end - start) + 1);
            const seq: number[] = [];
            for (let i = 0; i < length; i++) seq.push(start + i * step);
            if (length < Math.abs(end - start) + 1) {
              pushError('range_truncated', { func: 'indirect', start, end });
            }
            r = seq;
          } else {
            r = stringToNumber(source);
          }
          break; }
        case 'sumproduct':
        case 'sumprod': {
          if (!args.length) { r = 0; break; }
          const arrays = args.map(valueToArray);
          const maxLen = Math.max(...arrays.map(arr => arr.length));
          if (maxLen === 0) { r = 0; break; }
          const variableArrays = arrays.filter(arr => arr.length > 1);
          if (variableArrays.some(arr => arr.length !== maxLen)) {
            pushError('array_length_mismatch', { func: tk.name });
            r = 0;
            break;
          }
          if (arrays.length === 1) {
            r = arrays[0].reduce((acc, val) => acc + val, 0);
            break;
          }
          let total = 0;
          for (let i = 0; i < maxLen; i++) {
            let product = 1;
            for (const arr of arrays) {
              const val = arr.length === 1 ? arr[0] : arr[i] ?? 0;
              product *= val;
            }
            total += product;
          }
          r = total;
          break; }
        case 'sierreur':
        case 'iferror': {
          const primary = argEntries[0];
          const fallback = argEntries[1];
          const fallbackValue = fallback?.value ?? 0;
          const primaryValue = primary?.value;
          const usedFallback = !primary || primary.hadError || valueHasNumericError(primaryValue ?? 0 as StackValue);
          r = usedFallback ? fallbackValue ?? 0 : primaryValue ?? 0;
          break; }

        // Ã°Å¸â€â€ž ARRONDIS
        case 'arrondi':
        case 'round': {
          const val = toNumber(args[0] ?? 0);
          const decimals = Math.floor(toNumber(args[1] ?? 0));
          const factor = Math.pow(10, decimals);
          r = Math.round(val * factor) / factor;
          break; }
        case 'arrondi.sup':
        case 'roundup': {
          const val = toNumber(args[0] ?? 0);
          const decimals = Math.floor(toNumber(args[1] ?? 0));
          const factor = Math.pow(10, decimals);
          r = Math.ceil(val * factor) / factor;
          break; }
        case 'arrondi.inf':
        case 'rounddown': {
          const val = toNumber(args[0] ?? 0);
          const decimals = Math.floor(toNumber(args[1] ?? 0));
          const factor = Math.pow(10, decimals);
          r = Math.floor(val * factor) / factor;
          break; }
        case 'ent':
        case 'int':
          r = mapNumericValue(args[0] ?? 0, Math.floor);
          break;
        case 'tronque':
        case 'trunc': {
          const val = toNumber(args[0] ?? 0);
          const decimals = Math.floor(toNumber(args[1] ?? 0));
          const factor = Math.pow(10, decimals);
          r = Math.trunc(val * factor) / factor;
          break; }
        case 'plafond':
        case 'ceiling': {
          const val = toNumber(args[0] ?? 0);
          const multiple = toNumber(args[1] ?? 1);
          r = multiple === 0 ? val : Math.ceil(val / multiple) * multiple;
          break; }
        case 'plancher':
        case 'floor': {
          const val = toNumber(args[0] ?? 0);
          const multiple = toNumber(args[1] ?? 1);
          r = multiple === 0 ? val : Math.floor(val / multiple) * multiple;
          break; }

        // Ã°Å¸â€œÂ TRIGONOMÃƒâ€°TRIE (complÃƒÂ©ments)
        case 'degres':
        case 'degrees':
          r = mapNumericValue(args[0] ?? 0, rad => rad * (180 / Math.PI));
          break;
        case 'sin':
        case 'sinus':
          r = mapNumericValue(args[0] ?? 0, Math.sin);
          break;
        case 'tan':
        case 'tangente':
          r = mapNumericValue(args[0] ?? 0, Math.tan);
          break;
        case 'asin':
        case 'arcsin':
          r = mapNumericValue(args[0] ?? 0, Math.asin);
          break;
        case 'acos':
        case 'arccos':
          r = mapNumericValue(args[0] ?? 0, Math.acos);
          break;
        case 'atan2': {
          const x = toNumber(args[0] ?? 0);
          const y = toNumber(args[1] ?? 0);
          r = Math.atan2(y, x);
          break; }

        // Ã°Å¸â€Â¢ MATHÃƒâ€°MATIQUES (complÃƒÂ©ments)
        case 'puissance':
        case 'power': {
          const base = toNumber(args[0] ?? 0);
          const exp = toNumber(args[1] ?? 1);
          r = Math.pow(base, exp);
          break; }
        case 'exp':
          r = mapNumericValue(args[0] ?? 0, Math.exp);
          break;
        case 'ln':
          r = mapNumericValue(args[0] ?? 0, val => val <= 0 ? 0 : Math.log(val));
          break;
        case 'log': {
          const val = toNumber(args[0] ?? 0);
          const base = toNumber(args[1] ?? 10);
          r = val <= 0 ? 0 : Math.log(val) / Math.log(base);
          break; }
        case 'log10':
          r = mapNumericValue(args[0] ?? 0, val => val <= 0 ? 0 : Math.log10(val));
          break;
        case 'abs':
          r = mapNumericValue(args[0] ?? 0, Math.abs);
          break;
        case 'signe':
        case 'sign':
          r = mapNumericValue(args[0] ?? 0, Math.sign);
          break;
        case 'mod': {
          const val = toNumber(args[0] ?? 0);
          const divisor = toNumber(args[1] ?? 1);
          r = divisor === 0 ? 0 : val % divisor;
          break; }

        // Ã°Å¸â€œÅ  STATISTIQUES (complÃƒÂ©ments)
        case 'min': {
          const vals = args.flatMap(a => Array.isArray(a) ? a : [toNumber(a ?? 0)]);
          r = vals.length ? Math.min(...vals) : 0;
          break; }
        case 'max': {
          const vals = args.flatMap(a => Array.isArray(a) ? a : [toNumber(a ?? 0)]);
          r = vals.length ? Math.max(...vals) : 0;
          break; }
        case 'moyenne':
        case 'average': {
          const vals = args.flatMap(a => Array.isArray(a) ? a : [toNumber(a ?? 0)]);
          r = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
          break; }
        case 'somme':
        case 'sum': {
          const vals = args.flatMap(a => Array.isArray(a) ? a : [toNumber(a ?? 0)]);
          r = vals.reduce((s, v) => s + v, 0);
          break; }
        case 'sommeprod': {
          // Alias franÃƒÂ§ais pour sumproduct
          if (!args.length) { r = 0; break; }
          const arraysF = args.map(valueToArray);
          const maxLenF = Math.max(...arraysF.map(arr => arr.length));
          if (maxLenF === 0) { r = 0; break; }
          if (arraysF.length === 1) {
            r = arraysF[0].reduce((acc, val) => acc + val, 0);
            break;
          }
          let totalF = 0;
          for (let i = 0; i < maxLenF; i++) {
            let product = 1;
            for (const arr of arraysF) {
              const val = arr.length === 1 ? arr[0] : arr[i] ?? 0;
              product *= val;
            }
            totalF += product;
          }
          r = totalF;
          break; }
        case 'nb':
        case 'count': {
          const vals = args.flatMap(a => Array.isArray(a) ? a : [a]);
          r = vals.filter(v => typeof v === 'number' && !isNaN(v)).length;
          break; }

        // Ã°Å¸â€â‚¬ LOGIQUE & CONDITIONS
        case 'si':
        case 'if': {
          const cond = toNumber(args[0] ?? 0) !== 0;
          r = cond ? (args[1] ?? 0) : (args[2] ?? 0);
          break; }
        case 'et':
        case 'and': {
          r = args.every(a => toNumber(a ?? 0) !== 0) ? 1 : 0;
          break; }
        case 'ou':
        case 'or': {
          r = args.some(a => toNumber(a ?? 0) !== 0) ? 1 : 0;
          break; }
        case 'non':
        case 'not':
          r = toNumber(args[0] ?? 0) === 0 ? 1 : 0;
          break;

        default:
          pushError('unknown_function', { func: tk.name });
          r = 0;
      }
      if (typeof r === 'number' || Array.isArray(r)) {
        r = sanitizeNumericResult(r, { func: tk.name });
      }
      const funcIntroducedErrors = errors.length > beforeErrors;
      let hadError: boolean;
      if (tk.name === 'sierreur' || tk.name === 'iferror') {
        const primary = argEntries[0];
        const fallback = argEntries[1];
        const usedFallback = !primary || primary.hadError || valueHasNumericError(primary?.value ?? 0 as StackValue);
        const sourceEntry = usedFallback ? fallback : primary;
        hadError = funcIntroducedErrors || Boolean(sourceEntry?.hadError);
      } else {
        hadError = funcIntroducedErrors || argEntries.some(e => e.hadError);
      }
      pushEntry(r, hadError);
    }
  }
  const out = popEntry();
  if (stack.length || !out) {
    pushError('invalid_result');
    const dt = Date.now() - t0;
    logicMetrics.evaluations++;
    logicMetrics.totalEvalMs += dt;
    return { value: 0, errors };
  }
  let finalValue = out.value;
  if (typeof finalValue === 'string') {
    finalValue = stringToNumber(finalValue);
  } else if (Array.isArray(finalValue)) {
    finalValue = finalValue[0] ?? 0;
  }
  if (typeof finalValue !== 'number' || !Number.isFinite(finalValue)) {
    pushError('invalid_result');
    const dt = Date.now() - t0;
    logicMetrics.evaluations++;
    logicMetrics.totalEvalMs += dt;
    return { value: 0, errors };
  }
  const dt = Date.now() - t0;
  logicMetrics.evaluations++;
  logicMetrics.totalEvalMs += dt;
  return { value: finalValue, errors };
}

// Helper haut-niveau: compile & ÃƒÂ©value en une ÃƒÂ©tape (utilisÃƒÂ© potentiellement ailleurs)
export async function evaluateExpression(expr: string, roleToNodeId: Record<string,string>, opts: EvaluateOptions): Promise<{ value: number; errors: string[] }> {
  try {
    const tokens = parseExpression(expr, roleToNodeId, opts);
    return evaluateTokens(tokens, opts);
  } catch (e) {
    logicMetrics.parseErrors++;
    throw e;
  }
}
