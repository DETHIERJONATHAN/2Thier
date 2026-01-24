/**
 * SCRIPT TEST ÉTAPE 4 - COMPLET
 * 
 * Crée une table avec colonnes, puis un SelectConfig vide,
 * puis simule l'étape 4 manuelle avec la mise à jour displayColumn
 */

import { db } from '../src/lib/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function main() {
  console.log('\n========================================');
  console.log('🧪 TEST ÉTAPE 4 - COMPLET');
  console.log('========================================\n');

  try {
    // Chercher un nœud
    const node = await db.treeBranchLeafNode.findFirst();
    if (!node) {
      console.log('❌ Aucun nœud trouvé');
      process.exit(1);
    }
    console.log(`✅ Nœud trouvé: ${node.id}\n`);

    // ========================================
    // CRÉER UNE TABLE DE LOOKUP AVEC COLONNES
    // ========================================
    console.log('[STEP 1] Création d\'une table de lookup avec colonnes\n');

    const lookupTable = await db.treeBranchLeafNodeTable.create({
      data: {
        id: generateId(),
        nodeId: node.id,
        name: `test_lookup_${Date.now()}`,
        tableName: `test_lookup_${Date.now()}`,
        meta: {
          columns: [
            { name: 'id', type: 'text', label: 'ID' },
            { name: 'label', type: 'text', label: 'Label' },
            { name: 'value', type: 'text', label: 'Value' },
          ],
        },
    updatedAt: new Date(),
        id: generateId(),
        nodeId: node.id,
        tableReference: lookupTable.id,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ SelectConfig créé: ${selectConfig.id}`);
    console.log(`   displayColumn AVANT: ${selectConfig.displayColumn} (NULL) ← PROBLÈME!\n`);

    // ========================================
    // ÉTAPE 4 MANUELLE: SÉLECTIONNER displayColumn
    // ========================================
    console.log('[STEP 3] SIMULATION ÉTAPE 4 MANUELLE\n');
    console.log('⚙️  Utilisateur clique sur le dropdown et sélectionne "label"\n');

    const displayColumnValue = 'label'; // ← L'utilisateur sélectionne manuellement

    console.log(`[MANUAL-SAVE][SELECT-CONFIG]`);
    console.log(`   nodeId: ${node.id}`);
    console.log(`   tableReference: ${lookupTable.id}`);
    console.log(`   displayColumn: "${displayColumnValue}"\n`);

    // ========================================
    // MISE À JOUR (L'ÉTAPE 4 MANUELLE)
    // ========================================
    const updated = await db.treeBranchLeafSelectConfig.update({
      where: { id: selectConfig.id },
      data: { displayColumn: displayColumnValue },
    });

    console.log('✅ SelectConfig mise à jour\n');

    // ========================================
    // AFFICHAGE DES RÉSULTATS
    // ========================================
    console.log('\n========================================');
    console.log('📊 RÉSULTATS - CE QUI S\'EST ENREGISTRÉ');
    console.log('========================================\n');

    console.log('🔍 Contenu COMPLET du SelectConfig après update:\n');
    console.log(JSON.stringify(updated, null, 2));

    console.log('\n\n🎯 LES DONNÉES CRITIQUES:\n');
    console.log(`   id: "${updated.id}"`);
    console.log(`   nodeId: "${updated.nodeId}"`);
    console.log(`   tableReference: "${updated.tableReference}"`);
    console.log(`   displayColumn: "${updated.displayColumn}"  ← CECI DOIT ÊTRE COPIÉ`);
    console.log(`   keyColumn: ${updated.keyColumn}`);
    console.log(`   valueColumn: ${updated.valueColumn}`);

    console.log('\n\n📋 RÉSUMÉ POUR LA DUPLICATION:\n');
    console.log('QUAND ON DUPLIQUE UN CHAMP AVEC UNE TABLE LOOKUP:');
    console.log('1. Créer SelectConfig avec tableReference = ID de la table lookup');
    console.log(`2. Setter displayColumn = première colonne de la table ("label")`);
    console.log(`   OU demander à l'utilisateur de la sélectionner`);
    console.log(`\nActuellement après duplication: displayColumn = NULL`);
    console.log(`Ce qui empêche les formules de fonctionner!\n`);

    // ========================================
    // NETTOYAGE
    // ========================================
    console.log('[STEP 4] Nettoyage\n');
    
    await db.treeBranchLeafSelectConfig.delete({
      where: { id: selectConfig.id },
    });
    console.log('✅ SelectConfig supprimé');

    await db.treeBranchLeafNodeTable.delete({
      where: { id: lookupTable.id },
    });
    console.log('✅ Table de lookup supprimée');

    console.log('\n========================================');
    console.log('✅ DÉMONSTRATION TERMINÉE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
