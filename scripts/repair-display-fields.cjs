/**
 * Script de réparation des champs d'affichage (données d'affichage)
 * 
 * Ce script trouve tous les nœuds d'affichage créés par variable-copy-engine
 * (identifiés par metadata.fromVariableId) et vérifie/répare leurs formules et conditions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 RÉPARATION DES CHAMPS D\'AFFICHAGE');
  console.log('='.repeat(60));
  
  // Trouver tous les nœuds avec fromVariableId dans metadata (= champs d'affichage)
  // Comme le filtre JSON path ne fonctionne pas directement, on récupère tous les nœuds avec metadata
  const allNodesRaw = await prisma.treeBranchLeafNode.findMany({
    where: {
      metadata: {
        not: null
      }
    },
    select: {
      id: true,
      label: true,
      metadata: true,
      hasFormula: true,
      hasCondition: true,
      linkedFormulaIds: true,
      linkedConditionIds: true
    }
  });
  
  // Filtrer en JS pour ceux qui ont fromVariableId
  const allNodes = allNodesRaw.filter(n => {
    if (!n.metadata || typeof n.metadata !== 'object') return false;
    return 'fromVariableId' in n.metadata && n.metadata.fromVariableId;
  });
  
  console.log(`\n📋 Trouvé ${allNodes.length} nœuds d'affichage avec fromVariableId\n`);
  
  let repaired = 0;
  let alreadyOk = 0;
  let errors = 0;
  
  for (const node of allNodes) {
    const metadata = node.metadata;
    const fromVariableId = metadata?.fromVariableId;
    
    if (!fromVariableId) continue;
    
    console.log(`\n🔍 Analyse: "${node.label}" (${node.id})`);
    console.log(`   fromVariableId: ${fromVariableId}`);
    
    // Trouver la variable originale pour obtenir son nodeId
    const originalVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { id: fromVariableId },
      select: { nodeId: true, displayName: true }
    });
    
    // Si pas trouvée directement, c'est peut-être une variable copiée
    // Essayer de trouver l'originale en enlevant le suffixe
    let originalNodeId = null;
    
    if (originalVariable) {
      // La variable copiée pointe vers son propre nodeId (qui est le display node)
      // On doit trouver la variable ORIGINALE
      const suffixMatch = fromVariableId.match(/-(\d+)$/);
      if (suffixMatch) {
        const originalVarId = fromVariableId.replace(/-\d+$/, '');
        const trueOriginal = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: originalVarId },
          select: { nodeId: true, displayName: true }
        });
        if (trueOriginal) {
          originalNodeId = trueOriginal.nodeId;
          console.log(`   📌 Variable originale trouvée: ${originalVarId} → nodeId: ${originalNodeId}`);
        }
      }
    }
    
    if (!originalNodeId) {
      // Fallback: essayer de déduire le nodeId original du displayNodeId
      const suffixMatch = node.id.match(/-(\d+)$/);
      if (suffixMatch) {
        originalNodeId = node.id.replace(/-\d+$/, '');
        console.log(`   📌 NodeId original déduit: ${originalNodeId}`);
      }
    }
    
    if (!originalNodeId) {
      console.log(`   ⚠️ Impossible de trouver le nœud original, skip`);
      errors++;
      continue;
    }
    
    // Récupérer le nœud original
    const originalNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalNodeId },
      select: { id: true, label: true, hasFormula: true, hasCondition: true }
    });
    
    if (!originalNode) {
      console.log(`   ⚠️ Nœud original ${originalNodeId} non trouvé, skip`);
      errors++;
      continue;
    }
    
    console.log(`   📌 Nœud original: "${originalNode.label}" (${originalNode.id})`);
    console.log(`      hasFormula: ${originalNode.hasFormula}, hasCondition: ${originalNode.hasCondition}`);
    
    // Compter les formules et conditions
    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalNodeId }
    });
    const copyFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: node.id }
    });
    
    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: originalNodeId }
    });
    const copyConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: node.id }
    });
    
    console.log(`   📊 Formules: original=${originalFormulas.length}, copie=${copyFormulas.length}`);
    console.log(`   📊 Conditions: original=${originalConditions.length}, copie=${copyConditions.length}`);
    
    const needsRepair = 
      (originalFormulas.length > 0 && copyFormulas.length === 0) ||
      (originalConditions.length > 0 && copyConditions.length === 0);
    
    if (!needsRepair) {
      console.log(`   ✅ Déjà OK`);
      alreadyOk++;
      continue;
    }
    
    console.log(`   🔧 RÉPARATION NÉCESSAIRE`);
    
    // Extraire le suffixe
    const suffixMatch = node.id.match(/-(\d+)$/);
    const suffix = suffixMatch ? suffixMatch[1] : '1';
    
    const copiedFormulaIds = [];
    const copiedConditionIds = [];
    
    // Copier les formules manquantes
    if (originalFormulas.length > 0 && copyFormulas.length === 0) {
      console.log(`   📋 Copie de ${originalFormulas.length} formules...`);
      
      for (const f of originalFormulas) {
        const newFormulaId = `${f.id}-${suffix}`;
        
        // Vérifier si existe déjà
        const existing = await prisma.treeBranchLeafNodeFormula.findUnique({ where: { id: newFormulaId } });
        if (existing) {
          console.log(`      ♻️ ${newFormulaId} existe déjà`);
          copiedFormulaIds.push(newFormulaId);
          continue;
        }
        
        // Remplacer les IDs dans les tokens
        let newTokens = f.tokens;
        if (newTokens) {
          let tokensStr = JSON.stringify(newTokens);
          // Remplacer originalNodeId par node.id
          tokensStr = tokensStr.split(originalNodeId).join(node.id);
          newTokens = JSON.parse(tokensStr);
        }
        
        await prisma.treeBranchLeafNodeFormula.create({
          data: {
            id: newFormulaId,
            nodeId: node.id,
            organizationId: f.organizationId,
            name: f.name ? `${f.name} (${suffix})` : f.name,
            tokens: newTokens,
            description: f.description,
            isDefault: f.isDefault,
            order: f.order,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        copiedFormulaIds.push(newFormulaId);
        console.log(`      ✅ Créé: ${newFormulaId}`);
      }
    }
    
    // Copier les conditions manquantes
    if (originalConditions.length > 0 && copyConditions.length === 0) {
      console.log(`   📋 Copie de ${originalConditions.length} conditions...`);
      
      for (const c of originalConditions) {
        const newConditionId = `${c.id}-${suffix}`;
        
        // Vérifier si existe déjà
        const existing = await prisma.treeBranchLeafNodeCondition.findUnique({ where: { id: newConditionId } });
        if (existing) {
          console.log(`      ♻️ ${newConditionId} existe déjà`);
          copiedConditionIds.push(newConditionId);
          continue;
        }
        
        // Remplacer les IDs dans le conditionSet
        let newConditionSet = c.conditionSet;
        if (newConditionSet) {
          let setStr = JSON.stringify(newConditionSet);
          setStr = setStr.split(originalNodeId).join(node.id);
          // Aussi remplacer les IDs de formules
          for (const fId of copiedFormulaIds) {
            const origFId = fId.replace(new RegExp(`-${suffix}$`), '');
            setStr = setStr.split(origFId).join(fId);
          }
          newConditionSet = JSON.parse(setStr);
        }
        
        await prisma.treeBranchLeafNodeCondition.create({
          data: {
            id: newConditionId,
            nodeId: node.id,
            organizationId: c.organizationId,
            name: c.name ? `${c.name} (${suffix})` : c.name,
            conditionSet: newConditionSet,
            description: c.description,
            isDefault: c.isDefault,
            order: c.order,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        copiedConditionIds.push(newConditionId);
        console.log(`      ✅ Créé: ${newConditionId}`);
      }
    }
    
    // Mettre à jour le nœud
    const updateData = {};
    if (copiedFormulaIds.length > 0) {
      updateData.hasFormula = true;
      updateData.linkedFormulaIds = copiedFormulaIds;
    }
    if (copiedConditionIds.length > 0) {
      updateData.hasCondition = true;
      updateData.linkedConditionIds = copiedConditionIds;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: updateData
      });
      console.log(`   ✅ Nœud mis à jour: hasFormula=${updateData.hasFormula || node.hasFormula}, hasCondition=${updateData.hasCondition || node.hasCondition}`);
    }
    
    repaired++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ:');
  console.log(`   ✅ Déjà OK: ${alreadyOk}`);
  console.log(`   🔧 Réparés: ${repaired}`);
  console.log(`   ⚠️ Erreurs: ${errors}`);
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
