import { db } from './lib/database.js';

const prisma = db;

async function main() {
  console.log('🧹 NETTOYAGE COMPLET DES COPIES\n');

  // Supprimer toutes les copies avec suffixe -1 ou -2
  const deleted = await prisma.treeBranchLeafNode.deleteMany({
    where: {
      id: {
        endsWith: '-1'
      }
    }
  });

  const deleted2 = await prisma.treeBranchLeafNode.deleteMany({
    where: {
      id: {
        endsWith: '-2'
      }
    }
  });

  console.log(`✅ ${deleted.count} copies -1 supprimées`);
  console.log(`✅ ${deleted2.count} copies -2 supprimées`);
  
  // Vérifier que le template est intact
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c' },
    select: {
      label: true,
      metadata: true
    }
  });

  const templateIds = (repeater?.metadata as any)?.repeater?.templateNodeIds || [];
  console.log(`\n📋 Template du répéteur (${templateIds.length} nœuds):`);
  
  for (const id of templateIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id },
      select: { label: true, type: true }
    });
    if (node) {
      console.log(`   ✅ ${node.label} (${node.type})`);
    } else {
      console.log(`   ❌ ${id} (MANQUANT!)`);
    }
  }

  console.log('\n✨ Prêt pour un nouveau test !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
