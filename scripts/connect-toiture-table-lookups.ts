/**
 * Raccorde les tables Façozinc aux champs Toiture via SelectConfig + lookup.
 * - Crée les TreeBranchLeafSelectConfig pour les 4 champs avec tables
 * - Supprime les champs redondants (Épaisseur isolation, Format ardoises)
 * - Corrige la visibilité Hauteur chevrons
 * - Crée un champ "Modèle chatière" avec lookup (car Chatières est un toggle)
 * - Détache la table chatières du toggle et la rattache au nouveau champ
 */

import { db } from '../src/lib/database';
import { randomUUID } from 'crypto';

const DEVIS_NODE_ID = '7528d92c-ade9-4b38-8c60-fbbeffec6df9';
const TREE_ID = 'cmf1mwoz10005gooked1j6orn';
const SUBTAB = 'Toiture';

// IDs from the database
const IDS = {
  intervention:       'e714a515-3326-4001-a707-ab7d55465049',
  isolation_toggle:   '6320d6d2-0dbb-415b-a2ab-3d2e9a27cee0',
  isolation_type:     '1c6d1a66-1987-438b-ae51-91618ff72c5e',
  isolation_epaisseur:'598ade0e-d3b4-46e4-adad-4d3114bd058e',
  hauteur_chevrons:   '6a62d89f-5599-4886-8f98-4b292fd96d0d',
  sous_toiture_poser: 'b5453005-1073-4cd0-afbf-9894f34db685',
  materiau_couverture:'851859d0-b096-4fab-a00a-37dc9eae9905',
  format_ardoises:    'ed17b225-119f-4c07-8a7f-19c126d0c592',
  type_evacuation:    'cdd207df-c515-4652-8875-3df5dd75083c',
  chatieres_toggle:   '5cf484df-d946-451a-bee3-1a3694ecbdfe',
  nb_chatieres:       'aa014d38-8682-4b3d-a215-92f492bbfc17',
};

