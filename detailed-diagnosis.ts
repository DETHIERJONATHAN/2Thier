/**
 * 🎯 DIAGNOSTIC DÉTAILLÉ: POURQUOI LA COPIE NE FONCTIONNE PAS
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function detailedDiagnosis() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  🎯 DIAGNOSTIC: POURQUOI LA COPIE N\'EST PAS CORRECTE             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const originalTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { take: 3, orderBy: { rowIndex: 'asc' } }
      }
    });

    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'f5e24326-ef46-469e-9fdc-0b53d9e2067b-1' },
      include: {
        tableColumns: { orderBy: { columnIndex: 'asc' } },
        tableRows: { take: 3, orderBy: { rowIndex: 'asc' } }
      }
    });

    if (!originalTable || !copiedTable) {
      console.error('❌ Tables non trouvées!');
      return;
    }

    console.log('📊 STRUCTURE DES COLONNES:\n');
    console.log('┌─ ORIGINAL (Import O-I.xlsx)');
    console.log('│');
    originalTable.tableColumns.forEach((col, idx) => {
      console.log(`│  [${idx}] "${col.name}"`);
    });
    console.log('│\n└─────────────────────────────────────\n');

    console.log('┌─ COPIÉ (Import O-I.xlsx-1) - ❌ INCORRECT');
    console.log('│');
    copiedTable.tableColumns.forEach((col, idx) => {
      const original = originalTable.tableColumns[idx];
      const shouldBe = original?.name + '-1';
      const isCorrect = col.name === shouldBe;
      const icon = isCorrect ? '✅' : '❌';
      console.log(`│  [${idx}] "${col.name}" ${icon} (devrait être: "${shouldBe}")`);
    });
    console.log('│\n└─────────────────────────────────────\n');

    console.log('⚠️  ANALYSE DE L\'ERREUR:\n');
    console.log('1. Les colonnes ne sont PAS que des "en-têtes de données"');
    console.log('   → Elles représentent des VALEURS POSSIBLES pour le croisement');
    console.log('   → "Orientation" = le sélecteur');
    console.log('   → "0", "5", "15", "25", etc. = les colonnes de résultats\n');

    console.log('2. La logique ACTUELLE (idx === 0 ? suffixe : pas_suffixe):');
    console.log('   ❌ Ajoute "-1" SEULEMENT à la première colonne');
    console.log('   ❌ Laisse les autres colonnes (0, 5, 15...) IDENTIQUES\n');

    console.log('3. Quand on fait un lookup de "Orientation-1":');
    console.log('   ❌ La table copiée cherche les colonnes [0], [5], [15]... de la copie');
    console.log('   ❌ Mais ces colonnes ne sont pas suffixées!');
    console.log('   ✅ Donc le lookup échoue car les noms ne correspondent pas\n');

    console.log('💡 LA SOLUTION:\n');
    console.log('Changer la logique de suffixe:');
    console.log('  ❌ ANCIEN: idx === 0 ? suffixe : pas_suffixe');
    console.log('  ✅ NOUVEAU: TOUTES les colonnes reçoivent "-1"\n');

    console.log('Cela donnera:');
    console.log('  Original:  ["Orientation", "0", "5", "15", "25", "35", "45", "70", "90"]');
    console.log('  Copié:     ["Orientation-1", "0-1", "5-1", "15-1", "25-1", "35-1", "45-1", "70-1", "90-1"]');
    console.log('  → Le lookup fonctionnera car les colonnes référencées seront cohérentes!\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ FIX À APPLIQUER: modifier la logique du suffixe             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

detailedDiagnosis();
