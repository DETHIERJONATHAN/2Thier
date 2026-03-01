/**
 * fix-financement-taux-select.cjs
 * 
 * Corrige les champs "Financement (N° de mois)" et "Taux d'intérêt" pour qu'ils
 * s'affichent comme des SELECT dropdown liés à la table de taux.
 * 
 * - Financement : SELECT avec les durées en mois (colonnes de la table)
 * - Taux d'intérêt : SELECT avec les taux possibles, default auto-calculé par lookup
 * - Table meta : displayColumn corrigé pour pointer vers une vraie ligne de données
 */

const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

// IDs des nœuds
const FINANCEMENT_NODE_ID = '1c132e46-3222-4d0b-b754-80dc19fe875b';
const TAUX_NODE_ID = '5f6761b9-a7b5-4a49-9f74-06a77d115c8e';
const TABLE_ID = 'f4cdb8bd-8821-4f91-8f6e-d54d1eb82ab4';
const PRIX_TVAC_NODE_ID = '4aee7537-6704-4528-b646-41e098572b5b';

// Options mois (tirées des colonnes de la table, sauf col 0 "Montant crédit")
const MOIS_OPTIONS = [
  { label: '12 mois', value: '12' },
  { label: '24 mois', value: '24' },
  { label: '30 mois', value: '30' },
  { label: '36 mois', value: '36' },
  { label: '42 mois', value: '42' },
  { label: '48 mois', value: '48' },
  { label: '60 mois', value: '60' },
  { label: '72 mois', value: '72' },
  { label: '84 mois', value: '84' },
  { label: '96 mois', value: '96' },
  { label: '108 mois', value: '108' },
  { label: '120 mois', value: '120' },
  { label: '132 mois', value: '132' },
  { label: '144 mois', value: '144' },
];

// Options taux (toutes les valeurs uniques dans la table)
const TAUX_OPTIONS = [
  { label: '3,99 %', value: '3.99' },
  { label: '4,49 %', value: '4.49' },
];

