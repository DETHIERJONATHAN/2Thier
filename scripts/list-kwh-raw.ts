import { PrismaClient } from '@prisma/client';

// Liste brute (JSON) des nœuds liés à facture / consommation / prix kWh
// Usage: npx tsx scripts/list-kwh-raw.ts

const prisma = new PrismaClient();

async function run() {
  const patterns = [
    'facture',
    'consommation',
    'prix',
    'kwh',
    'kw/h'
  ];

  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: patterns.map(p => ({ label: { contains: p, mode: 'insensitive' } }))
    },
    take: 200
  });

  const simplified = nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
    hasData: n.hasData,
    hasFormula: n.hasFormula,
    hasCondition: n.hasCondition,
    formula_activeId: n.formula_activeId
  }));

  // Filtrages ciblés
  const facture = simplified.filter(n => /facture/i.test(n.label));
  const conso = simplified.filter(n => /consommation/i.test(n.label));
  const prix = simplified.filter(n => /(prix|kwh|kw\/h)/i.test(n.label));

  console.log(JSON.stringify({ facture, conso, prix }, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
