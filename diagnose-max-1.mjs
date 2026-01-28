#!/usr/bin/env node
/**
 * Script diagnostic pour le panel max-1
 * Vérifie : structure, formule, icône, affichage
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function diagnoseMax1() {
  console.log('🔍 DIAGNOSTIC PANEL MAX-1\n');
  console.log('=' .repeat(60));

  try {
    // 1. Chercher le panel max-1
    console.log('\n1️⃣  Recherche du panel MAX-1...');
    const panelType = 'max';
    const panelId = 1;
    
    const tableProperties = await db.tableProperties.findMany({
      where: { type: panelType },
      include: {
        fieldProperties: {
          include: {
            formulaNodeTree: true,
            linkedTableIds: true
          }
        }
      }
    });

    console.log(`   ➜ Trouvé ${tableProperties.length} panel(s) de type '${panelType}'`);
    
    if (tableProperties.length === 0) {
      console.log('   ❌ AUCUN PANEL DE TYPE MAX TROUVÉ');
      process.exit(1);
    }

    const maxPanel = tableProperties[0];
    console.log(`   ✅ Panel ID: ${maxPanel.id}`);
    console.log(`   ✅ Type: ${maxPanel.type}`);
    console.log(`   ✅ Nom: ${maxPanel.name || '(vide)'}`);
    console.log(`   ✅ Champs: ${maxPanel.fieldProperties.length}`);

    // 2. Analyser les champs et leurs formules
    console.log('\n2️⃣  Analyse des champs et formules...');
    for (const field of maxPanel.fieldProperties) {
      console.log(`\n   Champ: ${field.name} (ID: ${field.id})`);
      console.log(`   ├─ Type: ${field.fieldType}`);
      console.log(`   ├─ Visible: ${field.visible}`);
      console.log(`   ├─ Formula exists: ${field.formula ? '✅ OUI' : '❌ NON'}`);
      
      if (field.formula) {
        console.log(`   ├─ Formule: ${field.formula}`);
      }
      
      // Vérifier formulaNodeTree
      console.log(`   ├─ formulaNodeTree: ${field.formulaNodeTree ? '✅ PRESENT' : '❌ ABSENT'}`);
      if (field.formulaNodeTree) {
        console.log(`   │  └─ ID: ${field.formulaNodeTree.id}`);
        console.log(`   │  └─ Root: ${field.formulaNodeTree.root ? '✅' : '❌'}`);
        console.log(`   │  └─ TreeBranchLeaf: ${field.formulaNodeTree.treeBranchLeaf ? '✅' : '❌'}`);
        if (field.formulaNodeTree.treeBranchLeaf) {
          console.log(`   │     └─ Icon présent: OUI`);
        }
      }

      // Vérifier linkedTableIds
      console.log(`   └─ linkedTableIds: ${field.linkedTableIds?.length || 0}`);
      if (field.linkedTableIds && field.linkedTableIds.length > 0) {
        field.linkedTableIds.forEach(link => {
          console.log(`      └─ ${link.id}`);
        });
      }
    }

    // 3. Chercher les données / réponses
    console.log('\n3️⃣  Recherche des réponses en base...');
    const responses = await db.responses.findMany({
      where: {
        panelId: maxPanel.id
      },
      take: 5
    });

    console.log(`   ➜ Réponses trouvées: ${responses.length}`);
    if (responses.length > 0) {
      console.log(`   ✅ Des réponses existent!`);
      responses.forEach((resp, i) => {
        console.log(`      [${i + 1}] ID: ${resp.id}, Data: ${JSON.stringify(resp.data || {}).substring(0, 60)}...`);
      });
    } else {
      console.log(`   ⚠️  AUCUNE RÉPONSE TROUVÉE pour ce panel`);
    }

    // 4. Rapport synthétique
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DIAGNOSTIQUE\n');

    const fieldWithFormula = maxPanel.fieldProperties.filter(f => f.formula);
    const fieldWithTree = maxPanel.fieldProperties.filter(f => f.formulaNodeTree);
    const fieldWithIcon = maxPanel.fieldProperties.filter(f => f.formulaNodeTree?.treeBranchLeaf);

    console.log(`✅ Champs avec formule: ${fieldWithFormula.length}/${maxPanel.fieldProperties.length}`);
    console.log(`✅ Champs avec formulaNodeTree: ${fieldWithTree.length}/${maxPanel.fieldProperties.length}`);
    console.log(`✅ Champs avec treeBranchLeaf (icon): ${fieldWithIcon.length}/${maxPanel.fieldProperties.length}`);
    console.log(`✅ Réponses en base: ${responses.length}`);

    if (fieldWithIcon.length === 0 && fieldWithFormula.length > 0) {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ:');
      console.log('    - Des formules existent mais treeBranchLeaf est vide');
      console.log('    - L\'onglet formule ne sera pas bleu');
      console.log('    - L\'icône formule ne s\'affichera pas');
    }

    if (responses.length === 0) {
      console.log('\n⚠️  ATTENTION:');
      console.log('    - Aucune réponse trouvée pour ce panel');
      console.log('    - C\'est peut-être normal si le formulaire n\'a jamais été soumis');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnostic terminé\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

diagnoseMax1();
