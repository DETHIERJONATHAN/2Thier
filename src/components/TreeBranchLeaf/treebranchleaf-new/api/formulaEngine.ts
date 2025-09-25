// Formula Engine avec précédence, parenthèses et variables nodeId
// Fournit parsing d'expressions déjà "templatisées" sous forme de tokens ou string.
// Conçu pour remplacer l'évaluation gauche->droite simpliste.

export type FormulaToken =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string } // name = nodeId
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'func'; name: string; argCount?: number }
  | { type: 'comma' };

export interface EvaluateOptions {
  resolveVariable: (nodeId: string) => Promise<number | null> | number | null;
  onError?: (code: string, context?: Record<string, unknown>) => void;
  divisionByZeroValue?: number; // défaut 0
  strictVariables?: boolean; // erreur unknown_variable si variable non résolue
  enableCache?: boolean; // activer cache RPN (par défaut true)
  maxExpressionLength?: number; // sécurité (défaut 500)
  allowedCharsRegex?: RegExp; // whitelist (défaut fourni)
  precisionScale?: number; // si défini (>1), applique un scaling entier pour + - * / et round (sauf pow) pour réduire erreurs FP
}

// Ajout: opérateurs comparaison gérés en phase de parsing (transformés en fonctions booléennes)
// Ils ne sont PAS ajoutés à OP_PRECEDENCE pour éviter de modifier la logique arithmétique: au lieu de cela,
// on réécrit 'a > b' en gt(a,b) directement sous forme de tokens fonction.
const OP_PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
const OP_ASSOC: Record<string, 'L' | 'R'> = { '+': 'L', '-': 'L', '*': 'L', '/': 'L', '^': 'R' };

// Cache RPN basé sur empreinte des tokens
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

// Validation sécurité
function validateExpression(expr: string, opts?: EvaluateOptions) {
  const maxLen = opts?.maxExpressionLength ?? 500;
  if (expr.length > maxLen) throw new Error('Expression trop longue');
  const allowed = opts?.allowedCharsRegex || /^[0-9A-Za-z_\s+*\-/^(),.{}:]+$/;
  if (!allowed.test(expr)) throw new Error('Caractères non autorisés dans l\'expression');
}

