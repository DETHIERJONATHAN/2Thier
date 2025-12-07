import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deepAnalysis() {
  console.log('🔍 ANALYSE APPROFONDIE DES 3 VARIABLES\n');
  console.log('='.repeat(80));

  const variables = [
    { name: 'Rampant toiture', id: 'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72' },
    { name: 'Orientation-Inclinaison', id: 'ac81b3a7-5e5a-4c13-90f5-51503aadc748' },
    { name: 'Longueur toiture', id: '42de8d47-1300-49e0-bb00-f2dc3e4052d6' }
  ];

  for (const varInfo of variables) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 ${varInfo.name.toUpperCase()}`);
    console.log('='.repeat(80));

    // 1. VARIABLE SOURCE
    const sourceVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: varInfo.id },
      select: {
        id: true,
        displayName: true,
        nodeId: true,
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            parentId: true
          }
        }
      }
    });

    console.log('\n1️⃣ VARIABLE SOURCE:');
    if (sourceVar) {
      console.log(`  ✅ Existe: ${sourceVar.displayName || varInfo.name}`);
      console.log(`  ID: ${sourceVar.id}`);
      console.log(`  nodeId: ${sourceVar.nodeId || 'NULL'}`);
      if (sourceVar.TreeBranchLeafNode) {
        console.log(`  Nœud lié: ${sourceVar.TreeBranchLeafNode.label}`);
        console.log(`  Parent du nœud: ${sourceVar.TreeBranchLeafNode.parentId}`);
      }
    } else {
      console.log('  ❌ N\'existe pas');
    }

    // 2. VARIABLE COPIÉE
    const copiedVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: `${varInfo.id}-1` },
      select: {
        id: true,
        displayName: true,
        nodeId: true,
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            parentId: true
          }
        }
      }
    });

    console.log('\n2️⃣ VARIABLE COPIÉE:');
    if (copiedVar) {
      console.log(`  ✅ Existe: ${copiedVar.displayName || `${varInfo.name}-1`}`);
      console.log(`  ID: ${copiedVar.id}`);
      console.log(`  nodeId: ${copiedVar.nodeId || 'NULL'}`);
      if (copiedVar.TreeBranchLeafNode) {
        console.log(`  Nœud lié: ${copiedVar.TreeBranchLeafNode.label}`);
        console.log(`  Parent du nœud: ${copiedVar.TreeBranchLeafNode.parentId}`);
      }
    } else {
      console.log('  ❌ N\'existe pas - PAS COPIÉE !');
    }

    // 3. NŒUDS D'AFFICHAGE
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          {
            metadata: {
              path: ['fromVariableId'],
              equals: varInfo.id
            }
          },
          {
            metadata: {
              path: ['fromVariableId'],
              equals: `${varInfo.id}-1`
            }
          }
        ]
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('\n3️⃣ NŒUDS D\'AFFICHAGE:');
    if (displayNodes.length === 0) {
      console.log('  ❌ Aucun nœud d\'affichage trouvé');
    } else {
      for (const node of displayNodes) {
        const isCopy = node.id.includes('-1');
        console.log(`\n  ${isCopy ? '🟢 COPIE' : '🔵 SOURCE'}:`);
        console.log(`    ID: ${node.id}`);
        console.log(`    Label: ${node.label}`);
        console.log(`    ParentId: ${node.parentId}`);
        console.log(`    fromVariableId: ${node.metadata?.fromVariableId}`);

        // Vérifier le parent
        if (node.parentId) {
          const parent = await prisma.treeBranchLeafNode.findUnique({
            where: { id: node.parentId },
            select: { id: true, label: true, type: true }
          });
          
          if (parent) {
            console.log(`    Parent: ${parent.label} (${parent.type})`);
            
            // Si c'est une copie, vérifier si le parent est correct
            if (isCopy && sourceVar?.TreeBranchLeafNode) {
              const expectedParentId = `${sourceVar.TreeBranchLeafNode.parentId}-1`;
              const isCorrect = node.parentId === expectedParentId;
              console.log(`    Attendu: ${expectedParentId}`);
              console.log(`    ${isCorrect ? '✅' : '❌'} Parent ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
            }
          } else {
            console.log(`    Parent: ❌ INTROUVABLE`);
          }
        }
      }
    }

    // 4. CHAMPS UTILISANT CETTE VARIABLE
    const fieldsWithVar = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['linkedVariableIds'],
          array_contains: varInfo.id
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      }
    });

    const copiedFieldsWithVar = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['linkedVariableIds'],
          array_contains: `${varInfo.id}-1`
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      }
    });

    console.log('\n4️⃣ CHAMPS UTILISANT CETTE VARIABLE:');
    console.log(`  Sources: ${fieldsWithVar.length}`);
    console.log(`  Copiés: ${copiedFieldsWithVar.length}`);

    if (fieldsWithVar.length > 0) {
      console.log('\n  Champs sources:');
      for (const field of fieldsWithVar) {
        console.log(`    • ${field.label} (parent: ${field.parentId})`);
      }
    }

    if (copiedFieldsWithVar.length > 0) {
      console.log('\n  Champs copiés:');
      for (const field of copiedFieldsWithVar) {
        console.log(`    • ${field.label} (parent: ${field.parentId})`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 RÉSUMÉ DES PROBLÈMES:\n');

  // Résumé final
  for (const varInfo of variables) {
    const copiedVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: `${varInfo.id}-1` }
    });

    const displayNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        metadata: {
          path: ['fromVariableId'],
          equals: `${varInfo.id}-1`
        }
      }
    });

    console.log(`${varInfo.name}:`);
    console.log(`  Variable copiée: ${copiedVar ? '✅' : '❌'}`);
    console.log(`  Nœud d'affichage copié: ${displayNode ? '✅' : '❌'}`);
    
    if (displayNode && copiedVar) {
      const hasSection = displayNode.parentId?.includes('section-');
      console.log(`  Parent a "section-": ${hasSection ? '❌ OUI' : '✅ NON'}`);
    }
    console.log();
  }
}

deepAnalysis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
