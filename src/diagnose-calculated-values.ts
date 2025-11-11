/**
 * 🔍 SCRIPT DE DIAGNOSTIC - Vérifier les Valeurs Calculées Stockées
 * 
 * Ce script vérifie:
 * 1. Si la colonne calculatedValue existe dans Prisma
 * 2. Si les valeurs sont stockées dans la DB
 * 3. Les détails des champs "Prix Kwh"
 * 4. Les données stockées récemment
 */

import { prisma } from './lib/prisma';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 DIAGNOSTIC - Valeurs Calculées Stockées             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // ==========================================
    // 1️⃣ VÉRIFIER LA STRUCTURE DE LA TABLE
    // ==========================================
    console.log('📊 [1] VÉRIFICATION STRUCTURE TABLE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const tableSample = await prisma.treeBranchLeafNode.findFirst({
      select: {
        id: true,
        label: true,
        type: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      }
    });

    if (!tableSample) {
      console.log('❌ Aucun nœud trouvé dans la table!');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Table TreeBranchLeafNode trouvée');
    console.log('✅ Colonnes présentes:');
    console.log(`   - calculatedValue: ${tableSample.calculatedValue !== undefined ? '✅' : '❌'}`);
    console.log(`   - calculatedAt: ${tableSample.calculatedAt !== undefined ? '✅' : '❌'}`);
    console.log(`   - calculatedBy: ${tableSample.calculatedBy !== undefined ? '✅' : '❌'}`);

    // ==========================================
    // 2️⃣ CHERCHER LE CHAMP "PRIX KWH"
    // ==========================================
    console.log('\n📝 [2] RECHERCHE CHAMP "PRIX KWH"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const prixKwhNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Prix', mode: 'insensitive' } },
          { label: { contains: 'Kwh', mode: 'insensitive' } },
          { label: { contains: 'kWh', mode: 'insensitive' } },
          { field_label: { contains: 'Prix', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        label: true,
        field_label: true,
        type: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true,
        hasFormula: true,
        hasTable: true,
        hasData: true
      },
      take: 10
    });

    if (prixKwhNodes.length === 0) {
      console.log('⚠️  Aucun champ "Prix" ou "Kwh" trouvé');
    } else {
      console.log(`✅ Trouvé ${prixKwhNodes.length} champ(s) contenant "Prix" ou "Kwh":\n`);

      prixKwhNodes.forEach((node, idx) => {
        console.log(`${idx + 1}. ${node.label || node.field_label || 'Sans label'}`);
        console.log(`   ID: ${node.id}`);
        console.log(`   Type: ${node.type}`);
        console.log(`   Calculé? ${node.hasFormula ? '✅ Formula' : ''}${node.hasTable ? '✅ Table' : ''}${node.hasData ? '✅ Data' : ''}${!node.hasFormula && !node.hasTable && !node.hasData ? '❌ Non' : ''}`);
        console.log(`   Valeur Stockée: ${node.calculatedValue ? `✅ "${node.calculatedValue}"` : '❌ NULL'}`);
        console.log(`   Timestamp: ${node.calculatedAt ? `✅ ${node.calculatedAt.toLocaleString('fr-FR')}` : '❌ NULL'}`);
        console.log(`   Calculé par: ${node.calculatedBy || '❌ Inconnu'}`);
        console.log('');
      });
    }

    // ==========================================
    // 3️⃣ COMPTER LES VALEURS STOCKÉES
    // ==========================================
    console.log('\n📊 [3] STATISTIQUES DE STOCKAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const totalNodes = await prisma.treeBranchLeafNode.count();
    const nodesWithCalculatedValue = await prisma.treeBranchLeafNode.count({
      where: { calculatedValue: { not: null } }
    });
    const nodesWithTimestamp = await prisma.treeBranchLeafNode.count({
      where: { calculatedAt: { not: null } }
    });
    const nodesWithSource = await prisma.treeBranchLeafNode.count({
      where: { calculatedBy: { not: null } }
    });

    console.log(`Total nœuds: ${totalNodes}`);
    console.log(`Nœuds avec calculatedValue: ${nodesWithCalculatedValue} (${((nodesWithCalculatedValue / totalNodes) * 100).toFixed(1)}%)`);
    console.log(`Nœuds avec timestamp: ${nodesWithTimestamp} (${((nodesWithTimestamp / totalNodes) * 100).toFixed(1)}%)`);
    console.log(`Nœuds avec source: ${nodesWithSource} (${((nodesWithSource / totalNodes) * 100).toFixed(1)}%)`);

    // ==========================================
    // 4️⃣ AFFICHER LES 5 DERNIÈRES VALEURS
    // ==========================================
    console.log('\n📋 [4] 5 DERNIÈRES VALEURS CALCULÉES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const latestCalculated = await prisma.treeBranchLeafNode.findMany({
      where: { calculatedValue: { not: null } },
      orderBy: { calculatedAt: 'desc' },
      select: {
        id: true,
        label: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true
      },
      take: 5
    });

    if (latestCalculated.length === 0) {
      console.log('❌ Aucune valeur calculée stockée!');
    } else {
      latestCalculated.forEach((node, idx) => {
        console.log(`${idx + 1}. ${node.label}`);
        console.log(`   Valeur: ${node.calculatedValue}`);
        console.log(`   Calculé par: ${node.calculatedBy}`);
        console.log(`   Date: ${node.calculatedAt?.toLocaleString('fr-FR')}`);
        console.log('');
      });
    }

    // ==========================================
    // 5️⃣ VÉRIFIER LES FORMULES ET TABLES
    // ==========================================
    console.log('\n🔧 [5] NŒUDS AVEC FORMULES/TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const formulaNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { hasFormula: true },
          { hasTable: true }
        ]
      },
      select: {
        id: true,
        label: true,
        hasFormula: true,
        hasTable: true,
        calculatedValue: true,
        calculatedBy: true
      },
      take: 10
    });

    if (formulaNodes.length === 0) {
      console.log('⚠️  Aucun nœud avec formule/table trouvé');
    } else {
      console.log(`✅ Trouvé ${formulaNodes.length} nœud(s) avec formule/table:\n`);

      formulaNodes.forEach((node, idx) => {
        const type = node.hasFormula ? '🧮 Formula' : '📊 Table';
        const status = node.calculatedValue ? '✅' : '❌';
        console.log(`${idx + 1}. ${status} ${type} - ${node.label}`);
        console.log(`   Valeur: ${node.calculatedValue || 'Pas encore stockée'}`);
        console.log(`   Calculé par: ${node.calculatedBy || 'Inconnu'}`);
        console.log('');
      });
    }

    // ==========================================
    // 6️⃣ RÉSUMÉ FINAL
    // ==========================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 RÉSUMÉ DIAGNOSTIC                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const percentageStored = ((nodesWithCalculatedValue / totalNodes) * 100).toFixed(1);
    const status = nodesWithCalculatedValue > 0 ? '✅ SYSTÈME FONCTIONNEL' : '❌ AUCUNE VALEUR STOCKÉE';

    console.log(`\nStatus: ${status}`);
    console.log(`Valeurs stockées: ${nodesWithCalculatedValue}/${totalNodes} (${percentageStored}%)`);
    
    if (nodesWithCalculatedValue === 0) {
      console.log('\n⚠️  ACTION REQUISE:');
      console.log('   1. Vérifier que tu appelles storeCalculatedValues() dans ton endpoint');
      console.log('   2. Soumettre un formulaire pour générer des données');
      console.log('   3. Réexécuter ce script pour vérifier');
    } else {
      console.log('\n✅ LE SYSTÈME FONCTIONNE!');
      console.log('   Les valeurs sont bien stockées dans Prisma');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