export function parseExpression(expr: string, roleToNodeId: Record<string,string>, opts?: EvaluateOptions): FormulaToken[] {
  validateExpression(expr, opts);
  // Remplacer {{role}} par un marqueur unique pour scanning
  const working = expr.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, v) => `__VAR__${v.trim()}__`);
  const tokens: FormulaToken[] = [];
  let i = 0;
  let parenBalance = 0;
  // Stack des fonctions en cours pour compter les arguments (liaison par parenthèse)
  const funcParenStack: Array<{ name: string; argCount: number }> = [];
  let lastToken: FormulaToken | null = null;
  while (i < working.length) {
    const ch = working[i];
    if (/\s/.test(ch)) { i++; continue; }
    // Variable marquée
    if (working.startsWith('__VAR__', i)) {
      const end = working.indexOf('__', i + 7);
      if (end === -1) throw new Error('Marqueur variable mal formé');
      const role = working.substring(i + 7, end);
      const nodeId = roleToNodeId[role];
      if (!nodeId) throw new Error('Variable inconnue dans expression: ' + role);
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
    // Identifiant (potentiellement fonction)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < working.length && /[A-Za-z0-9_]/.test(working[j])) j++;
      const ident = working.slice(i, j);
      // Fonction si prochaine non-espace est (
      let k = j; while (k < working.length && /\s/.test(working[k])) k++;
      if (working[k] === '(') {
        tokens.push({ type: 'func', name: ident.toLowerCase() });
        // La parenthèse sera traitée dans cycle suivant
        i = j; lastToken = tokens[tokens.length - 1];
        continue;
      } else {
        // Identifiant seul non supporté (on pourrait l'étendre plus tard)
        throw new Error('Identifiant inattendu: ' + ident);
      }
    }
    // Parenthèses
    if (ch === '(') {
      tokens.push({ type: 'paren', value: '(' });
      // Lier à une fonction précédente (si lastToken func sans paren encore ouverte)
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
      if (parenBalance < 0) throw new Error('Parenthèses déséquilibrées');
      // Si on ferme une fonction: incrémenter argCount si la dernière chose n'était pas '(' (i.e. au moins une expr)
      if (funcParenStack.length) {
        // On décidera dans toRPN lequel associer
      }
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Virgule
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      // Incrémenter compteur arg de la fonction en haut de pile
      if (funcParenStack.length) {
        const top = funcParenStack[funcParenStack.length - 1];
        top.argCount++;
      }
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Opérateurs simples arithmétiques
    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    // Opérateurs comparaison multi-caractères (>=, <=, ==, !=)
    if ((ch === '>' || ch === '<' || ch === '=' || ch === '!') && i + 1 < working.length) {
      const two = working.slice(i, i + 2);
      if (['>=', '<=', '==', '!='].includes(two)) {
        tokens.push({ type: 'operator', value: two });
        i += 2; lastToken = tokens[tokens.length - 1];
        continue;
      }
    }
    // Opérateurs comparaison simples (>, <)
    if (ch === '>' || ch === '<') {
      tokens.push({ type: 'operator', value: ch });
      i++; lastToken = tokens[tokens.length - 1];
      continue;
    }
    throw new Error('Caractère inattendu: ' + ch);
  }
  if (parenBalance !== 0) throw new Error('Parenthèses déséquilibrées');
  // Réécriture comparaison → fonctions (gt, gte, lt, lte, eq, neq)
  if (tokens.some(t => t.type === 'operator' && ['>','>=','<','<=','==','!='].includes((t as { type:'operator'; value:string }).value))) {
    const rewritten: FormulaToken[] = [];
    for (let idx = 0; idx < tokens.length; idx++) {
      const tk = tokens[idx];
      if (tk.type === 'operator' && ['>','>=','<','<=','==','!='].includes(tk.value)) {
        // On suppose forme binaire: précédent est une valeur/variable/paren fermante ou fonction déjà sortie,
        // suivant est une valeur/variable/paren ouvrante ou fonction; on va transformer A op B en func(A,B)
        // Stratégie: On remonte à l'élément immédiatement précédent dans rewritten pour extraire l'opérande gauche
        const op = tk.value;
        const left = rewritten.pop();
        const right = tokens[idx + 1];
        if (!left || !right) throw new Error('Expression comparaison mal formée');
        // Consommer le token de droite en avançant idx
        idx++;
        // Construire tokens fonction: name(left,right)
        const funcName = op === '>' ? 'gt'
          : op === '>=' ? 'gte'
          : op === '<' ? 'lt'
          : op === '<=' ? 'lte'
          : op === '==' ? 'eq'
          : op === '!=' ? 'neq' : 'eq';
        // Modèle: func( left , right ) => [func, '(', left, ',', right, ')']
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
  // pile pour compter les arguments par fonction (index aligné avec parenthèse ouvrante associée)
  const funcStack: Array<{ name: string; argCount: number }> = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const tk = tokens[idx];
    switch (tk.type) {
      case 'number':
      case 'variable':
        output.push(tk);
        // Si nous sommes dans une fonction et que le token précédent est '(' ou ',' on compte cet argument
        if (funcStack.length) {
          // incrément implicite si dernier arg démarre; on gère en sortie parenthèse
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
          // Si le token précédent sur la pile est une fonction, initialiser compteur args=1 provisoire
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
          if (!found) throw new Error('Parenthèses déséquilibrées');
          // Si juste après '(' il y avait une fonction
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
        // vider la pile jusqu'à la parenthèse ouvrante
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.type === 'paren' && top.value === '(') break;
          output.push(stack.pop() as FormulaToken);
        }
        // Incrémenter compteur args
        if (funcStack.length) funcStack[funcStack.length - 1].argCount++;
        break;
    }
  }
  while (stack.length) {
    const top = stack.pop() as FormulaToken;
    if (top.type === 'paren') throw new Error('Parenthèses déséquilibrées (fin)');
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
  const stack: number[] = [];
  const scale = (opts.precisionScale && opts.precisionScale > 1) ? Math.floor(opts.precisionScale) : null;
  const toInternal = (v: number) => scale ? Math.round(v * scale) : v;
  const fromInternal = (v: number) => scale ? v / scale : v;
  for (const tk of rpn) {
    if (tk.type === 'number') stack.push(tk.value);
    else if (tk.type === 'variable') {
      let v: number | null;
      try { v = await opts.resolveVariable(tk.name); } catch { v = null; }
      if (v == null || !Number.isFinite(v)) {
        if (opts.strictVariables) pushError('unknown_variable', { nodeId: tk.name });
        v = 0;
      }
      stack.push(v);
    } else if (tk.type === 'operator') {
      const b = stack.pop();
      const a = stack.pop();
      if (typeof a !== 'number' || typeof b !== 'number') { pushError('stack_underflow', { op: tk.value }); return { value: 0, errors }; }
      let r = 0;
      switch (tk.value) {
        case '+':
          if (scale) r = fromInternal(toInternal(a) + toInternal(b)); else r = a + b; break;
        case '-':
          if (scale) r = fromInternal(toInternal(a) - toInternal(b)); else r = a - b; break;
        case '*':
          if (scale) r = fromInternal(Math.round(toInternal(a) * toInternal(b) / scale)); else r = a * b; break;
        case '/':
          if (b === 0) { pushError('division_by_zero', { a, b }); r = opts.divisionByZeroValue ?? 0; }
          else {
            if (scale) r = fromInternal(Math.round(toInternal(a) * scale / toInternal(b)));
            else r = a / b;
          }
          break;
        case '^':
          // Utiliser Math.pow (peut générer Infinity si grand)
          r = Math.pow(a, b);
          if (!Number.isFinite(r)) { pushError('invalid_result', { op: '^', a, b }); r = 0; }
          break;
        default:
          pushError('unknown_operator', { op: tk.value });
      }
      stack.push(r);
    } else if (tk.type === 'func') {
      const argc = tk.argCount ?? 0;
      if (stack.length < argc) { pushError('stack_underflow', { func: tk.name }); return { value: 0, errors }; }
      const args: number[] = [];
      for (let i = 0; i < argc; i++) args.unshift(stack.pop() as number);
      let r = 0;
      logicMetrics.functions[tk.name] = (logicMetrics.functions[tk.name] || 0) + 1;
      switch (tk.name) {
        case 'min':
          r = Math.min(...args);
          break;
        case 'max':
          r = Math.max(...args);
          break;
        case 'eq':
          r = (args[0] ?? 0) === (args[1] ?? 0) ? 1 : 0; break;
        case 'neq':
          r = (args[0] ?? 0) !== (args[1] ?? 0) ? 1 : 0; break;
        case 'gt':
          r = (args[0] ?? 0) > (args[1] ?? 0) ? 1 : 0; break;
        case 'gte':
          r = (args[0] ?? 0) >= (args[1] ?? 0) ? 1 : 0; break;
        case 'lt':
          r = (args[0] ?? 0) < (args[1] ?? 0) ? 1 : 0; break;
        case 'lte':
          r = (args[0] ?? 0) <= (args[1] ?? 0) ? 1 : 0; break;
        case 'round': {
          const value = args[0] ?? 0;
          const decimals = Math.max(0, Math.min(12, Math.floor(args[1] ?? 0)));
          const factor = Math.pow(10, decimals);
          r = Math.round(value * factor) / factor;
          if (scale) r = fromInternal(toInternal(r));
          break; }
        case 'abs':
          r = Math.abs(args[0] ?? 0);
          break;
        case 'ceil':
          r = Math.ceil(args[0] ?? 0);
          break;
        case 'floor':
          r = Math.floor(args[0] ?? 0);
          break;
        case 'if': {
          // if(condition, a, b) -> condition != 0 ? a : b
          const cond = args[0] ?? 0;
          const aVal = args[1] ?? 0;
            const bVal = args[2] ?? 0;
          if (argc < 2) { pushError('invalid_result', { func: 'if', reason: 'missing_args' }); r = 0; }
          else r = cond !== 0 ? aVal : bVal;
          break; }
        case 'and': {
          // and(a,b,...) -> 1 si tous != 0
          r = args.every(v => (v ?? 0) !== 0) ? 1 : 0;
          break; }
        case 'or': {
          // or(a,b,...) -> 1 si au moins un != 0
          r = args.some(v => (v ?? 0) !== 0) ? 1 : 0;
          break; }
        case 'not': {
          // not(a) -> 1 si a == 0
          r = (args[0] ?? 0) === 0 ? 1 : 0;
          break; }
        case 'present': {
          // present(a) -> 1 si a != 0
          r = (args[0] ?? 0) !== 0 ? 1 : 0;
          break; }
        case 'empty': {
          // empty(a) -> 1 si a == 0
          r = (args[0] ?? 0) === 0 ? 1 : 0;
          break; }
        case 'sum': {
          // sum(a,b,...) -> somme (ignore NaN)
          r = args.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
          break; }
        case 'avg': {
          // avg(a,b,...) -> moyenne (0 si aucun argument)
          if (!args.length) r = 0; else {
            const valid = args.filter(v => Number.isFinite(v));
            r = valid.length ? valid.reduce((a,b)=>a+b,0) / valid.length : 0;
          }
          break; }
        case 'ifnull': {
          // ifnull(a,b) -> a si a != 0 sinon b
          r = (args[0] ?? 0) !== 0 ? (args[0] ?? 0) : (args[1] ?? 0);
          break; }
        case 'coalesce': {
          // coalesce(a,b,c,...) -> premier != 0
            let found = 0;
            for (const v of args) { if ((v ?? 0) !== 0) { found = v ?? 0; break; } }
            r = found;
            break; }
        case 'safediv': {
          // safediv(a,b, fallback=0)
          const aVal = args[0] ?? 0; const bVal = args[1] ?? 0; const fb = args[2] ?? 0;
          if (bVal === 0) r = fb; else r = aVal / bVal;
          break; }
        case 'percentage': {
          // percentage(part, total) -> (part / total) * 100
          const part = args[0] ?? 0; const total = args[1] ?? 0;
          r = total === 0 ? 0 : (part / total) * 100;
          break; }
        case 'ratio': {
          // ratio(a,b) -> a / b
          const aVal = args[0] ?? 0; const bVal = args[1] ?? 0;
          r = bVal === 0 ? 0 : aVal / bVal;
          break; }
        default:
          pushError('unknown_function', { func: tk.name });
          r = 0;
      }
      if (!Number.isFinite(r)) { pushError('invalid_result', { func: tk.name }); r = 0; }
      stack.push(r);
    }
  }
  const out = stack.pop();
  if (stack.length || typeof out !== 'number' || !Number.isFinite(out)) {
    pushError('invalid_result');
    const dt = Date.now() - t0;
    logicMetrics.evaluations++;
    logicMetrics.totalEvalMs += dt;
    return { value: 0, errors };
  }
  const dt = Date.now() - t0;
  logicMetrics.evaluations++;
  logicMetrics.totalEvalMs += dt;
  return { value: out, errors };
}

// Helper haut-niveau: compile & évalue en une étape (utilisé potentiellement ailleurs)
export async function evaluateExpression(expr: string, roleToNodeId: Record<string,string>, opts: EvaluateOptions): Promise<{ value: number; errors: string[] }> {
  try {
    const tokens = parseExpression(expr, roleToNodeId, opts);
    return evaluateTokens(tokens, opts);
  } catch (e) {
    logicMetrics.parseErrors++;
    throw e;
  }
}
