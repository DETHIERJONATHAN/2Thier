import { PrismaClient } from '@prisma/client';
import { TBLReference, TBLContext, TBLNode } from './types';

/**
 * Résolveur universel pour toutes les références TBL
 * Gère @value.nodeId, node-formula:id, node-condition:id, node-table:id
 */
export class ReferenceResolver {
  private formulaCalculator?: any;
  private conditionCalculator?: any;

  constructor(
    private prisma: PrismaClient,
    private context: TBLContext
  ) {}

  /**
   * Injection des calculateurs pour éviter les références circulaires
   */
  setCalculators(formulaCalculator: any, conditionCalculator: any) {
    this.formulaCalculator = formulaCalculator;
    this.conditionCalculator = conditionCalculator;
  }

  /**
   * Résout une référence vers sa valeur
   */
  async resolveReference(ref: string): Promise<{
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'value' | 'formula' | 'condition' | 'table';
  }> {
    try {
      // Référence de valeur simple (@value.nodeId)
      if (ref.startsWith('@value.')) {
        return this.resolveValueReference(ref);
      }

      // Référence de formule (node-formula:id)
      if (ref.startsWith('node-formula:')) {
        return await this.resolveFormulaReference(ref);
      }

      // Référence de condition (node-condition:id)
      if (ref.startsWith('node-condition:')) {
        return await this.resolveConditionReference(ref);
      }

      // Référence de tableau (node-table:id)
      if (ref.startsWith('node-table:')) {
        return await this.resolveTableReference(ref);
      }

      // Référence inconnue
      return {
        value: undefined,
        label: ref,
        resolved: false,
        type: 'value'
      };

    } catch (error) {
      console.error(`[REFERENCE-RESOLVER] ❌ Erreur résolution ${ref}:`, error);
      return {
        value: undefined,
        label: ref,
        resolved: false,
        type: 'value'
      };
    }
  }

  /**
   * Résout une référence de valeur (@value.nodeId)
   */
  private resolveValueReference(ref: string): {
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'value';
  } {
    const nodeId = ref.replace('@value.', '');
    const value = this.context.valueMap.get(nodeId);
    const label = this.context.labelMap.get(nodeId) || nodeId;

    return {
      value,
      label,
      resolved: value !== undefined,
      type: 'value'
    };
  }

  /**
   * Résout une référence de formule (node-formula:id)
   */
  private async resolveFormulaReference(ref: string): Promise<{
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'formula';
  }> {
    const formulaId = ref.replace('node-formula:', '');
    
    try {
      const formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId }
      });

      if (!formula) {
        console.error(`[REFERENCE-RESOLVER] ❌ Formule non trouvée: ${formulaId}`);
        return {
          value: undefined,
          label: `Erreur: Formule ${formulaId} non trouvée`,
          resolved: false,
          type: 'formula'
        };
      }

      console.log(`[REFERENCE-RESOLVER] 📐 Formule trouvée: ${formula.name}, calcul en cours...`);

      // Calculer la formule avec FormulaCalculator
      if (this.formulaCalculator) {
        try {
          const calculationResult = await this.formulaCalculator.calculateFormula(formulaId);
          console.log(`[REFERENCE-RESOLVER] ✅ Formule calculée: ${calculationResult.result}`);
          
          return {
            value: calculationResult.value,
            label: calculationResult.result || formula.name || `Formule ${formulaId}`,
            resolved: !calculationResult.hasError,
            type: 'formula'
          };
        } catch (calcError) {
          console.error(`[REFERENCE-RESOLVER] ❌ Erreur calcul formule:`, calcError);
          return {
            value: undefined,
            label: `Erreur calcul: ${formula.name}`,
            resolved: false,
            type: 'formula'
          };
        }
      }

      // Fallback - retourne juste le nom si pas de calculateur
      return {
        value: undefined,
        label: formula.name || `Formule ${formulaId}`,
        resolved: true,
        type: 'formula'
      };
    } catch (error) {
      return {
        value: undefined,
        label: `Formule ${formulaId}`,
        resolved: false,
        type: 'formula'
      };
    }
  }

  /**
   * Résout une référence de condition (node-condition:id)
   */
  private async resolveConditionReference(ref: string): Promise<{
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'condition';
  }> {
    const conditionId = ref.replace('node-condition:', '');
    
    try {
      const condition = await this.prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: conditionId }
      });

      if (!condition) {
        return {
          value: undefined,
          label: `Condition ${conditionId}`,
          resolved: false,
          type: 'condition'
        };
      }

      return {
        value: undefined, // Sera calculé par ConditionCalculator
        label: condition.name || `Condition ${conditionId}`,
        resolved: true,
        type: 'condition'
      };
    } catch (error) {
      return {
        value: undefined,
        label: `Condition ${conditionId}`,
        resolved: false,
        type: 'condition'
      };
    }
  }

  /**
   * Résout une référence de tableau (node-table:id)
   */
  private async resolveTableReference(ref: string): Promise<{
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'table';
  }> {
    const tableId = ref.replace('node-table:', '');
    
    // Pour l'instant simple, plus tard on ajoutera la logique des tableaux
    return {
      value: undefined, // Sera calculé par TableCalculator
      label: `Tableau ${tableId}`,
      resolved: true,
      type: 'table'
    };
  }

  /**
   * Résout plusieurs références en parallèle
   */
  async resolveMultipleReferences(refs: string[]): Promise<Map<string, {
    value: unknown;
    label: string;
    resolved: boolean;
    type: 'value' | 'formula' | 'condition' | 'table';
  }>> {
    const results = new Map();
    
    const promises = refs.map(async (ref) => {
      const result = await this.resolveReference(ref);
      results.set(ref, result);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Met à jour le cache de valeurs
   */
  updateValueCache(nodeId: string, value: unknown, label?: string): void {
    this.context.valueMap.set(nodeId, value);
    if (label) {
      this.context.labelMap.set(nodeId, label);
    }
  }

  /**
   * Obtient le label pour un nodeId
   */
  getLabel(nodeId: string): string {
    return this.context.labelMap.get(nodeId) || nodeId;
  }

  /**
   * Obtient la valeur pour un nodeId
   */
  getValue(nodeId: string): unknown {
    return this.context.valueMap.get(nodeId);
  }
}