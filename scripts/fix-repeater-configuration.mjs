import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔧 FIX: Corriger la configuration du repeater "Rampant toiture"
 */

async function fixRepeaterConfiguration() {
  console.log('🔧 === CORRECTION DE LA CONFIGURATION ===\n');

  // 1. Trouver le nœud "Rampant toiture" qui est mal configuré
  const rampantNode = await prisma.treeBranchLeafNode.findFirst({
    where: {
      id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58'
    },
    select: {
      id: true,
      label: true,
      parentId: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!rampantNode) {
    console.log('❌ Nœud "Rampant toiture" introuvable');
    return;
  }

  console.log(`✅ Nœud trouvé: "${rampantNode.label}" (${rampantNode.id})\n`);

  // 2. Ce nœud NE DEVRAIT PAS être un repeater, il devrait être un TEMPLATE
  //    Le vrai repeater devrait être son PARENT

  const parent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: rampantNode.parentId },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  if (!parent) {
    console.log('❌ Parent introuvable');
    return;
  }

  console.log(`✅ Parent: "${parent.label}" (${parent.id})\n`);

  // 3. Le parent "Nouvelle Section" devrait être le repeater
  //    et "Rampant toiture" devrait être dans ses templateNodeIds

  let parentTemplateIds = [];
  if (parent.repeater_templateNodeIds) {
    try {
      parentTemplateIds = JSON.parse(parent.repeater_templateNodeIds);
    } catch (e) {
      console.log('⚠️ Erreur parsing templateIds du parent');
    }
  }

  console.log(`📋 Templates actuels du parent (${parentTemplateIds.length}):`);
  parentTemplateIds.forEach(id => console.log(`   - ${id}`));

  // 4. Ajouter "Rampant toiture" aux templates du parent s'il n'y est pas
  if (!parentTemplateIds.includes(rampantNode.id)) {
    console.log(`\n➕ Ajout de "Rampant toiture" aux templates du parent...`);
    
    parentTemplateIds.push(rampantNode.id);
    
    await prisma.treeBranchLeafNode.update({
      where: { id: parent.id },
      data: {
        repeater_templateNodeIds: JSON.stringify(parentTemplateIds)
      }
    });
    
    console.log(`✅ Parent mis à jour avec ${parentTemplateIds.length} templates`);
  } else {
    console.log(`\n✅ "Rampant toiture" est déjà dans les templates du parent`);
  }

  // 5. Supprimer la configuration repeater de "Rampant toiture" lui-même
  console.log(`\n🧹 Nettoyage de "Rampant toiture"...`);
  
  await prisma.treeBranchLeafNode.update({
    where: { id: rampantNode.id },
    data: {
      repeater_templateNodeIds: null,
      repeater_templateNodeLabels: null,
      repeater_minItems: null,
      repeater_maxItems: null,
      repeater_addButtonLabel: null,
      repeater_buttonSize: null,
      repeater_buttonWidth: null,
      repeater_iconOnly: null
    }
  });
  
  console.log(`✅ Configuration repeater supprimée de "Rampant toiture"`);

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ CORRECTION TERMINÉE\n');
  console.log('👉 Le repeater est maintenant le PARENT (Nouvelle Section)');
  console.log('👉 "Rampant toiture" est un simple TEMPLATE');
  console.log('👉 Les copies seront créées avec -1, -2, -3 sans double suffixe\n');
}

fixRepeaterConfiguration()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
