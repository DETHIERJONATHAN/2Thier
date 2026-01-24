/**
 * SCRIPT TEST ÉTAPE 4 MANUELLE - VERSION SIMPLE
 * 
 * Ce script effectue manuellement l'étape 4 (configuration du displayColumn)
 * et affiche EXACTEMENT ce qui s'enregistre en base de données.
 * 
 * Exécution : npx tsx scripts/test-stage4-simple.ts
 */

import { db } from '../src/lib/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function main() {
  console.log('\n\n========================================');
  console.log('🧪 TEST ÉTAPE 4 MANUELLE - SCRIPT');
  console.log('========================================\n');

  try {
    console.log('[STEP 1] Cherche les données existantes...\n');

    const org = await db.organization.findFirst();
    if (!org) {
      console.log('❌ Aucune organisation trouvée.');
      process.exit(1);
    }
    console.log(`✅ Organisation: ${org.id} (${org.name})`);

    const anyNode = await db.treeBranchLeafNode.findFirst({
      where: { organizationId: org.id }
    });
    if (!anyNode) {
      console.log('❌ Aucun nœud trouvé.');
      process.exit(1);
    }
    console.log(`✅ Nœud: ${anyNode.id}`);

    const anyTable = await db.treeBranchLeafNodeTable.findFirst({
      where: { organizationId: org.id }
    });
    if (!anyTable) {
      console.log('❌ Aucune table trouvée.');
      process.exit(1);
    }
    console.log(`✅ Table: ${anyTable.id}\n`);

    // ========================================
    // CRÉER UN SELECT CONFIG VIDE
    // ========================================
    console.log('[STEP 2] Création d\'un SelectConfig VIDE...\n');

    const selectConfig = await db.treeBranchLeafSelectConfig.create({
      data: {
        id: generateId(),
        nodeId: anyNode.id,
        organizationId: org.id,
        tableReference: anyTable.id,
      },
    });

    console.log(`✅ SelectConfig créé: ${selectConfig.id}`);
    console.log(`   displayColumn AVANT: ${selectConfig.displayColumn}\n`);

    // ========================================
    // ÉTAPE 4 MANUELLE: METTRE À JOUR displayColumn
    // ========================================
    console.log('[STEP 3] SIMULATION ÉTAPE 4 MANUELLE\n');
    console.log('⚙️  Utilisateur sélectionne displayColumn...\n');

    const tableMeta = anyTable.meta as any;
    const firstColumn = tableMeta?.columns?.[0];
    
    if (!firstColumn) {
      console.log('❌ Aucune colonne trouvée.');
      process.exit(1);
    }

    const displayColumnValue = firstColumn.name;
    console.log(`✅ Colonne sélectionnée: "${displayColumnValue}"`);
    console.log(`[MANUAL-SAVE][SELECT-CONFIG] Update displayColumn="${displayColumnValue}"\n`);

    // ========================================
    // MISE À JOUR
    // ========================================
    const updated = await db.treeBranchLeafSelectConfig.update({
      where: { id: selectConfig.id },
      data: { displayColumn: displayColumnValue },
    });

    console.log('✅ Mise à jour effectuée\n');

    // ========================================
    // AFFICHAGE DES RÉSULTATS
    // ========================================
    console.log('\n========================================');
    console.log('📊 RÉSULTATS');
    console.log('========================================\n');

    console.log('🔍 Contenu EXACT du SelectConfig après update:\n');
    console.log(JSON.stringify(updated, null, 2));

    console.log('\n🎯 CHAMPS IMPORTANTS:');
    console.log(`   nodeId: ${updated.nodeId}`);
    console.log(`   tableReference: ${updated.tableReference}`);
    console.log(`   displayColumn: "${updated.displayColumn}" ← C'EST CE QUI DOIT ÊTRE COPIÉ`);
    console.log(`   keyColumn: ${updated.keyColumn}`);
    console.log(`   valueColumn: ${updated.valueColumn}`);

    // ========================================
    // NETTOYAGE
    // ========================================
    console.log('\n\n[STEP 4] Nettoyage...\n');
    await db.treeBranchLeafSelectConfig.delete({
      where: { id: selectConfig.id },
    });
    console.log('✅ SelectConfig supprimé');

    console.log('\n========================================');
    console.log('✅ SCRIPT TERMINÉ');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
