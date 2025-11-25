const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPanneauFields() {
  try {
    console.log('\n🔍 Recherche des champs "N° de panneau" et "Panneau"...\n');

    // Recherche des champs par leur label
    const panneauFields = await prisma.treeNode.findMany({
      where: {
        OR: [
          { label: { contains: 'panneau', mode: 'insensitive' } },
          { label: { contains: 'Panneau' } }
        ],
        type: 'leaf_field'
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        order: true,
        metadata: true,
        subtab: true
      },
      orderBy: {
        label: 'asc'
      }
    });

    console.log(`✅ Trouvé ${panneauFields.length} champ(s) contenant "panneau":\n`);
    
    panneauFields.forEach(field => {
      console.log(`📌 Champ: "${field.label}"`);
      console.log(`   ID: ${field.id}`);
      console.log(`   ParentId: ${field.parentId}`);
      console.log(`   Subtab: ${field.subtab || 'N/A'}`);
      console.log(`   Order: ${field.order}`);
      
      // Vérifier si le champ a une capacité repeater
      const hasRepeaterCapability = field.metadata?.repeater !== undefined;
      console.log(`   Capacité repeater: ${hasRepeaterCapability ? '✅ OUI' : '❌ NON'}`);
      
      if (hasRepeaterCapability) {
        console.log(`   Repeater config:`, JSON.stringify(field.metadata.repeater, null, 2));
      }
      console.log('');
    });

    // Recherche du repeater "Versant"
    console.log('\n🔍 Recherche du repeater "Versant"...\n');
    
    const versantRepeater = await prisma.treeNode.findFirst({
      where: {
        label: { contains: 'Versant' },
        'metadata.repeater.templateNodeIds': {
          path: [],
          array_contains: []
        }
      },
      select: {
        id: true,
        label: true,
        metadata: true
      }
    });

    if (versantRepeater) {
      console.log(`✅ Repeater trouvé: "${versantRepeater.label}"`);
      console.log(`   ID: ${versantRepeater.id}`);
      console.log(`   templateNodeIds actuels: ${JSON.stringify(versantRepeater.metadata?.repeater?.templateNodeIds || [], null, 2)}`);
      
      // Identifier les champs manquants
      const currentTemplateIds = versantRepeater.metadata?.repeater?.templateNodeIds || [];
      const panneauFieldIds = panneauFields.map(f => f.id);
      const missingIds = panneauFieldIds.filter(id => !currentTemplateIds.includes(id));
      
      if (missingIds.length > 0) {
        console.log(`\n⚠️  ${missingIds.length} champ(s) panneau manquant(s) dans templateNodeIds:`);
        missingIds.forEach(id => {
          const field = panneauFields.find(f => f.id === id);
          console.log(`   - ${id} (${field?.label})`);
        });
        
        console.log(`\n📝 Pour corriger, exécute cette requête SQL:\n`);
        console.log(`UPDATE "TreeNode"`);
        console.log(`SET metadata = jsonb_set(`);
        console.log(`  metadata,`);
        console.log(`  '{repeater,templateNodeIds}',`);
        console.log(`  '${JSON.stringify([...currentTemplateIds, ...missingIds])}'::jsonb`);
        console.log(`)`);
        console.log(`WHERE id = '${versantRepeater.id}';`);
      } else {
        console.log(`\n✅ Tous les champs panneau sont déjà dans templateNodeIds`);
      }
    } else {
      console.log(`❌ Repeater "Versant" non trouvé`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findPanneauFields();
