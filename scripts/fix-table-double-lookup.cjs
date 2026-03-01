/**
 * fix-table-double-lookup.cjs
 * 
 * Configure la table de taux pour un double lookup :
 * - COLONNE = Financement (N° de mois) → matche les noms de colonnes (12, 24, 30, ...)
 * - LIGNE = Prix TVAC → matche la borne supérieure de la plage (2500, 3700, 5600, ...)
 * 
 * Change les labels de lignes de "0 - 2 500" → "2500" pour que findClosestIndexInLabels
 * trouve automatiquement la bonne plage par matching numérique "supérieur le plus proche".
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

const TABLE_ID = 'f4cdb8bd-8821-4f91-8f6e-d54d1eb82ab4';
const FINANCEMENT_NODE_ID = '1c132e46-3222-4d0b-b754-80dc19fe875b';
const PRIX_TVAC_NODE_ID = '4aee7537-6704-4528-b646-41e098572b5b';
const PRIX_TVAC_FORMULA_ID = '3862c5a2-f5c8-4317-8de1-5bfef56a1ee6';

// Mapping des labels de lignes : range → borne supérieure
// findClosestIndexInLabels cherche "supérieur le plus proche"
// Donc si Prix TVAC = 4000, il trouvera 5600 (borne sup de la plage 3701-5600) ✅
const ROW_LABEL_MAP = {
  '0 - 2 500':          '2500',
  '2 501 - 3 700':      '3700',
  '3 701 - 5 600':      '5600',
  '5 601 - 7 500':      '7500',
  '7 501 - 10 000':     '10000',
  '10 001 - 15 000':    '15000',
  '15 001 - 20 000':    '20000',
  '20 001 - 37 000':    '37000',
  '37 001 - 1 000 000': '1000000',
};

async function main() {
  console.log('=== Configuration double lookup (Prix TVAC × Mois → Taux) ===\n');

  // ─────────────────────────────────────────────
  // 1. Changer les labels de lignes (cells[0]) en bornes supérieures
  // ─────────────────────────────────────────────
  console.log('1️⃣  Mise à jour des labels de lignes...');
  
  const rows = await db.treeBranchLeafNodeTableRow.findMany({
    where: { tableId: TABLE_ID },
    orderBy: { rowIndex: 'asc' }
  });
  
  let updatedCount = 0;
  for (const row of rows) {
    if (row.rowIndex === 0) {
      console.log(`   Row 0 (header): skip`);
      continue;
    }
    
    const cells = Array.isArray(row.cells) ? [...row.cells] : [];
    const oldLabel = String(cells[0] || '');
    const newLabel = ROW_LABEL_MAP[oldLabel];
    
    if (newLabel) {
      cells[0] = newLabel;
      await db.treeBranchLeafNodeTableRow.update({
        where: { id: row.id },
        data: { cells: cells }
      });
      console.log(`   Row ${row.rowIndex}: "${oldLabel}" → "${newLabel}" ✅`);
      updatedCount++;
    } else {
      console.log(`   Row ${row.rowIndex}: "${oldLabel}" → pas de mapping (déjà converti?)`);
    }
  }
  console.log(`   ${updatedCount} lignes mises à jour`);

  // ─────────────────────────────────────────────
  // 2. Mettre à jour la table meta pour le double lookup
  // ─────────────────────────────────────────────
  console.log('\n2️⃣  Configuration table meta double lookup...');
  
  const newMeta = {
    lookup: {
      enabled: true,
      columnLookupEnabled: true,
      rowLookupEnabled: true,
      selectors: {
        columnFieldId: FINANCEMENT_NODE_ID,
        rowFieldId: PRIX_TVAC_NODE_ID,
      },
      columnSourceOption: {
        type: 'select',
        description: 'Durée de financement en mois (SELECT)'
      },
      rowSourceOption: {
        type: 'capacity',
        capacityRef: `node-formula:${PRIX_TVAC_FORMULA_ID}`,
        description: 'Prix TVAC (valeur calculée)'
      },
    }
  };
  
  await db.treeBranchLeafNodeTable.update({
    where: { id: TABLE_ID },
    data: { meta: newMeta }
  });
  
  console.log('   ✅ columnLookupEnabled=true, columnFieldId=Financement');
  console.log('   ✅ rowLookupEnabled=true, rowSourceOption=capacity (Prix TVAC formula)');
  console.log('   ✅ MODE 3 activé : croisement Mois × Montant → Taux');

  // ─────────────────────────────────────────────
  // 3. Vérification
  // ─────────────────────────────────────────────
  console.log('\n3️⃣  Vérification...');
  
  const checkTable = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: TABLE_ID },
    select: { meta: true }
  });
  console.log('   Table meta:', JSON.stringify(checkTable.meta, null, 2));
  
  const checkRows = await db.treeBranchLeafNodeTableRow.findMany({
    where: { tableId: TABLE_ID, rowIndex: { gt: 0 } },
    orderBy: { rowIndex: 'asc' },
  });
  console.log('\n   Labels de lignes:');
  checkRows.forEach(r => {
    const cells = Array.isArray(r.cells) ? r.cells : [];
    console.log(`   Row ${r.rowIndex}: label="${cells[0]}", taux12=${cells[1]}, taux108=${cells[11]}`);
  });
  
  console.log('\n✅ Double lookup configuré !');
  console.log('   → Quand Prix TVAC = 8000 et Mois = 60 → Le moteur cherche:');
  console.log('     colonne "60" (match exact) × ligne "10000" (sup closest à 8000) → taux 3.99');
  console.log('   → Quand Prix TVAC = 8000 et Mois = 120 → taux 4.49');
  
  await db.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e);
  db.$disconnect();
  process.exit(1);
});
