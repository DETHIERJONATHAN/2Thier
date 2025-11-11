/**
 * 🔍 SCRIPT DEBUG - Vérifier les valeurs calculées DIRECTEMENT dans Prisma
 * 
 * Cet script va:
 * 1. Afficher tous les nœuds avec valeurs calculées
 * 2. Tester le stockage d'une valeur
 * 3. Vérifier que c'est bien enregistré
 * 
 * Utilisation:
 * npx tsx src/verify-calculated-values.ts
 */

import { prisma } from './lib/prisma';

async function main() {
  try {
    console.log('\n' + '═'.repeat(90));
    console.log('🔍 VÉRIFICATION - Valeurs Calculées dans la Base de Données');
    console.log('═'.repeat(90));

    // ============================================================
    // ÉTAPE 1: Compter les nœuds
    // ============================================================
    console.log('\n📊 ÉTAPE 1 - Statistiques');
    console.log('─'.repeat(90));

    const totalNodes = await prisma.treeBranchLeafNode.count();
    console.log(`✅ Nombre total de nœuds: ${totalNodes}`);

    const nodesWithCalculatedValues = await prisma.treeBranchLeafNode.count({
      where: { calculatedValue: { not: null } }
    });

    console.log(`✅ Nœuds avec calculatedValue: ${nodesWithCalculatedValues}`);

    // ============================================================
    // ÉTAPE 2: Afficher les 10 premiers nœuds avec valeurs
    // ============================================================
    console.log('\n📋 ÉTAPE 2 - Affichage des Valeurs Existantes');
    console.log('─'.repeat(90));

    const existingValues = await prisma.treeBranchLeafNode.findMany({
      where: { calculatedValue: { not: null } },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      },
      take: 10
    });

    if (existingValues.length === 0) {
      console.log('⚠️  Aucune valeur calculée trouvée dans la DB');
      console.log('   → Nous allons en créer une pour test...');
    } else {
      console.log(`✅ ${existingValues.length} valeurs calculées trouvées:\n`);
      existingValues.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.label} (${item.id})`);
        console.log(`      └─ Valeur: ${item.calculatedValue}`);
        console.log(`      └─ Calculé à: ${item.calculatedAt ? new Date(item.calculatedAt).toLocaleString('fr-FR') : 'N/A'}`);
        console.log(`      └─ Calculé par: ${item.calculatedBy || 'inconnu'}\n`);
      });
    }

    // ============================================================
    // ÉTAPE 3: Créer une valeur de test
    // ============================================================
    console.log('\n🧪 ÉTAPE 3 - Test d\'Enregistrement');
    console.log('─'.repeat(90));

    // Trouver un nœud pour tester
    const testNode = await prisma.treeBranchLeafNode.findFirst({
      where: { type: { contains: 'TEXT' } }, // Cherche un nœud TEXT
      select: { id: true, label: true }
    });

    if (!testNode) {
      const anyNode = await prisma.treeBranchLeafNode.findFirst({
        select: { id: true, label: true }
      });

      if (!anyNode) {
        console.log('❌ Aucun nœud trouvé dans la base!');
        console.log('   → Crée au moins un nœud TreeBranchLeafNode d\'abord');
        process.exit(1);
      }

      console.log(`✅ Nœud de test: ${anyNode.label} (${anyNode.id})`);

      const testValue = `Test_${new Date().getTime()}`;
      const testCalculatedBy = `verify-script-${new Date().toISOString()}`;

      console.log(`📝 Enregistrement: "${testValue}"`);
      console.log(`📝 Calculé par: "${testCalculatedBy}"`);

      await prisma.treeBranchLeafNode.update({
        where: { id: anyNode.id },
        data: {
          calculatedValue: testValue,
          calculatedAt: new Date(),
          calculatedBy: testCalculatedBy
        }
      });

      console.log(`✅ Valeur enregistrée avec succès!`);

      // ============================================================
      // ÉTAPE 4: Vérifier que c'est enregistré
      // ============================================================
      console.log('\n✔️  ÉTAPE 4 - Vérification');
      console.log('─'.repeat(90));

      const verified = await prisma.treeBranchLeafNode.findUnique({
        where: { id: anyNode.id },
        select: {
          id: true,
          label: true,
          calculatedValue: true,
          calculatedAt: true,
          calculatedBy: true
        }
      });

      if (!verified) {
        console.log('❌ ERREUR: Nœud non trouvé après mise à jour!');
        process.exit(1);
      }

      console.log(`✅ Valeur vérifiée:\n`);
      console.log(`   ID: ${verified.id}`);
      console.log(`   Label: ${verified.label}`);
      console.log(`   calculatedValue: "${verified.calculatedValue}"`);
      console.log(`   calculatedAt: ${verified.calculatedAt ? new Date(verified.calculatedAt).toLocaleString('fr-FR') : 'N/A'}`);
      console.log(`   calculatedBy: "${verified.calculatedBy}"\n`);

      if (verified.calculatedValue === testValue) {
        console.log('🎉 SUCCÈS! La valeur a été correctement enregistrée et lue!');
      } else {
        console.log('⚠️  ATTENTION: La valeur lue ne correspond pas à celle écrite!');
        console.log(`   Attendu: "${testValue}"`);
        console.log(`   Obtenu: "${verified.calculatedValue}"`);
      }
    }

    // ============================================================
    // ÉTAPE 5: Afficher tous les nœuds (limite 5) pour debug
    // ============================================================
    console.log('\n📑 ÉTAPE 5 - Liste Complète (premiers 5)');
    console.log('─'.repeat(90));

    const allNodes = await prisma.treeBranchLeafNode.findMany({
      select: {
        id: true,
        label: true,
        type: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      },
      take: 5
    });

    console.log(`✅ Affichage des 5 premiers nœuds:\n`);
    allNodes.forEach((node, idx) => {
      const hasValue = node.calculatedValue ? '✅' : '❌';
      console.log(`${hasValue} ${idx + 1}. ${node.label}`);
      console.log(`      Type: ${node.type}`);
      console.log(`      ID: ${node.id}`);
      console.log(`      Valeur: ${node.calculatedValue || '(vide)'}`);
    });

    // ============================================================
    // RÉSUMÉ FINAL
    // ============================================================
    console.log('\n' + '═'.repeat(90));
    console.log('✅ VÉRIFICATION TERMINÉE');
    console.log('═'.repeat(90));

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   • Total nœuds: ${totalNodes}`);
    console.log(`   • Nœuds avec valeurs: ${nodesWithCalculatedValues}`);
    console.log(`   • Colonnes disponibles: calculatedValue, calculatedAt, calculatedBy ✅`);

    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('   1. Appeler storeCalculatedValues() après calculs');
    console.log('   2. Utiliser <CalculatedValueDisplay/> pour afficher');
    console.log('   3. Les valeurs s\'afficheront automatiquement');

    console.log('\n');

  } catch (error) {
    console.error('❌ ERREUR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
