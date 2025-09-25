const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 🧠 SYSTÈME DE COMPRÉHENSION UNIVERSEL
 * 
 * Comprend AUTOMATIQUEMENT n'importe quelle structure d'opération
 * même avec l'encodage actuel imparfait.
 * 
 * RÈGLES DE LECTURE:
 * 1. CONDITION → Contrôleur principal (priorité absolue)
 * 2. FORMULE → Calcul automatique  
 * 3. TABLEAU → Lecture structurée
 * 4. DONNÉE → Valeur directe
 * 
 * TYPES DE CHAMPS:
 * - SIMPLE → Valeur directe
 * - OPTION → Choix dans liste
 * - OPTION+CHAMP → Choix qui ouvre un champ enfant
 */
class UniversalOperationReader {
  
  constructor() {
    this.debugMode = true;
    this.analysisCache = new Map();
  }

  /**
   * 🎯 POINT D'ENTRÉE PRINCIPAL
   * Analyse n'importe quel nœud et comprend sa logique
   */
  async readNode(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    
    if (this.debugMode) {
      console.log(`${indent}🔍 LECTURE NŒUD: ${nodeId}`);
    }
    
    try {
      // 1. IDENTIFIER LE NŒUD
      const identity = await this.identifyNode(nodeId);
      if (!identity) {
        return { status: 'missing', nodeId, error: 'Nœud inexistant' };
      }
      
      if (this.debugMode) {
        console.log(`${indent}✅ IDENTITÉ: "${identity.label}" (${identity.type}/${identity.subType})`);
      }
      
      // 2. DÉTECTER LA LOGIQUE PRINCIPALE
      const primaryLogic = await this.detectPrimaryLogic(nodeId, depth + 1);
      
      // 3. ANALYSER LA STRUCTURE DU CHAMP  
      const fieldStructure = await this.analyzeFieldStructure(nodeId, identity, depth + 1);
      
      // 4. VALIDER LA COHÉRENCE
      const validation = this.validateCoherence(primaryLogic, fieldStructure);
      
      return {
        status: 'analyzed',
        nodeId,
        identity,
        primaryLogic,
        fieldStructure,
        validation
      };
      
    } catch (error) {
      return { status: 'error', nodeId, error: error.message };
    }
  }
  
