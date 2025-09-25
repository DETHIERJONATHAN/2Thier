const { PrismaClient } = require('@prisma/client');

async function analyserVraieFormule() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 ANALYSE DE LA VRAIE FORMULE QUI FONCTIONNE');
    console.log('=============================================');
    
    // 1. Analyser la vraie formule
    const vraieFormule = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: {
        id: '7097ff9b-974a-4fb3-80d8-49634a634efc'
      }
    });

    console.log('\n1. VRAIE FORMULE (7097ff9b-974a-4fb3-80d8-49634a634efc):');
    if (vraieFormule) {
      console.log(`   ID: ${vraieFormule.id}`);
      console.log(`   Name: "${vraieFormule.name}"`);
      console.log(`   Expression: "${vraieFormule.expression}"`);
      console.log(`   IsActive: ${vraieFormule.isActive}`);
      console.log(`   NodeId: ${vraieFormule.nodeId}`);
      console.log(`   CreatedAt: ${vraieFormule.createdAt}`);
      
      if (vraieFormule.variables) {
        console.log(`\n   🎯 VARIABLES:`);
        try {
          const vars = JSON.parse(vraieFormule.variables);
          console.log(`     ${JSON.stringify(vars, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse: ${vraieFormule.variables}`);
        }
      }

      if (vraieFormule.metadata) {
        console.log(`\n   🎯 METADATA:`);
        try {
          const meta = JSON.parse(vraieFormule.metadata);
          console.log(`     ${JSON.stringify(meta, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse: ${vraieFormule.metadata}`);
        }
      }
    }

    // 2. Comparer avec les autres champs qui ne calculent pas
    console.log(`\n2. COMPARAISON AVEC LES AUTRES CHAMPS:`);
    
    const autresChamps = [
      '688046c2-c2ee-4617-b4d3-c66eca40fa9d', // Champ (C) dans Données
      'cc8bf34e-3461-426e-a16d-2c1db4ff8a76'  // Champ (C) dans Nouveau Section
    ];

    for (const champId of autresChamps) {
      const champ = await prisma.treeBranchLeafNode.findFirst({
        where: { id: champId }
      });

      const formuleChamp = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { nodeId: champId }
      });

      console.log(`\n   Champ ${champ.label}:`);
      console.log(`     hasFormula: ${champ.hasFormula}`);
      console.log(`     formula_activeId: ${champ.formula_activeId || 'null'}`);
      console.log(`     Formule réelle existante: ${formuleChamp ? formuleChamp.id : 'AUCUNE'}`);
      if (formuleChamp) {
        console.log(`       Name: "${formuleChamp.name}"`);
        console.log(`       Expression: "${formuleChamp.expression}"`);
        console.log(`       IsActive: ${formuleChamp.isActive}`);
      }
    }

    // 3. SOLUTION PROPOSÉE
    console.log(`\n3. 🎯 SOLUTION POUR ACTIVER LES CALCULS:`);
    console.log(`\n   Le champ "Prix Kw/h" calcule parce qu'il a:`);
    console.log(`   ✅ hasData: true`);
    console.log(`   ✅ hasFormula: true`);
    console.log(`   ✅ Une formule réelle active dans TreeBranchLeafNodeFormula`);
    console.log(`   ❌ formula_activeId incorrect (pointe vers formule inexistante)`);

    console.log(`\n   Pour faire fonctionner les autres champs, il faut:`);
    console.log(`   1. Corriger formula_activeId pour pointer vers la vraie formule`);
    console.log(`   2. OU créer des formules pour les autres champs`);
    console.log(`   3. OU activer hasFormula: true sur les champs existants avec formule`);

    console.log(`\n   🔧 ACTIONS IMMÉDIATES:`);
    console.log(`   1. Champ 688046c2-c2ee-4617-b4d3-c66eca40fa9d : activer hasFormula: true`);
    console.log(`   2. Champ cc8bf34e-3461-426e-a16d-2c1db4ff8a76 : activer hasFormula: true`);
    console.log(`   3. Vérifier que les formules liées sont actives`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserVraieFormule();