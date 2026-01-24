/**
 * SCRIPT TEST ÉTAPE 4 MANUELLE
 * 
 * Ce script effectue manuellement l'étape 4 (configuration du displayColumn pour un lookup table)
 * et affiche EXACTEMENT ce qui s'enregistre en base de données.
 * 
 * Procédure :
 * 1. Crée un test node avec une table lookup
 * 2. Crée un SelectConfig VIDE (comme après duplication sans patch)
 * 3. Met à jour le SelectConfig avec displayColumn (comme si on cliquait manuellement)
 * 4. Affiche EXACTEMENT ce qui a été écrit en base de données
 * 
 * Exécution :
 *   npx tsx scripts/test-stage4-manual.ts
 */

import { db } from '../src/lib/database';

// Fonction pour générer des IDs comme dans le reste de l'app
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function main() {
  console.log('\n\n========================================');
  console.log('🧪 TEST ÉTAPE 4 MANUELLE - SCRIPT');
  console.log('========================================\n');

  try {
    // ========================================
    // ÉTAPE 1: CRÉATION DES DONNÉES DE TEST
    // ========================================
    console.log('[STEP 1] Création des données de test...\n');

    // Créer ou récupérer un utilisateur de test
    let user = await db.user.findFirst();
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé. Impossible de continuer.');
      process.exit(1);
    }
    console.log(`✅ Utilisateur trouvé: ${user.id}`);

    // Créer ou récupérer une organisation
    let org = await db.organization.findFirst();
    if (!org) {
      console.log('❌ Aucune organisation trouvée. Impossible de continuer.');
      process.exit(1);
    }
    console.log(`✅ Organisation trouvée: ${org.id} (${org.name})\n`);

    // ========================================
    // ÉTAPE 2: CRÉER UN TEST NODE
    // ========================================
    console.log('[STEP 2] Création d\'un nœud de test...\n');

    const testNode = await db.treeBranchLeafNode.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        nodeType: 'field',
        label: 'TEST-FIELD-STAGE4',
        fieldType: 'table',
        createdBy: user.id,
      },
    });
    console.log(`✅ Nœud créé: ${testNode.id}`);
    console.log(`   Type: ${testNode.nodeType}`);
    console.log(`   Label: ${testNode.label}\n`);

    // ========================================
    // ÉTAPE 3: CRÉER UNE TABLE LOOKUP DE RÉFÉRENCE
    // ========================================
    console.log('[STEP 3] Création d\'une table lookup de référence...\n');

    const lookupTableNode = await db.treeBranchLeafNode.create({
      data: {
        id: generateId(),
        organizationId: org.id,
        nodeType: 'table',
        label: 'TEST-LOOKUP-TABLE',
        fieldType: 'table',
        createdBy: user.id,
      },
    });
    console.log(`✅ Table lookup créée: ${lookupTableNode.id}`);
    console.log(`   Label: ${lookupTableNode.label}\n`);

    // Créer une table pour la lookup
    const lookupTable = await db.treeBranchLeafNodeTable.create({
      data: {
        id: generateId(),
        nodeId: lookupTableNode.id,
        organizationId: org.id,
        tableName: 'test_lookup_table',
        meta: {
          columns: [
            { name: 'id', type: 'text' },
            { name: 'display_name', type: 'text' },
            { name: 'value', type: 'text' },
          ],
        },
      },
    });
    console.log(`✅ Table de lookup créée: ${lookupTable.id}\n`);

    // ========================================
    // ÉTAPE 4: CRÉER UNE TABLE POUR LE NODE DE TEST
    // ========================================
    console.log('[STEP 4] Création d\'une table pour le nœud de test...\n');

    const testTable = await db.treeBranchLeafNodeTable.create({
      data: {
        id: generateId(),
        nodeId: testNode.id,
        organizationId: org.id,
        tableName: 'test_node_table',
        meta: {
          columns: [
            { name: 'id', type: 'text' },
            { name: 'name', type: 'text' },
          ],
        },
      },
    });
    console.log(`✅ Table du nœud créée: ${testTable.id}\n`);

    // ========================================
    // ÉTAPE 5: CRÉER UN SELECT CONFIG VIDE (COMME APRÈS DUPLICATION)
    // ========================================
    console.log('[STEP 5] Création d\'un SelectConfig VIDE (state post-duplication)...\n');

    const emptySelectConfig = await db.treeBranchLeafSelectConfig.create({
      data: {
        id: generateId(),
        nodeId: testNode.id,
        organizationId: org.id,
        tableReference: lookupTable.id,
        // displayColumn: null, // ← C'EST LE PROBLÈME: null après duplication
        // Les autres champs sont aussi null/vides
      },
    });

    console.log(`✅ SelectConfig VIDE créé: ${emptySelectConfig.id}`);
    console.log(`   nodeId: ${emptySelectConfig.nodeId}`);
    console.log(`   tableReference: ${emptySelectConfig.tableReference}`);
    console.log(`   displayColumn: ${emptySelectConfig.displayColumn} (NULL!)\n`);

    // ========================================
    // ÉTAPE 6: SIMULATION DE L'ÉTAPE 4 MANUELLE
    // ========================================
    console.log('[STEP 6] SIMULATION DE L\'ÉTAPE 4 MANUELLE\n');
    console.log('⚙️  Simulation: Utilisateur clique sur displayColumn');
    console.log('    et sélectionne "display_name" dans la table de lookup\n');

    // C'est EXACTEMENT ce qui se passe manuellement:
    // L'utilisateur clique sur un dropdown et sélectionne une colonne

    const displayColumnValue = 'display_name'; // ← LA COLONNE SÉLECTIONNÉE MANUELLEMENT

    console.log(`[MANUAL-SAVE][SELECT-CONFIG] Mise à jour avec displayColumn="${displayColumnValue}"\n`);

    // Mise à jour du SelectConfig (ÉTAPE 4 MANUELLE)
    const updatedSelectConfig = await db.treeBranchLeafSelectConfig.update({
      where: { id: emptySelectConfig.id },
      data: {
        displayColumn: displayColumnValue,
        // Tu peux ajouter d'autres champs si nécessaire
      },
    });

    console.log('✅ SelectConfig mise à jour\n');

    // ========================================
    // ÉTAPE 7: AFFICHAGE EXACT DE CE QUI S'EST ENREGISTRÉ
    // ========================================
    console.log('\n========================================');
    console.log('📊 DONNÉES EXACTES ENREGISTRÉES EN BASE');
    console.log('========================================\n');

    console.log('🔍 Contenu du SelectConfig après update:');
    console.log(JSON.stringify(updatedSelectConfig, null, 2));

    console.log('\n🔍 Lecture directe depuis la base pour confirmation:');
    const readBack = await db.treeBranchLeafSelectConfig.findUnique({
      where: { id: emptySelectConfig.id },
    });
    console.log(JSON.stringify(readBack, null, 2));

    console.log('\n========================================');
    console.log('📋 RÉSUMÉ');
    console.log('========================================\n');

    console.log('✅ Étapes effectuées:');
    console.log('   1. Nœud de test créé');
    console.log('   2. Table lookup créée');
    console.log('   3. Table du nœud créée');
    console.log('   4. SelectConfig VIDE créé (post-duplication)');
    console.log('   5. SelectConfig mise à jour avec displayColumn (ÉTAPE 4 MANUELLE)');
    console.log(`\n✅ Valeur final de displayColumn: "${readBack?.displayColumn}"`);
    console.log(`\n🎯 TOUS LES CHAMPS DU SelectConfig:`);
    Object.entries(readBack || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${JSON.stringify(value)}`);
    });

    // ========================================
    // NETTOYAGE
    // ========================================
    console.log('\n\n========================================');
    console.log('🧹 NETTOYAGE');
    console.log('========================================\n');

    await db.treeBranchLeafSelectConfig.delete({
      where: { id: emptySelectConfig.id },
    });
    console.log('✅ SelectConfig supprimé');

    await db.treeBranchLeafNodeTable.delete({
      where: { id: testTable.id },
    });
    console.log('✅ Table du nœud supprimée');

    await db.treeBranchLeafNodeTable.delete({
      where: { id: lookupTable.id },
    });
    console.log('✅ Table lookup supprimée');

    await db.treeBranchLeafNode.delete({
      where: { id: testNode.id },
    });
    console.log('✅ Nœud de test supprimé');

    await db.treeBranchLeafNode.delete({
      where: { id: lookupTableNode.id },
    });
    console.log('✅ Nœud lookup supprimé');

    console.log('\n✅ Nettoyage terminé\n');

    console.log('========================================');
    console.log('✅ SCRIPT TERMINÉ AVEC SUCCÈS');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
