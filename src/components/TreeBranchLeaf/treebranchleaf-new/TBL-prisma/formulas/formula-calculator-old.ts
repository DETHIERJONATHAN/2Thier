import { PrismaClient } from '@prisma/client';
import { FormulaDefinition, FormulaEvaluationResult, FormulaCalculationStep, FormulaToken } from './formula-types';
import { TBLContext } from '../shared/types';
import { ReferenceResolver } from '../shared/reference-resolver';

/**
 * Calculator pour les formules avec calculs step-by-step détaillés
 */
export class FormulaCalculator {
  private resolver: ReferenceResolver;

  constructor(
    private prisma: PrismaClient,
    private context: TBLContext
  ) {
    this.resolver = new ReferenceResolver(prisma, context);
  }

  /**
   * Calcule une formule complètement avec steps détaillés
   */
  async calculateFormula(formulaId: string): Promise<FormulaEvaluationResult> {
    try {
      console.log(`[FORMULA-CALC] 📐 Calcul formule: ${formulaId}`);

      // Récupérer la formule
      const formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });

      if (!formula) {
        return this.createErrorResult(`Formule ${formulaId} non trouvée`);
      }

      const formulaDef: FormulaDefinition = {
        id: formula.id,
        name: formula.name || `Formule ${formulaId}`,
        description: formula.description || undefined,
        tokens: formula.tokens as FormulaToken[] || []
      };

      return await this.evaluateFormula(formulaDef);

    } catch (error) {
      console.error(`[FORMULA-CALC] ❌ Erreur calcul formule ${formulaId}:`, error);
      return this.createErrorResult(`Erreur calcul formule: ${error}`);
    }
  }

  /**
   * Évalue une formule step-by-step
   */
  private async evaluateFormula(formula: FormulaDefinition): Promise<FormulaEvaluationResult> {
    const steps: FormulaCalculationStep[] = [];
    const referencesResolved: Array<{
      ref: string;
      label: string;
      value: unknown;
      resolved: boolean;
    }> = [];

    // 1. Résoudre toutes les références
    console.log(`[FORMULA-CALC] 🔍 Résolution des références...`);
    for (const token of formula.tokens) {
      if (token.type === 'reference' && token.ref) {
        const resolved = await this.resolver.resolveReference(token.ref);
        referencesResolved.push({
          ref: token.ref,
          label: resolved.label,
          value: resolved.value,
          resolved: resolved.resolved
        });
      }
    }

    // 2. Construire l'expression pas à pas
    let currentValue: number | undefined = undefined;
    let expression = '';
    let stepNumber = 1;
    let pendingOperator: string | undefined = undefined;

    for (let i = 0; i < formula.tokens.length; i++) {
      const token = formula.tokens[i];

      if (token.type === 'reference') {
        const resolved = referencesResolved.find(r => r.ref === token.ref);
        const value = resolved?.value;
        const label = resolved?.label || token.ref || 'Inconnue';
        const numValue = this.toNumber(value);

        expression += `${label}(${value !== undefined ? value : '∅'})`;

        // Calculer si on a un opérateur en attente
        if (pendingOperator && currentValue !== undefined && numValue !== undefined) {
          const result = this.applyOperation(currentValue, pendingOperator, numValue);
          
          steps.push({
            stepNumber: stepNumber++,
            operation: pendingOperator,
            leftOperand: {
              label: 'Résultat précédent',
              value: currentValue,
              raw: currentValue
            },
            operator: pendingOperator,
            rightOperand: {
              label,
              value: numValue,
              raw: value
            },
            result,
            expression: `${currentValue} ${pendingOperator} ${numValue} = ${result}`
          });

          currentValue = result;
          pendingOperator = undefined;
        } else if (currentValue === undefined && numValue !== undefined) {
          // Premier nombre
          currentValue = numValue;
          steps.push({
            stepNumber: stepNumber++,
            operation: 'init',
            leftOperand: {
              label,
              value: numValue,
              raw: value
            },
            result: numValue,
            expression: `Initialisation: ${label}(${numValue})`
          });
        }

      } else if (token.type === 'operator') {
        expression += ` (${token.value}) `;
        pendingOperator = token.value?.toString();

      } else if (token.type === 'literal') {
        const numValue = this.toNumber(token.value);
        expression += `${token.value}`;

        if (pendingOperator && currentValue !== undefined && numValue !== undefined) {
          const result = this.applyOperation(currentValue, pendingOperator, numValue);
          
          steps.push({
            stepNumber: stepNumber++,
            operation: pendingOperator,
            leftOperand: {
              label: 'Résultat précédent',
              value: currentValue,
              raw: currentValue
            },
            operator: pendingOperator,
            rightOperand: {
              label: 'Valeur littérale',
              value: numValue,
              raw: token.value
            },
            result,
            expression: `${currentValue} ${pendingOperator} ${numValue} = ${result}`
          });

          currentValue = result;
          pendingOperator = undefined;
        } else if (currentValue === undefined && numValue !== undefined) {
          currentValue = numValue;
        }
      }
    }

    // 3. Construire le résultat final
    const finalValue = currentValue ?? 0;
    const fullExpression = `${expression} (=) ${formula.name} (${finalValue})`;

    return {
      detail: {
        formulaId: formula.id,
        formulaName: formula.name,
        tokens: formula.tokens,
        stepsCount: steps.length
      },
      result: fullExpression,
      value: finalValue,
      steps,
      finalValue,
      hasNumericResult: currentValue !== undefined,
      referencesResolved,
      hasError: false
    };
  }

  /**
   * Applique une opération mathématique
   */
  private applyOperation(left: number, operator: string, right: number): number {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right !== 0 ? left / right : 0;
      case '%': return right !== 0 ? left % right : 0;
      case '^': 
      case '**': return Math.pow(left, right);
      default: return left;
    }
  }

  /**
   * Convertit une valeur en nombre
   */
  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Crée un résultat d'erreur
   */
  private createErrorResult(message: string): FormulaEvaluationResult {
    return {
      detail: { error: message },
      result: `Erreur: ${message}`,
      value: undefined,
      steps: [],
      finalValue: 0,
      hasNumericResult: false,
      referencesResolved: [],
      hasError: true,
      errorMessage: message
    };
  }

  /**
   * Calcule une formule et retourne juste l'expression simplifiée
   */
  async calculateFormulaSimple(formulaId: string): Promise<string> {
    const result = await this.calculateFormula(formulaId);
    return result.result;
  }
}