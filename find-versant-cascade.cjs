const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findVersantCascade() {
  console.log('\n🔍 RECHERCHE CASCADE "VERSANT"\n');
  console.log('='.repeat(80));

  try {
    // Chercher tous les nœuds Versant avec plus de détails
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { contains: 'Versant' }
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        subType: true,
        parentId: true,
        treeId: true,
        metadata: true,
        TreeBranchLeafSelectConfig: {
          select: {
            id: true,
            nodeId: true,
            options: true,
            optionsSource: true,
            allowCustom: true,
            maxSelections: true
          }
        }
      }
    });

    console.log(`\n📊 ${nodes.length} nœuds "Versant" trouvés\n`);

    for (const node of nodes) {
      console.log('\n' + '='.repeat(80));
      console.log(`📌 ${node.label}`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Type: ${node.type}`);
      console.log(`   FieldType: ${node.fieldType || 'null'}`);
      console.log(`   SubType: ${node.subType || 'null'}`);
      console.log(`   ParentId: ${node.parentId || 'null'}`);
      console.log(`   TreeId: ${node.treeId}`);

      if (node.metadata && Object.keys(node.metadata).length > 0) {
        console.log(`\n   📦 Metadata:`);
        console.log(`      ${JSON.stringify(node.metadata, null, 2).split('\n').join('\n      ')}`);
      }

      if (node.TreeBranchLeafSelectConfig) {
        console.log(`\n   ✅ A une TreeBranchLeafSelectConfig !!`);
        const cfg = node.TreeBranchLeafSelectConfig;
        console.log(`      ID: ${cfg.id}`);
        console.log(`      optionsSource: ${cfg.optionsSource || 'null'}`);
        console.log(`      allowCustom: ${cfg.allowCustom}`);
        console.log(`      maxSelections: ${cfg.maxSelections || 'null'}`);
        
        if (cfg.options) {
          console.log(`\n      📊 Options (JSON):`);
          if (Array.isArray(cfg.options)) {
            console.log(`         ${cfg.options.length} options trouvées:`);
            cfg.options.forEach((opt, i) => {
              console.log(`\n         [${i}] "${opt.label || opt.value}"`);
              console.log(`             value: ${opt.value}`);
              
              if (opt.metadata) {
                console.log(`             metadata keys: ${Object.keys(opt.metadata).join(', ')}`);
                
                if (opt.metadata.sharedReferenceIds) {
                  const refs = Array.isArray(opt.metadata.sharedReferenceIds)
                    ? opt.metadata.sharedReferenceIds
                    : [opt.metadata.sharedReferenceIds];
                  console.log(`             🔗🔗🔗 sharedReferenceIds: [${refs.join(', ')}]`);
                }
              }
              
              if (opt.conditionalFields) {
                console.log(`             ✅ conditionalFields: ${Array.isArray(opt.conditionalFields) ? opt.conditionalFields.length : 'objet'}`);
              }
              
              if (opt.children) {
                console.log(`             🌳 children: ${Array.isArray(opt.children) ? opt.children.length : 'objet'}`);
              }
            });
          } else {
            console.log(`         Type: ${typeof cfg.options}`);
            console.log(`         ${JSON.stringify(cfg.options, null, 2).split('\n').slice(0, 20).join('\n         ')}`);
          }
        } else {
          console.log(`\n      ❌ Pas d'options`);
        }
      } else {
        console.log(`\n   ❌ PAS de TreeBranchLeafSelectConfig`);
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

findVersantCascade();
