import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔬 ANALYSE COMPLÈTE: Comprendre EXACTEMENT pourquoi -1-1 se crée
 */

async function deepAnalysis() {
  console.log('🔬 === ANALYSE APPROFONDIE DU PROBLÈME ===\n');

  // 1. État actuel des nœuds "Rampant toiture"
  const allRampant = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { id: { startsWith: '6817ee20-5782-4b03-a7b1-0687cc5b4d58' } },
        { label: { contains: 'Rampant toiture' } }
      ]
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      metadata: true,
      repeater_templateNodeIds: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📦 ÉTAT ACTUEL: ${allRampant.length} nœuds "Rampant toiture":\n`);
  
  for (const node of allRampant) {
    const suffixCount = (node.id.match(/-\d+/g) || []).length;
    const status = suffixCount === 0 ? '📋 TEMPLATE' : 
                   suffixCount === 1 ? '📑 COPIE-1' : 
                   '❌ DOUBLE-SUFFIXE';
    
    console.log(`${status}: ${node.label}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   Suffixes détectés: ${suffixCount}`);
    console.log(`   Créé: ${node.createdAt}`);
    console.log('');
  }

  // 2. Analyser le parent "Nouveau Section"
  console.log(`${'='.repeat(80)}`);
  console.log('🔍 ANALYSE DU PARENT (repeater):\n');

  const parent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!parent) {
    console.log('❌ Parent introuvable\n');
    return;
  }

  console.log(`✅ Parent: "${parent.label}" (${parent.id})\n`);

  let parentTemplateIds = [];
  if (parent.repeater_templateNodeIds) {
    try {
      parentTemplateIds = JSON.parse(parent.repeater_templateNodeIds);
      console.log(`📋 repeater_templateNodeIds (${parentTemplateIds.length}):`);
      parentTemplateIds.forEach((id, idx) => {
        const suffixCount = (id.match(/-\d+/g) || []).length;
        const status = suffixCount === 0 ? '✅ OK (pas de suffixe)' : 
                       suffixCount === 1 ? '⚠️  SUFFIXÉ (-1)' :
                       '❌ DOUBLE SUFFIXE';
        console.log(`   ${idx + 1}. ${id}`);
        console.log(`      ${status}`);
      });
    } catch (e) {
      console.log('❌ Erreur parsing templateIds');
    }
  } else {
    console.log('⚠️  repeater_templateNodeIds est NULL');
  }

  // 3. Vérifier les enfants directs du parent
  console.log(`\n${'='.repeat(80)}`);
  console.log('👶 ENFANTS DIRECTS DU PARENT:\n');

  const children = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: parent.id },
    select: {
      id: true,
      label: true,
      metadata: true,
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Trouvé ${children.length} enfants:\n`);

  for (const child of children) {
    const suffixCount = (child.id.match(/-\d+/g) || []).length;
    const isCopy = child.metadata?.duplicatedFromRepeater === true;
    const icon = suffixCount === 0 && !isCopy ? '📋' : 
                 suffixCount === 1 && isCopy ? '📑' :
                 suffixCount > 1 ? '❌' : '❓';
    
    console.log(`${icon} ${child.label || 'N/A'}`);
    console.log(`   ID: ${child.id}`);
    console.log(`   Suffixes: ${suffixCount}`);
    console.log(`   Copie: ${isCopy ? 'OUI' : 'NON'}`);
    console.log(`   Créé: ${child.createdAt}`);
    console.log('');
  }

  // 4. SIMULATION: Que se passerait-il si on clique sur "Ajouter" ?
  console.log(`${'='.repeat(80)}`);
  console.log('🎯 SIMULATION: Prochain clic sur "Ajouter Toit":\n');

  // Calculer le prochain suffixe
  const existingCopies = children.filter(c => c.metadata?.duplicatedFromRepeater === true);
  const suffixes = existingCopies.map(c => {
    const match = c.id.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }).filter(s => s > 0);

  const nextSuffix = suffixes.length === 0 ? 1 : Math.max(...suffixes) + 1;
  
  console.log(`📊 Copies existantes: ${existingCopies.length}`);
  console.log(`🔢 Suffixes utilisés: [${suffixes.join(', ')}]`);
  console.log(`➡️  Prochain suffixe: ${nextSuffix}\n`);

  // Templates qui seront copiés
  console.log(`📋 Templates qui seront copiés (depuis repeater_templateNodeIds):\n`);
  
  for (const templateId of parentTemplateIds) {
    const suffixCount = (templateId.match(/-\d+/g) || []).length;
    const newId = `${templateId}-${nextSuffix}`;
    const newSuffixCount = (newId.match(/-\d+/g) || []).length;
    
    console.log(`   Template: ${templateId}`);
    console.log(`      Suffixes actuels: ${suffixCount}`);
    console.log(`      ➡️  Nouvel ID: ${newId}`);
    console.log(`      ➡️  Suffixes après copie: ${newSuffixCount}`);
    
    if (newSuffixCount > 1) {
      console.log(`      ❌ PROBLÈME: DOUBLE SUFFIXE DÉTECTÉ !`);
      console.log(`      💡 CAUSE: Le templateId contient déjà un suffixe`);
    } else {
      console.log(`      ✅ OK`);
    }
    console.log('');
  }

  // 5. DIAGNOSTIC FINAL
  console.log(`${'='.repeat(80)}`);
  console.log('💡 DIAGNOSTIC FINAL:\n');

  const problematicTemplates = parentTemplateIds.filter(id => /-\d+/.test(id));
  
  if (problematicTemplates.length > 0) {
    console.log(`❌ PROBLÈME IDENTIFIÉ:`);
    console.log(`   ${problematicTemplates.length} templateIds dans repeater_templateNodeIds contiennent des suffixes\n`);
    
    problematicTemplates.forEach(id => {
      console.log(`   ❌ ${id}`);
    });
    
    console.log(`\n💡 SOLUTION PROPOSÉE:`);
    console.log(`   Modifier repeater_templateNodeIds pour ne garder QUE les IDs de base (sans suffixes)`);
    console.log(`   Exemple: au lieu de "6817...-1", mettre "6817..." (sans le -1)\n`);
    
    // Proposer les IDs corrigés
    const correctedIds = parentTemplateIds.map(id => id.replace(/-\d+$/, ''));
    const uniqueCorrectedIds = [...new Set(correctedIds)];
    
    console.log(`📋 IDs CORRIGÉS proposés (${uniqueCorrectedIds.length}):`);
    uniqueCorrectedIds.forEach(id => console.log(`   ✅ ${id}`));
    
  } else {
    console.log(`✅ Aucun problème détecté dans les templateIds`);
    console.log(`   Le problème doit venir d'ailleurs...\n`);
  }
}

deepAnalysis()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
