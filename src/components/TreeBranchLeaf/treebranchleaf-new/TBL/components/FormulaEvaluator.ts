import { logger } from '../../../../../lib/logger';
/**
 * Évaluateur dynamique pour les formules TreeBranchLeaf
 * Évalue les formules sans code en dur en récupérant depuis l'API
 * 
 * 🚀 OPTIMISATION: Utilise un cache local avec TTL pour éviter les appels API répétés
 */

interface FormulaStructure {
  id: string;
  name: string;
  tokens: Array<{
    type: string;
    value: string;
    reference?: string;
  }>;
}

// Cache des formules pour éviter les appels API répétés
// 🚀 OPTIMISATION: Cache avec TTL pour expiration automatique
const formulaCache = new Map<string, { formula: FormulaStructure; timestamp: number }>();
const CACHE_TTL_MS = 60_000; // 60 secondes

export class FormulaEvaluator {
  private api: { get: (url: string) => Promise<{ data: FormulaStructure }> };

  constructor(api: { get: (url: string) => Promise<{ data: FormulaStructure }> }) {
    this.api = api;
  }

  /**
   * Récupère une formule depuis l'API ou le cache
   * 🚀 OPTIMISATION: Cache avec TTL
   */
  private async fetchFormula(formulaId: string): Promise<FormulaStructure> {
    // Vérifier le cache d'abord avec TTL
    const cached = formulaCache.get(formulaId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug(`🚀 [FormulaEvaluator] Cache hit pour formule ${formulaId}`);
      return cached.formula;
    }

    try {
      logger.debug(`⚠️ [FormulaEvaluator] Appel API pour formule ${formulaId}`);
      // Appel API pour récupérer la formule
      const response = await this.api.get(`/treebranchleaf/formulas/${formulaId}`);
      const formula = response.data;
      
      // Mettre en cache avec timestamp
      formulaCache.set(formulaId, { formula, timestamp: Date.now() });
      
      return formula;
    } catch (error) {
      throw new Error(`Impossible de récupérer la formule ${formulaId}: ${error}`);
    }
  }

  /**
   * 🚀 NOUVEAU: Injecter une formule dans le cache (utilisé par le batch)
   */
  static injectFormula(formulaId: string, formula: FormulaStructure): void {
    formulaCache.set(formulaId, { formula, timestamp: Date.now() });
  }

  /**
   * 🚀 NOUVEAU: Injecter plusieurs formules dans le cache
   */
  static injectFormulas(formulas: Record<string, FormulaStructure>): void {
    const now = Date.now();
    for (const [id, formula] of Object.entries(formulas)) {
      formulaCache.set(id, { formula, timestamp: now });
    }
    logger.debug(`🚀 [FormulaEvaluator] ${Object.keys(formulas).length} formules injectées dans le cache`);
  }

  /**
   * Évalue une formule avec les données du formulaire
   */
  async evaluateFormula(formulaId: string, formData: Record<string, unknown>): Promise<number | null> {
    try {
      // Récupérer la formule depuis l'API
      const formula = await this.fetchFormula(formulaId);
      
      // Construire l'expression à évaluer
      let expression = '';
      
      for (const token of formula.tokens) {
        switch (token.type) {
          case 'NUMBER':
            expression += token.value;
            break;
          case 'OPERATOR':
            expression += ` ${token.value} `;
            break;
          case 'REFERENCE': {
            // Résoudre la référence vers une valeur du formulaire
            const refValue = this.resolveReference(token.reference || token.value, formData);
            expression += refValue !== null ? refValue.toString() : '0';
            break;
          }
          case 'PARENTHESIS':
            expression += token.value;
            break;
          default:
            // Token inconnu, l'ignorer ou traiter comme une valeur
            expression += token.value;
        }
      }
      
      // Évaluer l'expression mathématique
      return this.evaluateExpression(expression.trim());
    } catch (error) {
      logger.error(`Erreur lors de l'évaluation de la formule ${formulaId}:`, error);
      return null;
    }
  }

  /**
   * Résout une référence vers une valeur du formulaire
   */
  private resolveReference(reference: string, formData: Record<string, unknown>): number | null {
    if (!reference) return null;
    
    // Format: @value.fieldId ou fieldId directement
    const fieldId = reference.startsWith('@value.') 
      ? reference.replace('@value.', '') 
      : reference;
    
    const value = formData[fieldId];
    
    // Convertir en nombre
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    const numValue = Number(value);
    return isNaN(numValue) ? 0 : numValue;
  }

  /**
   * Évalue une expression mathématique de manière sécurisée
   */
  private evaluateExpression(expression: string): number | null {
    try {
      // Nettoyer l'expression pour la sécurité
      const cleanExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
      
      if (!cleanExpression) return null;
      
      // Évaluer l'expression (utilisation de Function pour éviter eval)
      const result = Function(`"use strict"; return (${cleanExpression})`)();
      
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch (error) {
      logger.error('Erreur lors de l\'évaluation de l\'expression:', expression, error);
      return null;
    }
  }
}