/**
 * Script pour implanter le tableau des taux de financement.
 * 
 * 1. Convertit "Financement (N° de mois)" en SELECT dropdown
 *    Options: 12, 24, 30, 36, 42, 48, 60, 72, 84, 96, 108, 120, 132, 144
 * 
 * 2. Crée une table lookup "Taux Financement" sur le nœud "Taux d'intérêt"
 *    - Colonnes = durées en mois
 *    - Lignes = plages de montants (0-2500, 2501-3700, etc.)
 *    - Valeurs = taux (3.99% ou 4.49%)
 *    - Lookup colonne activé → lié au champ Financement
 * 
 * 3. Configure le lookup pour auto-remplir le taux selon la durée choisie
 */
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const db = new PrismaClient();

// ─── IDs des nœuds existants ───
const NODE_FINANCEMENT = '1c132e46-3222-4d0b-b754-80dc19fe875b';
const NODE_TAUX        = '5f6761b9-a7b5-4a49-9f74-06a77d115c8e';
const NODE_PRIX_TVAC   = '4aee7537-6704-4528-b646-41e098572b5b';
const TREE_ID          = 'cmf1mwoz10005gooked1j6orn';
const ORG_ID           = '1757366075154-i554z93kl';

// ─── Durées en mois (= options du SELECT + colonnes de la table) ───
const DUREES_MOIS = [12, 24, 30, 36, 42, 48, 60, 72, 84, 96, 108, 120, 132, 144];

// ─── Plages de montants (lignes du tableau) ───
const MONTANT_RANGES = [
  { label: '0 - 2 500', min: 0, max: 2500 },
  { label: '2 501 - 3 700', min: 2501, max: 3700 },
  { label: '3 701 - 5 600', min: 3701, max: 5600 },
  { label: '5 601 - 7 500', min: 5601, max: 7500 },
  { label: '7 501 - 10 000', min: 7501, max: 10000 },
  { label: '10 001 - 15 000', min: 10001, max: 15000 },
  { label: '15 001 - 20 000', min: 15001, max: 20000 },
  { label: '20 001 - 37 000', min: 20001, max: 37000 },
  { label: '37 001 - 1 000 000', min: 37001, max: 1000000 },
];

// ─── Taux selon la durée (≤96 mois = 3.99%, >96 = 4.49%) ───
function getTaux(mois) {
  return mois <= 96 ? 3.99 : 4.49;
}

// ─── IDs générés ───
const SELECT_CONFIG_ID = crypto.randomUUID();
const TABLE_ID         = crypto.randomUUID();

