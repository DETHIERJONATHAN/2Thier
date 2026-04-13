import { PrismaClient } from '@prisma/client';
import { TBLContext, TBLCalculationResult } from '../shared/types';
import { 
  extractNodeIdsFromTokens,
  buildTextFromTokens, 
  calculateResult,
  contextToLegacyMaps
} from '../shared/legacy-functions';
import { logger } from '../../../../../lib/logger';

/**
 * Calculateur de formules avec la logique EXACTE de l'ancien système
 * Port direct des fonctions qui FONCTIONNENT dans treebranchleaf-routes.ts
 */
export class FormulaCalculator {
  constructor(
    private prisma: PrismaClient,
    private context: TBLContext
  ) {}

  /**
   * Point d'entrée principal pour calculer une formule
   * EXACTEMENT basé sur la logique qui fonctionne
   */
  async calculateFormula(formulaId: string): Promise<TBLCalculationResult> {
    try {
      logger.debug(`[FORMULA-CALCULATOR] 📐 Calcul formule: ${formulaId}`);

      // Récupérer la formule depuis la base
      const formula = await this.prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: formulaId },
        select: { id: true, nodeId: true, tokens: true, name: true }
      });

      if (!formula) {
        logger.error(`[FORMULA-CALCULATOR] ❌ Formule non trouvée: ${formulaId}`);
        return {
          detail: { error: `Formule ${formulaId} non trouvée` },
          result: `Erreur: Formule ${formulaId} non trouvée`,
          value: undefined,
          hasError: true,
          errorMessage: `Formule ${formulaId} non trouvée`
        };
      }

      // Utiliser la logique EXACTE de l'ancien système
      const { labels, values } = contextToLegacyMaps(this.context);
      
      // S'assurer que tous les tokens ont leurs labels
      const allTokenIds = new Set<string>();
      const ids = extractNodeIdsFromTokens(formula.tokens);
      ids.forEach(id => allTokenIds.add(id));
      
      if (allTokenIds.size > 0) {
        const missing = Array.from(allTokenIds).filter(id => !labels.has(id));
        if (missing.length > 0) {
          const nodes = await this.prisma.treeBranchLeafNode.findMany({
            where: { id: { in: missing } },
            select: { id: true, label: true }
          });
          for (const n of nodes) labels.set(n.id, n.label || null);
        }
      }
      
      // Construire l'expression avec la fonction qui marche
      const expr = buildTextFromTokens(formula.tokens, labels, values);
      logger.debug(`[FORMULA-CALCULATOR] Expression construite: ${expr}`);
      
      // Calculer le résultat avec la fonction qui marche
      const calculatedResult = calculateResult(expr);
      
      let result: string;
      let value: unknown = calculatedResult;
      
      if (calculatedResult !== null && calculatedResult !== undefined && !isNaN(calculatedResult)) {
        const lbl = labels.get(formula.nodeId) ?? formula.name ?? 'Formule';
        result = `${lbl} ${expr} (=) ${calculatedResult}`;
        logger.debug(`[FORMULA-CALCULATOR] ✅ Résultat calculé: ${result}`);
      } else {
        const lbl = labels.get(formula.nodeId) ?? formula.name ?? 'Formule';
        result = `${lbl} ${expr}`;
        logger.debug(`[FORMULA-CALCULATOR] ⚠️ Pas de résultat numérique: ${result}`);
      }

      return {
        detail: {
          formulaId,
          tokens: formula.tokens,
          expression: expr,
          calculatedResult
        },
        result,
        value,
        hasError: false
      };

    } catch (error) {
      logger.error(`[FORMULA-CALCULATOR] ❌ Erreur calcul formule:`, error);
      return {
        detail: { error: String(error) },
        result: `Erreur: ${error}`,
        value: undefined,
        hasError: true,
        errorMessage: String(error)
      };
    }
  }
}