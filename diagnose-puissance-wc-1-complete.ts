import { db } from './src/lib/database';

async function diagnosePuissanceWC1() {
  console.log('🔍 DIAGNOSTIC COMPLET: Puissance WC-1\n');
  
  // 1. Récupérer les deux champs
  const allPuissance = await db.treeBranchLeafNode.findMany({
    where: {
      name: { contains: 'Puissance WC' }
    },
    include: {
      tables: {
        include: {
          columns: { orderBy: { position: 'asc' } },
          rows: { orderBy: { position: 'asc' } }
        }
      }
    }
  });

  const original = allPuissance.find(n => n.name === 'Puissance WC' && !n.id.endsWith('-1'));
  const copy = allPuissance.find(n => n.name === 'Puissance WC-1' || (n.id.endsWith('-1') && n.name.startsWith('Puissance WC')));

  if (!original) {
    console.log('❌ ORIGINAL "Puissance WC" NON TROUVÉ !');
    return;
  }

  if (!copy) {
    console.log('❌ COPIE "Puissance WC-1" NON TROUVÉE !');
    console.log('\n💡 Le champ n\'a pas été re-dupliqué. Veuillez dupliquer à nouveau "Puissance WC".');
    return;
  }

  console.log('📊 COMPARAISON ORIGINAL vs COPIE\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Comparaison des IDs
  console.log('🔑 IDs:');
  console.log(`   ORIGINAL: ${original.id}`);
  console.log(`   COPIE:    ${copy.id}`);
  console.log(`   ✓ Pattern suffix: ${copy.id.endsWith('-1') ? '✅' : '❌'}\n`);

  // Comparaison des noms
  console.log('📝 Noms:');
  console.log(`   ORIGINAL: "${original.name}"`);
  console.log(`   COPIE:    "${copy.name}"\n`);

  // Comparaison des types
  console.log('🏷️  Types de champ:');
  console.log(`   ORIGINAL: ${original.fieldType || 'null (display field)'}`);
  console.log(`   COPIE:    ${copy.fieldType || 'null (display field)'}`);
  console.log(`   ✓ Identiques: ${original.fieldType === copy.fieldType ? '✅' : '❌'}\n`);

  // Comparaison des flags table
  console.log('🗂️  Flags Table:');
  console.log(`   ORIGINAL: hasTable=${original.hasTable}, table_activeId=${original.table_activeId || 'null'}`);
  console.log(`   COPIE:    hasTable=${copy.hasTable}, table_activeId=${copy.table_activeId || 'null'}`);
  
  if (!copy.hasTable) {
    console.log('   ❌ PROBLÈME: hasTable=false sur la copie !');
  }
  if (!copy.table_activeId) {
    console.log('   ❌ PROBLÈME: table_activeId=null sur la copie !');
  }
  console.log('');

  // Comparaison des tables
  console.log('📊 Tables liées:');
  console.log(`   ORIGINAL: ${original.tables.length} table(s)`);
  console.log(`   COPIE:    ${copy.tables.length} table(s)\n`);

  if (original.tables.length === 0) {
    console.log('⚠️  ATTENTION: L\'original n\'a pas de table !\n');
  }

  if (copy.tables.length === 0) {
    console.log('❌ ERREUR CRITIQUE: La copie n\'a pas de table !');
    console.log('   → La table n\'a pas été dupliquée lors du repeat/copy.');
    console.log('   → Vérifiez que deep-copy-service.ts est bien exécuté.\n');
  } else {
    const copyTable = copy.tables[0];
    console.log(`✅ Table copiée trouvée: ${copyTable.id}`);
    console.log(`   Nom: "${copyTable.name}"`);
    console.log(`   Type: ${copyTable.type}`);
    console.log(`   Colonnes: ${copyTable.columns.length}`);
    console.log(`   Lignes: ${copyTable.rows.length}\n`);

    // Vérifier le suffix de l'ID de table
    if (original.tables.length > 0) {
      const originalTableId = original.tables[0].id;
      const expectedCopyTableId = `${originalTableId}-1`;
      console.log(`🔍 Vérification ID table suffixé:`);
      console.log(`   ORIGINAL TABLE ID: ${originalTableId}`);
      console.log(`   COPIE TABLE ID:    ${copyTable.id}`);
      console.log(`   ATTENDU:           ${expectedCopyTableId}`);
      console.log(`   ✓ Correct: ${copyTable.id === expectedCopyTableId ? '✅' : '❌'}\n`);
    }
  }

  // Comparaison meta.lookup
  console.log('🔗 Configuration Lookup (meta.lookup):');
  
  const originalMeta = original.meta ? (typeof original.meta === 'string' ? JSON.parse(original.meta) : original.meta) : null;
  const copyMeta = copy.meta ? (typeof copy.meta === 'string' ? JSON.parse(copy.meta) : copy.meta) : null;

  if (!originalMeta?.lookup) {
    console.log('   ⚠️  ORIGINAL: Pas de configuration lookup\n');
  } else {
    console.log('   ORIGINAL lookup:');
    console.log(`      displayColumn: "${originalMeta.lookup.displayColumn || 'N/A'}"`);
    console.log(`      comparisonColumn: "${originalMeta.lookup.comparisonColumn || 'N/A'}"`);
    console.log(`      sourceField: "${originalMeta.lookup.columnSourceOption?.sourceField || 'N/A'}"`);
    console.log(`      columnFieldId: "${originalMeta.lookup.selectors?.columnFieldId || 'N/A'}"`);
    console.log(`      rowFieldId: "${originalMeta.lookup.selectors?.rowFieldId || 'N/A'}"\n`);
  }

  if (!copyMeta?.lookup) {
    console.log('   ❌ COPIE: Pas de configuration lookup !');
    console.log('      → Le meta.lookup n\'a pas été copié !\n');
  } else {
    console.log('   COPIE lookup:');
    console.log(`      displayColumn: "${copyMeta.lookup.displayColumn || 'N/A'}"`);
    console.log(`      comparisonColumn: "${copyMeta.lookup.comparisonColumn || 'N/A'}"`);
    console.log(`      sourceField: "${copyMeta.lookup.columnSourceOption?.sourceField || 'N/A'}"`);
    console.log(`      columnFieldId: "${copyMeta.lookup.selectors?.columnFieldId || 'N/A'}"`);
    console.log(`      rowFieldId: "${copyMeta.lookup.selectors?.rowFieldId || 'N/A'}"\n`);

    // Vérifications des suffixes
    console.log('   🔍 Vérification des suffixes dans lookup:');
    
    const sourceField = copyMeta.lookup.columnSourceOption?.sourceField;
    if (sourceField) {
      console.log(`      sourceField: ${sourceField.endsWith('-1') ? '✅ suffixé' : '❌ NON suffixé'}`);
    }
    
    const columnFieldId = copyMeta.lookup.selectors?.columnFieldId;
    if (columnFieldId) {
      console.log(`      columnFieldId: ${columnFieldId.endsWith('-1') ? '✅ suffixé' : '❌ NON suffixé'}`);
    }
    
    const rowFieldId = copyMeta.lookup.selectors?.rowFieldId;
    if (rowFieldId) {
      console.log(`      rowFieldId: ${rowFieldId.endsWith('-1') ? '✅ suffixé' : '❌ NON suffixé'}`);
    }
    
    const displayColumn = copyMeta.lookup.displayColumn;
    const comparisonColumn = copyMeta.lookup.comparisonColumn;
    console.log(`      displayColumn: ${displayColumn === originalMeta?.lookup?.displayColumn ? '✅ identique (pas de suffix)' : '⚠️  modifié'}`);
    console.log(`      comparisonColumn: ${comparisonColumn === originalMeta?.lookup?.comparisonColumn ? '✅ identique (pas de suffix)' : '⚠️  modifié'}\n`);
  }

  // DIAGNOSTIC FINAL
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🎯 DIAGNOSTIC FINAL:\n');

  const issues: string[] = [];

  if (!copy.hasTable) {
    issues.push('❌ hasTable=false → Le flag n\'est pas activé');
  }
  if (!copy.table_activeId) {
    issues.push('❌ table_activeId=null → Pas de table active définie');
  }
  if (copy.tables.length === 0) {
    issues.push('❌ Aucune table liée → Table non dupliquée');
  }
  if (!copyMeta?.lookup) {
    issues.push('❌ Pas de meta.lookup → Configuration lookup manquante');
  } else {
    const sourceField = copyMeta.lookup.columnSourceOption?.sourceField;
    if (sourceField && !sourceField.endsWith('-1')) {
      issues.push(`⚠️  sourceField pas suffixé: "${sourceField}" au lieu de "${sourceField}-1"`);
    }
    const columnFieldId = copyMeta.lookup.selectors?.columnFieldId;
    if (columnFieldId && !columnFieldId.endsWith('-1')) {
      issues.push(`⚠️  columnFieldId pas suffixé: "${columnFieldId}" au lieu de "${columnFieldId}-1"`);
    }
    const rowFieldId = copyMeta.lookup.selectors?.rowFieldId;
    if (rowFieldId && !rowFieldId.endsWith('-1')) {
      issues.push(`⚠️  rowFieldId pas suffixé: "${rowFieldId}" au lieu de "${rowFieldId}-1"`);
    }
  }

  if (issues.length === 0) {
    console.log('✅ AUCUN PROBLÈME DÉTECTÉ !');
    console.log('   La configuration semble correcte.');
    console.log('   Si le lookup ne fonctionne toujours pas, vérifiez:');
    console.log('   1. Que le champ source (sourceField) contient bien une valeur');
    console.log('   2. Que cette valeur existe dans la colonne de comparaison');
    console.log('   3. Que la colonne d\'affichage contient bien des valeurs\n');
  } else {
    console.log('PROBLÈMES DÉTECTÉS:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('');
  }

  // Afficher les données de la table si elle existe
  if (copy.tables.length > 0 && copy.tables[0].columns.length > 0) {
    const table = copy.tables[0];
    console.log('📋 APERÇU DES DONNÉES DE LA TABLE:\n');
    console.log(`Colonnes: ${table.columns.map(c => c.name).join(', ')}\n`);
    
    if (table.rows.length > 0) {
      console.log(`Nombre de lignes: ${table.rows.length}`);
      console.log('Aperçu des 3 premières lignes:');
      table.rows.slice(0, 3).forEach((row, idx) => {
        console.log(`   Ligne ${idx + 1}: ${row.name}`);
      });
    } else {
      console.log('⚠️  Aucune ligne dans la table');
    }
  }

  await db.$disconnect();
}

diagnosePuissanceWC1().catch(console.error);