async function main() {
  console.log('=== IMPLANTATION TABLE TAUX FINANCEMENT ===\n');

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 1 : Convertir "Financement (N° de mois)" en SELECT
  // ═══════════════════════════════════════════════════════════════
  console.log('1. Conversion de "Financement" en SELECT...');

  // Créer les options du select - chaque option est un nœud enfant
  const selectOptions = DUREES_MOIS.map((mois, idx) => {
    const ans = mois / 12;
    const label = Number.isInteger(ans) ? `${mois} mois (${ans} ans)` : `${mois} mois (${ans.toFixed(1)} ans)`;
    return {
      key: `opt_${mois}`,
      label: label,
      value: String(mois),
      order: idx
    };
  });

  // Mettre à jour le nœud : TEXT → SELECT
  await db.treeBranchLeafNode.update({
    where: { id: NODE_FINANCEMENT },
    data: {
      subType: 'SELECT',
    }
  });
  console.log('   ✅ Node Financement → subType=SELECT');

  // Créer le SelectConfig
  await db.treeBranchLeafSelectConfig.create({
    data: {
      id: SELECT_CONFIG_ID,
      nodeId: NODE_FINANCEMENT,
      options: selectOptions,
      multiple: false,
      searchable: true,
      allowCustom: false,
      optionsSource: 'static',
      updatedAt: new Date(),
    }
  });
  console.log(`   ✅ SelectConfig créé: ${SELECT_CONFIG_ID}`);
  console.log(`   Options: ${DUREES_MOIS.join(', ')} mois`);

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 2 : Créer la table "Taux Financement" sur le nœud Taux
  // ═══════════════════════════════════════════════════════════════
  console.log('\n2. Création de la table "Taux Financement"...');

  // Colonnes : col0 = "Montant crédit", col1..14 = durées en mois
  const columnNames = ['Montant crédit', ...DUREES_MOIS.map(m => String(m))];
  
  const tableMeta = {
    lookup: {
      enabled: true,
      selectors: {
        columnFieldId: NODE_FINANCEMENT,   // Le champ Financement sélectionne la colonne
      },
      displayColumn: ['Taux'],             // Pas utilisé en mode colonne directe, mais utile comme référence
      rowLookupEnabled: false,             // Désactivé pour l'instant (tous les montants ont le même taux)
      columnLookupEnabled: true,
      columnSourceOption: {
        type: 'select',                    // Source = sélection par l'utilisateur
        description: 'Durée de financement en mois'
      },
    }
  };

  await db.treeBranchLeafNodeTable.create({
    data: {
      id: TABLE_ID,
      nodeId: NODE_TAUX,
      organizationId: ORG_ID,
      name: 'Taux Financement',
      description: 'Table des taux d\'intérêt selon montant et durée de financement',
      type: 'matrix',
      meta: tableMeta,
      isDefault: true,
      order: 0,
      columnCount: columnNames.length,
      rowCount: MONTANT_RANGES.length + 1, // +1 pour le header
      updatedAt: new Date(),
      // Colonnes
      tableColumns: {
        create: columnNames.map((name, idx) => ({
          id: crypto.randomUUID(),
          columnIndex: idx,
          name: name,
          type: idx === 0 ? 'text' : 'number',
          metadata: {},
        }))
      },
      // Lignes : row 0 = header, rows 1..N = données
      tableRows: {
        create: [
          // Row 0 = Header (noms des colonnes)
          {
            id: crypto.randomUUID(),
            rowIndex: 0,
            cells: columnNames,
          },
          // Rows 1..9 = données par plage de montant
          ...MONTANT_RANGES.map((range, idx) => ({
            id: crypto.randomUUID(),
            rowIndex: idx + 1,
            cells: [
              range.label,
              ...DUREES_MOIS.map(mois => getTaux(mois))
            ],
          }))
        ]
      }
    }
  });
  console.log(`   ✅ Table créée: ${TABLE_ID}`);
  console.log(`   ${columnNames.length} colonnes × ${MONTANT_RANGES.length} lignes`);

  // Mettre à jour le nœud Taux : activer hasTable + subType display
  await db.treeBranchLeafNode.update({
    where: { id: NODE_TAUX },
    data: {
      hasTable: true,
      subType: 'display',
    }
  });
  console.log('   ✅ Node Taux → hasTable=true, subType=display');

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 3 : Créer la variable sur Taux pour le lookup
  // ═══════════════════════════════════════════════════════════════
  console.log('\n3. Création de la variable Taux...');

  // Vérifier s'il existe déjà une variable
  const existingVar = await db.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: NODE_TAUX }
  });

  if (!existingVar) {
    await db.treeBranchLeafNodeVariable.create({
      data: {
        id: crypto.randomUUID(),
        nodeId: NODE_TAUX,
        exposedKey: `var_${NODE_TAUX.substring(0, 4)}`,
        displayName: "Taux d'intérêt",
        displayFormat: 'number',
        unit: '%',
        precision: 2,
        visibleToUser: false,
        isReadonly: false,
        sourceRef: `node-table:${TABLE_ID}`,
        sourceType: 'tree',
        metadata: {},
        updatedAt: new Date(),
      }
    });
    console.log('   ✅ Variable créée avec sourceRef=node-table:' + TABLE_ID);
  } else {
    // Mettre à jour la variable existante
    await db.treeBranchLeafNodeVariable.update({
      where: { nodeId: NODE_TAUX },
      data: {
        sourceRef: `node-table:${TABLE_ID}`,
        sourceType: 'tree',
        updatedAt: new Date(),
      }
    });
    console.log('   ✅ Variable mise à jour avec sourceRef=node-table:' + TABLE_ID);
  }

  // ═══════════════════════════════════════════════════════════════
  // VÉRIFICATION FINALE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== VÉRIFICATION ===');

  const finNode = await db.treeBranchLeafNode.findUnique({
    where: { id: NODE_FINANCEMENT },
    select: { label: true, subType: true }
  });
  console.log(`Financement: ${finNode.label} → subType=${finNode.subType}`);

  const selConfig = await db.treeBranchLeafSelectConfig.findUnique({
    where: { nodeId: NODE_FINANCEMENT },
    select: { options: true }
  });
  const opts = selConfig.options;
  console.log(`  Options: ${Array.isArray(opts) ? opts.length : '?'} options`);

  const tauxNode = await db.treeBranchLeafNode.findUnique({
    where: { id: NODE_TAUX },
    select: { label: true, subType: true, hasTable: true }
  });
  console.log(`Taux: ${tauxNode.label} → subType=${tauxNode.subType}, hasTable=${tauxNode.hasTable}`);

  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: TABLE_ID },
    select: { name: true, columnCount: true, rowCount: true }
  });
  console.log(`Table: ${table.name} → ${table.columnCount} cols × ${table.rowCount} rows`);

  const tauxVar = await db.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: NODE_TAUX },
    select: { sourceRef: true }
  });
  console.log(`Variable Taux: sourceRef=${tauxVar.sourceRef}`);

  // Afficher la matrice complète
  console.log('\n=== MATRICE DES TAUX ===');
  console.log('Montant / Durée\t\t' + DUREES_MOIS.map(m => m + 'm').join('\t'));
  for (const range of MONTANT_RANGES) {
    const taux = DUREES_MOIS.map(m => getTaux(m).toFixed(2) + '%').join('\t');
    console.log(`${range.label}\t${taux}`);
  }

  console.log('\n✅ TERMINÉ !');
  console.log('   → "Financement (N° de mois)" est maintenant un dropdown');
  console.log('   → "Taux d\'intérêt" se remplit automatiquement via la table');
  console.log('   → La "Mensualité - Prêt" se calcule ensuite avec la formule VPM');

  await db.$disconnect();
}

main().catch(async e => {
  console.error('❌ ERREUR:', e.message || e);
  await db.$disconnect();
  process.exit(1);
});
