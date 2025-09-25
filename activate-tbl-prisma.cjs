const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TreeBranchLeaf', 'treebranchleaf-new', 'api', 'treebranchleaf-routes.ts');

try {
  console.log('🔧 Activation du système TBL-prisma...');
  
  // Lire le fichier
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer la fonction buildDetailAndResultForOperation
  const oldFunctionPattern = /console\.log\('\[buildDetailAndResultForOperation\] 🎯 Construction pour type:', type, 'record ID:', record\?\.id\);\s*\/\/ 🚨 TEMPORAIREMENT: Retourner vers l'ancienne logique qui FONCTIONNE\s*console\.log\('\[buildDetailAndResultForOperation\] � Utilisation de l\'ancienne logique \(système TBL-prisma temporairement désactivé\)'\);\s*return buildDetailAndResultForOperationLegacy\(type, record, display, valueStr, unit, labelMap, valuesMap, prisma\);/s;
  
  const newFunction = `console.log('[buildDetailAndResultForOperation] 🎯 Construction pour type:', type, 'record ID:', record?.id);
  
  try {
    // 🚀 NOUVEAU SYSTÈME TBL-PRISMA ACTIVÉ avec logique fonctionnelle portée
    console.log('[buildDetailAndResultForOperation] ✅ Utilisation du système TBL-prisma avec logique fonctionnelle');
    
    if (type === 'condition') {
      // Import du calculateur de conditions avec logique fonctionnelle
      const { ConditionCalculator } = await import('../tbl-prisma/conditions/condition-calculator');
      const calculator = new ConditionCalculator(prisma);
      
      const result = await calculator.buildConditionExpressionReadable(
        record.id,
        organizationId,
        labelMap,
        valuesMap
      );
      
      return {
        detail: result,
        result: result
      };
    }
    
    if (type === 'formula') {
      // Import du calculateur de formules avec logique fonctionnelle
      const { FormulaCalculator } = await import('../tbl-prisma/formulas/formula-calculator');
      const calculator = new FormulaCalculator(prisma);
      
      const result = await calculator.calculateFormula(
        record.id,
        organizationId,
        labelMap,
        valuesMap
      );
      
      return {
        detail: result,
        result: result
      };
    }
    
    if (type === 'table') {
      // Pour les tables, utiliser la logique existante pour le moment
      console.log('[buildDetailAndResultForOperation] 📊 Table calculation - utilisation logique existante');
      return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
    }
    
    // Fallback par défaut
    console.log('[buildDetailAndResultForOperation] ⚠️ Type non reconnu, fallback vers legacy');
    return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
    
  } catch (error) {
    console.error('[buildDetailAndResultForOperation] ❌ Erreur TBL-prisma, fallback vers legacy:', error);
    // En cas d'erreur, retourner vers l'ancienne logique
    return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
  }`;
  
  // Remplacer uniquement la partie problématique
  const searchText = "  // 🚨 TEMPORAIREMENT: Retourner vers l'ancienne logique qui FONCTIONNE\n  console.log('[buildDetailAndResultForOperation] � Utilisation de l\\'ancienne logique (système TBL-prisma temporairement désactivé)');\n  return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);";
  
  const replaceText = `try {
    // 🚀 NOUVEAU SYSTÈME TBL-PRISMA ACTIVÉ avec logique fonctionnelle portée
    console.log('[buildDetailAndResultForOperation] ✅ Utilisation du système TBL-prisma avec logique fonctionnelle');
    
    if (type === 'condition') {
      // Import du calculateur de conditions avec logique fonctionnelle
      const { ConditionCalculator } = await import('../tbl-prisma/conditions/condition-calculator');
      const calculator = new ConditionCalculator(prisma);
      
      const result = await calculator.buildConditionExpressionReadable(
        record.id,
        organizationId,
        labelMap,
        valuesMap
      );
      
      return {
        detail: result,
        result: result
      };
    }
    
    if (type === 'formula') {
      // Import du calculateur de formules avec logique fonctionnelle
      const { FormulaCalculator } = await import('../tbl-prisma/formulas/formula-calculator');
      const calculator = new FormulaCalculator(prisma);
      
      const result = await calculator.calculateFormula(
        record.id,
        organizationId,
        labelMap,
        valuesMap
      );
      
      return {
        detail: result,
        result: result
      };
    }
    
    if (type === 'table') {
      // Pour les tables, utiliser la logique existante pour le moment
      console.log('[buildDetailAndResultForOperation] 📊 Table calculation - utilisation logique existante');
      return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
    }
    
    // Fallback par défaut
    console.log('[buildDetailAndResultForOperation] ⚠️ Type non reconnu, fallback vers legacy');
    return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
    
  } catch (error) {
    console.error('[buildDetailAndResultForOperation] ❌ Erreur TBL-prisma, fallback vers legacy:', error);
    // En cas d'erreur, retourner vers l'ancienne logique
    return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);
  }`;
  
  if (content.includes(searchText)) {
    content = content.replace(searchText, replaceText);
    console.log('✅ Remplacement effectué avec succès');
  } else {
    console.log('❌ Texte de recherche non trouvé, tentative de remplacement alternatif...');
    
    // Essayer un autre pattern
    const altSearchText = "// 🚨 TEMPORAIREMENT: Retourner vers l'ancienne logique qui FONCTIONNE\n  console.log('[buildDetailAndResultForOperation] � Utilisation de l\\'ancienne logique (système TBL-prisma temporairement désactivé)');\n  return buildDetailAndResultForOperationLegacy(type, record, display, valueStr, unit, labelMap, valuesMap, prisma);";
    
    if (content.includes(altSearchText)) {
      content = content.replace(altSearchText, replaceText);
      console.log('✅ Remplacement alternatif effectué avec succès');
    } else {
      console.log('⚠️ Aucun pattern trouvé, affichage du contenu pour diagnostic...');
      const lines = content.split('\n');
      for (let i = 400; i < 430; i++) {
        if (lines[i]) {
          console.log(`${i+1}: ${lines[i]}`);
        }
      }
      process.exit(1);
    }
  }
  
  // Écrire le fichier modifié
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Système TBL-prisma activé avec succès!');
  
} catch (error) {
  console.error('❌ Erreur lors de l\'activation:', error);
  process.exit(1);
}