/**
 * Import des produits Façozinc pertinents pour la Toiture
 * dans des tables TBL liées aux champs du formulaire Devis > Toiture.
 *
 * Tables créées :
 *  1. Isolation Toiture  → nœud "Type d'isolation"
 *  2. Ardoises            → nœud "Matériau de couverture"
 *  3. Sous-toiture        → nœud "Sous-toiture à poser"
 *  4. Chatières           → nœud "Chatières / Ventilation toiture ?"
 *  5. Gouttières          → nœud "Type d'évacuation eaux"
 */

import { db } from '../src/lib/database';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────
// CSV Parsing
// ──────────────────────────────────────────
interface CsvRow {
  reference: string;
  description: string;
  fournisseur: string;
  unite: string;
  prixAchat: number;
  marge: number;
  ean: string;
}

function parseCsv(filePath: string): CsvRow[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);
  // skip header
  return lines.slice(1).map(line => {
    const cols = line.split(';');
    return {
      reference:   cols[0]?.trim() || '',
      description: cols[1]?.trim() || '',
      fournisseur: cols[2]?.trim() || '',
      unite:       cols[3]?.trim() || '',
      prixAchat:   parseFloat((cols[4] || '0').replace(',', '.')) || 0,
      marge:       parseFloat((cols[5] || '0').replace(',', '.')) || 0,
      ean:         cols[11]?.trim() || '',
    };
  });
}

// ──────────────────────────────────────────
// Catégorisation des produits pour la toiture
// ──────────────────────────────────────────

type Category = {
  name: string;
  nodeLabel: string;        // label du TreeBranchLeafNode auquel lier la table
  columns: string[];        // noms de colonnes pour la table
  filter: (r: CsvRow) => boolean;
  mapRow: (r: CsvRow) => any[];
};

const CATEGORIES: Category[] = [
  {
    name: 'Isolation Toiture',
    nodeLabel: "Type d'isolation",
    columns: ['Référence', 'Description', 'Épaisseur', 'Unité', 'Prix achat (€)'],
    filter: (r) => {
      const d = r.description.toUpperCase();
      return (
        d.includes('UTHERM SARKING') ||
        d.includes('I-SARKING') ||
        d.includes('RHINOXX') ||
        d.includes('ALUTHERMO')
      ) && !d.includes('ADHESIF') && !d.includes('CADRE ISOLANT');
    },
    mapRow: (r) => {
      // Extraire l'épaisseur du texte
      const match = r.description.match(/(\d+)\s*(?:MM|CM)/i);
      const ep = match ? match[1] + (r.description.toUpperCase().includes('CM') ? ' cm' : ' mm') : '-';
      return [r.reference, r.description, ep, r.unite, r.prixAchat];
    },
  },
  {
    name: 'Ardoises & Fibro-ciment',
    nodeLabel: 'Matériau de couverture',
    columns: ['Référence', 'Description', 'Format', 'Unité', 'Prix achat (€)'],
    filter: (r) => {
      const d = r.description.toUpperCase();
      return (
        (d.startsWith('ARDOISE ') && (d.includes('CUPA') || d.includes('BORONDA') || d.includes('RATHSCHECK') || d.includes('NEW STONIT'))) ||
        (d.startsWith('DOLMEN ') && !d.includes('FAITIERE') && /\d+[xX]\d+/.test(d))
      );
    },
    mapRow: (r) => {
      const match = r.description.match(/(\d+)\s*[Xx×]\s*(\d+)/);
      const format = match ? `${match[1]}x${match[2]}` : '-';
      return [r.reference, r.description, format, r.unite, r.prixAchat];
    },
  },
  {
    name: 'Sous-toiture & Membranes',
    nodeLabel: 'Sous-toiture à poser',
    columns: ['Référence', 'Description', 'Type', 'Unité', 'Prix achat (€)'],
    filter: (r) => {
      const d = r.description.toUpperCase();
      return (
        d.includes('INTELLO') ||
        d.includes('PARE-VAPEUR') ||
        d.includes('VILLATHERM') ||
        (d.includes('I-SARKING') && d.includes('SOUS-TOITURE'))
      ) && !d.includes('CLEANER');
    },
    mapRow: (r) => {
      const d = r.description.toUpperCase();
      let type = 'Membrane';
      if (d.includes('PARE-VAPEUR') || d.includes('VILLATHERM')) type = 'Pare-vapeur';
      else if (d.includes('INTELLO')) type = 'Frein-vapeur HPV';
      else if (d.includes('I-SARKING') && d.includes('SOUS-TOITURE')) type = 'Écran HPV intégré';
      return [r.reference, r.description, type, r.unite, r.prixAchat];
    },
  },
  {
    name: 'Chatières',
    nodeLabel: 'Chatières / Ventilation toiture ?',
    columns: ['Référence', 'Description', 'Matériau', 'Unité', 'Prix achat (€)'],
    filter: (r) => {
      const d = r.description.toUpperCase();
      return d.includes('CHATIERE') || d.includes('CHATIÈRE');
    },
    mapRow: (r) => {
      const d = r.description.toUpperCase();
      let mat = '-';
      if (d.includes('ATZ')) mat = 'Zinc patiné (ATZ)';
      else if (d.includes(' QZ')) mat = 'Zinc quartz (QZ)';
      else if (d.includes(' ZN')) mat = 'Zinc naturel';
      else if (d.includes(' CU')) mat = 'Cuivre';
      else if (d.includes('TUILE')) mat = 'Terre cuite';
      return [r.reference, r.description, mat, r.unite, r.prixAchat];
    },
  },
  {
    name: 'Gouttières & Évacuation',
    nodeLabel: "Type d'évacuation eaux",
    columns: ['Référence', 'Description', 'Profil', 'Matériau', 'Unité', 'Prix achat (€)'],
    filter: (r) => {
      const d = r.description.toUpperCase();
      return (
        d.includes('GOUTTIERE') || d.includes('GOUTTIÈRE') ||
        d.includes('FOND DE GOUTTIERE') || d.includes('FOND DE GOUTTIÈRE') ||
        d.includes('NAISSANCE ') ||
        d.includes('DESCENTE ')
      ) && d.includes('FAÇOZINC') === false; // fournisseur is always Façozinc, but some unrelated items too
    },
    mapRow: (r) => {
      const d = r.description.toUpperCase();
      let profil = '-';
      if (d.includes('DL ') || d.includes('DEMI')) profil = 'Demi-ronde';
      else if (d.includes('CAR ')) profil = 'Corniche (carrée)';
      else if (d.includes('ARDENAIS')) profil = 'Ardenaise';
      let mat = '-';
      if (d.includes(' ATZ')) mat = 'Zinc patiné (ATZ)';
      else if (d.includes(' QZ')) mat = 'Zinc quartz (QZ)';
      else if (d.includes(' ZN')) mat = 'Zinc naturel';
      else if (d.includes(' CU')) mat = 'Cuivre';
      else if (d.includes(' PVC')) mat = 'PVC';
      return [r.reference, r.description, profil, mat, r.unite, r.prixAchat];
    },
  },
];

