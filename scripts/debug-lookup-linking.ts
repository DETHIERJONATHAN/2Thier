/**
 * 🔍 SCRIPT DE DIAGNOSTIC - Lookup Linking & LinkedTableIds/LinkedVariableIds
 * 
 * But: Comprendre pourquoi les linked*Ids ne sont pas remplis lors d'une config lookup
 * 
 * Flow attendu:
 * 1. Créer une table (ex: "Versants")
 * 2. Configurer lookup: colonne=Orientation, ligne=Inclinaison
 * 3. À la sauvegarde, les champs Select (Orientation, Inclinaison) doivent avoir:
 *    - linkedTableIds = [tableId]
 *    - linkedVariableIds = [newVariableId] (si une variable est créée)
 * 4. Le repeater utilisera ces IDs pour savoir quelles variables copier
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LookupConfig {
  columnLookupEnabled?: boolean;
  rowLookupEnabled?: boolean;
  columnFieldId?: string;
  rowFieldId?: string;
  columnFieldLabel?: string;
  rowFieldLabel?: string;
}

async function diagnosticLookupLinking() {
  console.log(`\n========================================`);
  console.log(`🔍 DIAGNOSTIC: Lookup Linking Analysis`);
  console.log(`========================================\n`);

  try {
    // 1️⃣ CHERCHER LES TABLES AVEC LOOKUP CONFIGURÉ
    console.log(`1️⃣ Cherchant les tables avec lookup configuré...`);
    const tablesWithLookup = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup'],
          not: Prisma.DbNull
        }
      },
      include: {
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            linkedTableIds: true,
            linkedVariableIds: true,
            type: true
          }
        }
      }
    });

    console.log(`✅ Trouvé ${tablesWithLookup.length} table(s) avec lookup\n`);

    for (const table of tablesWithLookup) {
      console.log(`📊 Table: "${table.name}" (ID: ${table.id})`);
      const meta = table.meta as any;
      const lookup = meta?.lookup as LookupConfig;

      if (!lookup) {
        console.log(`   ⚠️ Pas de config lookup trouvée dans meta\n`);
        continue;
      }

      console.log(`   Lookup Config:`, {
        columnLookupEnabled: lookup.columnLookupEnabled,
        rowLookupEnabled: lookup.rowLookupEnabled,
        columnFieldId: lookup.columnFieldId,
        columnFieldLabel: lookup.columnFieldLabel,
        rowFieldId: lookup.rowFieldId,
        rowFieldLabel: lookup.rowFieldLabel
      });

      // 2️⃣ CHERCHER LES CHAMPS SELECT QUI UTILISENT CETTE TABLE
      console.log(`\n   🔎 Cherchant les champs Select utilisant cette table...`);
      const selectFields = await prisma.treeBranchLeafSelectConfig.findMany({
        where: {
          metadata: {
            path: ['sourceRef'],
            string_contains: `@table.${table.id}`
          }
        },
        include: {
          node: {
            select: {
              id: true,
              label: true,
              linkedTableIds: true,
              linkedVariableIds: true,
              hasData: true,
              data_activeId: true,
              TreeBranchLeafNodeVariable: {
                select: {
                  id: true,
                  metadata: true
                }
              }
            }
          }
        }
      });

      console.log(`   ✅ Trouvé ${selectFields.length} champ(s) Select\n`);

      for (const selectConfig of selectFields) {
        const fieldNode = selectConfig.node;
        if (!fieldNode) continue;

        console.log(`   📋 Select Field: "${fieldNode.label}" (${fieldNode.id})`);
        console.log(`      sourceRef: @table.${table.id}`);
        console.log(`      linkedTableIds: ${JSON.stringify(fieldNode.linkedTableIds ?? [])} ${
          fieldNode.linkedTableIds?.includes(table.id) ? '✅' : '❌ MANQUANT!'
        }`);
        console.log(`      linkedVariableIds: ${JSON.stringify(fieldNode.linkedVariableIds ?? [])} ${
          fieldNode.linkedVariableIds?.length ? '✅' : '❌ VIDE!'
        }`);
        console.log(`      hasData: ${fieldNode.hasData}`);
        console.log(`      data_activeId: ${fieldNode.data_activeId}`);

        if (fieldNode.TreeBranchLeafNodeVariable?.length) {
          console.log(`      Variable(s):`, fieldNode.TreeBranchLeafNodeVariable.map(v => ({
            id: v.id,
            sourceRef: (v.metadata as any)?.sourceRef
          })));
        } else {
          console.log(`      ⚠️ Pas de variable trouvée!`);
        }
        console.log();
      }

      // 3️⃣ VÉRIFIER LE NŒUD PROPRIÉTAIRE DE LA TABLE
      console.log(`   🏠 Nœud propriétaire de la table:`);
      const tableNode = table.TreeBranchLeafNode;
      if (tableNode) {
        console.log(`      Label: "${tableNode.label}"`);
        console.log(`      linkedTableIds: ${JSON.stringify(tableNode.linkedTableIds ?? [])}`);
        console.log(`      linkedVariableIds: ${JSON.stringify(tableNode.linkedVariableIds ?? [])}`);
      }
      console.log(`\n${'='.repeat(60)}\n`);
    }

    // 4️⃣ CHERCHER LES VARIABLES LIÉES À DES TABLES
    console.log(`\n2️⃣ Cherchant toutes les variables avec sourceRef @table...\n`);
    const tableLinkedVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        metadata: {
          path: ['sourceRef'],
          string_contains: '@table.'
        }
      },
      include: {
        node: {
          select: {
            id: true,
            label: true,
            linkedVariableIds: true,
            linkedTableIds: true
          }
        }
      }
    });

    console.log(`✅ Trouvé ${tableLinkedVars.length} variable(s) liée(s) à une table\n`);

    for (const varNode of tableLinkedVars) {
      const sourceRef = (varNode.metadata as any)?.sourceRef;
      const tableId = sourceRef?.replace('@table.', '');
      console.log(`📌 Variable: ${varNode.id}`);
      console.log(`   Node: "${varNode.node?.label}" (${varNode.node?.id})`);
      console.log(`   sourceRef: ${sourceRef}`);
      console.log(`   linkedTableIds: ${JSON.stringify(varNode.node?.linkedTableIds ?? [])} ${
        varNode.node?.linkedTableIds?.includes(tableId) ? '✅' : '❌'
      }`);
      console.log(`   linkedVariableIds: ${JSON.stringify(varNode.node?.linkedVariableIds ?? [])} ${
        varNode.node?.linkedVariableIds?.includes(varNode.id) ? '✅' : '❌'
      }`);
      console.log();
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosticLookupLinking();

import Prisma from '@prisma/client';