async function main() {
  console.log('=== Correction Financement & Taux d\'intérêt ===\n');

  // ─────────────────────────────────────────────
  // 1. FIX FINANCEMENT : SELECT avec options mois
  // ─────────────────────────────────────────────
  console.log('1️⃣  Correction nœud Financement...');
  
  const finNode = await db.treeBranchLeafNode.findUnique({
    where: { id: FINANCEMENT_NODE_ID },
    select: { id: true, label: true, subType: true, fieldType: true, metadata: true, select_options: true }
  });
  
  if (!finNode) {
    console.error('❌ Nœud Financement introuvable !');
    return;
  }
  
  // Mettre à jour metadata.appearance.variant → dropdown
  const finMeta = (finNode.metadata || {});
  if (finMeta.appearance) {
    finMeta.appearance.variant = 'dropdown';
  }
  
  await db.treeBranchLeafNode.update({
    where: { id: FINANCEMENT_NODE_ID },
    data: {
      subType: 'SELECT',
      fieldType: 'SELECT',
      select_options: MOIS_OPTIONS,
      metadata: finMeta,
    }
  });
  
  console.log('   ✅ subType=SELECT, fieldType=SELECT');
  console.log('   ✅ select_options = 14 options (12-144 mois)');
  console.log('   ✅ metadata.appearance.variant = dropdown');

  // ─────────────────────────────────────────────
  // 2. FIX TAUX D'INTÉRÊT : SELECT + table lookup
  // ─────────────────────────────────────────────
  console.log('\n2️⃣  Correction nœud Taux d\'intérêt...');
  
  const tauxNode = await db.treeBranchLeafNode.findUnique({
    where: { id: TAUX_NODE_ID },
    select: { id: true, label: true, subType: true, fieldType: true, metadata: true, select_options: true, hasTable: true }
  });
  
  if (!tauxNode) {
    console.error('❌ Nœud Taux introuvable !');
    return;
  }
  
  // Mettre à jour metadata.appearance.variant → dropdown
  const tauxMeta = (tauxNode.metadata || {});
  if (tauxMeta.appearance) {
    tauxMeta.appearance.variant = 'dropdown';
  }
  
  await db.treeBranchLeafNode.update({
    where: { id: TAUX_NODE_ID },
    data: {
      subType: 'SELECT',
      fieldType: 'SELECT',
      select_options: TAUX_OPTIONS,
      hasTable: true,
      metadata: tauxMeta,
    }
  });
  
  console.log('   ✅ subType=SELECT, fieldType=SELECT');
  console.log('   ✅ select_options = 2 options (3.99%, 4.49%)');
  console.log('   ✅ hasTable=true (pour le lookup auto)');
  console.log('   ✅ metadata.appearance.variant = dropdown');

  // ─────────────────────────────────────────────
  // 3. FIX TABLE META : displayColumn + row lookup
  // ─────────────────────────────────────────────
  console.log('\n3️⃣  Correction table meta lookup...');
  
  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: TABLE_ID },
    select: { id: true, meta: true }
  });
  
  if (!table) {
    console.error('❌ Table introuvable !');
    return;
  }
  
  // Configuration MODE 1 (column lookup)
  // - colonne = valeur de Financement (mois)
  // - ligne fixe = "0 - 2 500" (première ligne de données, toutes les lignes ont les mêmes taux)
  // - displayColumn pointe vers un label de ligne existant
  const newMeta = {
    lookup: {
      enabled: true,
      columnLookupEnabled: true,
      rowLookupEnabled: false,
      selectors: {
        columnFieldId: FINANCEMENT_NODE_ID,
      },
      columnSourceOption: {
        type: 'select',
        description: 'Durée de financement en mois'
      },
      // displayColumn = label de la LIGNE dans laquelle lire la valeur
      // Toutes les lignes ont les mêmes taux, donc on utilise la première
      displayColumn: ['0 - 2 500'],
    }
  };
  
  await db.treeBranchLeafNodeTable.update({
    where: { id: TABLE_ID },
    data: { meta: newMeta }
  });
  
  console.log('   ✅ columnLookupEnabled=true, columnFieldId=Financement');
  console.log('   ✅ displayColumn=["0 - 2 500"] (première ligne données)');
  console.log('   ✅ rowLookupEnabled=false (taux identiques toutes lignes)');

  // ─────────────────────────────────────────────
  // 4. VÉRIFICATION FINALE
  // ─────────────────────────────────────────────
  console.log('\n4️⃣  Vérification...');
  
  const checkFin = await db.treeBranchLeafNode.findUnique({
    where: { id: FINANCEMENT_NODE_ID },
    select: { subType: true, fieldType: true, select_options: true }
  });
  const checkTaux = await db.treeBranchLeafNode.findUnique({
    where: { id: TAUX_NODE_ID },
    select: { subType: true, fieldType: true, select_options: true, hasTable: true }
  });
  const checkTable = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: TABLE_ID },
    select: { meta: true }
  });
  
  console.log('   Financement:', JSON.stringify({
    subType: checkFin.subType,
    fieldType: checkFin.fieldType,
    optionsCount: Array.isArray(checkFin.select_options) ? checkFin.select_options.length : 0
  }));
  console.log('   Taux:', JSON.stringify({
    subType: checkTaux.subType,
    fieldType: checkTaux.fieldType,
    optionsCount: Array.isArray(checkTaux.select_options) ? checkTaux.select_options.length : 0,
    hasTable: checkTaux.hasTable
  }));
  console.log('   Table displayColumn:', JSON.stringify(checkTable.meta?.lookup?.displayColumn));
  
  console.log('\n✅ Terminé ! Rechargez la page pour voir les SELECT.');
  
  await db.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e);
  db.$disconnect();
  process.exit(1);
});
