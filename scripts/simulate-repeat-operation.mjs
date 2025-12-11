import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔬 TRACE COMPLÈTE: Simule l'opération de création de copie pas à pas
 */

async function simulateRepeatOperation() {
  console.log('🔬 === SIMULATION DE L\'OPÉRATION REPEAT ===\n');

  // 1. Trouver le repeater "Rampant toiture"
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Rampant toiture'
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true,
      parentId: true
    }
  });

  if (!repeater) {
    console.log('❌ Repeater "Rampant toiture" introuvable');
    return;
  }

  console.log(`✅ Repeater trouvé: "${repeater.label}" (${repeater.id})\n`);

  // 2. Extraire les templateNodeIds
  let templateIds = [];
  
  if (repeater.repeater_templateNodeIds) {
    try {
      templateIds = JSON.parse(repeater.repeater_templateNodeIds);
    } catch (e) {
      console.log('❌ Erreur parsing repeater_templateNodeIds');
    }
  }

  // Fallback sur metadata
  if (templateIds.length === 0 && repeater.metadata?.repeater?.templateNodeIds) {
    templateIds = repeater.metadata.repeater.templateNodeIds;
  }

  // Si toujours vide, chercher les enfants directs
  if (templateIds.length === 0) {
    console.log('⚠️  Aucun templateNodeIds configuré, recherche des enfants directs...\n');
    
    const children = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: repeater.id
      },
      select: {
        id: true,
        label: true,
        data_exposedKey: true,
        metadata: true
      }
    });

    console.log(`📦 Trouvé ${children.length} enfants directs:\n`);
    
    for (const child of children) {
      const hasSuffix = /-\d+$/.test(child.id);
      const isTemplate = !child.metadata?.duplicatedFromRepeater;
      
      console.log(`   ${isTemplate ? '📋' : '📑'} ${child.label || child.data_exposedKey}`);
      console.log(`      ID: ${child.id}`);
      console.log(`      Suffixé: ${hasSuffix ? '❌ OUI' : '✅ NON'}`);
      console.log(`      Template: ${isTemplate ? '✅ OUI' : '❌ NON (copie)'}`);
      
      if (isTemplate && !hasSuffix) {
        templateIds.push(child.id);
        console.log(`      ➕ Ajouté aux templates`);
      }
      console.log('');
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 TEMPLATE IDs à utiliser (${templateIds.length}):\n`);
  
  if (templateIds.length === 0) {
    console.log('❌ AUCUN TEMPLATE TROUVÉ - IMPOSSIBLE DE CONTINUER\n');
    return;
  }

  templateIds.forEach((id, idx) => {
    const hasSuffix = /-\d+$/.test(id);
    console.log(`   ${idx + 1}. ${id} ${hasSuffix ? '❌ PROBLÈME: ID SUFFIXÉ' : '✅ OK'}`);
  });

  // 3. Vérifier l'existence de ces IDs
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 Vérification de l\'existence des templates:\n');

  const templates = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { in: templateIds }
    },
    select: {
      id: true,
      label: true,
      data_exposedKey: true
    }
  });

  console.log(`✅ ${templates.length}/${templateIds.length} templates trouvés\n`);
  
  templates.forEach(t => {
    console.log(`   ✅ ${t.label || t.data_exposedKey} (${t.id})`);
  });

  const missingIds = templateIds.filter(id => !templates.find(t => t.id === id));
  if (missingIds.length > 0) {
    console.log(`\n❌ ${missingIds.length} templates MANQUANTS:`);
    missingIds.forEach(id => console.log(`   ❌ ${id}`));
  }

  // 4. Calculer le prochain suffixe
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔢 Calcul du prochain suffixe:\n');

  const allCopies = await prisma.treeBranchLeafNode.findMany({
    where: {
      parentId: repeater.parentId,
      metadata: {
        path: ['duplicatedFromRepeater'],
        equals: true
      }
    },
    select: {
      id: true,
      label: true,
      metadata: true
    }
  });

  console.log(`📦 Trouvé ${allCopies.length} copies existantes\n`);

  const suffixes = new Set();
  
  for (const copy of allCopies) {
    // Extraire le suffixe depuis l'ID
    const match = copy.id.match(/-(\d+)$/);
    if (match) {
      const suffix = parseInt(match[1], 10);
      suffixes.add(suffix);
      console.log(`   📑 ${copy.label || 'N/A'}: suffixe ${suffix} (ID: ${copy.id})`);
    }
  }

  const nextSuffix = suffixes.size === 0 ? 1 : Math.max(...Array.from(suffixes)) + 1;
  
  console.log(`\n✅ Prochain suffixe à utiliser: ${nextSuffix}`);

  // 5. Simuler la création d'ID
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 SIMULATION: Création des IDs avec suffixe ${nextSuffix}:\n`);

  for (const templateId of templateIds) {
    const newId = `${templateId}-${nextSuffix}`;
    
    // Vérifier si cet ID existe déjà
    const exists = await prisma.treeBranchLeafNode.findUnique({
      where: { id: newId },
      select: { id: true, label: true }
    });

    if (exists) {
      console.log(`   ❌ COLLISION: ${newId} EXISTE DÉJÀ (${exists.label})`);
      console.log(`      → C'est ce qui cause le double suffixe !`);
    } else {
      console.log(`   ✅ OK: ${newId} (n'existe pas, peut être créé)`);
    }
  }

  // 6. Vérifier s'il y a des IDs suffixés dans templateIds
  console.log(`\n${'='.repeat(80)}`);
  console.log('⚠️  DIAGNOSTIC FINAL:\n');

  const suffixedTemplates = templateIds.filter(id => /-\d+$/.test(id));
  
  if (suffixedTemplates.length > 0) {
    console.log(`❌ PROBLÈME IDENTIFIÉ: ${suffixedTemplates.length} templateIds sont DÉJÀ SUFFIXÉS\n`);
    suffixedTemplates.forEach(id => {
      console.log(`   ❌ ${id}`);
      console.log(`      → Si on applique suffixe ${nextSuffix}, on aura: ${id}-${nextSuffix}`);
      console.log(`      → C'est un DOUBLE SUFFIXE !`);
    });
    
    console.log(`\n💡 SOLUTION: Nettoyer repeater_templateNodeIds pour ne garder que les IDs de base\n`);
  } else {
    console.log('✅ Tous les templateIds sont propres (aucun suffixe)\n');
  }
}

simulateRepeatOperation()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
