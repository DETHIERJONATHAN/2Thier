const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  
  // Récupérer une soumission récente
  console.log('=== SOUMISSIONS RECENTES ===');
  const submissions = await prisma.treeBranchLeafSubmission.findMany({
    where: { treeId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { Lead: { select: { firstName: true, lastName: true } } }
  });
  
  console.log('Total soumissions trouvées:', submissions.length);
  
  if (submissions.length === 0) {
    console.log('Pas de soumission trouvée');
    await prisma.$disconnect();
    return;
  }
  
  // Prendre la première soumission
  const sub = submissions[0];
  console.log(`\nSoumission: ${sub.id}`);
  console.log(`Lead: ${sub.Lead?.firstName} ${sub.Lead?.lastName}`);
  console.log(`Créée: ${sub.createdAt}`);
  
  // Données de la soumission
  console.log('\n=== DONNEES SOUMISSION (data) ===');
  const data = sub.data || {};
  console.log('Type:', typeof data);
  console.log('Keys:', Object.keys(data).length);
  
  // Afficher toutes les clés et valeurs
  console.log('\n--- TOUTES LES DONNEES ---');
  Object.entries(data).forEach(([key, value]) => {
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    console.log(`${key}: ${valStr.substring(0, 80)}`);
  });
  
  // Chercher les données liées aux prix
  console.log('\n=== DONNEES PRIX/DEVIS ===');
  const priceKeys = Object.keys(data).filter(k => {
    const kl = k.toLowerCase();
    return kl.includes('prix') || kl.includes('total') || kl.includes('kwh') || kl.includes('panneau') || kl.includes('puissance');
  });
  priceKeys.forEach(k => {
    console.log(`${k}: ${data[k]}`);
  });
  
  // Chercher les repeaters dans les données
  console.log('\n=== DONNEES REPEATERS ===');
  const repeaterKeys = Object.keys(data).filter(k => k.includes('repeat') || k.includes('_instance'));
  repeaterKeys.forEach(k => {
    console.log(`${k}: ${JSON.stringify(data[k]).substring(0, 100)}`);
  });
  
  // Données de soumission détaillées
  console.log('\n=== SUBMISSION DATA TABLE ===');
  const subData = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { submissionId: sub.id }
  });
  console.log('Entrées SubmissionData:', subData.length);
  subData.slice(0, 30).forEach(d => {
    console.log(`${d.nodeId}: ${d.value}`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
