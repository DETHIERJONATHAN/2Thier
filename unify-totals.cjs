/**
 * 🔧 SCRIPT: Unifier le fonctionnement des 3 champs Total
 * 
 * Problème: Panneaux max - Total a metadata.capabilities.datas qui cause un chemin différent
 * Solution: Retirer capabilities.datas de tous les Totaux pour qu'ils utilisent tous
 *           le chemin fallback via formula_instances (comme M² toiture - Total qui fonctionne)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function unifyTotals() {
  console.log('\n🔧 ========== UNIFICATION DES CHAMPS TOTAL ==========\n');

  // Les 3 Totaux à unifier
  const totalIds = [
    '3da47bc3-739e-4c83-98c3-813ecf77a740-sum-total',  // Panneaux max - Total
    '0cac5b10-ea6e-45a4-a24a-a5a4ab6a04e0-sum-total',  // M² toiture - Total
    'f40b31f0-9cba-4110-a2a6-37df8c986661-sum-total'   // Mur - Total
  ];

  for (const id of totalIds) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id },
      select: { id: true, label: true, metadata: true, fieldType: true }
    });

    if (!node) {
      console.log(`⚠️ Nœud non trouvé: ${id}`);
      continue;
    }

    console.log(`\n📊 ${node.label}`);
    console.log(`   ID: ${id}`);
    
    const meta = node.metadata || {};
    const hasCapabilities = !!meta.capabilities;
    
    console.log(`   Avant: capabilities.datas = ${hasCapabilities ? 'OUI' : 'NON'}`);
    console.log(`   fieldType = ${node.fieldType}`);

    // Retirer capabilities.datas et uniformiser fieldType à null
    // (comme M² toiture - Total qui fonctionne)
    const { capabilities, ...cleanMeta } = meta;
    
    await prisma.treeBranchLeafNode.update({
      where: { id },
      data: {
        metadata: {
          ...cleanMeta,
          unifiedAt: new Date().toISOString()
        },
        // Uniformiser: fieldType = null comme M² toiture - Total
        fieldType: null,
        fieldSubType: null,
        subType: null
      }
    });

    console.log(`   ✅ Après: capabilities.datas = NON, fieldType = null`);
  }

  // Vérification finale
  console.log('\n\n🔍 ========== VÉRIFICATION FINALE ==========\n');

  const updatedNodes = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: totalIds } },
    select: { 
      id: true, 
      label: true, 
      metadata: true, 
      calculatedValue: true,
      fieldType: true,
      hasData: true,
      hasFormula: true,
      formula_instances: true
    }
  });

  for (const node of updatedNodes) {
    const meta = node.metadata || {};
    console.log(`✅ ${node.label}:`);
    console.log(`   calculatedValue: ${node.calculatedValue}`);
    console.log(`   hasFormula: ${node.hasFormula}`);
    console.log(`   formula_instances: ${node.formula_instances ? 'OUI' : 'NON'}`);
    console.log(`   fieldType: ${node.fieldType}`);
    console.log(`   capabilities.datas: ${meta.capabilities?.datas ? 'OUI (PROBLÈME!)' : 'NON (OK)'}`);
    console.log('');
  }

  console.log('🎉 Unification terminée ! Les 3 Totaux utilisent maintenant le même chemin.');
  console.log('   → Rafraîchis le frontend pour voir le résultat.');

  await prisma.$disconnect();
}

unifyTotals().catch(e => { console.error(e); process.exit(1); });
