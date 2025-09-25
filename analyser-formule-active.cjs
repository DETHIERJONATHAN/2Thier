const { PrismaClient } = require('@prisma/client');

async function analyserFormuleActive() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 ANALYSE DE LA FORMULE QUI FAIT CALCULER LE CHAMP');
    console.log('=================================================');
    
    // 1. Analyser la formule active
    const formule = await prisma.treeBranchLeafNodeFormula.findFirst({
      where: {
        id: 'cb42c9a9-c6b4-49bb-bd55-74d763123bfb'
      },
      include: {
        node: true
      }
    });

    console.log('\n1. FORMULE ACTIVE (cb42c9a9-c6b4-49bb-bd55-74d763123bfb):');
    if (formule) {
      console.log(`   ID: ${formule.id}`);
      console.log(`   Name: "${formule.name}"`);
      console.log(`   Expression: "${formule.expression}"`);
      console.log(`   IsActive: ${formule.isActive}`);
      console.log(`   NodeId: ${formule.nodeId}`);
      console.log(`   Node associé: ${formule.node?.label}`);
      console.log(`   CreatedAt: ${formule.createdAt}`);
      
      if (formule.variables) {
        console.log(`\n   🎯 VARIABLES UTILISÉES:`);
        try {
          const vars = JSON.parse(formule.variables);
          console.log(`     Variables: ${JSON.stringify(vars, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse variables`);
        }
      }

      if (formule.metadata) {
        console.log(`\n   🎯 METADATA FORMULE:`);
        try {
          const meta = JSON.parse(formule.metadata);
          console.log(`     Metadata: ${JSON.stringify(meta, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse metadata`);
        }
      }
    } else {
      console.log('   ❌ Formule NON TROUVÉE !');
      return;
    }

    // 2. Analyser le champ associé plus en détail
    const champAvecFormule = await prisma.treeBranchLeafNode.findFirst({
      where: {
        id: formule.nodeId
      }
    });

    console.log(`\n2. CONFIGURATION COMPLÈTE DU CHAMP AVEC FORMULE:`);
    if (champAvecFormule) {
      console.log(`   🎯 TOUS LES CHAMPS FORMULE:`);
      console.log(`     formula_activeId: ${champAvecFormule.formula_activeId}`);
      console.log(`     formula_name: ${champAvecFormule.formula_name}`);
      
      if (champAvecFormule.formula_instances) {
        console.log(`\n   🎯 FORMULA_INSTANCES:`);
        try {
          const instances = JSON.parse(champAvecFormule.formula_instances);
          console.log(`     Instances: ${JSON.stringify(instances, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse formula_instances`);
        }
      }

      if (champAvecFormule.formula_tokens) {
        console.log(`\n   🎯 FORMULA_TOKENS:`);
        try {
          const tokens = JSON.parse(champAvecFormule.formula_tokens);
          console.log(`     Tokens: ${JSON.stringify(tokens, null, 2)}`);
        } catch (e) {
          console.log(`     ❌ Erreur parse formula_tokens`);
        }
      }
    }

    // 3. CONCLUSION PRATIQUE
    console.log(`\n3. 🎯 CONCLUSION POUR FAIRE FONCTIONNER LES AUTRES CHAMPS:`);
    console.log(`\n   Pour qu'un champ "données" calcule automatiquement, il faut:`);
    console.log(`   1. hasData: true ✅ (déjà fait)`);
    console.log(`   2. hasFormula: true ❌ (à activer)`);
    console.log(`   3. formula_activeId: [ID_FORMULE] ❌ (à définir)`);
    console.log(`   4. Une formule avec expression valide ❌ (à créer)`);

    console.log(`\n   🔧 ACTION REQUISE:`);
    console.log(`   - Créer des formules pour les autres champs "données"`);
    console.log(`   - Ou copier/adapter la formule existante "${formule.expression}"`);
    console.log(`   - Activer hasFormula: true sur les champs cibles`);
    console.log(`   - Définir formula_activeId avec l'ID de la formule`);

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyserFormuleActive();