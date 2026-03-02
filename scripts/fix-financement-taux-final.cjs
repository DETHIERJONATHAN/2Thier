/**
 * Configuration finale Financement + Taux + Mensualité
 * 
 * Architecture:
 * - Table importée (dc68d88b) sur nœud Financement → SELECT dynamique des mois
 * - Table importée (b754a7bd) sur nœud Taux → crosslookup MODE 3 (auto-calc taux)
 * - Formule VPM sur nœud Mensualité (déjà existante)
 * 
 * Flux: Prix TVAC → filtre mois dispo dans Financement SELECT
 *       Prix TVAC + Financement → crosslookup → Taux auto-calculé
 *       Prix TVAC + Taux + Financement → VPM → Mensualité
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NODE_IDS = {
  financement: '1c132e46-3222-4d0b-b754-80dc19fe875b',
  taux: '5f6761b9-a7b5-4a49-9f74-06a77d115c8e',
  mensualite: '399f2d0b-ce5c-4c17-b666-530b4f44c0a8',
  prixTvac: '4aee7537-6704-4528-b646-41e098572b5b',
};

const TABLE_IDS = {
  financement: 'dc68d88b-7bc4-4f19-a78a-747a65fa8377',  // sur nœud Financement
  taux: 'b754a7bd-f38a-4202-89c2-5c6cf3db251d',          // sur nœud Taux
};

const FORMULA_PRIX_TVAC = '3862c5a2-f5c8-4317-8de1-5bfef56a1ee6';

async function main() {
  console.log('🔧 Configuration finale Financement + Taux...\n');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. Configurer la table meta.lookup sur les DEUX tables
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const lookupMeta = {
    lookup: {
      enabled: true,
      selectors: {
        rowFieldId: NODE_IDS.prixTvac,       // Prix TVAC → détermine la ligne 
        columnFieldId: NODE_IDS.financement,  // Financement → détermine la colonne
      },
      rowSourceOption: {
        type: 'capacity',
        capacityRef: `node-formula:${FORMULA_PRIX_TVAC}`,
        description: 'Prix TVAC (calculé depuis devis)',
      },
      columnSourceOption: {
        type: 'select',
        description: 'Durée de financement en mois',
      },
      rowLookupEnabled: true,
      columnLookupEnabled: true,
    },
  };

  for (const [name, tableId] of Object.entries(TABLE_IDS)) {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({ where: { id: tableId } });
    if (!table) {
      console.log(`❌ Table ${name} (${tableId}) introuvable !`);
      continue;
    }
    // Fusionner meta existant avec lookup
    const existingMeta = (table.meta && typeof table.meta === 'object') ? table.meta : {};
    await prisma.treeBranchLeafNodeTable.update({
      where: { id: tableId },
      data: {
        meta: { ...existingMeta, ...lookupMeta },
        type: 'matrix',  // S'assurer que c'est bien matrix
      },
    });
    console.log(`✅ Table ${name} (${tableId}) → meta.lookup configuré, type=matrix`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. Configurer le nœud Financement (SELECT dynamique)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await prisma.treeBranchLeafNode.update({
    where: { id: NODE_IDS.financement },
    data: {
      subType: 'SELECT',
      fieldType: 'SELECT',
      hasTable: true,
      table_activeId: TABLE_IDS.financement,
    },
  });
  console.log('✅ Nœud Financement → SELECT, table_activeId défini');

  // Upsert SelectConfig pour Financement: keyRow="Montant crédit" → retourne les en-têtes de colonnes (mois)
  await prisma.treeBranchLeafSelectConfig.upsert({
    where: { nodeId: NODE_IDS.financement },
    update: {
      optionsSource: 'table',
      tableReference: TABLE_IDS.financement,
      keyRow: 'Montant crédit',   // Row A1 → extract column headers (mois)
      keyColumn: null,
      valueColumn: null,
      valueRow: null,
      displayColumn: null,
      displayRow: null,
      multiple: false,
      searchable: true,
      allowCustom: false,
      options: [],
      updatedAt: new Date(),
    },
    create: {
      id: require('crypto').randomUUID(),
      nodeId: NODE_IDS.financement,
      optionsSource: 'table',
      tableReference: TABLE_IDS.financement,
      keyRow: 'Montant crédit',
      keyColumn: null,
      valueColumn: null,
      valueRow: null,
      displayColumn: null,
      displayRow: null,
      multiple: false,
      searchable: true,
      allowCustom: false,
      options: [],
    },
  });
  console.log('✅ SelectConfig Financement → keyRow="Montant crédit" (mois filtrés par Prix TVAC)');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. Configurer le nœud Taux (display auto-calculé par crosslookup)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  await prisma.treeBranchLeafNode.update({
    where: { id: NODE_IDS.taux },
    data: {
      subType: 'display',
      fieldType: null,
      hasTable: true,
      table_activeId: TABLE_IDS.taux,
      number_suffix: '%',
      number_decimals: 2,
      data_unit: '%',
      data_precision: 2,
    },
  });
  console.log('✅ Nœud Taux → display (auto-calc), table_activeId défini');

  // Supprimer SelectConfig du Taux s'il existe (pas besoin, c'est auto-calculé)
  await prisma.treeBranchLeafSelectConfig.deleteMany({
    where: { nodeId: NODE_IDS.taux },
  });
  console.log('✅ SelectConfig Taux supprimé (auto-calculé, pas un SELECT)');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. Mettre à jour la variable du Taux → pointer vers la bonne table
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const tauxVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { nodeId: NODE_IDS.taux },
  });
  if (tauxVar) {
    await prisma.treeBranchLeafNodeVariable.update({
      where: { id: tauxVar.id },
      data: {
        sourceRef: `node-table:${TABLE_IDS.taux}`,
        displayFormat: 'number',
        unit: '%',
        precision: 2,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Variable Taux mise à jour → sourceRef=node-table:${TABLE_IDS.taux}`);
  } else {
    // Créer la variable si elle n'existe pas
    await prisma.treeBranchLeafNodeVariable.create({
      data: {
        id: require('crypto').randomUUID(),
        nodeId: NODE_IDS.taux,
        exposedKey: 'var_taux_interet',
        displayName: "Taux d'intérêt",
        displayFormat: 'number',
        unit: '%',
        precision: 2,
        visibleToUser: false,
        isReadonly: false,
        sourceRef: `node-table:${TABLE_IDS.taux}`,
        sourceType: 'tree',
        metadata: {},
      },
    });
    console.log('✅ Variable Taux créée → sourceRef=node-table:' + TABLE_IDS.taux);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. Mettre à jour la formule VPM : @value.taux → @calculated.taux
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '97431f94-e307-48c2-96a7-d1a06ff6a123' },
  });
  if (formula) {
    // Remplacer @value.taux par @calculated.taux (le taux est maintenant auto-calculé)
    const newTokens = formula.tokens.map(t => {
      if (t === `@value.${NODE_IDS.taux}`) return `@calculated.${NODE_IDS.taux}`;
      return t;
    });
    await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formula.id },
      data: { tokens: newTokens },
    });
    console.log('✅ Formule VPM → @value.taux remplacé par @calculated.taux');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. Vérification finale
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n📋 VÉRIFICATION FINALE:');
  
  const finNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: NODE_IDS.financement },
    select: { label: true, subType: true, fieldType: true, table_activeId: true },
  });
  console.log(`  Financement: ${finNode.label} | ${finNode.subType} | table=${finNode.table_activeId}`);
  
  const tauxNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: NODE_IDS.taux },
    select: { label: true, subType: true, fieldType: true, table_activeId: true },
  });
  console.log(`  Taux: ${tauxNode.label} | ${tauxNode.subType} | table=${tauxNode.table_activeId}`);
  
  const mensNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: NODE_IDS.mensualite },
    select: { label: true, subType: true, hasFormula: true },
  });
  console.log(`  Mensualité: ${mensNode.label} | ${mensNode.subType} | hasFormula=${mensNode.hasFormula}`);
  
  const finSC = await prisma.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: NODE_IDS.financement } });
  console.log(`  Financement SC: optionsSource=${finSC?.optionsSource} keyRow=${finSC?.keyRow} tableRef=${finSC?.tableReference}`);
  
  const tauxSC = await prisma.treeBranchLeafSelectConfig.findFirst({ where: { nodeId: NODE_IDS.taux } });
  console.log(`  Taux SC: ${tauxSC ? 'EXISTE (BUG)' : 'null (OK - auto-calculé)'}`);

  const updatedFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '97431f94-e307-48c2-96a7-d1a06ff6a123' },
    select: { tokens: true },
  });
  const tauxTokens = updatedFormula.tokens.filter(t => t.includes(NODE_IDS.taux));
  console.log(`  Formule VPM refs taux: ${tauxTokens.join(', ')}`);

  console.log('\n✅ CONFIGURATION TERMINÉE !');
  console.log('Flux: Prix TVAC → Financement (SELECT mois filtrés) → Taux (auto-calc) → Mensualité (VPM)');
}

main()
  .catch(e => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
