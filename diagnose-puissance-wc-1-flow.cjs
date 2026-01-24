const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnosePuissanceWC1Flow() {
  console.log('\n🔍 DIAGNOSTIC COMPLET: Pourquoi "Puissance WC-1" ne retourne pas de valeur ?\n');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 1 : Trouver le champ "Puissance WC-1"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 ÉTAPE 1 : Recherche du champ "Puissance WC-1"\n');
    
    const field = await prisma.treeBranchLeafNode.findFirst({
      where: { 
        name: 'Puissance WC-1'
      }
    });

    if (!field) {
      console.log('❌ ERREUR CRITIQUE: Champ "Puissance WC-1" NON TROUVÉ dans la base !');
      console.log('   → Vérifiez que vous avez bien dupliqué "Puissance WC"\n');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Champ trouvé !');
    console.log(`   ID: ${field.id}`);
    console.log(`   Nom: ${field.name}`);
    console.log(`   Type: ${field.fieldType || 'NULL (display field)'}`);
    console.log(`   hasTable: ${field.hasTable}`);
    console.log(`   table_activeId: ${field.table_activeId || 'NULL'}\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 2 : Vérifier les flags de capacité
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔧 ÉTAPE 2 : Vérification des flags de capacité\n');
    
    const issues = [];
    
    if (!field.hasTable) {
      issues.push('❌ hasTable = false → La capacité Table n\'est pas activée');
    } else {
      console.log('✅ hasTable = true');
    }

    if (!field.table_activeId) {
      issues.push('❌ table_activeId = NULL → Aucune table active définie');
    } else {
      console.log(`✅ table_activeId = ${field.table_activeId}`);
    }

    if (issues.length > 0) {
      console.log('\n⚠️  PROBLÈMES DÉTECTÉS:\n');
      issues.forEach(i => console.log(`   ${i}`));
      console.log('\n💡 SOLUTION: Ouvrir le champ dans l\'interface et activer/configurer la Table\n');
      await prisma.$disconnect();
      return;
    }

    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 3 : Récupérer la table
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📊 ÉTAPE 3 : Récupération de la table liée\n');

    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: field.table_activeId }
    });

    if (!table) {
      console.log(`❌ ERREUR CRITIQUE: Table ${field.table_activeId} NON TROUVÉE !`);
      console.log('   → La table a été supprimée ou l\'ID est incorrect\n');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ Table trouvée !');
    console.log(`   ID: ${table.id}`);
    console.log(`   Nom: ${table.name || 'Sans nom'}`);
    console.log(`   NodeId: ${table.nodeId}\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 4 : Analyser la configuration lookup
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔗 ÉTAPE 4 : Analyse de la configuration lookup\n');

    const meta = table.meta;
    const lookup = meta?.lookup;

    if (!lookup) {
      console.log('❌ ERREUR CRITIQUE: Pas de configuration lookup dans table.meta !');
      console.log('   → Configurez le lookup dans l\'onglet Table du champ\n');
      await prisma.$disconnect();
      return;
    }

    console.log('Configuration lookup trouvée:');
    console.log(`   columnLookupEnabled: ${lookup.columnLookupEnabled}`);
    console.log(`   rowLookupEnabled: ${lookup.rowLookupEnabled}`);
    console.log(`   displayColumn: ${lookup.displayColumn}`);
    
    if (lookup.columnSourceOption) {
      console.log(`\n   columnSourceOption:`);
      console.log(`      type: ${lookup.columnSourceOption.type}`);
      console.log(`      sourceField: ${lookup.columnSourceOption.sourceField || 'N/A'}`);
      console.log(`      operator: ${lookup.columnSourceOption.operator || 'N/A'}`);
      console.log(`      comparisonColumn: ${lookup.columnSourceOption.comparisonColumn || 'N/A'}`);
    }

    const lookupIssues = [];

    if (!lookup.columnLookupEnabled && !lookup.rowLookupEnabled) {
      lookupIssues.push('❌ Ni columnLookupEnabled ni rowLookupEnabled activé');
    }

    if (!lookup.displayColumn) {
      lookupIssues.push('❌ displayColumn non défini');
    }

    if (lookup.columnLookupEnabled && !lookup.columnSourceOption?.sourceField) {
      lookupIssues.push('❌ columnSourceOption.sourceField non défini');
    }

    if (lookupIssues.length > 0) {
      console.log('\n⚠️  PROBLÈMES DE CONFIGURATION:\n');
      lookupIssues.forEach(i => console.log(`   ${i}`));
      console.log('');
      await prisma.$disconnect();
      return;
    }

    console.log('\n✅ Configuration lookup valide\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 5 : Vérifier les données de la table
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 ÉTAPE 5 : Vérification des données de la table\n');

    const tableData = meta?.data;

    if (!tableData) {
      console.log('❌ ERREUR: Pas de données dans table.meta.data !');
      console.log('   → La table est vide ou mal structurée\n');
      await prisma.$disconnect();
      return;
    }

    const columns = tableData.columns || [];
    const rows = tableData.rows || [];
    const matrix = tableData.matrix || [];

    console.log(`Colonnes (${columns.length}): [${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}]`);
    console.log(`Lignes (${rows.length}): [${rows.slice(0, 5).join(', ')}${rows.length > 5 ? '...' : ''}]`);
    console.log(`Matrice: ${matrix.length} lignes de données\n`);

    if (columns.length === 0 || rows.length === 0) {
      console.log('❌ ERREUR: La table n\'a pas de colonnes ou de lignes !');
      console.log('   → Remplissez la table avec des données\n');
      await prisma.$disconnect();
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 6 : Récupérer la valeur du sourceField (simulation)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔎 ÉTAPE 6 : Simulation de la récupération du sourceField\n');

    const sourceFieldId = lookup.columnSourceOption?.sourceField;
    
    if (!sourceFieldId) {
      console.log('❌ ERREUR: sourceField non configuré\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`Recherche du champ source: ${sourceFieldId}`);

    const sourceField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sourceFieldId }
    });

    if (!sourceField) {
      console.log(`❌ ERREUR: Champ source ${sourceFieldId} NON TROUVÉ !`);
      console.log('   → Le sourceField pointe vers un champ qui n\'existe pas');
      console.log('   → Vérifiez que l\'ID est correct (avec suffix -1 pour les copies)\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Champ source trouvé: "${sourceField.name}"`);
    console.log(`   Type: ${sourceField.fieldType || 'display field'}`);
    console.log(`   calculatedValue: ${sourceField.calculatedValue || 'NULL'}`);
    console.log(`   defaultValue: ${sourceField.defaultValue || 'NULL'}\n`);

    // Simuler la valeur qu'on obtiendrait dans une vraie soumission
    const sourceValue = sourceField.calculatedValue || sourceField.defaultValue || '???';
    console.log(`🎯 Valeur simulée du sourceField: "${sourceValue}"\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 7 : Simuler le lookup dans la table
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🎲 ÉTAPE 7 : Simulation du lookup dans la table\n');

    const operator = lookup.columnSourceOption?.operator || '=';
    const comparisonColumn = lookup.columnSourceOption?.comparisonColumn;
    const displayColumn = lookup.displayColumn;

    console.log(`Configuration du lookup:`);
    console.log(`   Valeur à chercher: "${sourceValue}"`);
    console.log(`   Opérateur: ${operator}`);
    console.log(`   Colonne de comparaison: ${comparisonColumn || 'N/A'}`);
    console.log(`   Colonne à afficher: ${displayColumn}\n`);

    // Trouver l'index de la colonne de comparaison
    let comparisonColIndex = -1;
    if (comparisonColumn) {
      comparisonColIndex = columns.findIndex(c => 
        String(c).toLowerCase() === String(comparisonColumn).toLowerCase()
      );
      if (comparisonColIndex === -1) {
        comparisonColIndex = rows.findIndex(r => 
          String(r).toLowerCase() === String(comparisonColumn).toLowerCase()
        );
      }
    }

    console.log(`Index de la colonne de comparaison: ${comparisonColIndex}`);

    if (comparisonColIndex === -1 && comparisonColumn) {
      console.log(`❌ ERREUR: Colonne "${comparisonColumn}" non trouvée dans la table !`);
      console.log(`   Colonnes disponibles: ${columns.join(', ')}`);
      console.log(`   Lignes disponibles: ${rows.join(', ')}\n`);
      await prisma.$disconnect();
      return;
    }

    // Rechercher la ligne qui match
    let foundRowIndex = -1;
    let matchedValue = null;

    for (let i = 0; i < rows.length; i++) {
      let cellValue;
      
      if (comparisonColIndex === 0) {
        // La première colonne correspond aux noms de lignes
        cellValue = rows[i];
      } else {
        // Valeur dans la matrice de données
        const dataColIndex = comparisonColIndex - 1;
        cellValue = matrix[i]?.[dataColIndex];
      }

      // Comparer selon l'opérateur
      let matches = false;
      const numericSource = parseFloat(String(sourceValue));
      const numericCell = parseFloat(String(cellValue));

      switch (operator) {
        case '=':
        case '==':
          matches = String(cellValue).toLowerCase() === String(sourceValue).toLowerCase();
          break;
        case '>':
          matches = !isNaN(numericCell) && !isNaN(numericSource) && numericCell > numericSource;
          break;
        case '>=':
          matches = !isNaN(numericCell) && !isNaN(numericSource) && numericCell >= numericSource;
          break;
        case '<':
          matches = !isNaN(numericCell) && !isNaN(numericSource) && numericCell < numericSource;
          break;
        case '<=':
          matches = !isNaN(numericCell) && !isNaN(numericSource) && numericCell <= numericSource;
          break;
      }

      if (matches) {
        foundRowIndex = i;
        matchedValue = cellValue;
        break;
      }
    }

    if (foundRowIndex === -1) {
      console.log(`❌ RÉSULTAT: Aucune ligne ne correspond à la recherche !`);
      console.log(`   → Aucune valeur dans "${comparisonColumn}" ${operator} "${sourceValue}"`);
      console.log(`\n💡 DONNÉES POUR DEBUG:`);
      console.log(`   Première ligne de la table:`);
      for (let j = 0; j < Math.min(columns.length, 5); j++) {
        const val = j === 0 ? rows[0] : matrix[0]?.[j - 1];
        console.log(`      ${columns[j] || rows[j]}: ${val}`);
      }
      console.log('');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ MATCH TROUVÉ !`);
    console.log(`   Ligne trouvée: Index ${foundRowIndex} (${rows[foundRowIndex]})`);
    console.log(`   Valeur qui a matché: ${matchedValue}\n`);

    // Récupérer la valeur à afficher
    const displayColIndex = columns.findIndex(c => 
      String(c).toLowerCase() === String(displayColumn).toLowerCase()
    );

    if (displayColIndex === -1) {
      console.log(`❌ ERREUR: Colonne d'affichage "${displayColumn}" non trouvée !`);
      console.log(`   Colonnes disponibles: ${columns.join(', ')}\n`);
      await prisma.$disconnect();
      return;
    }

    const dataColIndex = displayColIndex - 1;
    const result = matrix[foundRowIndex]?.[dataColIndex];

    console.log(`📊 RÉSULTAT FINAL:\n`);
    console.log(`   Colonne à afficher: ${displayColumn} (index ${displayColIndex})`);
    console.log(`   Valeur retournée: ${result}\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DIAGNOSTIC FINAL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 DIAGNOSTIC FINAL:\n');

    if (result !== undefined && result !== null) {
      console.log(`✅ LE LOOKUP FONCTIONNE CORRECTEMENT !`);
      console.log(`   Le champ "Puissance WC-1" DEVRAIT afficher: ${result}`);
      console.log(`\n⚠️  SI L'INTERFACE N'AFFICHE PAS CETTE VALEUR, le problème est:`);
      console.log(`   1. Le champ n'est pas dans le formulaire actif`);
      console.log(`   2. Le frontend ne charge pas la valeur calculée`);
      console.log(`   3. Le sourceField n'a pas de valeur dans la soumission active`);
      console.log(`   4. Rechargez la page / le formulaire\n`);
    } else {
      console.log(`❌ LE LOOKUP NE RETOURNE PAS DE VALEUR`);
      console.log(`   Vérifiez que la matrice de données est correctement remplie\n`);
    }

  } catch (error) {
    console.error('\n❌ ERREUR LORS DU DIAGNOSTIC:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePuissanceWC1Flow();
