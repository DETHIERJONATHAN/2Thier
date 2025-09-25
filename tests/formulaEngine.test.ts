import { describe, it, expect } from 'vitest';
import { evaluateTokens, parseExpression, FormulaToken } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/formulaEngine';

// Utilitaire de création tokens simples sans passer par parseExpression
function num(n:number): FormulaToken { return { type:'number', value:n }; }
function op(o:string): FormulaToken { return { type:'operator', value:o }; }
function par(p:'(' | ')'): FormulaToken { return { type:'paren', value:p }; }
function variable(name:string): FormulaToken { return { type:'variable', name }; }

async function evalDirect(tokens: FormulaToken[], vars: Record<string, number | null> = {}) {
  return evaluateTokens(tokens, { resolveVariable: (id) => vars[id] ?? 0 });
}

describe('formulaEngine - opérations de base', () => {
  it('addition et multiplication avec précédence', async () => {
    // 2 + 3 * 4 = 14
    const { value, errors } = await evalDirect([
      num(2), op('+'), num(3), op('*'), num(4)
    ]);
    expect(value).toBe(14);
    expect(errors).toEqual([]);
  });

  it('parenthèses modifient la précédence', async () => {
    // (2 + 3) * 4 = 20
    const { value, errors } = await evalDirect([
      par('('), num(2), op('+'), num(3), par(')'), op('*'), num(4)
    ]);
    expect(value).toBe(20);
    expect(errors).toEqual([]);
  });

  it('soustraction et division', async () => {
    // (10 - 4) / 3 = 2
    const { value } = await evalDirect([
      par('('), num(10), op('-'), num(4), par(')'), op('/'), num(3)
    ]);
    expect(value).toBeCloseTo(2, 6);
  });
});

describe('formulaEngine - variables', () => {
  it('résout des variables simples', async () => {
    // a * 5 où a=3 => 15
    const { value, errors } = await evalDirect([
      variable('A'), op('*'), num(5)
    ], { A: 3 });
    expect(value).toBe(15);
    expect(errors).toEqual([]);
  });

  it('variables manquantes => 0 mais pas d erreur fatale', async () => {
    const { value, errors } = await evalDirect([
      variable('X'), op('+'), num(2)
    ], {});
    expect(value).toBe(2);
    expect(errors).toEqual([]);
  });
});

describe('formulaEngine - division par zéro', () => {
  it('retourne 0 et flag division_by_zero', async () => {
    const { value, errors } = await evaluateTokens([
      num(10), op('/'), num(0)
    ], { resolveVariable: () => 0, divisionByZeroValue: 0 });
    expect(value).toBe(0);
    expect(errors).toContain('division_by_zero');
  });
});

describe('formulaEngine - expression parsing', () => {
  it('parseExpression + evaluateTokens sur expression avec rôles', async () => {
    const expr = '( {{ A }} + 2 ) * {{ B }}';
    const tokens = parseExpression(expr, { A: 'NODE_A', B: 'NODE_B' });
  const valueMap: Record<string, number> = { NODE_A: 3, NODE_B: 4 };
  const { value, errors } = await evaluateTokens(tokens, { resolveVariable: (id) => valueMap[id] });
    expect(value).toBe(20); // (3+2)*4
    expect(errors).toEqual([]);
  });
});

describe('formulaEngine - erreurs structure', () => {
  it('parenthèses déséquilibrées -> throw au parse', () => {
  expect(() => parseExpression('( 2 + 3', {} as Record<string,string>)).toThrow();
  });

  it('stack underflow (expression invalide)', async () => {
    const { value, errors } = await evalDirect([
      num(2), op('+') // manque opérande
    ]);
    expect(value).toBe(0);
    expect(errors).toContain('stack_underflow');
  });
});


describe('formulaEngine - grands nombres et précision', () => {
  it('multiplie grands nombres', async () => {
    const { value, errors } = await evalDirect([
      num(1000000), op('*'), num(3000)
    ]);
    expect(value).toBe(3000000000);
    expect(errors).toEqual([]);
  });
});
