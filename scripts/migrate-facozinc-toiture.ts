/**
 * Migration Façozinc Toiture - Architecture correcte
 * 
 * Remplace les 5 tables sources séparées (MAUVAIS) par:
 * 1. UNE table source unique avec TOUS les produits toiture + colonne Catégorie
 * 2. UNE vue par nœud SELECT, chacune filtrant par sa catégorie
 * 3. UN SelectConfig par nœud pointant vers sa vue
 * 
 * Architecture: Source → Vue (par catégorie) → Node SELECT → Dropdown options
 */
import { db } from '../src/lib/database';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ─── Configuration ───────────────────────────────────────────────

const TREE_ID = 'cmf1mwoz10005gooked1j6orn';
const ORG_ID = '1757366075154-i554z93kl';
const CSV_PATH = 'documentation/CL083798_29-12-2025.csv';

// Nœuds SELECT à configurer (IDs réels vérifiés)
const NODES = {
  isolation: {
    id: '1c6d1a66-1987-438b-ae51-91618ff72c5e',
    label: "Type d'isolation",
    category: 'Isolation',
    viewName: 'Catalogue Façozinc - Isolation',
  },
  ardoises: {
    id: '851859d0-b096-4fab-a00a-37dc9eae9905',
    label: 'Matériau de couverture',
    category: 'Ardoises',
    viewName: 'Catalogue Façozinc - Ardoises',
  },
  sousToiture: {
    id: 'b5453005-1073-4cd0-afbf-9894f34db685',
    label: 'Sous-toiture à poser',
    category: 'Sous-toiture',
    viewName: 'Catalogue Façozinc - Sous-toiture',
  },
  chatieres: {
    id: 'cdfb1287-430f-4fdf-98e1-55454fe2fffa',
    label: 'Modèle chatière',
    category: 'Chatières',
    viewName: 'Catalogue Façozinc - Chatières',
  },
  gouttieres: {
    id: 'cdd207df-c515-4652-8875-3df5dd75083c',
    label: "Type d'évacuation eaux",
    category: 'Gouttières',
    viewName: 'Catalogue Façozinc - Gouttières',
  },
};

// Tables à supprimer (IDs réels vérifiés)
const BAD_TABLE_IDS = [
  '71b5f791-b8cf-4205-8cd5-623f61acbb91', // Isolation Toiture (source)
  '173f3efa-0394-4568-b0b7-904c350a6ba4', // Isolation Toiture - couverture (view)
  '1d45b1cf-7859-4860-8c12-8bb1c3b3de50', // Ardoises & Fibro-ciment
  '8a8fe947-6aa3-4e22-87c0-d14930d007be', // Sous-toiture & Membranes
  '4f193ec2-1952-4eff-803c-d8b338c9d336', // Chatières
  'ac4e62a4-b3ae-4cfd-b408-dd84bd6c4590', // Gouttières & Évacuation
];

// ─── CSV parsing ─────────────────────────────────────────────────

interface CsvRow {
  reference: string;
  description: string;
  unite: string;
  prixAchat: number;
}

function parseCSV(): CsvRow[] {
  const raw = readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    const prix = parseFloat((cols[4] || '0').replace(',', '.'));
    rows.push({
      reference: cols[0]?.trim() || '',
      description: cols[1]?.trim() || '',
      unite: cols[3]?.trim() || '',
      prixAchat: isNaN(prix) ? 0 : prix,
    });
  }
  return rows;
}

// ─── Catégorisation (mêmes patterns que l'ancien import) ─────────

