const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function explainVariables() {
  try {
    console.log('🔍 EXPLICATION DES VARIABLES DANS LE SYSTÈME\n');
    console.log('='.repeat(60));
    
    // 1. Montrer les vraies variables existantes
    console.log('\n1️⃣ QU\'EST-CE QU\'UNE VARIABLE DANS CE SYSTÈME:');
    console.log('-'.repeat(50));
    
    const realVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            type: true
          }
        }
      }
    });
    
    console.log('📝 Une VARIABLE = un enregistrement dans TreeBranchLeafNodeVariable');
    console.log('   qui permet d\'exposer un champ pour les calculs et devis');
    console.log('');
    console.log('✅ Variables actuellement définies dans votre système:');
    realVariables.forEach((variable, i) => {
      console.log('');
      console.log(`   ${i + 1}. VARIABLE: ${variable.exposedKey}`);
      console.log(`      📋 Nom affiché: ${variable.displayName}`);
      console.log(`      🔗 Champ associé: ${variable.TreeBranchLeafNode.label}`);
      console.log(`      📊 Type champ: ${variable.TreeBranchLeafNode.type}`);
      console.log(`      🆔 Node ID: ${variable.nodeId}`);
      console.log(`      🎯 Source: ${variable.sourceRef || 'Manuel'}`);
    });
    
    // 2. Montrer ce qui N'EST PAS une variable
    console.log('\n\n2️⃣ CHAMPS QUI NE SONT PAS DES VARIABLES:');
    console.log('-'.repeat(50));
    
    const fieldsWithoutVariables = await prisma.treeBranchLeafNode.findMany({
      where: {
        TreeBranchLeafNodeVariable: {
          is: null
        },
        isActive: true,
        isVisible: true
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true
      },
      take: 10
    });
    
    console.log('❌ Champs qui NE sont PAS des variables (pas d\'exposedKey):');
    fieldsWithoutVariables.forEach((field, i) => {
      console.log(`   ${i + 1}. CHAMP: ${field.label}`);
      console.log(`      📊 Type: ${field.type}/${field.fieldType || 'null'}`);
      console.log(`      🆔 ID: ${field.id}`);
      console.log(`      ⚠️  PAS de variable associée!`);
    });
    
    // 3. Expliquer la différence
    console.log('\n\n3️⃣ DIFFÉRENCE IMPORTANTE:');
    console.log('-'.repeat(50));
    console.log('🌳 CHAMP (TreeBranchLeafNode) = élément de formulaire');
    console.log('   - Peut être: texte, nombre, SELECT, bouton, etc.');
    console.log('   - Visible dans l\'interface utilisateur');
    console.log('   - Contient les données saisies');
    console.log('');
    console.log('💎 VARIABLE (TreeBranchLeafNodeVariable) = exposé pour calculs');
    console.log('   - Relie un champ à une clé utilisable (exposedKey)'); 
    console.log('   - Permet d\'utiliser ce champ dans les formules');
    console.log('   - Apparaît dans les devis avec sa valeur traduite');
    console.log('');
    console.log('🎯 PROBLÈME DÉTECTÉ:');
    console.log(`   - Champs total: ${realVariables.length + fieldsWithoutVariables.length}+`);
    console.log(`   - Variables définies: ${realVariables.length}`);
    console.log(`   - Champs SANS variables: ${fieldsWithoutVariables.length}+`);
    console.log('   → Ces champs ne peuvent pas être utilisés dans les calculs!');
    
    // 4. Exemple concret
    console.log('\n\n4️⃣ EXEMPLE CONCRET:');
    console.log('-'.repeat(50));
    
    if (realVariables.length > 0) {
      const example = realVariables[0];
      console.log('✅ EXEMPLE D\'UNE VARIABLE QUI FONCTIONNE:');
      console.log(`   📋 Champ: "${example.TreeBranchLeafNode.label}"`);
      console.log(`   🔑 Variable exposée: "${example.exposedKey}"`);
      console.log(`   💡 Dans une formule, on peut écrire: @value.${example.nodeId}`);
      console.log(`   🎯 Dans un devis, ça devient: "${example.displayName}: [valeur]"`);
    }
    
    if (fieldsWithoutVariables.length > 0) {
      const example = fieldsWithoutVariables[0];
      console.log('\n❌ EXEMPLE D\'UN CHAMP SANS VARIABLE:');
      console.log(`   📋 Champ: "${example.label}"`);
      console.log(`   🚫 Pas d\'exposedKey`);
      console.log(`   💡 Dans une formule: @value.${example.id} → ERREUR!`);
      console.log(`   🎯 Dans un devis: N\'apparaît PAS du tout!`);
    }
    
    console.log('\n\n5️⃣ CE QUE FAIT MON SYSTÈME D\'AUTOMATISATION:');
    console.log('-'.repeat(50));
    console.log('🚀 Mon système détecte automatiquement:');
    console.log('   1. Tous les champs qui N\'ONT PAS de variable');
    console.log('   2. Crée automatiquement les variables manquantes');
    console.log('   3. Génère des exposedKey intelligents');
    console.log('   4. Les associe aux nouveaux devis automatiquement');
    console.log('');
    console.log('🎯 RÉSULTAT: Tous vos champs deviennent utilisables dans les calculs!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

explainVariables();