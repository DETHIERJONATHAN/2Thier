import { PrismaClient } from '@prisma/client';
import { TBLContext, TBLCalculationResult } from './shared/types';
import { ConditionCalculator } from './conditions/condition-calculator';
import { FormulaCalculator } from './formulas/formula-calculator';
import { ReferenceResolver } from './shared/reference-resolver';

/**
 * Point d'entrée principal pour tous les calculs TBL
 * Orchestrateur central pour conditions, formules, et tableaux
 */
export class TBLOrchestrator {
  private conditionCalculator: ConditionCalculator;
  private formulaCalculator: FormulaCalculator;
  private resolver: ReferenceResolver;

  constructor(
    private prisma: PrismaClient,
    private context: TBLContext
  ) {
    this.resolver = new ReferenceResolver(prisma, context);
    this.conditionCalculator = new ConditionCalculator(prisma, context);
    this.formulaCalculator = new FormulaCalculator(prisma, context);
    
    // Injecter les calculateurs dans le resolver pour éviter les références circulaires
    this.resolver.setCalculators(this.formulaCalculator, this.conditionCalculator);
  }

  /**
   * Point d'entrée principal pour buildDetailAndResultForOperation
   * Remplace l'ancienne logique dans treebranchleaf-routes.ts
   */
  async buildDetailAndResultForOperation(
    operationType: 'condition' | 'formula' | 'table',
    sourceRef: string
  ): Promise<TBLCalculationResult> {
    try {
      console.log(`[TBL-ORCHESTRATOR] 🎯 Construction pour type: ${operationType}, ref: ${sourceRef}`);

      switch (operationType) {
        case 'condition':
          return await this.buildConditionOperation(sourceRef);
        
        case 'formula':
          return await this.buildFormulaOperation(sourceRef);
        
        case 'table':
          return await this.buildTableOperation(sourceRef);
        
        default:
          return this.createErrorResult(`Type d'opération non supporté: ${operationType}`);
      }

    } catch (error) {
      console.error(`[TBL-ORCHESTRATOR] ❌ Erreur calcul ${operationType}:`, error);
      return this.createErrorResult(`Erreur calcul ${operationType}: ${error}`);
    }
  }

  /**
   * Construit l'opération pour une condition
   */
  private async buildConditionOperation(
    sourceRef: string
  ): Promise<TBLCalculationResult> {
    // Extraire l'ID de la condition depuis sourceRef (format: condition:id)
    const conditionId = sourceRef.replace('condition:', '');
    
    console.log(`[TBL-ORCHESTRATOR] 🎯 Construction condition: ${conditionId}`);

    // Calculer la condition avec le nouveau système
    const conditionResult = await this.conditionCalculator.calculateCondition(conditionId);

    return {
      detail: conditionResult.detail,
      result: conditionResult.result,
      value: conditionResult.value,
      hasError: conditionResult.hasError,
      errorMessage: conditionResult.errorMessage
    };
  }

  /**
   * Construit l'opération pour une formule
   */
  private async buildFormulaOperation(
    sourceRef: string
  ): Promise<TBLCalculationResult> {
    // Extraire l'ID de la formule depuis sourceRef (format: node-formula:id)
    const formulaId = sourceRef.replace('node-formula:', '');
    
    console.log(`[TBL-ORCHESTRATOR] 📐 Construction formule: ${formulaId}`);

    // Calculer la formule avec le nouveau système
    const formulaResult = await this.formulaCalculator.calculateFormula(formulaId);

    return {
      detail: formulaResult.detail,
      result: formulaResult.result,
      value: formulaResult.value,
      hasError: formulaResult.hasError,
      errorMessage: formulaResult.errorMessage
    };
  }

  /**
   * Construit l'opération pour un tableau
   */
  private async buildTableOperation(
    sourceRef: string
  ): Promise<TBLCalculationResult> {
    // Pour l'instant, implémentation simple
    const tableId = sourceRef.replace('node-table:', '');
    
    console.log(`[TBL-ORCHESTRATOR] 📊 Construction tableau: ${tableId}`);

    return {
      detail: { tableId, message: 'Tableaux à implémenter' },
      result: `Tableau ${tableId}: (À implémenter)`,
      value: undefined
    };
  }

  /**
   * Met à jour le contexte avec de nouvelles valeurs
   */
  updateContext(updates: {
    valueMap?: Map<string, unknown>;
    labelMap?: Map<string, string>;
  }): void {
    if (updates.valueMap) {
      updates.valueMap.forEach((value, key) => {
        this.context.valueMap.set(key, value);
      });
    }
    if (updates.labelMap) {
      updates.labelMap.forEach((label, key) => {
        this.context.labelMap.set(key, label);
      });
    }
  }

  /**
   * Crée un résultat d'erreur standardisé
   */
  private createErrorResult(message: string): TBLCalculationResult {
    return {
      detail: { error: message },
      result: `Erreur: ${message}`,
      value: undefined,
      hasError: true,
      errorMessage: message
    };
  }

  /**
   * Obtient le résolveur de références pour usage externe
   */
  getResolver(): ReferenceResolver {
    return this.resolver;
  }

  /**
   * Factory method pour créer un orchestrateur avec contexte
   */
  static create(
    prisma: PrismaClient,
    submissionId: string,
    labelMap: Map<string, string>,
    valueMap: Map<string, unknown>,
    organizationId: string,
    userId: string
  ): TBLOrchestrator {
    const context: TBLContext = {
      submissionId,
      labelMap,
      valueMap,
      organizationId,
      userId
    };

    return new TBLOrchestrator(prisma, context);
  }
}