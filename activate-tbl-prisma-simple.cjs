const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TreeBranchLeaf', 'treebranchleaf-new', 'api', 'treebranchleaf-routes.ts');

try {
  console.log('🔧 Activation du système TBL-prisma...');
  
  // Lire le fichier
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Créer le nouveau contenu de la fonction 
  const newFunctionBody = `  try {
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
  
  // Remplacer les lignes 422-424
  const lines = content.split('\n');
  
  // Trouver et remplacer les lignes spécifiques
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('// 🚨 TEMPORAIREMENT: Retourner vers l\'ancienne logique qui FONCTIONNE')) {
      // Remplacer les 3 lignes suivantes (422, 423, 424)
      lines.splice(i, 3, newFunctionBody);
      break;
    }
  }
  
  // Rejoindre les lignes
  content = lines.join('\n');
  
  // Écrire le fichier modifié
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Système TBL-prisma activé avec succès!');
  
} catch (error) {
  console.error('❌ Erreur lors de l\'activation:', error);
  process.exit(1);
}