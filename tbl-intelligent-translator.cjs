#!/usr/bin/env node

/**
 * 🧠 SYSTÈME DE TRADUCTION INTELLIGENT TBL
 * 
 * Transforme les operationDetail JSON en phrases françaises lisibles
 * avec les vraies valeurs comme demandé :
 * 
 * Condition: Si Prix Kw/h = n'est pas vide ; alors Prix Kw/h (0.35); Sinon Calcul du prix Kw/h (4000) (/) Consommation annuelle électricité* (1000) (=) Result (0.25)
 * Formule: Prix Kw/h (0.35) (/) Consommation annuelle électricité (4000) (=) Result (0.0875)
 * Table: Tableau Tarifs[Prix Kw/h] = 0.35
 */

const { PrismaClient } = require('@prisma/client');

class TBLIntelligentTranslator {
  constructor(prisma) {
    this.prisma = prisma;
    this.nodeValuesCache = new Map();
  }

  /**
   * Traduit une référence @value.nodeId en nom lisible avec valeur
   */
  async translateNodeReference(ref, submissionId) {
    try {
      // Extraire l'ID du noeud de la référence @value.nodeId
      // Gérer TOUS les formats : UUID et node_XXXXX_YYYYY
      const nodeIdMatch = ref.match(/@value\.(.+)/);
      if (!nodeIdMatch) return ref;
      
      const nodeId = nodeIdMatch[1];
      
      // 1. PRIORITÉ : Chercher le vrai label dans TreeBranchLeafNode
      const tblNode = await this.prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId }
      });
      
      let nodeLabel = tblNode?.label || `Node ${nodeId.slice(0, 8)}`;
      
      // 2. Chercher la valeur dans SubmissionData
      const submissionData = await this.prisma.treeBranchLeafSubmissionData.findFirst({
        where: {
          submissionId: submissionId,
          nodeId: nodeId
        }
      });
      
      // 3. Gestion intelligente des valeurs manquantes
      let value;
      if (submissionData?.value !== undefined && submissionData?.value !== null) {
        value = submissionData.value;
      } else {
        // Pas de données de soumission - indiquer clairement
        value = "⚠️ Aucune donnée";
      }
      
      return `${nodeLabel} (${value})`;
      
    } catch (error) {
      console.error('❌ Erreur traduction référence:', error.message);
      return ref;
    }
  }

  /**
   * Traduit une condition JSON en phrase française
   */
  async translateCondition(operationDetail, submissionId) {
    try {
      const conditionSet = operationDetail.conditionSet;
      if (!conditionSet) return 'Condition non définie';

      let translation = 'Si ';

      // Traiter la première branche (condition "when")
      if (conditionSet.branches && conditionSet.branches.length > 0) {
        const firstBranch = conditionSet.branches[0];
        const when = firstBranch.when;
        
        if (when && when.left && when.left.ref) {
          const leftTranslation = await this.translateNodeReference(when.left.ref, submissionId);
          const operator = this.translateOperator(when.op);
          
          translation += `${leftTranslation} ${operator}`;
        }

        // Traiter les actions "alors"
        translation += ' ; alors ';
        if (firstBranch.actions && firstBranch.actions.length > 0) {
          const actionTranslations = [];
          for (const action of firstBranch.actions) {
            if (action.nodeIds) {
              for (const nodeId of action.nodeIds) {
                if (nodeId.startsWith('node-formula:')) {
                  // C'est une formule - la traduire
                  const formulaTranslation = await this.translateFormulaById(nodeId, submissionId);
                  actionTranslations.push(formulaTranslation);
                } else {
                  const nodeTranslation = await this.translateNodeReference(`@value.${nodeId}`, submissionId);
                  actionTranslations.push(nodeTranslation);
                }
              }
            }
          }
          translation += actionTranslations.join(', ');
        }
      }

      // Traiter le fallback "sinon"
      if (conditionSet.fallback && conditionSet.fallback.actions) {
        translation += ' ; Sinon ';
        const fallbackTranslations = [];
        
        for (const action of conditionSet.fallback.actions) {
          if (action.nodeIds) {
            for (const nodeId of action.nodeIds) {
              if (nodeId.startsWith('node-formula:')) {
                // C'est une formule - la traduire aussi
                const formulaTranslation = await this.translateFormulaById(nodeId, submissionId);
                fallbackTranslations.push(formulaTranslation);
              } else {
                const nodeTranslation = await this.translateNodeReference(`@value.${nodeId}`, submissionId);
                fallbackTranslations.push(nodeTranslation);
              }
            }
          }
        }
        translation += fallbackTranslations.join(', ');
      }

      return translation;

    } catch (error) {
      console.error('❌ Erreur traduction condition:', error.message);
      return 'Erreur traduction condition';
    }
  }

  /**
   * Traduit une formule en phrase française avec calcul
   */
  async translateFormula(expression, submissionId) {
    try {
      if (!Array.isArray(expression)) {
        return 'Formule invalide';
      }

      const translations = [];
      let currentResult = 0;
      
      for (let i = 0; i < expression.length; i++) {
        const element = expression[i];
        
        if (typeof element === 'string' && element.startsWith('@value.')) {
          // C'est une référence à un noeud
          const nodeTranslation = await this.translateNodeReference(element, submissionId);
          translations.push(nodeTranslation);
          
          // Extraire la valeur numérique pour le calcul
          const valueMatch = nodeTranslation.match(/\(([0-9.]+)\)/);
          if (valueMatch) {
            const numValue = parseFloat(valueMatch[1]);
            if (i === 0) {
              currentResult = numValue;
            } else if (i > 1) {
              const operator = expression[i - 1];
              if (operator === '/') {
                currentResult = currentResult / numValue;
              } else if (operator === '*') {
                currentResult = currentResult * numValue;
              } else if (operator === '+') {
                currentResult = currentResult + numValue;
              } else if (operator === '-') {
                currentResult = currentResult - numValue;
              }
            }
          }
          
        } else if (typeof element === 'string') {
          // C'est un opérateur
          const operatorSymbol = this.translateMathOperator(element);
          translations.push(operatorSymbol);
        }
      }

      // Ajouter le résultat final
      const resultFormatted = currentResult.toFixed(4);
      translations.push(`(=) Result (${resultFormatted})`);

      return translations.join(' ');

    } catch (error) {
      console.error('❌ Erreur traduction formule:', error.message);
      return 'Erreur traduction formule';
    }
  }

  /**
   * Traduit une formule par son ID
   */
  async translateFormulaById(formulaRef, submissionId) {
    try {
      // Extraire l'ID de la formule
      const formulaId = formulaRef.replace('node-formula:', '');
      
      // Chercher la formule dans la base
      const formula = await this.prisma.treeBranchLeafNodeFormula.findFirst({
        where: { id: formulaId }
      });

      if (formula) {
        // Si on a des tokens, les traduire
        if (formula.tokens) {
          try {
            let tokensArray;
            
            // Les tokens peuvent être JSON ou string séparés par virgules
            if (typeof formula.tokens === 'string') {
              if (formula.tokens.startsWith('[')) {
                // JSON array
                tokensArray = JSON.parse(formula.tokens);
              } else {
                // String séparés par virgules
                tokensArray = formula.tokens.split(',');
              }
            } else {
              tokensArray = formula.tokens;
            }
            
            if (Array.isArray(tokensArray) && tokensArray.length > 0) {
              console.log(`🔧 [DEBUG] Tokens trouvés:`, tokensArray);
              return await this.translateFormula(tokensArray, submissionId);
            }
          } catch (parseError) {
            console.log('⚠️ Erreur parsing tokens:', parseError.message);
            console.log('⚠️ Tokens bruts:', formula.tokens);
          }
        }
        
        return `Formule: ${formula.name}`;
      }

      return `Formule ${formulaId.slice(0, 8)}`;

    } catch (error) {
      console.error('❌ Erreur traduction formule par ID:', error.message);
      return `Formule ${formulaRef}`;
    }
  }

  /**
   * Traduit une table en phrase française
   */
  async translateTable(operationDetail, submissionId) {
    try {
      // À implémenter selon la structure des tables
      return 'Tableau [nom][champ] = [valeur]';
    } catch (error) {
      console.error('❌ Erreur traduction table:', error.message);
      return 'Erreur traduction table';
    }
  }

  /**
   * Traduit un opérateur de condition
   */
  translateOperator(op) {
    const operators = {
      'isNotEmpty': 'n\'est pas vide',
      'isEmpty': 'est vide',
      'equals': 'égale',
      'notEquals': 'n\'égale pas',
      'greaterThan': 'est supérieur à',
      'lessThan': 'est inférieur à',
      'contains': 'contient'
    };
    
    return operators[op] || op;
  }

  /**
   * Traduit un opérateur mathématique
   */
  translateMathOperator(op) {
    const operators = {
      '/': '(/)',
      '*': '(*)',
      '+': '(+)',
      '-': '(-)',
      '=': '(=)'
    };
    
    return operators[op] || `(${op})`;
  }

  /**
   * MÉTHODE PRINCIPALE : Traduit n'importe quelle capacité
   */
  async translateCapacity(operationSource, operationDetail, sourceRef, submissionId) {
    try {
      console.log(`🧠 [TRADUCTION] ${operationSource} - ${sourceRef}`);

      switch (operationSource) {
        case 'condition':
          return await this.translateCondition(operationDetail, submissionId);
          
        case 'formula':
          if (typeof operationDetail === 'string' && operationDetail.startsWith('node-formula:')) {
            return await this.translateFormulaById(operationDetail, submissionId);
          } else if (Array.isArray(operationDetail)) {
            return await this.translateFormula(operationDetail, submissionId);
          }
          return 'Formule non reconnue';
          
        case 'table':
          return await this.translateTable(operationDetail, submissionId);
          
        default:
          return `Capacité ${operationSource} non reconnue`;
      }

    } catch (error) {
      console.error('❌ Erreur traduction capacité:', error.message);
      return `Erreur traduction ${operationSource}`;
    }
  }
}

module.exports = TBLIntelligentTranslator;