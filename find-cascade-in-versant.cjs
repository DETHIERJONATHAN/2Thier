const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCascadeInVersant() {
  console.log('\n🔍 RECHERCHE CHAMPS CASCADE DANS VERSANT\n');
  console.log('='.repeat(80));

  try {
    // Trouver le parent Versant original
    const versantBranch = await prisma.treeBranchLeafNode.findUnique({
      where: {
        id: '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af' // Versant original
      },
      select: {
        id: true,
        label: true,
        type: true
      }
    });

    console.log(`\n📌 Versant branch trouvé: ${versantBranch.label} (${versantBranch.id})\n`);

    // Trouver tous les enfants du Versant
    const children = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: '3f0f3de7-9bc4-4fca-b39e-52e1ce9530af'
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        subType: true,
        TreeBranchLeafSelectConfig: {
          select: {
            id: true,
            options: true,
            optionsSource: true
          }
        }
      }
    });

    console.log(`📊 ${children.length} champs enfants trouvés:\n`);

    for (const child of children) {
      console.log(`\n   🔹 ${child.label} (${child.id})`);
      console.log(`      Type: ${child.type} / FieldType: ${child.fieldType || 'null'} / SubType: ${child.subType || 'null'}`);
      
      if (child.TreeBranchLeafSelectConfig) {
        console.log(`\n      ✅✅✅ A UNE TreeBranchLeafSelectConfig !!`);
        const cfg = child.TreeBranchLeafSelectConfig;
        console.log(`      Config ID: ${cfg.id}`);
        console.log(`      optionsSource: ${cfg.optionsSource || 'null'}`);
        
        if (cfg.options) {
          if (Array.isArray(cfg.options)) {
            console.log(`\n      📊 ${cfg.options.length} OPTIONS:`);
            
            cfg.options.forEach((opt, i) => {
              console.log(`\n         [${i}] "${opt.label || opt.value}"`);
              console.log(`             value: ${opt.value}`);
              
              if (opt.metadata) {
                const metaKeys = Object.keys(opt.metadata);
                console.log(`             metadata keys: ${metaKeys.join(', ')}`);
                
                if (opt.metadata.sharedReferenceIds) {
                  const refs = Array.isArray(opt.metadata.sharedReferenceIds)
                    ? opt.metadata.sharedReferenceIds
                    : [opt.metadata.sharedReferenceIds];
                  console.log(`             🔗🔗🔗🔗🔗 sharedReferenceIds: [${refs.join(', ')}]`);
                  
                  console.log(`\n             🎯 TROUVÉ ! Les sharedReferenceIds sont STOCKÉS en BASE !`);
                }
              } else {
                console.log(`             ⚠️  Pas de metadata`);
              }
              
              if (opt.conditionalFields) {
                console.log(`             conditionalFields: ${Array.isArray(opt.conditionalFields) ? opt.conditionalFields.length + ' champs' : 'objet'}`);
              }
              
              if (opt.children) {
                console.log(`             children (CASCADE): ${Array.isArray(opt.children) ? opt.children.length + ' niveaux' : 'objet'}`);
              }
            });
          } else {
            console.log(`\n      Options (non-array): ${typeof cfg.options}`);
          }
        } else {
          console.log(`\n      ⚠️  Pas d'options`);
        }
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

findCascadeInVersant();
