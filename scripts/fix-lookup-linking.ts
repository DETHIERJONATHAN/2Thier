/**
 * 🔧 SCRIPT DE CORRECTION - Auto-Populate linkedTableIds & linkedVariableIds
 * 
 * But: Corriger rétroactivement les champs Select qui utilisent des tables
 * mais dont les linked*Ids n'ont pas été remplis
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLookupLinking() {
  console.log(`\n========================================`);
  console.log(`🔧 CORRECTION: Fix LinkedTableIds/Vars`);
  console.log(`========================================\n`);

  try {
    // Chercher les tables avec lookup
    const tablesWithLookup = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup'],
          not: Prisma.DbNull
        }
      }
    });

    console.log(`📊 Trouvé ${tablesWithLookup.length} table(s) avec lookup config\n`);

    for (const table of tablesWithLookup) {
      const meta = table.meta as any;
      const lookup = meta?.lookup;

      if (!lookup) continue;

      console.log(`🔧 Traitant table: "${table.name}" (${table.id})`);

      // Chercher les champs Select utilisant cette table
      const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
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
              linkedVariableIds: true
            }
          }
        }
      });

      console.log(`   ✅ Trouvé ${selectConfigs.length} champ(s) Select\n`);

      for (const selectConfig of selectConfigs) {
        const fieldNode = selectConfig.node;
        if (!fieldNode) continue;

        console.log(`   📋 Champ: "${fieldNode.label}" (${fieldNode.id})`);

        // Vérifier si linkedTableIds contient la table
        const hasTableLink = fieldNode.linkedTableIds?.includes(table.id);
        if (!hasTableLink) {
          console.log(`      ❌ linkedTableIds manquant -> AJOUT`);
          const newTableIds = Array.from(
            new Set([...(fieldNode.linkedTableIds ?? []), table.id])
          );
          await prisma.treeBranchLeafNode.update({
            where: { id: fieldNode.id },
            data: { linkedTableIds: { set: newTableIds } }
          });
          console.log(`      ✅ linkedTableIds mise à jour: ${JSON.stringify(newTableIds)}`);
        } else {
          console.log(`      ✅ linkedTableIds OK`);
        }

        // Chercher ou créer une variable pour ce champ
        let variable = await prisma.treeBranchLeafNodeVariable.findFirst({
          where: { nodeId: fieldNode.id }
        });

        if (!variable) {
          console.log(`      ❌ Variable manquante -> CRÉATION`);
          variable = await prisma.treeBranchLeafNodeVariable.create({
            data: {
              id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              nodeId: fieldNode.id,
              metadata: {
                sourceRef: `@table.${table.id}`,
                sourceType: 'tree',
                displayFormat: 'text'
              }
            }
          });
          console.log(`      ✅ Variable créée: ${variable.id}`);
        }

        // Vérifier si linkedVariableIds contient la variable
        const hasVarLink = fieldNode.linkedVariableIds?.includes(variable.id);
        if (!hasVarLink) {
          console.log(`      ❌ linkedVariableIds manquant -> AJOUT`);
          const newVarIds = Array.from(
            new Set([...(fieldNode.linkedVariableIds ?? []), variable.id])
          );
          await prisma.treeBranchLeafNode.update({
            where: { id: fieldNode.id },
            data: { linkedVariableIds: { set: newVarIds } }
          });
          console.log(`      ✅ linkedVariableIds mise à jour: ${JSON.stringify(newVarIds)}`);
        } else {
          console.log(`      ✅ linkedVariableIds OK`);
        }

        // Assurer que hasData et data_* sont configurés
        const needsDataFields = !fieldNode.linkedVariableIds?.length || 
                                 fieldNode.linkedTableIds?.some(id => id === table.id);
        
        if (needsDataFields) {
          console.log(`      ⚙️ Mise à jour des champs data_*...`);
          await prisma.treeBranchLeafNode.update({
            where: { id: fieldNode.id },
            data: {
              hasData: true,
              data_activeId: variable.id,
              data_displayFormat: 'text',
              data_instances: {
                [variable.id]: {
                  id: variable.id,
                  unit: '',
                  precision: 0,
                  exposedKey: `var_${fieldNode.id.slice(0, 4)}`,
                  displayName: `Table Lookup (${fieldNode.label})`,
                  sourceRef: `@table.${table.id}`,
                  sourceType: 'tree'
                }
              }
            }
          });
          console.log(`      ✅ data_* mis à jour`);
        }

        console.log();
      }

      console.log(`${'='.repeat(60)}\n`);
    }

    console.log(`✅ CORRECTION TERMINÉE\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLookupLinking();