function categorize(r: CsvRow): string | null {
  const d = r.description.toUpperCase();

  // Isolation
  if (
    (d.includes('UTHERM SARKING') || d.includes('I-SARKING') ||
     d.includes('RHINOXX') || d.includes('ALUTHERMO')) &&
    !d.includes('ADHESIF') && !d.includes('CADRE ISOLANT') &&
    !d.includes('SOUS-TOITURE')
  ) {
    return 'Isolation';
  }

  // Sous-toiture (avant Isolation car I-SARKING SOUS-TOITURE)
  if (
    (d.includes('INTELLO') || d.includes('PARE-VAPEUR') ||
     d.includes('VILLATHERM') ||
     (d.includes('I-SARKING') && d.includes('SOUS-TOITURE'))) &&
    !d.includes('CLEANER')
  ) {
    return 'Sous-toiture';
  }

  // Ardoises
  if (
    (d.startsWith('ARDOISE ') && (d.includes('CUPA') || d.includes('BORONDA') ||
     d.includes('RATHSCHECK') || d.includes('NEW STONIT'))) ||
    (d.startsWith('DOLMEN ') && !d.includes('FAITIERE') && /\d+[xX]\d+/.test(d))
  ) {
    return 'Ardoises';
  }

  // Chatières
  if (d.includes('CHATIERE') || d.includes('CHATIÈRE')) {
    return 'Chatières';
  }

  // Gouttières
  if (
    (d.includes('GOUTTIERE') || d.includes('GOUTTIÈRE') ||
     d.includes('FOND DE GOUTTIERE') || d.includes('FOND DE GOUTTIÈRE') ||
     d.includes('NAISSANCE ') || d.includes('DESCENTE '))
  ) {
    return 'Gouttières';
  }

  return null; // Pas un produit toiture
}

