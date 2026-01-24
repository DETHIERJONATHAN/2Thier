const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareSourceFieldConfig() {
  console.log('\n🔍 COMPARAISON: Puissance WC vs Puissance WC-1\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Récupérer les deux champs
    const [original, copy] = await Promise.all([
      prisma.treeBranchLeafNode.findFirst({
        where: { name: 'Puissance WC' },
        select: { id: true, name: true, table_activeId: true, meta: true }
      }),
      prisma.treeBranchLeafNode.findFirst({
        where: { name: 'Puissance WC-1' },
        select: { id: true, name: true, table_activeId: true, meta: true }
      })
    ]);

    if (!original || !copy) {
      console.log('❌ Un des champs est manquant !');
      console.log(`   Original: ${original ? '✅' : '❌'}`);
      console.log(`   Copie: ${copy ? '✅' : '❌'}\n`);
      process.exit(1);
    }

    console.log('📋 CHAMPS TROUVÉS:\n');
    console.log(`Original: ${original.name} (${original.id})`);
    console.log(`Copie:    ${copy.name} (${copy.id})\n`);

    // Récupérer les tables
    const [originalTable, copyTable] = await Promise.all([
      original.table_activeId ? prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: original.table_activeId },
        select: { id: true, name: true, meta: true }
      }) : null,
      copy.table_activeId ? prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: copy.table_activeId },
        select: { id: true, name: true, meta: true }
      }) : null
    ]);

    console.log('📊 TABLES:\n');
    console.log(`Original: ${originalTable ? `${originalTable.name} (${originalTable.id})` : '❌ AUCUNE'}`);
    console.log(`Copie:    ${copyTable ? `${copyTable.name} (${copyTable.id})` : '❌ AUCUNE'}\n`);

    if (!copyTable) {
      console.log('❌ PROBLÈME: La copie n\'a pas de table !\n');
      process.exit(1);
    }

    // Analyser les configurations lookup
    const originalLookup = originalTable?.meta?.lookup;
    const copyLookup = copyTable?.meta?.lookup;

    console.log('🔗 CONFIGURATION LOOKUP:\n');
    console.log('ORIGINAL:');
    if (originalLookup) {
      console.log(`   sourceField: ${originalLookup.columnSourceOption?.sourceField || 'N/A'}`);
      console.log(`   displayColumn: ${originalLookup.displayColumn || 'N/A'}`);
      console.log(`   comparisonColumn: ${originalLookup.columnSourceOption?.comparisonColumn || 'N/A'}`);
      console.log(`   operator: ${originalLookup.columnSourceOption?.operator || 'N/A'}`);
    } else {
      console.log('   ❌ Pas de lookup');
    }

    console.log('\nCOPIE:');
    if (copyLookup) {
      console.log(`   sourceField: ${copyLookup.columnSourceOption?.sourceField || 'N/A'}`);
      console.log(`   displayColumn: ${copyLookup.displayColumn || 'N/A'}`);
      console.log(`   comparisonColumn: ${copyLookup.columnSourceOption?.comparisonColumn || 'N/A'}`);
      console.log(`   operator: ${copyLookup.columnSourceOption?.operator || 'N/A'}`);
    } else {
      console.log('   ❌ Pas de lookup');
    }

    // DIAGNOSTIC
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 DIAGNOSTIC:\n');

    const originalSourceField = originalLookup?.columnSourceOption?.sourceField;
    const copySourceField = copyLookup?.columnSourceOption?.sourceField;

    if (!copySourceField) {
      console.log('❌ PROBLÈME: sourceField non configuré dans la copie\n');
      process.exit(1);
    }

    console.log(`sourceField original: ${originalSourceField}`);
    console.log(`sourceField copie:    ${copySourceField}\n`);

    // Vérifier si le sourceField a le suffix
    const hasSuffix = copySourceField.endsWith('-1');
    console.log(`Le sourceField de la copie a un suffix -1 ? ${hasSuffix ? '✅' : '❌'}\n`);

    if (!hasSuffix) {
      console.log('⚠️  PROBLÈME IDENTIFIÉ:');
      console.log('   Le sourceField de la copie pointe vers le champ ORIGINAL !');
      console.log(`   Il devrait être: ${originalSourceField}-1`);
      console.log(`   Mais il est:     ${copySourceField}\n`);
      console.log('💡 SOLUTION:');
      console.log('   Ouvrir "Puissance WC-1" → Onglet Table → ÉTAPE 2.5');
      console.log(`   Changer le sourceField de "${copySourceField}" à "${originalSourceField}-1"\n`);
    }

    // Vérifier la valeur du sourceField
    console.log('🔎 VÉRIFICATION DES VALEURS:\n');

    const [sourceOriginal, sourceCopy] = await Promise.all([
      originalSourceField ? prisma.treeBranchLeafNode.findUnique({
        where: { id: originalSourceField },
        select: { id: true, name: true, calculatedValue: true, defaultValue: true }
      }) : null,
      copySourceField ? prisma.treeBranchLeafNode.findUnique({
        where: { id: copySourceField },
        select: { id: true, name: true, calculatedValue: true, defaultValue: true }
      }) : null
    ]);

    if (sourceOriginal) {
      console.log(`Champ source ORIGINAL: ${sourceOriginal.name}`);
      console.log(`   Valeur: ${sourceOriginal.calculatedValue || sourceOriginal.defaultValue || 'VIDE'}\n`);
    }

    if (sourceCopy) {
      console.log(`Champ source COPIE: ${sourceCopy.name}`);
      console.log(`   Valeur: ${sourceCopy.calculatedValue || sourceCopy.defaultValue || 'VIDE'}\n`);
    } else {
      console.log(`❌ Champ source ${copySourceField} NON TROUVÉ !\n`);
    }

    if (!sourceCopy || (!sourceCopy.calculatedValue && !sourceCopy.defaultValue)) {
      console.log('⚠️  Le sourceField est vide ou n\'existe pas !');
      console.log('   C\'est pourquoi le lookup retourne 0\n');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareSourceFieldConfig();
