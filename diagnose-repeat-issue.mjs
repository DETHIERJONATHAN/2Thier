import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseRepeatIssue() {
  console.log('\n🔍 DIAGNOSTIC DU PROBLÈME DE SUFFIXES\n');
  console.log('='.repeat(70));
  
  const repeaterId = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';
  
  // 1. Vérifier les copies actuelles
  console.log('\n📋 ÉTAPE 1 : État actuel de la base de données');
  console.log('-'.repeat(70));
  
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterId }
  });
  
  const templateNodeIds = JSON.parse(repeater.repeater_templateNodeIds);
  console.log(`\nNombre de nœuds dans le template: ${templateNodeIds.length}`);
  
  let allCopies = [];
  for (const templateId of templateNodeIds) {
    const template = await prisma.treeBranchLeafNode.findUnique({
      where: { id: templateId },
      select: { label: true }
    });
    
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: templateId + '-' },
        organisationId: repeater.organisationId
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, label: true, createdAt: true }
    });
    
    if (copies.length > 0) {
      console.log(`\n${template.label}:`);
      copies.forEach(c => {
        const suffix = c.id.match(/-(\d+)$/)?.[1] || '?';
        console.log(`  - ${c.label} (suffixe: ${suffix}, créé: ${c.createdAt.toLocaleString('fr-FR')})`);
        allCopies.push({ ...c, suffix: parseInt(suffix), templateLabel: template.label });
      });
    }
  }
  
  // 2. Analyser les suffixes
  console.log('\n📋 ÉTAPE 2 : Analyse des suffixes');
  console.log('-'.repeat(70));
  
  if (allCopies.length === 0) {
    console.log('✅ Aucune copie trouvée - la base est propre');
  } else {
    console.log(`⚠️  ${allCopies.length} copie(s) trouvée(s):`);
    
    const suffixes = allCopies.map(c => c.suffix);
    const minSuffix = Math.min(...suffixes);
    const maxSuffix = Math.max(...suffixes);
    
    console.log(`   Min suffixe: ${minSuffix}`);
    console.log(`   Max suffixe: ${maxSuffix}`);
    console.log(`   Prochain suffixe calculé: ${maxSuffix + 1}`);
    
    // Grouper par temps de création
    const byTime = {};
    allCopies.forEach(c => {
      const time = c.createdAt.toISOString().substring(0, 19);
      if (!byTime[time]) byTime[time] = [];
      byTime[time].push(c);
    });
    
    console.log(`\n   Groupes de création (par timestamp):`);
    Object.entries(byTime).forEach(([time, copies]) => {
      console.log(`\n   ${time} (${copies.length} nœuds):`);
      copies.forEach(c => console.log(`     - ${c.templateLabel} → suffixe ${c.suffix}`));
    });
  }
  
  // 3. Vérifier la transaction de repeat
  console.log('\n📋 ÉTAPE 3 : Vérification de la logique de calcul');
  console.log('-'.repeat(70));
  
  // Simuler la logique du backend
  const existingMax = new Map();
  for (const templateId of templateNodeIds) {
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: templateId + '-' },
        organisationId: repeater.organisationId
      },
      select: { id: true }
    });
    
    let maxSuffix = 0;
    for (const copy of copies) {
      const match = copy.id.match(/-(\d+)$/);
      if (match) {
        const suffix = parseInt(match[1], 10);
        if (suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }
    existingMax.set(templateId, maxSuffix);
  }
  
  const allMaxes = Array.from(existingMax.values());
  const globalMax = Math.max(0, ...allMaxes);
  const nextSuffix = globalMax + 1;
  
  console.log(`\nMax par nœud: ${allMaxes.join(', ')}`);
  console.log(`Global max: ${globalMax}`);
  console.log(`Prochain suffixe: ${nextSuffix}`);
  
  if (nextSuffix === 2 && allCopies.length > 0) {
    console.log('\n⚠️  PROBLÈME DÉTECTÉ:');
    console.log('   Le système calcule -2 car des copies -1 existent déjà !');
    console.log('   → Les copies n\'ont pas été correctement supprimées');
    console.log('   → OU une nouvelle copie a été créée depuis le nettoyage');
  } else if (nextSuffix === 1) {
    console.log('\n✅ Le système devrait créer -1 (correct)');
  }
  
  // 4. Chercher des copies orphelines
  console.log('\n📋 ÉTAPE 4 : Recherche de copies orphelines');
  console.log('-'.repeat(70));
  
  const allNodesWithSuffix = await prisma.treeBranchLeafNode.findMany({
    where: {
      organisationId: repeater.organisationId,
      id: { contains: '-' }
    },
    select: { id: true, label: true, createdAt: true }
  });
  
  const orphans = allNodesWithSuffix.filter(n => {
    // Extraire le templateId (tout avant le dernier -)
    const templateId = n.id.replace(/-\d+$/, '');
    return !templateNodeIds.includes(templateId);
  });
  
  if (orphans.length > 0) {
    console.log(`⚠️  ${orphans.length} copie(s) orpheline(s) trouvée(s):`);
    orphans.forEach(o => console.log(`   - ${o.label} (${o.id})`));
  } else {
    console.log('✅ Aucune copie orpheline');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n🎯 RÉSUMÉ:');
  console.log(`   Total copies dans le template: ${allCopies.length}`);
  console.log(`   Total copies orphelines: ${orphans.length}`);
  console.log(`   Prochain suffixe: ${nextSuffix}`);
  
  if (allCopies.length > 0) {
    console.log('\n⚠️  ACTION REQUISE:');
    console.log('   Relancer delete-all-copies.mjs pour nettoyer');
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

diagnoseRepeatIssue()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
