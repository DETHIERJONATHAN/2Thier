/**
 * Script pour analyser pourquoi les formules/conditions de "Rampant toiture" ne sont pas copiées
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(80));
  console.log('🔍 ANALYSE: Rampant toiture et ses copies');
  console.log('═'.repeat(80));

  // Trouver tous les nœuds "Rampant toiture"
  const rampantNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Rampant toiture' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      parentId: true,
      hasFormula: true,
      hasCondition: true,
      linkedFormulaIds: true,
      linkedConditionIds: true,
      metadata: true
    }
  });

  console.log(`\nTrouvé ${rampantNodes.length} nœuds "Rampant toiture":\n`);

  for (const node of rampantNodes) {
    const isCopy = node.id.includes('-');
    console.log(`\n${isCopy ? '📋 COPIE' : '📍 ORIGINAL'}: ${node.label} (${node.id})`);
    console.log(`   parentId: ${node.parentId}`);
    console.log(`   hasFormula: ${node.hasFormula} | hasCondition: ${node.hasCondition}`);
    console.log(`   linkedFormulaIds: ${JSON.stringify(node.linkedFormulaIds)}`);
    console.log(`   linkedConditionIds: ${JSON.stringify(node.linkedConditionIds)}`);

    // Métadonnées de copie
    if (node.metadata && typeof node.metadata === 'object') {
      const meta = node.metadata;
      console.log(`   metadata.copiedFromNodeId: ${meta.copiedFromNodeId || 'N/A'}`);
      console.log(`   metadata.copySuffix: ${meta.copySuffix || 'N/A'}`);
    }

    // Chercher les formules liées
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: node.id },
      select: { id: true, name: true }
    });

    console.log(`   📐 Formules dans DB: ${formulas.length}`);
    for (const f of formulas) {
      console.log(`      - ${f.name || 'Sans nom'} (${f.id})`);
    }

    // Chercher les conditions liées
    const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: node.id },
      select: { id: true, name: true }
    });

    console.log(`   📊 Conditions dans DB: ${conditions.length}`);
    for (const c of conditions) {
      console.log(`      - ${c.name || 'Sans nom'} (${c.id})`);
    }
  }

  // Maintenant, trouver les formules de l'ORIGINAL et voir si elles ont été copiées
  console.log('\n\n' + '═'.repeat(80));
  console.log('🔍 DÉTAIL DES FORMULES DE L\'ORIGINAL vs COPIE');
  console.log('═'.repeat(80));

  const original = rampantNodes.find(n => !n.id.includes('-'));
  const copy = rampantNodes.find(n => n.id.includes('-1'));

  if (original) {
    console.log(`\nOriginal: ${original.id}`);
    
    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: original.id }
    });

    for (const f of originalFormulas) {
      console.log(`\n📐 Formule originale: ${f.name} (${f.id})`);
      
      // Vérifier si la copie existe
      const expectedCopyId = f.id + '-1';
      const copiedFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: expectedCopyId }
      });

      if (copiedFormula) {
        console.log(`   ✅ Copie trouvée: ${copiedFormula.id}`);
        console.log(`      nodeId: ${copiedFormula.nodeId}`);
      } else {
        console.log(`   ❌ Copie INTROUVABLE: ${expectedCopyId}`);
        
        // Chercher si une formule avec un autre ID existe pour la copie
        const anyFormulaForCopy = await prisma.treeBranchLeafNodeFormula.findFirst({
          where: { 
            nodeId: copy?.id,
            name: f.name
          }
        });

        if (anyFormulaForCopy) {
          console.log(`   ⚠️ Formule alternative trouvée pour la copie:`);
          console.log(`      ID: ${anyFormulaForCopy.id}`);
        }
      }
    }

    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: original.id }
    });

    for (const c of originalConditions) {
      console.log(`\n📊 Condition originale: ${c.name} (${c.id})`);
      
      const expectedCopyId = c.id + '-1';
      const copiedCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: expectedCopyId }
      });

      if (copiedCondition) {
        console.log(`   ✅ Copie trouvée: ${copiedCondition.id}`);
      } else {
        console.log(`   ❌ Copie INTROUVABLE: ${expectedCopyId}`);
      }
    }
  }

  // Analyser la hiérarchie pour comprendre pourquoi les formules ne sont pas copiées
  console.log('\n\n' + '═'.repeat(80));
  console.log('🔍 HIÉRARCHIE DU REPEAT');
  console.log('═'.repeat(80));

  if (original) {
    // Remonter la hiérarchie
    let currentNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: original.parentId || '' },
      select: { id: true, label: true, type: true, parentId: true }
    });

    const hierarchy = [{ id: original.id, label: original.label, type: original.type }];
    
    while (currentNode) {
      hierarchy.unshift({ id: currentNode.id, label: currentNode.label, type: currentNode.type });
      if (currentNode.parentId) {
        currentNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: currentNode.parentId },
          select: { id: true, label: true, type: true, parentId: true }
        });
      } else {
        currentNode = null;
      }
    }

    console.log('\nHiérarchie:');
    hierarchy.forEach((h, i) => {
      const isRepeater = h.type === 'leaf_repeater';
      console.log(`${'  '.repeat(i)}${isRepeater ? '🔄' : '📁'} ${h.label} (${h.type}) - ${h.id}`);
    });
  }

  console.log('\n' + '═'.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
