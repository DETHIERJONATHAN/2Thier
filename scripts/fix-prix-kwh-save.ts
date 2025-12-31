#!/usr/bin/env npx tsx
/**
 * 🔧 ACTIVER LA SAUVEGARDE DU CHAMP PRIX KW/H
 * 
 * Active la capacité Data pour que le champ sauvegarde sa valeur
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche du champ "Prix Kw/h"...\n');

  // Trouver le champ Prix Kw/h (leaf_option_field)
  const prixKwhField = await prisma.treeBranchLeafNode.findFirst({
    where: {
      label: 'Prix Kw/h',
      type: 'leaf_option_field'
    }
  });

  if (!prixKwhField) {
    console.error('❌ Champ "Prix Kw/h" non trouvé!');
    process.exit(1);
  }

  console.log(`✅ Champ trouvé: ${prixKwhField.id}`);
  console.log(`   Type: ${prixKwhField.type}`);
  console.log(`   HasData: ${prixKwhField.hasData}`);
  console.log(`   HasFormula: ${prixKwhField.hasFormula}`);
  console.log(`   Data activeId: ${prixKwhField.data_activeId}`);

  // Vérifier si une variable existe déjà
  let variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: prixKwhField.id }
  });

  if (variable) {
    console.log(`\n✅ Variable existante trouvée: ${variable.id}`);
    console.log(`   Clé exposée: ${variable.exposedKey}`);
  } else {
    console.log('\n❌ Aucune variable n\'existe pour ce champ');
    console.log('🔧 Création de la variable...');

    // Créer une variable pour stocker les données
    const exposedKey = `var_prix_kwh_${Date.now()}`;
    variable = await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: `var-${prixKwhField.id}`,
        nodeId: prixKwhField.id,
        exposedKey: exposedKey,
        displayName: 'Prix Kw/h',
        sourceRef: null, // Pas de formule source, c'est une saisie/calcul
        displayFormat: '0.000',
        precision: 3,
        unit: '€/kWh',
        visibleToUser: true,
        updatedAt: new Date()
      }
    });

    console.log(`   ✅ Variable créée: ${variable.id}`);
    console.log(`   Clé exposée: ${variable.exposedKey}`);
  }

  // Activer la capacité Data sur le champ
  console.log('\n🔧 Activation de la capacité Data...');
  
  await prisma.treeBranchLeafNode.update({
    where: { id: prixKwhField.id },
    data: {
      hasData: true,
      data_activeId: variable.id,
      data_exposedKey: variable.exposedKey,
      data_displayFormat: '0.000',
      data_precision: 3,
      data_unit: '€/kWh',
      data_visibleToUser: true
    }
  });

  console.log('   ✅ Capacité Data activée');

  // Vérifier le résultat
  const updated = await prisma.treeBranchLeafNode.findUnique({
    where: { id: prixKwhField.id }
  });

  console.log('\n📊 Configuration finale:');
  console.log(`   HasData: ${updated?.hasData} ✅`);
  console.log(`   Data activeId: ${updated?.data_activeId}`);
  console.log(`   Data exposedKey: ${updated?.data_exposedKey}`);
  console.log(`   HasFormula: ${updated?.hasFormula}`);

  console.log('\n✅ Configuration terminée!');
  console.log('\n💡 Maintenant, le champ "Prix Kw/h" va:');
  console.log('   1. Calculer automatiquement la valeur (formule)');
  console.log('   2. SAUVEGARDER la valeur calculée (capacité Data)');
  console.log('   3. Rendre la valeur disponible via @' + variable.exposedKey);
  console.log('\n🔄 Rechargez la page pour voir les changements.');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