// ─── MAIN ────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Migration Façozinc Toiture → 1 Source + N Vues ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ═══ PHASE 1: CLEANUP ═══
  console.log('━━━ Phase 1: Nettoyage ━━━');

  // 1a. Supprimer les SelectConfigs des nœuds toiture
  const nodeIds = Object.values(NODES).map(n => n.id);
  const deletedConfigs = await db.treeBranchLeafSelectConfig.deleteMany({
    where: { nodeId: { in: nodeIds } }
  });
  console.log(`  ✓ ${deletedConfigs.count} SelectConfig(s) supprimé(s)`);

  // 1b. Supprimer les tables (cascade supprime columns + rows)
  // D'abord supprimer la vue (qui a une FK vers la source)
  const deletedView = await db.treeBranchLeafNodeTable.deleteMany({
    where: { id: '173f3efa-0394-4568-b0b7-904c350a6ba4' }
  });
  console.log(`  ✓ ${deletedView.count} vue supprimée`);

  // Puis supprimer les sources
  const sourceIds = BAD_TABLE_IDS.filter(id => id !== '173f3efa-0394-4568-b0b7-904c350a6ba4');
  const deletedTables = await db.treeBranchLeafNodeTable.deleteMany({
    where: { id: { in: sourceIds } }
  });
  console.log(`  ✓ ${deletedTables.count} table(s) source supprimée(s)`);

  // 1c. Réinitialiser les nœuds
  for (const node of Object.values(NODES)) {
    await db.treeBranchLeafNode.update({
      where: { id: node.id },
      data: { hasTable: false, table_activeId: null, linkedTableIds: [] }
    });
  }
  console.log(`  ✓ ${nodeIds.length} nœud(s) réinitialisé(s)\n`);

  // ═══ PHASE 2: CRÉER LA TABLE SOURCE ═══
  console.log('━━━ Phase 2: Import CSV → 1 table source ━━━');

  const allCsv = parseCSV();
  console.log(`  CSV: ${allCsv.length} produits lus`);

  // Catégoriser
  const categorized: { row: CsvRow; category: string }[] = [];
  const stats: Record<string, number> = {};
  for (const row of allCsv) {
    const cat = categorize(row);
    if (cat) {
      categorized.push({ row, category: cat });
      stats[cat] = (stats[cat] || 0) + 1;
    }
  }
  console.log(`  Catégorisés: ${categorized.length} produits toiture`);
  Object.entries(stats).forEach(([cat, count]) => console.log(`    ${cat}: ${count}`));

  // Créer la table source
  const sourceTableId = randomUUID();
  const sourceNodeId = NODES.isolation.id; // Source associée au premier nœud

  const COLUMNS = ['Référence', 'Description', 'Catégorie', 'Unité', 'Prix achat (€)'];

  await db.treeBranchLeafNodeTable.create({
    data: {
      id: sourceTableId,
      nodeId: sourceNodeId,
      organizationId: ORG_ID,
      name: 'Catalogue Façozinc - Toiture',
      description: 'Table source unique pour tous les produits toiture Façozinc',
      type: 'columns',
      meta: {
        lookup: {
          enabled: true,
          columnLookupEnabled: true,
          rowLookupEnabled: false,
        },
        isImported: true,
        importSource: 'CL083798_29-12-2025.csv',
      },
      columnCount: COLUMNS.length,
      rowCount: categorized.length + 1, // +1 for header row
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  console.log(`  ✓ Table source créée: ${sourceTableId.slice(0, 8)}...`);

  // Créer les colonnes
  for (let i = 0; i < COLUMNS.length; i++) {
    await db.treeBranchLeafNodeTableColumn.create({
      data: {
        id: randomUUID(),
        tableId: sourceTableId,
        columnIndex: i,
        name: COLUMNS[i],
        type: i === 4 ? 'number' : 'text',
        metadata: {},
      }
    });
  }
  console.log(`  ✓ ${COLUMNS.length} colonnes créées`);

  // Créer les rows (row 0 = header, rows 1+ = données)
  // Header row (comme dans les tables existantes)
  await db.treeBranchLeafNodeTableRow.create({
    data: {
      id: randomUUID(),
      tableId: sourceTableId,
      rowIndex: 0,
      cells: JSON.stringify(COLUMNS),
    }
  });

  // Data rows
  for (let i = 0; i < categorized.length; i++) {
    const { row, category } = categorized[i];
    await db.treeBranchLeafNodeTableRow.create({
      data: {
        id: randomUUID(),
        tableId: sourceTableId,
        rowIndex: i + 1,
        cells: JSON.stringify([row.reference, row.description, category, row.unite, row.prixAchat]),
      }
    });
  }
  console.log(`  ✓ ${categorized.length + 1} rows créées (1 header + ${categorized.length} données)\n`);

  // ═══ PHASE 3: CRÉER LES VUES + SELECT CONFIGS ═══
  console.log('━━━ Phase 3: Vues + SelectConfigs ━━━');

  for (const [key, node] of Object.entries(NODES)) {
    const viewId = randomUUID();

    // 3a. Créer la vue
    await db.treeBranchLeafNodeTable.create({
      data: {
        id: viewId,
        nodeId: node.id,
        organizationId: ORG_ID,
        name: node.viewName,
        description: `Vue filtrée: ${node.category}`,
        type: 'columns',
        sourceTableId: sourceTableId,
        meta: {
          lookup: {
            enabled: true,
            columnLookupEnabled: true,
            rowLookupEnabled: false,
            displayColumn: ['Prix achat (€)'],
            filterConditions: {
              enabled: true,
              filterLogic: 'AND',
              conditions: [
                {
                  id: `filter_${key}`,
                  filterByColumn: 'Catégorie',
                  operator: 'equals',
                  compareWithRef: node.category,
                }
              ],
            },
          },
        },
        columnCount: COLUMNS.length,
        rowCount: stats[node.category] || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // 3b. Créer le SelectConfig
    await db.treeBranchLeafSelectConfig.create({
      data: {
        id: randomUUID(),
        nodeId: node.id,
        optionsSource: 'table',
        tableReference: viewId,
        keyColumn: 'Description',
        displayColumn: 'Prix achat (€)',
        searchable: true,
        options: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    // 3c. Mettre à jour le nœud
    await db.treeBranchLeafNode.update({
      where: { id: node.id },
      data: {
        hasTable: true,
        table_activeId: viewId,
        linkedTableIds: [viewId],
      }
    });

    console.log(`  ✓ ${node.label} → vue ${viewId.slice(0, 8)}... (${node.category}: ${stats[node.category] || 0} produits)`);
  }

  // ═══ RÉSUMÉ ═══
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  ✅ Migration terminée avec succès               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n  Source: ${sourceTableId}`);
  console.log(`  Produits: ${categorized.length}`);
  console.log(`  Vues: ${Object.keys(NODES).length}`);
  console.log(`  Architecture: 1 source → ${Object.keys(NODES).length} vues → ${Object.keys(NODES).length} SELECT fields`);

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Erreur:', e);
  await db.$disconnect();
  process.exit(1);
});
