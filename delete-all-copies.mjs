import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🗑️  SUPPRESSION DE TOUTES LES COPIES\n');
console.log('='.repeat(80));

const REPEATER_ID = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';

const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: REPEATER_ID },
  select: { metadata: true }
});

const templateNodeIds = repeater.metadata?.repeater?.templateNodeIds || [];

console.log(`\n📦 Recherche de toutes les copies des ${templateNodeIds.length} nœuds du template...\n`);

let totalDeleted = 0;

for (const templateId of templateNodeIds) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: templateId },
    select: { label: true }
  });

  // Chercher toutes les copies (avec n'importe quel suffixe)
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: {
        startsWith: templateId + '-'
      }
    },
    select: {
      id: true,
      label: true
    }
  });

  if (copies.length > 0) {
    console.log(`${node?.label || templateId}:`);
    console.log(`  Trouvé ${copies.length} copie(s)`);

    // Supprimer chaque copie
    for (const copy of copies) {
      await prisma.treeBranchLeafNode.delete({
        where: { id: copy.id }
      });
      console.log(`    ✅ Supprimé: ${copy.label || copy.id}`);
      totalDeleted++;
    }
    console.log();
  }
}

console.log('='.repeat(80));
console.log(`\n🎉 TERMINÉ !\n`);
console.log(`Total suppressions: ${totalDeleted} nœud(s)\n`);

if (totalDeleted > 0) {
  console.log('✅ Toutes les copies ont été supprimées');
  console.log('✅ La prochaine répétition créera des nœuds -1\n');
} else {
  console.log('ℹ️  Aucune copie trouvée\n');
}

console.log('🚀 Vous pouvez maintenant:');
console.log('   1. Démarrer le serveur: npm run dev');
console.log('   2. Créer une nouvelle répétition');
console.log('   3. Tous les nœuds auront le suffixe -1\n');

console.log('='.repeat(80));

await prisma.$disconnect();