// ──────────────────────────────────────────
// DEVIS PARENT & SUBTAB
// ──────────────────────────────────────────
const DEVIS_NODE_ID = '7528d92c-ade9-4b38-8c60-fbbeffec6df9';
const SUBTAB = 'Toiture';

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Import produits Façozinc → Tables TBL Toiture ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // 1) Parse CSV
  const csvPath = path.resolve(process.cwd(), 'documentation/CL083798_29-12-2025.csv');
  const allProducts = parseCsv(csvPath);
  console.log(`📦 CSV chargé : ${allProducts.length} produits\n`);

  // 2) Load Toiture TBL fields
  const toitureFields = await db.treeBranchLeafNode.findMany({
    where: { parentId: DEVIS_NODE_ID, subtab: { equals: SUBTAB } },
    select: { id: true, label: true, hasTable: true, linkedTableIds: true },
  });
  console.log(`🏠 Champs Toiture trouvés : ${toitureFields.length}\n`);

  // 3) For each category, filter products, create table, link to node
  for (const cat of CATEGORIES) {
    const node = toitureFields.find(f => f.label === cat.nodeLabel);
    if (!node) {
      console.log(`⚠️  Nœud "${cat.nodeLabel}" introuvable — skip`);
      continue;
    }

    const products = allProducts.filter(cat.filter);
    if (products.length === 0) {
      console.log(`⚠️  Aucun produit pour "${cat.name}" — skip`);
      continue;
    }

    // Sort by description
    products.sort((a, b) => a.description.localeCompare(b.description));

    console.log(`\n📋 ${cat.name} : ${products.length} produits → nœud "${cat.nodeLabel}"`);

    const tableId = randomUUID();
    const now = new Date();

    // Build rows — header row at index 0, then product rows
    const headerCells = cat.columns;
    const productRows = products.map(p => cat.mapRow(p));

    await db.$transaction(async (tx: any) => {
      // Create table with nested columns and rows
      await tx.treeBranchLeafNodeTable.create({
        data: {
          id: tableId,
          nodeId: node.id,
          name: cat.name,
          description: `Catalogue Façozinc — ${cat.name} (import CSV)`,
          type: 'basic',
          meta: {
            lookup: {
              enabled: true,
              columnLookupEnabled: true,
              rowLookupEnabled: false,
            },
          },
          isDefault: true,
          order: 0,
          columnCount: cat.columns.length,
          rowCount: productRows.length + 1,
          lookupSelectColumn: 'Description',
          lookupDisplayColumns: cat.columns.filter(c => c !== 'Description'),
          updatedAt: now,
          tableColumns: {
            create: cat.columns.map((name, idx) => ({
              id: randomUUID(),
              columnIndex: idx,
              name,
              type: name.includes('Prix') ? 'number' : 'text',
              metadata: {},
            })),
          },
        },
      });

      // Create rows one by one (JSONB requires individual create, not createMany)
      // Header row
      await tx.treeBranchLeafNodeTableRow.create({
        data: {
          id: randomUUID(),
          tableId,
          rowIndex: 0,
          cells: headerCells,
        },
      });

      // Product rows
      for (let i = 0; i < productRows.length; i++) {
        await tx.treeBranchLeafNodeTableRow.create({
          data: {
            id: randomUUID(),
            tableId,
            rowIndex: i + 1,
            cells: productRows[i],
          },
        });
      }

      // Link table to node
      const currentLinked = node.linkedTableIds ?? [];
      const newLinked = Array.from(new Set([...currentLinked, tableId]));

      await tx.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          hasTable: true,
          linkedTableIds: { set: newLinked },
          table_activeId: tableId,
          updatedAt: now,
        },
      });
    }, { timeout: 60000 });

    console.log(`   ✅ Table "${cat.name}" créée (${productRows.length} lignes, ${cat.columns.length} colonnes)`);
    console.log(`   🔗 Liée au nœud ${node.id}`);
  }

  console.log('\n✨ Import terminé !');
}

main().catch(console.error).finally(() => process.exit());
