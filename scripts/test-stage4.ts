/**
 * SCRIPT TEST ÉTAPE 4 ULTRA-SIMPLE
 * 
 * Cherche un SelectConfig existant ou en crée un, puis le mette à jour avec displayColumn
 */

import { db } from '../src/lib/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function main() {
  console.log('\n========================================');
  console.log('🧪 TEST ÉTAPE 4 - DÉMONSTRATION');
  console.log('========================================\n');

  try {
    // Chercher UN nœud quelconque
    const node = await db.treeBranchLeafNode.findFirst();
    if (!node) {
      console.log('❌ Aucun nœud trouvé dans la base. Impossible de continuer.');
      process.exit(1);
    }
    console.log(`✅ Nœud trouvé: ${node.id}`);

    // Chercher UNE table quelconque
    const table = await db.treeBranchLeafNodeTable.findFirst();
    if (!table) {
      console.log('❌ Aucune table trouvée. Impossible de continuer.');
      process.exit(1);
    }
    console.log(`✅ Table trouvée: ${table.id}\n`);

    // ========================================
    // CRÉER UN SELECT CONFIG VIDE
    // ========================================
    console.log('[STEP 1] Création SelectConfig VIDE (state post-duplication)\n');

    const selectConfig = await db.treeBranchLeafSelectConfig.create({
      data: {
        id: generateId(),
        nodeId: node.id,
        tableReference: table.id,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ SelectConfig créé: ${selectConfig.id}`);
    console.log(`   displayColumn AVANT update: ${selectConfig.displayColumn} (NULL)\n`);

    // ========================================
    // ÉTAPE 4 MANUELLE: SÉLECTIONNER displayColumn
    // ========================================
    console.log('[STEP 2] ÉTAPE 4 MANUELLE - Sélection du displayColumn\n');

    const tableMeta = table.meta as any;
    const firstColumn = tableMeta?.columns?.[0];
    
    if (!firstColumn) {
      console.log('❌ Aucune colonne dans la table.');
      process.exit(1);
    }

    const displayColumnValue = firstColumn.name;
    console.log(`✅ Colonne sélectionnée: "${displayColumnValue}"`);
    console.log(`\n[MANUAL-SAVE][SELECT-CONFIG]`);
    console.log(`   UPDATE displayColumn = "${displayColumnValue}"\n`);

    // ========================================
    // MISE À JOUR
    // ========================================
    const updated = await db.treeBranchLeafSelectConfig.update({
      where: { id: selectConfig.id },
      data: { displayColumn: displayColumnValue },
    });

    // ========================================
    // AFFICHAGE DES RÉSULTATS
    // ========================================
    console.log('\n========================================');
    console.log('📊 RÉSULTATS - CE QUI S\'EST ENREGISTRÉ');
    console.log('========================================\n');

    console.log('🔍 Contenu COMPLET du SelectConfig après update:\n');
    console.log(JSON.stringify(updated, null, 2));

    console.log('\n\n🎯 CHAMPS CRITIQUES:\n');
    console.log(`   id: "${updated.id}"`);
    console.log(`   nodeId: "${updated.nodeId}"`);
    console.log(`   tableReference: "${updated.tableReference}"`);
    console.log(`   displayColumn: "${updated.displayColumn}"  ← CECI DOIT ÊTRE COPIÉ`);
    console.log(`   keyColumn: ${updated.keyColumn}`);
    console.log(`   valueColumn: ${updated.valueColumn}`);
    console.log(`   createdAt: ${updated.createdAt}`);
    console.log(`   updatedAt: ${updated.updatedAt}`);

    // ========================================
    // NETTOYAGE
    // ========================================
    console.log('\n\n[STEP 3] Nettoyage\n');
    await db.treeBranchLeafSelectConfig.delete({
      where: { id: selectConfig.id },
    });
    console.log('✅ SelectConfig supprimé');

    console.log('\n========================================');
    console.log('✅ DÉMONSTRATION TERMINÉE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
