import { describe, it, expect } from 'vitest';
import { parseExpression, evaluateTokens, evaluateExpression, getRpnCacheStats } from './formulaEngine';

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

  it('expression trop longue rejetée', () => {
    const long = '1+'.repeat(600) + '1';
    expect(() => parseExpression(long, roleMap, { maxExpressionLength: 300 })).toThrow(/trop longue/);
  });

  it('caractère illégal rejeté', () => {
    expect(() => parseExpression('1 + alert("x")', roleMap, {})).toThrow(/non autorisés/i);
  });

  it('fonction inconnue signale erreur', async () => {
    const bad = 'foo(1,2)';
    const tokens = parseExpression(bad, roleMap, {} as any); // roleMap non utilisé
    const res = await evaluateTokens(tokens, { resolveVariable: () => 0 });
    expect(res.errors).toContain('unknown_function');
  });

  it('gère fonctions trigonométriques et racine/pi', async () => {
    const expr = 'PI() * cos(radians(60)) + RACINE(16) + atan(1)';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({}) });
    expect(value).toBeCloseTo(Math.PI * 0.5 + 4 + Math.atan(1), 10);
  });

  it('gère sierreur / iferror', async () => {
    const expr = 'sierreur( {{a}} / {{b}}, 42 ) + sierreur( {{c}}, 7 )';
    const { value } = await evaluateExpression(expr, roleMap, { resolveVariable: makeResolver({ nodeA: 10, nodeB: 0, nodeC: 5 }) });
    expect(value).toBeCloseTo(42 + 5, 5);
  });
});
