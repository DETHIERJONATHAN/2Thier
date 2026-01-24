import { db } from '../src/lib/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function main() {
  console.log('\n========================================');
  console.log('🧪 TEST ÉTAPE 4 - MANUEL');
  console.log('========================================\n');

  try {
    // Trouver un nœud existant
    const node = await db.treeBranchLeafNode.findFirst({
      where: { type: 'field' },
    });

    if (!node) {
      console.log('❌ ERREUR: Aucun nœud trouvé');
      process.exit(1);
    }

    console.log(`✅ Nœud trouvé: ${node.id}\n`);

    // ========================================
    // STEP 1: Créer table de lookup avec colonnes
    // ========================================
    console.log('[STEP 1] Création d\'une table de lookup avec colonnes\n');

    const tableName = `test_lookup_${Date.now()}`;
    const lookupTable = await db.treeBranchLeafNodeTable.create({
      data: {
        id: generateId(),
        nodeId: node.id,
        name: tableName,
        tableName: tableName,
        meta: {
          columns: [
            { name: 'id', type: 'text', label: 'ID' },
            { name: 'label', type: 'text', label: 'Label' },
            { name: 'value', type: 'text', label: 'Value' },
          ],
        },
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Table créée: ${lookupTable.id}`);
    console.log(`   Colonnes: id, label, value\n`);

    // ========================================
    // STEP 2: Créer SelectConfig VIDE (état post-duplication)
    // ========================================
    console.log('[STEP 2] Création d\'un SelectConfig VIDE (état post-duplication)\n');

    const selectConfig = await db.treeBranchLeafSelectConfig.create({
      data: {
        id: generateId(),
        nodeId: node.id,
        tableReference: lookupTable.id,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ SelectConfig créé: ${selectConfig.id}`);
    console.log(`   displayColumn AVANT: ${selectConfig.displayColumn} (NULL) ← PROBLÈME!\n`);

    // ========================================
    // STEP 3: SIMULATION ÉTAPE 4 MANUELLE
    // ========================================
    console.log('[STEP 3] SIMULATION ÉTAPE 4 MANUELLE\n');
    console.log('⚙️  Utilisateur sélectionne "label" comme colonne d\'affichage\n');

    // ========================================
    // STEP 4: UPDATE (L'ÉTAPE 4 MANUELLE)
    // ========================================
    const updated = await db.treeBranchLeafSelectConfig.update({
      where: { id: selectConfig.id },
      data: { displayColumn: 'label' },
    });

    console.log('✅ SelectConfig MISE À JOUR\n');

    // ========================================
    // AFFICHAGE COMPLET DES DONNÉES
    // ========================================
    console.log('[RESULT] Voici EXACTEMENT ce qui s\'écrit en base de données:\n');
    console.log('📊 SelectConfig APRÈS Étape 4:');
    console.log(JSON.stringify(updated, null, 2));

    // ========================================
    // NETTOYAGE
    // ========================================
    console.log('\n[CLEANUP] Suppression des données de test...\n');

    await db.treeBranchLeafSelectConfig.delete({
      where: { id: selectConfig.id },
    });

    await db.treeBranchLeafNodeTable.delete({
      where: { id: lookupTable.id },
    });

    console.log('✅ Données de test supprimées\n');

    console.log('========================================');
    console.log('✅ TEST TERMINÉ AVEC SUCCÈS');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main();
