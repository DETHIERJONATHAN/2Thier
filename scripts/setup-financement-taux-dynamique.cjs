/**
 * setup-financement-taux-dynamique.cjs
 * 
 * Configure TOUT proprement depuis la table de taux :
 * 
 * 1. Crée la table "Taux Financement" sur le nœud Taux d'intérêt
 *    - Colonnes = mois (tirés du tableau de taux original)
 *    - Lignes = plages de montant (bornes supérieures pour matching numérique)
 *    - Données = taux correspondants
 * 
 * 2. Configure Financement (N° de mois) comme SELECT dynamique
 *    - hasTable=true, table_activeId = tableId
 *    - SelectConfig avec optionsSource='table', tableReference=tableId
 *    - keyRow='header' → les options sont les noms de colonnes (12, 24, 30, ...)
 * 
 * 3. Configure Taux d'intérêt comme SELECT dynamique  
 *    - hasTable=true, table_activeId = tableId
 *    - SelectConfig avec optionsSource='table', tableReference=tableId
 *    - Le lookup croisé (MODE 3) avec Prix TVAC × Mois → Taux
 * 
 * RIEN N'EST CODÉ EN DUR dans les nœuds. Tout vient de la table.
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const db = new PrismaClient();

// IDs des nœuds existants
const FINANCEMENT_NODE_ID = '1c132e46-3222-4d0b-b754-80dc19fe875b';
const TAUX_NODE_ID = '5f6761b9-a7b5-4a49-9f74-06a77d115c8e';
const PRIX_TVAC_NODE_ID = '4aee7537-6704-4528-b646-41e098572b5b';
const PRIX_TVAC_FORMULA_ID = '3862c5a2-f5c8-4317-8de1-5bfef56a1ee6';
const ORG_ID = '1757366075154-i554z93kl';

// Données du tableau de taux (exactement comme le screenshot)
// Colonnes: Montant crédit, 12, 24, 30, 36, 42, 48, 60, 72, 84, 96, 108, 120, 132, 144
const MOIS = ['12','24','30','36','42','48','60','72','84','96','108','120','132','144'];

const PLAGES = [
  { borne: '2500',    taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '3700',    taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '5600',    taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '7500',    taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '10000',   taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '15000',   taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '20000',   taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '37000',   taux12_96: 3.99, taux108_144: 4.49 },
  { borne: '1000000', taux12_96: 3.99, taux108_144: 4.49 },
];

// Les mois qui ont un taux de 3.99% (12-96)
const MOIS_399 = ['12','24','30','36','42','48','60','72','84','96'];

async function main() {
  console.log('=== Setup Financement & Taux DYNAMIQUE (depuis table) ===\n');

  // ─── Nettoyage des anciennes données ───
  console.log('0️⃣  Nettoyage...');
  
  // Supprimer les SelectConfig existants
  await db.treeBranchLeafSelectConfig.deleteMany({
    where: { nodeId: { in: [FINANCEMENT_NODE_ID, TAUX_NODE_ID] } }
  });
  // Supprimer les variables orphelines
  await db.treeBranchLeafNodeVariable.deleteMany({
    where: { nodeId: { in: [FINANCEMENT_NODE_ID, TAUX_NODE_ID] } }
  });
  // Supprimer les anciennes tables sur ces nœuds
  await db.treeBranchLeafNodeTable.deleteMany({
    where: { nodeId: TAUX_NODE_ID }
  });
  console.log('   ✅ Nettoyé\n');

  // ─── 1. Créer la TABLE sur le nœud Taux d'intérêt ───
  console.log('1️⃣  Création de la table "Taux Financement"...');
  
  const TABLE_ID = randomUUID();
  
  await db.treeBranchLeafNodeTable.create({
    data: {
      id: TABLE_ID,
      nodeId: TAUX_NODE_ID,
      organizationId: ORG_ID,
      name: 'Taux Financement',
      description: 'Table de taux par montant et durée',
      type: 'basic',
      isDefault: true,
      order: 0,
      updatedAt: new Date(),
      columnCount: MOIS.length + 1, // +1 pour "Montant crédit"
      rowCount: PLAGES.length + 1,  // +1 pour le header
      meta: {
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
            description: 'Durée de financement en mois'
          },
          rowSourceOption: {
            type: 'capacity',
            capacityRef: `node-formula:${PRIX_TVAC_FORMULA_ID}`,
            description: 'Prix TVAC (valeur calculée)'
          },
        }
      }
    }
  });
  
  // Colonnes (index 0 = label, 1-14 = mois)
  const allColNames = ['Montant crédit', ...MOIS];
  for (let i = 0; i < allColNames.length; i++) {
    await db.treeBranchLeafNodeTableColumn.create({
      data: {
        id: randomUUID(),
        tableId: TABLE_ID,
        columnIndex: i,
        name: allColNames[i],
        type: i === 0 ? 'text' : 'number',
      }
    });
  }
  
  // Ligne 0 = header (noms de colonnes)
  await db.treeBranchLeafNodeTableRow.create({
    data: {
      id: randomUUID(),
      tableId: TABLE_ID,
      rowIndex: 0,
      cells: allColNames,
    }
  });
  
  // Lignes 1-9 = données
  for (let i = 0; i < PLAGES.length; i++) {
    const p = PLAGES[i];
    const cells = [p.borne];
    for (const m of MOIS) {
      cells.push(MOIS_399.includes(m) ? p.taux12_96 : p.taux108_144);
    }
    await db.treeBranchLeafNodeTableRow.create({
      data: {
        id: randomUUID(),
        tableId: TABLE_ID,
        rowIndex: i + 1,
        cells: cells,
      }
    });
  }
  
  console.log(`   ✅ Table créée: ${TABLE_ID}`);
  console.log(`   ✅ ${allColNames.length} colonnes, ${PLAGES.length + 1} lignes`);

  // ─── 2. Configurer FINANCEMENT comme SELECT dynamique ───
  console.log('\n2️⃣  Configuration Financement = SELECT dynamique...');
  
  // Mettre à jour le nœud
  const finNode = await db.treeBranchLeafNode.findUnique({
    where: { id: FINANCEMENT_NODE_ID },
    select: { metadata: true }
  });
  const finMeta = (finNode.metadata || {});
  if (finMeta.appearance) {
    finMeta.appearance.variant = 'dropdown';
  }
  // Ajouter la capability table dans metadata
  if (!finMeta.capabilities) finMeta.capabilities = {};
  finMeta.capabilities.table = {
    enabled: true,
    activeId: TABLE_ID,
  };
  
  await db.treeBranchLeafNode.update({
    where: { id: FINANCEMENT_NODE_ID },
    data: {
      subType: 'SELECT',
      fieldType: 'SELECT',
      hasTable: true,
      table_activeId: TABLE_ID,
      select_options: [], // Pas d'options en dur → tout vient de la table
      metadata: finMeta,
    }
  });
  
  // Créer la SelectConfig dynamique
  await db.treeBranchLeafSelectConfig.create({
    data: {
      id: randomUUID(),
      nodeId: FINANCEMENT_NODE_ID,
      options: [], // Pas d'options statiques → tout dynamique
      multiple: false,
      searchable: true,
      allowCustom: true, // Permettre saisie manuelle
      optionsSource: 'table',
      tableReference: TABLE_ID,
      keyRow: 'Montant crédit', // Row header = noms de colonnes = options
      updatedAt: new Date(),
    }
  });
  
  console.log('   ✅ subType=SELECT, hasTable=true, table_activeId=table');
  console.log('   ✅ SelectConfig: optionsSource=table, options dynamiques depuis colonnes');

  // ─── 3. Configurer TAUX comme SELECT dynamique ───
  console.log('\n3️⃣  Configuration Taux = SELECT dynamique...');
  
  const tauxNode = await db.treeBranchLeafNode.findUnique({
    where: { id: TAUX_NODE_ID },
    select: { metadata: true }
  });
  const tauxMeta = (tauxNode.metadata || {});
  if (tauxMeta.appearance) {
    tauxMeta.appearance.variant = 'dropdown';
  }
  if (!tauxMeta.capabilities) tauxMeta.capabilities = {};
  tauxMeta.capabilities.table = {
    enabled: true,
    activeId: TABLE_ID,
  };
  
  await db.treeBranchLeafNode.update({
    where: { id: TAUX_NODE_ID },
    data: {
      subType: 'SELECT',
      fieldType: 'SELECT',
      hasTable: true,
      table_activeId: TABLE_ID,
      select_options: [], // Pas d'options en dur
      metadata: tauxMeta,
    }
  });
  
  // Créer la SelectConfig dynamique avec lookup croisé
  await db.treeBranchLeafSelectConfig.create({
    data: {
      id: randomUUID(),
      nodeId: TAUX_NODE_ID,
      options: [], // Pas d'options statiques
      multiple: false,
      searchable: true,
      allowCustom: true, // Permettre modification manuelle du taux
      optionsSource: 'table',
      tableReference: TABLE_ID,
      keyColumn: 'Montant crédit', // Colonne des labels de lignes
      updatedAt: new Date(),
    }
  });
  
  // Variable pour le lookup backend (Mensualité en a besoin)
  await db.treeBranchLeafNodeVariable.create({
    data: {
      id: randomUUID(),
      nodeId: TAUX_NODE_ID,
      exposedKey: `var_taux_${Date.now().toString(36)}`,
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
  
  console.log('   ✅ subType=SELECT, hasTable=true, table_activeId=table');
  console.log('   ✅ SelectConfig: optionsSource=table, lookup croisé');
  console.log('   ✅ Variable créée pour la formule Mensualité');

  // ─── 4. Vérification ───
  console.log('\n4️⃣  Vérification finale...');
  
  const checkFin = await db.treeBranchLeafNode.findUnique({
    where: { id: FINANCEMENT_NODE_ID },
    select: { subType: true, fieldType: true, hasTable: true, table_activeId: true }
  });
  const checkTaux = await db.treeBranchLeafNode.findUnique({
    where: { id: TAUX_NODE_ID },
    select: { subType: true, fieldType: true, hasTable: true, table_activeId: true }
  });
  const checkFinCfg = await db.treeBranchLeafSelectConfig.findUnique({ where: { nodeId: FINANCEMENT_NODE_ID } });
  const checkTauxCfg = await db.treeBranchLeafSelectConfig.findUnique({ where: { nodeId: TAUX_NODE_ID } });
  
  console.log('   Financement:', JSON.stringify(checkFin));
  console.log('   Financement SelectConfig:', JSON.stringify({ optionsSource: checkFinCfg?.optionsSource, tableRef: checkFinCfg?.tableReference, keyRow: checkFinCfg?.keyRow }));
  console.log('   Taux:', JSON.stringify(checkTaux));
  console.log('   Taux SelectConfig:', JSON.stringify({ optionsSource: checkTauxCfg?.optionsSource, tableRef: checkTauxCfg?.tableReference, keyColumn: checkTauxCfg?.keyColumn }));
  
  console.log('\n✅ Tout est configuré dynamiquement depuis la table !');
  console.log('   → Financement: SELECT dont les options viennent des colonnes de la table (12, 24, ..., 144)');
  console.log('   → Taux: SELECT dont le default est calculé par lookup croisé (Prix TVAC × Mois)');
  console.log('   → Rien codé en dur. Si tu modifies la table, les options changent automatiquement.');
  
  await db.$disconnect();
}

main().catch(e => {
  console.error('❌ Erreur:', e);
  db.$disconnect();
  process.exit(1);
});
