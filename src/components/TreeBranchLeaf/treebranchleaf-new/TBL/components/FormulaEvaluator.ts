/**
 * Évaluateur dynamique pour les formules TreeBranchLeaf
 * Évalue les formules sans code en dur en récupérant depuis l'API
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
const formulaCache = new Map<string, FormulaStructure>();

export class FormulaEvaluator {
  private api: { get: (url: string) => Promise<{ data: FormulaStructure }> };

  constructor(api: { get: (url: string) => Promise<{ data: FormulaStructure }> }) {
    this.api = api;
  }

  /**
   * Récupère une formule depuis l'API ou le cache
   */
  private async fetchFormula(formulaId: string): Promise<FormulaStructure> {
    // Vérifier le cache d'abord
    if (formulaCache.has(formulaId)) {
      return formulaCache.get(formulaId)!;
    }

    try {
      // Appel API pour récupérer la formule
      const response = await this.api.get(`/treebranchleaf/formulas/${formulaId}`);
      const formula = response.data;
      
      // Mettre en cache
      formulaCache.set(formulaId, formula);
      
      return formula;
    } catch (error) {
      throw new Error(`Impossible de récupérer la formule ${formulaId}: ${error}`);
    }
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
      console.error(`Erreur lors de l'évaluation de la formule ${formulaId}:`, error);
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
      console.error('Erreur lors de l\'évaluation de l\'expression:', expression, error);
      return null;
    }
  }
}