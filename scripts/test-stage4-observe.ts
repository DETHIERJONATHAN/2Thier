import { db } from '../src/lib/database';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function main() {
  console.log('\n========================================');
  console.log('🧪 TEST ÉTAPE 4 - OBSERVATION DB');
  console.log('========================================\n');

  try {
    // Récupérer une table existante
    const existingTable = await db.treeBranchLeafNodeTable.findFirst();

    if (!existingTable) {
      console.log('❌ ERREUR: Aucune table existante trouvée');
      process.exit(1);
    }

    console.log(`✅ Table existante trouvée: ${existingTable.id}`);
    console.log(`   NodeId: ${existingTable.nodeId}\n`);

    // ========================================
    // ÉTAPE 1: VÉRIFIER LES COLONNES
    // ========================================
    console.log('[ÉTAPE 1] Colonnes de la table\n');
    
    // Si meta.columns existe, utilisons-le; sinon cherchons les colonnes
    let columns: any[] = existingTable.meta?.columns || [];
    
    if (columns.length === 0) {
      // Chercher les colonnes dans la DB
      const dbColumns = await db.treeBranchLeafNodeTableColumn.findMany({
        where: { tableId: existingTable.id },
      });
      columns = dbColumns.map(c => ({ name: c.name, type: c.type, label: c.label }));
    }

    console.log(`Colonnes trouvées: ${columns.map((c: any) => c.name).join(', ')}`);
    const firstColumnName = columns[0]?.name || 'label';
    console.log(`Première colonne: ${firstColumnName}\n`);

    // ========================================
    // ÉTAPE 2: CHERCHER SelectConfig EXISTANT
    // ========================================
    console.log('[ÉTAPE 2] Recherche SelectConfig existant\n');

    const existingSelectConfig = await db.treeBranchLeafSelectConfig.findFirst({
      where: { tableReference: existingTable.id },
    });

    if (existingSelectConfig) {
      console.log(`✅ SelectConfig trouvé: ${existingSelectConfig.id}`);
      console.log(`   displayColumn AVANT: ${existingSelectConfig.displayColumn || '(NULL)'} ← PROBLÈME!\n`);

      // ========================================
      // ÉTAPE 3: SIMULATION ÉTAPE 4 MANUELLE
      // ========================================
      console.log('[ÉTAPE 3] SIMULATION ÉTAPE 4 MANUELLE - UPDATE AVEC displayColumn\n');
      console.log(`⚙️  Mise à jour: displayColumn = "${firstColumnName}"\n`);

      const updated = await db.treeBranchLeafSelectConfig.update({
        where: { id: existingSelectConfig.id },
        data: { displayColumn: firstColumnName },
      });

      console.log('✅ SelectConfig MISE À JOUR\n');

      // ========================================
      // AFFICHAGE COMPLET DES DONNÉES
      // ========================================
      console.log('========================================');
      console.log('📊 VOICI EXACTEMENT CE QUI S\'ÉCRIT EN DB');
      console.log('========================================\n');
      console.log(JSON.stringify(updated, null, 2));
      console.log('\n========================================');
      console.log('🔑 CHAMPS CRITIQUES:');
      console.log(`   - id: ${updated.id}`);
      console.log(`   - nodeId: ${updated.nodeId}`);
      console.log(`   - tableReference: ${updated.tableReference}`);
      console.log(`   - displayColumn: "${updated.displayColumn}" ← C'EST ÇA QUI MANQUE EN DUPLICATION!`);
      console.log(`   - keyColumn: ${updated.keyColumn || '(NULL)'}`);
      console.log(`   - updatedAt: ${updated.updatedAt}`);
      console.log('========================================\n');

    } else {
      console.log(`❌ Aucun SelectConfig trouvé pour cette table`);
      console.log(`📌 Création d'un SelectConfig VIDE (état post-duplication)\n`);

      const newSelectConfig = await db.treeBranchLeafSelectConfig.create({
        data: {
          id: generateId(),
          nodeId: existingTable.nodeId,
          tableReference: existingTable.id,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ SelectConfig créé: ${newSelectConfig.id}`);
      console.log(`   displayColumn AVANT: ${newSelectConfig.displayColumn || '(NULL)'} ← PROBLÈME!\n`);

      // ========================================
      // ÉTAPE 3: SIMULATION ÉTAPE 4 MANUELLE
      // ========================================
      console.log('[ÉTAPE 3] SIMULATION ÉTAPE 4 MANUELLE - UPDATE AVEC displayColumn\n');
      console.log(`⚙️  Mise à jour: displayColumn = "${firstColumnName}"\n`);

      const updated = await db.treeBranchLeafSelectConfig.update({
        where: { id: newSelectConfig.id },
        data: { displayColumn: firstColumnName },
      });

      console.log('✅ SelectConfig MISE À JOUR\n');

      // ========================================
      // AFFICHAGE COMPLET DES DONNÉES
      // ========================================
      console.log('========================================');
      console.log('📊 VOICI EXACTEMENT CE QUI S\'ÉCRIT EN DB');
      console.log('========================================\n');
      console.log(JSON.stringify(updated, null, 2));
      console.log('\n========================================');
      console.log('🔑 CHAMPS CRITIQUES:');
      console.log(`   - id: ${updated.id}`);
      console.log(`   - nodeId: ${updated.nodeId}`);
      console.log(`   - tableReference: ${updated.tableReference}`);
      console.log(`   - displayColumn: "${updated.displayColumn}" ← C'EST ÇA QUI MANQUE EN DUPLICATION!`);
      console.log(`   - keyColumn: ${updated.keyColumn || '(NULL)'}`);
      console.log(`   - updatedAt: ${updated.updatedAt}`);
      console.log('========================================\n');

      // Nettoyage
      console.log('[CLEANUP] Suppression du SelectConfig de test...\n');
      await db.treeBranchLeafSelectConfig.delete({
        where: { id: newSelectConfig.id },
      });
      console.log('✅ SelectConfig supprimé\n');
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    process.exit(1);
  }
}

main();
