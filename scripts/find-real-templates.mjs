import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🔍 CHERCHER: Où sont les vrais templates "Rampant toiture" ?
 */

async function findRealTemplates() {
  console.log('🔍 === RECHERCHE DES VRAIS TEMPLATES ===\n');

  // 1. Tous les nœuds "Rampant toiture"
  const allRampant = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Rampant' } },
        { data_exposedKey: { contains: 'rampant' } }
      ]
    },
    select: {
      id: true,
      label: true,
      data_exposedKey: true,
      parentId: true,
      metadata: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📦 Trouvé ${allRampant.length} nœuds contenant "Rampant":\n`);

  for (const node of allRampant) {
    const hasSuffix = /-\d+$/.test(node.id);
    const isCopy = node.metadata?.duplicatedFromRepeater === true;
    const isTemplate = !hasSuffix && !isCopy;
    
    console.log(`${'='.repeat(80)}`);
    console.log(`${isTemplate ? '📋 TEMPLATE' : isCopy ? '📑 COPIE' : '❓ INCONNU'}: ${node.label || node.data_exposedKey}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId || 'N/A'}`);
    console.log(`   Suffixé: ${hasSuffix ? '❌ OUI' : '✅ NON'}`);
    console.log(`   Créé: ${node.createdAt}`);
    
    if (node.metadata) {
      if (node.metadata.duplicatedFromRepeater) {
        console.log(`   🔄 Dupliqué du repeater: ${node.metadata.duplicatedFromRepeater}`);
      }
      if (node.metadata.copiedFromNodeId) {
        console.log(`   🔗 Copié depuis: ${node.metadata.copiedFromNodeId}`);
      }
      if (node.metadata.sourceTemplateId) {
        console.log(`   📋 Template source: ${node.metadata.sourceTemplateId}`);
      }
    }
    console.log('');
  }

  // 2. Chercher le parent qui devrait contenir les templates
  console.log(`${'='.repeat(80)}`);
  console.log('🔍 Recherche du repeater parent qui contient les templates...\n');

  const repeaters = await prisma.treeBranchLeafNode.findMany({
    where: {
      repeater_templateNodeIds: { not: null }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  console.log(`📦 Trouvé ${repeaters.length} repeaters configurés:\n`);

  for (const rep of repeaters) {
    if (!rep.repeater_templateNodeIds) continue;
    
    try {
      const templateIds = JSON.parse(rep.repeater_templateNodeIds);
      
      // Vérifier si ce repeater pointe vers "Rampant toiture"
      const hasRampantTemplate = templateIds.some(id => 
        allRampant.find(n => n.id === id)
      );
      
      if (hasRampantTemplate || rep.label?.includes('Rampant') || rep.label?.includes('Toit')) {
        console.log(`✅ Repeater: "${rep.label}" (${rep.id})`);
        console.log(`   Templates (${templateIds.length}):`);
        
        for (const templateId of templateIds) {
          const hasSuffix = /-\d+$/.test(templateId);
          const template = allRampant.find(n => n.id === templateId);
          
          console.log(`      ${hasSuffix ? '❌' : '✅'} ${templateId}`);
          
          if (template) {
            console.log(`         → ${template.label || template.data_exposedKey}`);
          } else {
            console.log(`         → Template introuvable en base`);
          }
        }
        console.log('');
      }
    } catch (e) {
      console.log(`   ⚠️ Erreur parsing templateIds pour ${rep.label}`);
    }
  }

  // 3. Diagnostic final
  console.log(`${'='.repeat(80)}`);
  console.log('💡 DIAGNOSTIC:\n');

  const templates = allRampant.filter(n => !/-\d+$/.test(n.id) && !n.metadata?.duplicatedFromRepeater);
  const copies = allRampant.filter(n => /-\d+$/.test(n.id) || n.metadata?.duplicatedFromRepeater);

  console.log(`📋 Templates (non suffixés, non copiés): ${templates.length}`);
  templates.forEach(t => console.log(`   ✅ ${t.label || t.data_exposedKey} (${t.id})`));

  console.log(`\n📑 Copies (suffixés ou marqués comme copies): ${copies.length}`);
  copies.forEach(c => console.log(`   📑 ${c.label || c.data_exposedKey} (${c.id})`));

  if (templates.length === 0) {
    console.log('\n❌ PROBLÈME: Aucun template de base trouvé !');
    console.log('   Le système essaie de copier une COPIE au lieu d\'un TEMPLATE');
    console.log('   C\'est pour ça qu\'on obtient des doubles suffixes\n');
  }
}

findRealTemplates()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