  /**
   * 🆔 IDENTIFICATION DU NŒUD
   */
  async identifyNode(nodeId) {
    if (this.analysisCache.has(nodeId)) {
      return this.analysisCache.get(nodeId);
    }
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });
    
    if (!node) return null;
    
    const identity = {
      id: node.id,
      label: node.label,
      type: node.type,
      subType: node.subType,
      parentId: node.parentId,
      hasData: node.hasData,
      hasFormula: node.hasFormula
    };
    
    this.analysisCache.set(nodeId, identity);
    return identity;
  }
  
  /**
   * 🎯 DÉTECTION DE LA LOGIQUE PRINCIPALE
   * Règle: CONDITION > FORMULE VALIDE > TABLEAU > DONNÉE
   */
  async detectPrimaryLogic(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    
    // ÉTAPE 1: Récupérer TOUTES les opérations
    const operations = await this.getAllOperations(nodeId);
    
    if (this.debugMode) {
      console.log(`${indent}📊 OPÉRATIONS TROUVÉES:`);
      console.log(`${indent}   Conditions: ${operations.conditions.length}`);
      console.log(`${indent}   Formules: ${operations.formulas.length}`);
      console.log(`${indent}   Variables: ${operations.variables.length}`);
      console.log(`${indent}   Tableaux: ${operations.tables.length}`);
    }
    
    // ÉTAPE 2: PRIORITÉ - CONDITION (contrôleur principal)
    if (operations.conditions.length > 0) {
      if (this.debugMode) {
        console.log(`${indent}🎯 LOGIQUE PRINCIPALE: CONDITION`);
      }
      return await this.analyzeCondition(operations.conditions[0], depth + 1);
    }
    
    // ÉTAPE 3: FORMULE ACTIVE
    const activeFormula = this.findActiveFormula(operations.formulas);
    if (activeFormula) {
      if (this.debugMode) {
        console.log(`${indent}🎯 LOGIQUE PRINCIPALE: FORMULE`);
      }
      return await this.analyzeFormula(activeFormula, depth + 1);
    }
    
    // ÉTAPE 4: TABLEAU  
    if (operations.tables.length > 0) {
      if (this.debugMode) {
        console.log(`${indent}🎯 LOGIQUE PRINCIPALE: TABLEAU`);
      }
      return await this.analyzeTable(operations.tables[0], depth + 1);
    }
    
    // ÉTAPE 5: VARIABLE (configuration)
    if (operations.variables.length > 0) {
      if (this.debugMode) {
        console.log(`${indent}🎯 LOGIQUE PRINCIPALE: VARIABLE`);
      }
      return await this.analyzeVariable(operations.variables[0], depth + 1);
    }
    
    // ÉTAPE 6: DONNÉE SIMPLE
    if (this.debugMode) {
      console.log(`${indent}🎯 LOGIQUE PRINCIPALE: DONNÉE SIMPLE`);
    }
    return { type: 'data', description: 'Saisie directe utilisateur' };
  }
  
  /**
   * 📊 RÉCUPÉRATION DE TOUTES LES OPÉRATIONS
   */
  async getAllOperations(nodeId) {
    const [conditions, formulas, variables, tables] = await Promise.all([
      prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId } }),
      prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId } }),
      prisma.treeBranchLeafNodeVariable.findMany({ where: { nodeId } }),
      prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId } })
    ]);
    
    return { conditions, formulas, variables, tables };
  }
  
  /**
   * 🧮 DÉTECTION DE LA FORMULE ACTIVE
   * Logique: Formule avec tokens valides > isDefault=true > plus récente
   */
  findActiveFormula(formulas) {
    if (formulas.length === 0) return null;
    
    // 1. Priorité: Formules avec tokens valides
    const validFormulas = formulas.filter(f => 
      f.tokens && Array.isArray(f.tokens) && f.tokens.length > 0
    );
    
    if (validFormulas.length === 1) {
      return validFormulas[0];
    }
    
    if (validFormulas.length > 1) {
      // 2. Priorité: isDefault=true
      const defaultFormula = validFormulas.find(f => f.isDefault);
      if (defaultFormula) return defaultFormula;
      
      // 3. Priorité: Plus récente
      return validFormulas.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
    }
    
    return null;
  }
  
  /**
   * ❓ ANALYSE CONDITION
   */
  async analyzeCondition(condition, depth = 0) {
    const indent = '  '.repeat(depth);
    
    if (this.debugMode) {
      console.log(`${indent}❓ CONDITION: ${condition.id}`);
    }
    
    // TODO: Parser la structure de condition
    // Pour l'instant, retour basique
    return {
      type: 'condition',
      id: condition.id,
      description: 'Logique conditionnelle Si/Alors/Sinon'
    };
  }
  
  /**
   * 🧮 ANALYSE FORMULE
   */
  async analyzeFormula(formula, depth = 0) {
    const indent = '  '.repeat(depth);
    
    if (this.debugMode) {
      console.log(`${indent}🧮 FORMULE: ${formula.description || 'Sans description'}`);
    }
    
    const tokens = formula.tokens || [];
    const variables = tokens.filter(t => t.type === 'variable');
    const operators = tokens.filter(t => t.type === 'operator');
    
    // Expression lisible
    const expression = tokens.map(t => {
      if (t.type === 'variable') {
        return `[${t.name}]`;
      } else if (t.type === 'operator') {
        return t.value;
      } else {
        return t.toString();
      }
    }).join(' ');
    
    if (this.debugMode) {
      console.log(`${indent}📝 Expression: ${expression}`);
      console.log(`${indent}🔢 Variables: ${variables.length}, Opérateurs: ${operators.length}`);
    }
    
    // Analyser chaque variable récursivement
    const analyzedVariables = [];
    for (const variable of variables) {
      if (this.debugMode) {
        console.log(`${indent}🔍 Variable: ${variable.name}`);
      }
      
      const varAnalysis = await this.readNode(variable.name, depth + 1);
      analyzedVariables.push({
        name: variable.name,
        analysis: varAnalysis
      });
    }
    
    return {
      type: 'formula',
      id: formula.id,
      description: formula.description,
      expression,
      variables: analyzedVariables,
      operators,
      health: this.checkFormulaHealth(analyzedVariables)
    };
  }
  
  /**
   * 📋 ANALYSE TABLEAU
   */
  async analyzeTable(table, depth = 0) {
    return {
      type: 'table',
      id: table.id,
      description: 'Structure de données tabulaire'
    };
  }
  
  /**
   * 📊 ANALYSE VARIABLE
   */
  async analyzeVariable(variable, depth = 0) {
    const indent = '  '.repeat(depth);
    
    if (this.debugMode) {
      console.log(`${indent}📊 VARIABLE: ${variable.exposedKey}`);
      console.log(`${indent}   Source: ${variable.sourceType}`);
      console.log(`${indent}   Référence: ${variable.sourceRef || 'aucune'}`);
    }
    
    return {
      type: 'variable',
      exposedKey: variable.exposedKey,
      sourceType: variable.sourceType,
      sourceRef: variable.sourceRef,
      unit: variable.unit
    };
  }
  
  /**
   * 🏗️ ANALYSE STRUCTURE DU CHAMP
   */
  async analyzeFieldStructure(nodeId, identity, depth = 0) {
    const indent = '  '.repeat(depth);
    
    // CHAMP SELECT → Analyser options
    if (identity.type === 'leaf_option_field') {
      if (this.debugMode) {
        console.log(`${indent}🎛️ CHAMP SELECT`);
      }
      return await this.analyzeSelectField(nodeId, depth + 1);
    }
    
    // BRANCHE → Analyser enfants
    if (identity.type === 'branch') {
      if (this.debugMode) {
        console.log(`${indent}🌳 BRANCHE`);
      }
      return await this.analyzeBranch(nodeId, depth + 1);
    }
    
    // CHAMP SIMPLE
    return { type: 'simple_field' };
  }
  
  /**
   * 🎛️ ANALYSE CHAMP SELECT
   */
  async analyzeSelectField(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    
    const options = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: nodeId, type: 'leaf_option' },
      orderBy: { label: 'asc' }
    });
    
    if (this.debugMode) {
      console.log(`${indent}📋 Options: ${options.length}`);
    }
    
    const analyzedOptions = [];
    
    for (const option of options) {
      if (this.debugMode) {
        console.log(`${indent}  ➤ "${option.label}"`);
      }
      
      // Chercher les champs enfants (OPTION+CHAMP)
      const childFields = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: option.id }
      });
      
      let optionType = 'simple_option';
      const analyzedChildren = [];
      
      if (childFields.length > 0) {
        optionType = 'option_plus_field';
        
        if (this.debugMode) {
          console.log(`${indent}    ↳ Ouvre ${childFields.length} champ(s)`);
        }
        
        for (const child of childFields) {
          const childAnalysis = await this.readNode(child.id, depth + 2);
          analyzedChildren.push(childAnalysis);
        }
      }
      
      analyzedOptions.push({
        option,
        type: optionType,
        children: analyzedChildren
      });
    }
    
    return {
      type: 'select_field',
      options: analyzedOptions
    };
  }
  
  /**
   * 🌳 ANALYSE BRANCHE
   */
  async analyzeBranch(nodeId, depth = 0) {
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: nodeId },
      orderBy: { label: 'asc' }
    });
    
    const analyzedChildren = [];
    for (const child of children) {
      const childAnalysis = await this.readNode(child.id, depth + 1);
      analyzedChildren.push(childAnalysis);
    }
    
    return {
      type: 'branch',
      children: analyzedChildren
    };
  }
  
  /**
   * 🩺 VALIDATION SANTÉ FORMULE
   */
  checkFormulaHealth(variables) {
    const missing = variables.filter(v => v.analysis.status === 'missing');
    const errors = variables.filter(v => v.analysis.status === 'error');
    
    if (missing.length > 0 || errors.length > 0) {
      return {
        status: 'broken',
        missing: missing.map(v => v.name),
        errors: errors.map(v => v.name),
        message: `${missing.length} variable(s) manquante(s), ${errors.length} erreur(s)`
      };
    }
    
    return { status: 'healthy', message: 'Toutes les variables sont accessibles' };
  }
  
  /**
   * ✅ VALIDATION COHÉRENCE GLOBALE
   */
  validateCoherence(primaryLogic, fieldStructure) {
    const issues = [];
    
    // Vérifier cohérence logique
    if (primaryLogic.type === 'formula' && primaryLogic.health?.status === 'broken') {
      issues.push('Formule avec variables manquantes');
    }
    
    // Vérifier cohérence structure
    if (fieldStructure.type === 'select_field') {
      const optionPlusFields = fieldStructure.options.filter(o => o.type === 'option_plus_field');
      if (optionPlusFields.length > 0) {
        issues.push('OPTION+CHAMP détecté - Vérifier récupération données');
      }
    }
    
    return {
      status: issues.length === 0 ? 'coherent' : 'issues_detected',
      issues
    };
  }
}

// 🚀 TEST DE L'ALGORITHME  
async function testUniversalReader() {
  console.log('🧠 TEST ALGORITHME DE LECTURE UNIVERSEL');
  console.log('='.repeat(70));
  
  const reader = new UniversalOperationReader();
  
  // Test avec Prix Kw/h
  const prixKwhId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
  
  console.log('\n🎯 TEST: Champ Prix Kw/h');
  console.log('-'.repeat(50));
  
  const result = await reader.readNode(prixKwhId);
  
  console.log('\n📊 RÉSULTAT COMPLET:');
  console.log(JSON.stringify(result, null, 2));
  
  await prisma.$disconnect();
}

testUniversalReader();