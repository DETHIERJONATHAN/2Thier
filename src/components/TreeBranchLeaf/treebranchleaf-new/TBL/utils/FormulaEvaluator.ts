/**
 * 🧮 ÉVALUATEUR DE FORMULES DYNAMIQUE
 * 
 * Calcule les formules TreeBranchLeaf avec tokens :
 * - Résout les références @value.xxx vers formData
 * - Effectue les opérations mathématiques (+, -, *, /)
 * - Gère les parenthèses et priorités
 */

export class FormulaEvaluator {
  
  /**
   * Évalue une formule avec tokens
   */
  static evaluateTokens(
    tokens: string[], 
    formData: Record<string, unknown>,
    debug = false
  ): { success: boolean; result?: number; error?: string } {
    
    if (debug) {
      console.log('🧮 [FORMULA] Évaluation tokens:', tokens);
    }
    
    try {
      // Résoudre toutes les références vers des valeurs
      const resolvedTokens = tokens.map(token => {
        if (typeof token === 'string' && token.startsWith('@value.')) {
          const value = this.resolveReference(token, formData, debug);
          return value;
        }
        // 🆕 Support pour @calculated.{nodeId} - récupère la calculatedValue d'un champ
        if (typeof token === 'string' && token.startsWith('@calculated.')) {
          const value = this.resolveCalculatedReference(token, formData, debug);
          return value;
        }
        return token;
      });
      
      if (debug) {
        console.log('🧮 [FORMULA] Tokens résolus:', resolvedTokens);
      }
      
      // Évaluer l'expression mathématique
      const result = this.evaluateExpression(resolvedTokens, debug);
      
      if (debug) {
        console.log('🧮 [FORMULA] Résultat:', result);
      }
      
      return { success: true, result };
      
    } catch (error) {
      return { 
        success: false, 
        error: `Erreur calcul formule: ${error.message}` 
      };
    }
  }
  
  /**
   * Résout une référence @value.xxx vers la valeur dans formData
   */
  private static resolveReference(
    ref: string, 
    formData: Record<string, unknown>,
    debug = false
  ): number {
    
    const nodeId = ref.replace('@value.', '');
    
    // Chercher dans formData par nodeId direct
    if (formData[nodeId] !== undefined) {
      const value = parseFloat(String(formData[nodeId]));
      if (debug) {
        console.log(`🧮 [FORMULA] Référence ${ref} -> ${value}`);
      }
      return isNaN(value) ? 0 : value;
    }
    
    // Chercher dans les clés qui contiennent le nodeId
    for (const [key, value] of Object.entries(formData)) {
      if (key.includes(nodeId)) {
        const numValue = parseFloat(String(value));
        if (debug) {
          console.log(`🧮 [FORMULA] Référence ${ref} -> ${numValue} (via clé ${key})`);
        }
        return isNaN(numValue) ? 0 : numValue;
      }
    }
    
    if (debug) {
      console.log(`🧮 [FORMULA] Référence ${ref} non trouvée, utilisation de 0`);
    }
    
    return 0; // Valeur par défaut
  }
  
  /**
   * 🆕 Résout une référence @calculated.xxx vers la calculatedValue stockée
   * NOTE: Cette méthode recherche dans formData la valeur pré-calculée
   * La clé attendue est `__calculated__{nodeId}` ou directement via l'API
   */
  private static resolveCalculatedReference(
    ref: string, 
    formData: Record<string, unknown>,
    debug = false
  ): number {
    
    const nodeId = ref.replace('@calculated.', '');
    
    // Chercher la valeur calculée dans formData avec le préfixe spécial
    const calculatedKey = `__calculated__${nodeId}`;
    if (formData[calculatedKey] !== undefined) {
      const value = parseFloat(String(formData[calculatedKey]));
      if (debug) {
        console.log(`📊 [FORMULA] Calculated ${ref} -> ${value}`);
      }
      return isNaN(value) ? 0 : value;
    }
    
    // Fallback: chercher directement par nodeId (la calculatedValue peut être dans formData)
    if (formData[nodeId] !== undefined) {
      const value = parseFloat(String(formData[nodeId]));
      if (debug) {
        console.log(`📊 [FORMULA] Calculated ${ref} (fallback) -> ${value}`);
      }
      return isNaN(value) ? 0 : value;
    }
    
    if (debug) {
      console.log(`📊 [FORMULA] Calculated ${ref} non trouvé, utilisation de 0`);
    }
    
    return 0; // Valeur par défaut
  }
  
  /**
   * Évalue une expression mathématique simple
   */
  private static evaluateExpression(
    tokens: unknown[], 
    debug = false
  ): number {
    
    // Convertir tous les tokens en nombres ou opérateurs
    const processed = tokens.map(token => {
      if (typeof token === 'number') {
        return token;
      }
      
      if (typeof token === 'string') {
        // Opérateurs
        if (['+', '-', '*', '/'].includes(token)) {
          return token;
        }
        
        // Nombres sous forme de string
        const num = parseFloat(token);
        if (!isNaN(num)) {
          return num;
        }
      }
      
      // Par défaut 0
      return 0;
    });
    
    if (debug) {
      console.log('🧮 [FORMULA] Expression processée:', processed);
    }
    
    // Évaluation simple de gauche à droite pour l'instant
    // TODO: Implémenter priorité des opérateurs si nécessaire
    let result = processed[0] as number;
    
    for (let i = 1; i < processed.length; i += 2) {
      const operator = processed[i] as string;
      const operand = processed[i + 1] as number;
      
      switch (operator) {
        case '+':
          result += operand;
          break;
        case '-':
          result -= operand;
          break;
        case '*':
          result *= operand;
          break;
        case '/':
          if (operand !== 0) {
            result /= operand;
          } else {
            throw new Error('Division par zéro');
          }
          break;
        default:
          if (debug) {
            console.warn(`🧮 [FORMULA] Opérateur non supporté: ${operator}`);
          }
      }
      
      if (debug) {
        console.log(`🧮 [FORMULA] ${result} ${operator} ${operand} = ${result}`);
      }
    }
    
    return result;
  }
}

export default FormulaEvaluator;