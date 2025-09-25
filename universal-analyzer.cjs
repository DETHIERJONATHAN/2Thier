const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 🧠 ANALYSEUR UNIVERSEL - COMPREND TOUT AUTOMATIQUEMENT
class UniversalNodeAnalyzer {
  
  // 📖 FONCTION PRINCIPALE : Analyse n'importe quel nœud
  async analyzeNode(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}🔍 ANALYSE NŒUD: ${nodeId}`);
    
    try {
      // ÉTAPE 1: QUI ES-TU ?
      const identity = await this.identifyNode(nodeId);
      if (!identity) {
        console.log(`${indent}❌ NŒUD INEXISTANT`);
        return { status: 'missing', nodeId };
      }
      
      console.log(`${indent}✅ IDENTITÉ: "${identity.label}" (${identity.type}/${identity.subType})`);
      
      // ÉTAPE 2: QUE FAIS-TU ?
      const operation = await this.detectOperation(nodeId, depth + 1);
      
      // ÉTAPE 3: COMMENT FONCTIONNES-TU ?
      const structure = await this.analyzeStructure(nodeId, identity, depth + 1);
      
      return {
        status: 'analyzed',
        nodeId,
        identity,
        operation,
        structure
      };
      
    } catch (error) {
      console.log(`${indent}❌ ERREUR: ${error.message}`);
      return { status: 'error', nodeId, error: error.message };
    }
  }
  
  // 🆔 IDENTIFIE LE NŒUD
  async identifyNode(nodeId) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });
    
    if (!node) return null;
    
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      subType: node.subType,
      parentId: node.parentId,
      hasData: node.hasData,
      hasFormula: node.hasFormula
    };
  }
  
  // 🎯 DÉTECTE L'OPÉRATION (RÉCURSIF !)
  async detectOperation(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}🎯 DÉTECTION OPÉRATION pour ${nodeId}`);
    
    // Chercher TOUTES les formules pour ce nœud
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId } });
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId } });
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { nodeId } });
    const tables = await prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId } });
    
    console.log(`${indent}📊 TROUVÉ: ${formulas.length} formule(s), ${conditions.length} condition(s), ${variable ? 1 : 0} variable, ${tables.length} tableau(x)`);
    
    // Priorité : Formule avec contenu > Condition > Variable > Tableau > Data
    for (const formula of formulas) {
      if (formula.tokens && Array.isArray(formula.tokens) && formula.tokens.length > 0) {
        console.log(`${indent}✅ OPÉRATION: FORMULE (${formula.id})`);
        return await this.analyzeOperation('formule', formula, depth + 1);
      }
    }
    
    if (conditions.length > 0) {
      console.log(`${indent}✅ OPÉRATION: CONDITION`);
      return await this.analyzeOperation('condition', conditions[0], depth + 1);
    }
    
    if (variable) {
      console.log(`${indent}✅ OPÉRATION: VARIABLE`);
      return await this.analyzeOperation('variable', variable, depth + 1);
    }
    
    if (tables.length > 0) {
      console.log(`${indent}✅ OPÉRATION: TABLEAU`);
      return await this.analyzeOperation('tableau', tables[0], depth + 1);
    }
    
    // Si des formules vides existent, les signaler
    if (formulas.length > 0) {
      console.log(`${indent}⚠️ FORMULE(S) VIDE(S) DÉTECTÉE(S)`);
      for (const formula of formulas) {
        console.log(`${indent}   - Formule ${formula.id}: tokens=${formula.tokens ? JSON.stringify(formula.tokens) : 'null'}`);
      }
    }
    
    console.log(`${indent}📝 OPÉRATION: DONNÉE SIMPLE`);
    return { type: 'data', description: 'Saisie directe utilisateur' };
  }
  
  // 🔍 ANALYSE UNE OPÉRATION SPÉCIFIQUE (RÉCURSIF !)
  async analyzeOperation(type, operation, depth = 0) {
    const indent = '  '.repeat(depth);
    
    switch (type) {
      case 'formule':
        return await this.analyzeFormula(operation, depth);
        
      case 'condition':
        return await this.analyzeCondition(operation, depth);
        
      case 'variable':
        return await this.analyzeVariable(operation, depth);
        
      case 'tableau':
        return await this.analyzeTable(operation, depth);
        
      default:
        return { type, raw: operation };
    }
  }
  
  // 🧮 ANALYSE FORMULE (RÉCURSIF !)
  async analyzeFormula(formula, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}🧮 FORMULE: "${formula.description}"`);
    
    const tokens = formula.tokens || [];
    const variables = tokens.filter(t => t.type === 'variable');
    const operators = tokens.filter(t => t.type === 'operator');
    
    console.log(`${indent}📊 EXPRESSION: ${tokens.map(t => t.type === 'variable' ? `[${t.name}]` : t.value).join(' ')}`);
    console.log(`${indent}🔢 VARIABLES: ${variables.length}, OPÉRATEURS: ${operators.length}`);
    
    // ANALYSE RÉCURSIVE DE CHAQUE VARIABLE
    const analyzedVariables = [];
    for (const variable of variables) {
      console.log(`${indent}🔍 ANALYSE VARIABLE: ${variable.name}`);
      const varAnalysis = await this.analyzeNode(variable.name, depth + 1);
      analyzedVariables.push({
        name: variable.name,
        analysis: varAnalysis
      });
    }
    
    return {
      type: 'formula',
      description: formula.description,
      expression: tokens.map(t => t.type === 'variable' ? `[${t.name}]` : t.value).join(' '),
      variables: analyzedVariables,
      operators,
      health: this.checkFormulaHealth(analyzedVariables)
    };
  }
  
  // ❓ ANALYSE CONDITION (RÉCURSIF !)
  async analyzeCondition(condition, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}❓ CONDITION DÉTECTÉE`);
    
    // TODO: Analyser la structure des conditions
    // Expression → Si [variable] [opérateur] [valeur] alors [action] sinon [action]
    
    return {
      type: 'condition',
      // expression: condition.expression,
      // thenAction: await this.analyzeNode(condition.thenNodeId, depth + 1),
      // elseAction: await this.analyzeNode(condition.elseNodeId, depth + 1)
      raw: condition
    };
  }
  
  // 📊 ANALYSE VARIABLE (RÉCURSIF !)
  async analyzeVariable(variable, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}📊 VARIABLE: ${variable.exposedKey}`);
    console.log(`${indent}   Source: ${variable.sourceType}`);
    console.log(`${indent}   Unité: ${variable.unit || 'aucune'}`);
    
    // Si la variable pointe vers une autre source, l'analyser
    if (variable.sourceRef && variable.sourceType === 'formula') {
      console.log(`${indent}🔗 RÉFÉRENCE VERS: ${variable.sourceRef}`);
      const refAnalysis = await this.analyzeNode(variable.sourceRef, depth + 1);
      return {
        type: 'variable',
        config: variable,
        reference: refAnalysis
      };
    }
    
    return {
      type: 'variable',
      config: variable
    };
  }
  
  // 📋 ANALYSE TABLEAU (RÉCURSIF !)
  async analyzeTable(table, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}📋 TABLEAU DÉTECTÉ`);
    
    return {
      type: 'table',
      raw: table
    };
  }
  
  // 🏗️ ANALYSE STRUCTURE (Options, champs enfants, etc.)
  async analyzeStructure(nodeId, identity, depth = 0) {
    const indent = '  '.repeat(depth);
    
    // Si c'est un champ option, analyser ses options
    if (identity.type === 'leaf_option_field') {
      console.log(`${indent}🎛️ CHAMP SELECT - Analyse des options...`);
      return await this.analyzeSelectField(nodeId, depth + 1);
    }
    
    // Si c'est une branche, analyser ses enfants
    if (identity.type === 'branch') {
      console.log(`${indent}🌳 BRANCHE - Analyse des enfants...`);
      return await this.analyzeBranch(nodeId, depth + 1);
    }
    
    return { type: 'simple' };
  }
  
  // 🎛️ ANALYSE CHAMP SELECT (RÉCURSIF !)
  async analyzeSelectField(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    
    const options = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: nodeId, type: 'leaf_option' },
      orderBy: { label: 'asc' }
    });
    
    console.log(`${indent}📋 OPTIONS (${options.length}):`);
    
    const analyzedOptions = [];
    for (const option of options) {
      console.log(`${indent}  ➤ "${option.label}"`);
      
      // Chercher les champs ouverts par cette option
      const childFields = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: option.id }
      });
      
      const analyzedChildren = [];
      if (childFields.length > 0) {
        console.log(`${indent}    ↳ Ouvre ${childFields.length} champ(s):`);
        for (const child of childFields) {
          console.log(`${indent}      - "${child.label}"`);
          const childAnalysis = await this.analyzeNode(child.id, depth + 2);
          analyzedChildren.push(childAnalysis);
        }
      }
      
      analyzedOptions.push({
        option: option,
        children: analyzedChildren,
        type: childFields.length > 0 ? 'option_plus_field' : 'option_simple'
      });
    }
    
    return {
      type: 'select_field',
      options: analyzedOptions
    };
  }
  
  // 🌳 ANALYSE BRANCHE (RÉCURSIF !)
  async analyzeBranch(nodeId, depth = 0) {
    const indent = '  '.repeat(depth);
    
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: nodeId },
      orderBy: { label: 'asc' }
    });
    
    console.log(`${indent}👥 ENFANTS (${children.length}):`);
    
    const analyzedChildren = [];
    for (const child of children) {
      const childAnalysis = await this.analyzeNode(child.id, depth + 1);
      analyzedChildren.push(childAnalysis);
    }
    
    return {
      type: 'branch',
      children: analyzedChildren
    };
  }
  
  // 🩺 VÉRIFIE LA SANTÉ D'UNE FORMULE
  checkFormulaHealth(variables) {
    const missing = variables.filter(v => v.analysis.status === 'missing');
    const errors = variables.filter(v => v.analysis.status === 'error');
    
    if (missing.length > 0 || errors.length > 0) {
      return {
        status: 'broken',
        missing: missing.map(v => v.name),
        errors: errors.map(v => v.name)
      };
    }
    
    return { status: 'healthy' };
  }
}

// 🚀 LANCEMENT DE L'ANALYSE UNIVERSELLE
async function analyzeUniversal() {
  console.log('🧠 ANALYSEUR UNIVERSEL - SYSTÈME DE COMPRÉHENSION AUTOMATIQUE');
  console.log('='.repeat(80));
  
  const analyzer = new UniversalNodeAnalyzer();
  
  // Test avec le champ Prix Kw/h
  const prixKwhId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
  
  console.log('\n🎯 TEST AVEC LE CHAMP Prix Kw/h:');
  console.log('-'.repeat(50));
  
  const result = await analyzer.analyzeNode(prixKwhId);
  
  console.log('\n📊 RÉSULTAT FINAL:');
  console.log(JSON.stringify(result, null, 2));
  
  await prisma.$disconnect();
}

analyzeUniversal();