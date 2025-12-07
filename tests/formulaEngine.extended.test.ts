import { describe, it, expect } from 'vitest';
import { parseExpression, evaluateTokens, evaluateExpression, getRpnCacheStats } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/formulaEngine';

// Utilitaire de résolution: map direct nodeId -> value
function makeResolver(values: Record<string, number | null>) {
  return (id: string) => values[id] ?? null;
}

const roleMap = {
  a: 'nodeA',
  b: 'nodeB',
  c: 'nodeC',
  d: 'nodeD'
};

describe('FormulaEngine extended', () => {
  it('gère opérateur ^ associativité droite', async () => {
    const expr = '{{a}} ^ {{b}} ^ {{c}}'; // a^(b^c)
    const tokens = parseExpression(expr, roleMap);
    const { value } = await evaluateTokens(tokens, { resolveVariable: makeResolver({ nodeA: 2, nodeB: 3, nodeC: 2 }) });
    // 2^(3^2) = 2^9 = 512
    expect(value).toBe(512);
  });

  it('gère fonctions min/max', async () => {
    const expr = 'max( {{a}}, 10, min( {{b}}, 3) )';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 2, nodeB: 5 }) });
    // min(b=5,3)=3 => max(2,10,3)=10
    expect(value).toBe(10);
  });

  it('gère fonction round sans décimales', async () => {
    const expr = 'round( {{a}} / {{b}} )';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 10, nodeB: 3 }) });
    expect(value).toBe(3);
  });

  it('gère fonction round avec décimales', async () => {
    const expr = 'round( {{a}} / {{b}}, 2 )';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 10, nodeB: 3 }) });
    expect(value).toBeCloseTo(3.33, 2);
  });

  it('strictVariables retourne erreur unknown_variable', async () => {
    const expr = '{{a}} + {{b}}';
    const result = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 1, nodeB: null }), strictVariables: true });
    expect(result.errors).toContain('unknown_variable');
    expect(result.value).toBe(1); // b remplacé par 0
  });

  it('cache RPN évite reparse (parseCount stable)', async () => {
    const expr = 'round( ({{a}}+{{b}}) * max({{c}},2) , 1)';
    const before = getRpnCacheStats().parseCount;
    for (let i=0;i<5;i++) {
      await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA:1,nodeB:2,nodeC:3 }) });
    }
    const after = getRpnCacheStats().parseCount;
    expect(after - before).toBe(1); // une seule compilation
  });

  it('precisionScale améliore addition flottante (0.1+0.2)', async () => {
    const expr = '{{a}} + {{b}}';
    const noScale = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA:0.1 as any, nodeB:0.2 as any }) });
    // Sans scale, JS donne 0.30000000000000004 parfois (nous acceptons proche de 0.3)
    expect(noScale.value).toBeCloseTo(0.3, 10);
    const scaled = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA:0.1 as any, nodeB:0.2 as any }), precisionScale: 10000 });
    expect(scaled.value).toBe(0.3);
  });

  it('expression trop longue rejetée', () => {
    const long = '1+'.repeat(600) + '1';
    expect(() => parseExpression(long, roleMap, { maxExpressionLength: 300 })).toThrow(/trop longue/);
  });

  it('caractère illégal rejeté', () => {
    expect(() => parseExpression('1 + €', roleMap, {})).toThrow(/non autorisés/i);
  });

  it('fonction inconnue signale erreur', async () => {
    const bad = 'foo(1,2)';
    // Pas d'options spécifiques nécessaires ici
    const tokens = parseExpression(bad, roleMap); // roleMap non utilisé
    const res = await evaluateTokens(tokens, { resolveVariable: () => 0 });
    expect(res.errors).toContain('unknown_function');
  });

  it('gère abs / ceil / floor', async () => {
    const expr = 'ceil( {{a}} / 3 ) + floor( {{b}} / 2 ) + abs( {{c}} )';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 5, nodeB: 5, nodeC: -2 }) });
    // ceil(5/3)=2, floor(5/2)=2, abs(-2)=2 => total 6
    expect(value).toBe(6);
  });

  it('gère if(condition, a, b)', async () => {
    const expr1 = 'if( {{a}}, 10, 20 )';
    const expr2 = 'if( {{b}}, 10, 20 )';
    const r1 = await evaluateExpression(expr1, roleMap, { resolveVariable: makeResolver({ nodeA: 1, nodeB: 0 }) });
    const r2 = await evaluateExpression(expr2, roleMap, { resolveVariable: makeResolver({ nodeA: 1, nodeB: 0 }) });
    expect(r1.value).toBe(10);
    expect(r2.value).toBe(20);
  });

  it('gère comparateurs eq/neq/gt/gte/lt/lte', async () => {
    const baseResolver = makeResolver({ nodeA: 5, nodeB: 5, nodeC: 7, nodeD: 3 });
    const eqExpr = 'eq({{a}}, {{b}})';
    const neqExpr = 'neq({{a}}, {{c}})';
    const gtExpr = 'gt({{c}}, {{a}})';
    const gteExpr = 'gte({{a}}, {{b}})';
    const ltExpr = 'lt({{d}}, {{b}})';
    const lteExpr = 'lte({{d}}, {{d}})';
    const rEq = await evaluateExpression(eqExpr, roleMap, { resolveVariable: baseResolver });
    const rNeq = await evaluateExpression(neqExpr, roleMap, { resolveVariable: baseResolver });
    const rGt = await evaluateExpression(gtExpr, roleMap, { resolveVariable: baseResolver });
    const rGte = await evaluateExpression(gteExpr, roleMap, { resolveVariable: baseResolver });
    const rLt = await evaluateExpression(ltExpr, roleMap, { resolveVariable: baseResolver });
    const rLte = await evaluateExpression(lteExpr, roleMap, { resolveVariable: baseResolver });
    expect(rEq.value).toBe(1);
    expect(rNeq.value).toBe(1);
    expect(rGt.value).toBe(1);
    expect(rGte.value).toBe(1);
    expect(rLt.value).toBe(1);
    expect(rLte.value).toBe(1);
  });
});