// Table IDs (from the import script)
const TABLE_IDS = {
  isolation:    '71b5f791-b8cf-4205-8cd5-623f61acbb91',
  ardoises:     '1d45b1cf-7859-4860-8c12-8bb1c3b3de50',
  sous_toiture: '8a8fe947-6aa3-4e22-87c0-d14930d007be',
  chatieres:    '4f193ec2-1952-4eff-803c-d8b338c9d336',
  gouttieres:   'ac4e62a4-b3ae-4cfd-b408-dd84bd6c4590',
};

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  Raccordement Tables Lookup + Nettoyage champs   ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const now = new Date();

  // ══════════════════════════════════════════
  // 1. Créer SelectConfig pour les 4 champs avec tables directes
  // ══════════════════════════════════════════
  console.log('📋 1. Création des SelectConfig (table → lookup select)...');

  const selectConfigs = [
    { nodeId: IDS.isolation_type,      tableId: TABLE_IDS.isolation,    label: "Type d'isolation" },
    { nodeId: IDS.materiau_couverture, tableId: TABLE_IDS.ardoises,     label: "Matériau de couverture" },
    { nodeId: IDS.sous_toiture_poser,  tableId: TABLE_IDS.sous_toiture, label: "Sous-toiture à poser" },
    { nodeId: IDS.type_evacuation,     tableId: TABLE_IDS.gouttieres,   label: "Type d'évacuation eaux" },
  ];

  for (const sc of selectConfigs) {
    await db.treeBranchLeafSelectConfig.upsert({
      where: { nodeId: sc.nodeId },
      create: {
        id: randomUUID(),
        nodeId: sc.nodeId,
        optionsSource: 'table',
        tableReference: sc.tableId,
        keyColumn: 'Description',
        valueColumn: 'Description',
        displayColumn: 'Description',
        multiple: false,
        searchable: true,
        allowCustom: false,
        updatedAt: now,
      },
      update: {
        optionsSource: 'table',
        tableReference: sc.tableId,
        keyColumn: 'Description',
        valueColumn: 'Description',
        displayColumn: 'Description',
        searchable: true,
        updatedAt: now,
      },
    });
    console.log(`   ✅ ${sc.label} → table lookup raccordé`);
  }

  // ══════════════════════════════════════════
  // 2. Champ "Modèle chatière" — nouvelle select liée à la table chatières
  // ══════════════════════════════════════════
  console.log('\n📋 2. Création du champ "Modèle chatière" avec lookup...');

  const modeleChatId = randomUUID();

  // D'abord détacher la table du toggle chatières
  await db.treeBranchLeafNode.update({
    where: { id: IDS.chatieres_toggle },
    data: {
      hasTable: false,
      table_activeId: null,
      linkedTableIds: { set: [] },
      updatedAt: now,
    },
  });
  console.log('   ✅ Table détachée du toggle "Chatières ?"');

  // Créer le champ "Modèle chatière"
  await db.treeBranchLeafNode.create({
    data: {
      id: modeleChatId,
      treeId: TREE_ID,
      parentId: DEVIS_NODE_ID,
      label: 'Modèle chatière',
      subType: 'select',
      type: 'FIELD',
      order: 50.5, // entre Chatières(50) et Nombre(51)
      subtab: 'Toiture',
      hasProduct: true,
      product_sourceNodeId: IDS.chatieres_toggle,
      product_visibleFor: ['oui'],
      hasTable: true,
      table_activeId: TABLE_IDS.chatieres,
      linkedTableIds: [TABLE_IDS.chatieres],
      text_helpTooltipText: `À quoi sert ce champ ?
Permet de sélectionner le modèle exact de chatière à poser depuis le catalogue fournisseur Façozinc.

Question commerciale à poser au client :
« Nous allons choisir le type de chatière adapté à votre couverture. Le modèle dépend du matériau de couverture choisi. »

Indication / Pourquoi ce champ est important :
Le prix unitaire varie fortement selon le modèle (13€ pour une chatière standard tuile à 90€ pour une chatière avec tuyau VMC).
La chatière doit être compatible avec le matériau de couverture choisi.`,
      text_helpTooltipType: 'text',
      createdAt: now,
      updatedAt: now,
    },
  });

  // Lier la table au nouveau champ
  await db.treeBranchLeafNodeTable.update({
    where: { id: TABLE_IDS.chatieres },
    data: { nodeId: modeleChatId, updatedAt: now },
  });

  // Créer la SelectConfig pour le nouveau champ
  await db.treeBranchLeafSelectConfig.create({
    data: {
      id: randomUUID(),
      nodeId: modeleChatId,
      optionsSource: 'table',
      tableReference: TABLE_IDS.chatieres,
      keyColumn: 'Description',
      valueColumn: 'Description',
      displayColumn: 'Description',
      multiple: false,
      searchable: true,
      allowCustom: false,
      updatedAt: now,
    },
  });
  console.log(`   ✅ Champ "Modèle chatière" créé avec lookup (order 50.5)`);

  // ══════════════════════════════════════════
  // 3. Supprimer les champs redondants
  // ══════════════════════════════════════════
  console.log('\n📋 3. Suppression des champs redondants...');

  const toDelete = [
    { id: IDS.isolation_epaisseur, label: 'Épaisseur isolation (cm)' },
    { id: IDS.format_ardoises,     label: 'Format ardoises' },
  ];

  for (const field of toDelete) {
    await db.treeBranchLeafNode.delete({ where: { id: field.id } });
    console.log(`   🗑️  "${field.label}" supprimé`);
  }

  // ══════════════════════════════════════════
  // 4. Corriger la visibilité de "Hauteur chevrons"
  // ══════════════════════════════════════════
  console.log('\n📋 4. Correction visibilité "Hauteur chevrons"...');

  // Avant: src=Type d'isolation, vis=["sarking"]
  // Après: src=Isolation ?, vis=["oui"]
  // Raison: le "Type d'isolation" montre maintenant des noms de produits, plus "sarking"
  await db.treeBranchLeafNode.update({
    where: { id: IDS.hauteur_chevrons },
    data: {
      product_sourceNodeId: IDS.isolation_toggle,
      product_visibleFor: ['oui'],
      updatedAt: now,
    },
  });
  console.log('   ✅ Hauteur chevrons → visible quand Isolation = Oui');

  // ══════════════════════════════════════════
  // 5. Mettre le type des tables à "columns" (requis pour le lookup par colonne)
  // ══════════════════════════════════════════
  console.log('\n📋 5. Ajustement type des tables → "columns"...');

  for (const [name, tableId] of Object.entries(TABLE_IDS)) {
    await db.treeBranchLeafNodeTable.update({
      where: { id: tableId },
      data: { type: 'columns', updatedAt: now },
    });
    console.log(`   ✅ ${name} → type "columns"`);
  }

  // ══════════════════════════════════════════
  // 6. Réordonner proprement (fix les .5)
  // ══════════════════════════════════════════
  console.log('\n📋 6. Réordonnancement...');

  const allFields = await db.treeBranchLeafNode.findMany({
    where: { parentId: DEVIS_NODE_ID, subtab: { equals: SUBTAB } },
    select: { id: true, label: true, order: true },
    orderBy: { order: 'asc' },
  });

  for (let i = 0; i < allFields.length; i++) {
    const newOrder = 26 + i;
    if (allFields[i].order !== newOrder) {
      await db.treeBranchLeafNode.update({
        where: { id: allFields[i].id },
        data: { order: newOrder, updatedAt: now },
      });
    }
  }
  console.log(`   ✅ ${allFields.length} champs réordonnés (26 → ${25 + allFields.length})`);

  // ══════════════════════════════════════════
  // Résumé
  // ══════════════════════════════════════════
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  ✨ Résumé des modifications                      ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  ✅ 4 SelectConfig créés (lookup table → select)  ║');
  console.log('║  ✅ 1 champ "Modèle chatière" créé avec lookup    ║');
  console.log('║  🗑️  2 champs redondants supprimés                ║');
  console.log('║  ✅ Hauteur chevrons → visibilité corrigée         ║');
  console.log('║  ✅ 5 tables type → "columns"                     ║');
  console.log('║  ✅ Ordres réajustés                               ║');
  console.log('╚═══════════════════════════════════════════════════╝');
}

main().catch(console.error).finally(() => process.exit());
