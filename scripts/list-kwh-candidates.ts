import { PrismaClient } from '@prisma/client';

/**
 * Liste les nœuds candidats pour: facture annuelle, consommation annuelle, prix kWh
 * Utilisation: npx tsx scripts/list-kwh-candidates.ts
 * (AUCUNE modification en base – lecture seule)
 */

const prisma = new PrismaClient();

const patterns = [
  { key: 'facture', like: ['facture', 'cout', 'coût'] },
  { key: 'consommation', like: ['consommation', 'conso'] },
  { key: 'prix', like: ['prix kwh', 'prix kw/h', 'prix kw', 'prix k'] }
];

async function main() {
  console.log('🔍 Scan des nœuds TreeBranchLeaf pour KWh...');

  for (const pat of patterns) {
    console.log(`\n=== Candidats ${pat.key.toUpperCase()} ===`);
    const whereOR = pat.like.map(txt => ({ label: { contains: txt, mode: 'insensitive' as const } }));
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { OR: whereOR },
      select: {
        id: true,
        label: true,
        type: true,
        subType: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        treeId: true,
        formula_activeId: true,
        data_activeId: true,
        order: true
      },
      orderBy: { label: 'asc' }
    });
    if (nodes.length === 0) {
      console.log('  (aucun)');
      continue;
    }
    nodes.forEach(n => {
      console.log(`  • ${n.label}  id=${n.id}`);
      console.log(`    type=${n.type}/${n.subType} hasData=${n.hasData} hasFormula=${n.hasFormula} hasCondition=${n.hasCondition}`);
      if (n.formula_activeId) console.log(`    formula_activeId=${n.formula_activeId}`);
      if (n.data_activeId) console.log(`    data_activeId=${n.data_activeId}`);
    });
  }

  console.log('\n✅ Termine. Choisis:');
  console.log('  FACTURE: id ...');
  console.log('  CONSOMMATION: id ...');
  console.log('  PRIX: id ... (celui qui DOIT afficher la formule)');
  console.log('\nEnsuite:');
  console.log('  $env:KWH_NODE_FACTURE_ID="..."; $env:KWH_NODE_CONSO_ID="..."; $env:KWH_NODE_PRIX_NODE_ID="...";');
  console.log('  npx tsx scripts/link-kwh-formula.ts');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
