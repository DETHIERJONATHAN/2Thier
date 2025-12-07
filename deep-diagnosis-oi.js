import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function deepDiagnosis() {
  try {
    console.log('═'.repeat(80));
    console.log('🔍 DIAGNOSTIC APPROFONDI: orientation-inclinaison ne se copie pas');
    console.log('═'.repeat(80) + '\n');

    // 1. Trouver la table O-I
    console.log('📊 ÉTAPE 1: Trouver les tables O-I');
    const oiTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        name: { contains: 'O-I', mode: 'insensitive' }
      },
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true,
            linkedTableIds: true,
            TreeBranchLeafNodeVariable: {
              select: {
                id: true,
                exposedKey: true,
                sourceRef: true,
                sourceType: true
              }
            }
          }
        }
      }
    });

    if (oiTables.length === 0) {
      console.log('❌ Aucune table O-I trouvée!');
      return;
    }

    console.log(`✅ Trouvé ${oiTables.length} table(s):\n`);
    
    for (const table of oiTables) {
      console.log(`TABLE: ${table.name} (ID: ${table.id})`);
      console.log(`  Nœud propriétaire: ${table.TreeBranchLeafNode?.label || 'NULL'}`);
      
      const node = table.TreeBranchLeafNode;
      if (node) {
        console.log(`  Nœud ID: ${node.id}`);
        console.log(`  Nœud type: ${node.type}`);
        console.log(`  linkedTableIds: ${node.linkedTableIds ? JSON.stringify(node.linkedTableIds) : 'null'}`);
        
        // Vérifier si cette table est dans linkedTableIds
        const isLinked = node.linkedTableIds && 
          (Array.isArray(node.linkedTableIds) 
            ? node.linkedTableIds.includes(table.id)
            : Object.values(node.linkedTableIds).includes(table.id));
        
        console.log(`  ➡️ Cette table dans linkedTableIds? ${isLinked ? '✅ OUI' : '❌ NON'}`);
        
        // Variables du nœud
        console.log(`  Variables du nœud (${node.TreeBranchLeafNodeVariable?.length || 0}):`);
        if (node.TreeBranchLeafNodeVariable && node.TreeBranchLeafNodeVariable.length > 0) {
          node.TreeBranchLeafNodeVariable.forEach((v, i) => {
            console.log(`    [${i}] ${v.exposedKey}`);
            console.log(`        sourceType: ${v.sourceType}`);
            console.log(`        sourceRef: ${v.sourceRef}`);
            
            // Vérifier si pointe vers cette table
            if (v.sourceRef && v.sourceRef.includes(table.id)) {
              console.log(`        ✅ POINTE VERS CETTE TABLE`);
            }
          });
        } else {
          console.log('    ⚠️ AUCUNE variable!');
        }
      } else {
        console.log('  ❌ Nœud propriétaire NULL!');
      }
      console.log('');
    }

    // 2. Vérifier linkedTableIds globalement
    console.log('\n📌 ÉTAPE 2: Nœuds avec linkedTableIds remplis?');
    
    const nodesWithLinkedTables = await prisma.treeBranchLeafNode.findMany({
      where: {
        linkedTableIds: {
          hasSome: ['0701ed66-22ff-4af5-862b-e553386de9d6', '0701ed66-22ff-4af5-862b-e553386de9d6-1']
        }
      },
      select: {
        id: true,
        label: true,
        type: true,
        linkedTableIds: true
      }
    });

    if (nodesWithLinkedTables.length === 0) {
      console.log('⚠️ Pas de nœud avec linkedTableIds pointant vers O-I');
    } else {
      console.log(`✅ Trouvé ${nodesWithLinkedTables.length} nœud(s) avec linkedTableIds vers O-I:`);
      nodesWithLinkedTables.forEach((n, i) => {
        console.log(`  [${i}] ${n.label} (${n.type})`);
        console.log(`      linkedTableIds: ${JSON.stringify(n.linkedTableIds)}`);
      });
    }

    // 3. Voir comment les REPEATERs sont dupliqués
    console.log('\n🔄 ÉTAPE 3: Vérifier la duplication d\'un REPEATER');
    
    const testRepeater = await prisma.treeBranchLeafNode.findFirst({
      where: { type: 'REPEATER' },
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });

    if (testRepeater) {
      console.log(`Nœud test: ${testRepeater.label}`);
      console.log(`  Variables: ${testRepeater.TreeBranchLeafNodeVariable?.length || 0}`);
      console.log(`  linkedTableIds: ${JSON.stringify(testRepeater.linkedTableIds)}`);
    }

    // 4. Vérifier si linkedTableIds est synchronisé après copie
    console.log('\n🔗 ÉTAPE 4: Synchronisation linkedTableIds après copie');
    
    const nodesCopies = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { contains: '-1' }
      },
      select: {
        id: true,
        label: true,
        linkedTableIds: true
      },
      take: 3
    });

    if (nodesCopies.length === 0) {
      console.log('ℹ️ Pas de nœuds copiés trouvés (pas de label avec -1)');
    } else {
      console.log(`Nœuds copiés: ${nodesCopies.length}`);
      nodesCopies.forEach((n) => {
        console.log(`  ${n.label}: linkedTableIds = ${JSON.stringify(n.linkedTableIds)}`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('💡 HYPOTHÈSES:');
    console.log('═'.repeat(80));
    console.log('1. linkedTableIds n\'est pas synchronisé entre source et copie');
    console.log('2. Aucune variable ne pointe vers la table O-I');
    console.log('3. La table O-I n\'est pas dans le nœud propriétaire linkedTableIds');
    console.log('4. copyTableCapacity est appelée mais linkedTableIds n\'est pas mis à jour');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepDiagnosis();
