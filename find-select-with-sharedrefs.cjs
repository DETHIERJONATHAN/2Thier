const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSelectFieldInVersant() {
  console.log('\n🔍 RECHERCHE CHAMP SELECT AVEC OPTIONS ET SHAREDREFERENCES\n');
  console.log('='.repeat(80));

  try {
    // Chercher TOUS les nœuds qui ont une TreeBranchLeafSelectConfig
    const nodesWithSelectConfig = await prisma.treeBranchLeafSelectConfig.findMany({
      select: {
        id: true,
        nodeId: true,
        options: true,
        optionsSource: true,
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true,
            fieldType: true,
            parentId: true
          }
        }
      }
    });

    console.log(`\n📊 ${nodesWithSelectConfig.length} configurations SELECT trouvées\n`);

    for (const cfg of nodesWithSelectConfig) {
      const node = cfg.TreeBranchLeafNode;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📌 ${node.label} (${node.id})`);
      console.log(`   Type: ${node.type} / FieldType: ${node.fieldType || 'null'}`);
      console.log(`   ParentId: ${node.parentId || 'root'}`);
      console.log(`   SelectConfig ID: ${cfg.id}`);
      console.log(`   optionsSource: ${cfg.optionsSource || 'null'}`);

      if (cfg.options) {
        if (Array.isArray(cfg.options)) {
          console.log(`\n   📊 ${cfg.options.length} OPTIONS:`);
          
          let hasSharedRefs = false;
          
          cfg.options.forEach((opt, i) => {
            console.log(`\n      [${i}] "${opt.label || opt.value}"`);
            console.log(`          value: ${opt.value}`);
            
            if (opt.metadata) {
              const metaKeys = Object.keys(opt.metadata);
              console.log(`          metadata keys: ${metaKeys.join(', ')}`);
              
              if (opt.metadata.sharedReferenceIds) {
                hasSharedRefs = true;
                const refs = Array.isArray(opt.metadata.sharedReferenceIds)
                  ? opt.metadata.sharedReferenceIds
                  : [opt.metadata.sharedReferenceIds];
                console.log(`          🔗🔗🔗 sharedReferenceIds: [${refs.join(', ')}]`);
              }
            }
            
            if (opt.conditionalFields) {
              console.log(`          conditionalFields: ${Array.isArray(opt.conditionalFields) ? opt.conditionalFields.length + ' champs' : 'objet'}`);
            }
            
            if (opt.children && Array.isArray(opt.children)) {
              console.log(`          🌳 children (CASCADE): ${opt.children.length} niveaux`);
            }
          });
          
          if (hasSharedRefs) {
            console.log(`\n   🎯🎯🎯 CE CHAMP A DES SHAREDREFERENCES ! C'EST CELUI-CI !`);
          }
        } else {
          console.log(`\n   Options: ${typeof cfg.options}`);
        }
      } else {
        console.log(`\n   ⚠️  Pas d'options`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ RECHERCHE TERMINÉE\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

findSelectFieldInVersant();
