import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findFieldsWithVariables() {
  console.log('🔍 RECHERCHE DES CHAMPS AVEC linkedVariableIds\n');
  console.log('='.repeat(80));

  const targetVarIds = [
    'dfe42b56-ce2e-4c2d-a4a2-cba90087ed72', // Rampant
    'ac81b3a7-5e5a-4c13-90f5-51503aadc748', // Orientation
    '42de8d47-1300-49e0-bb00-f2dc3e4052d6'  // Longueur
  ];

  for (const varId of targetVarIds) {
    console.log(`\n📊 Variable: ${varId}`);
    console.log('-'.repeat(80));

    // Chercher les champs SOURCE qui utilisent cette variable
    const sourceFields = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { not: { endsWith: '-1' } },
        OR: [
          {
            metadata: {
              path: ['linkedVariableIds'],
              array_contains: varId
            }
          }
        ]
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      }
    });

    console.log(`\nChamps SOURCE utilisant cette variable: ${sourceFields.length}`);
    for (const field of sourceFields) {
      console.log(`  • ${field.label} (${field.id})`);
      console.log(`    Parent: ${field.parentId}`);
      const linkedVars = field.metadata?.linkedVariableIds || [];
      console.log(`    linkedVariableIds:`, linkedVars);
    }

    // Chercher les champs COPIÉS
    const copiedFields = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { endsWith: '-1' },
        OR: [
          {
            metadata: {
              path: ['linkedVariableIds'],
              array_contains: varId
            }
          },
          {
            metadata: {
              path: ['linkedVariableIds'],
              array_contains: `${varId}-1`
            }
          }
        ]
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      }
    });

    console.log(`\nChamps COPIÉS utilisant cette variable: ${copiedFields.length}`);
    for (const field of copiedFields) {
      console.log(`  • ${field.label} (${field.id})`);
      console.log(`    Parent: ${field.parentId}`);
      const linkedVars = field.metadata?.linkedVariableIds || [];
      console.log(`    linkedVariableIds:`, linkedVars);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 DIAGNOSTIC:\n');
  console.log('Si aucun champ SOURCE n\'utilise Orientation ou Longueur,');
  console.log('alors ces variables ne seront JAMAIS copiées car elles ne sont');
  console.log('pas liées à un champ dans le template du repeat.\n');
  console.log('💡 SOLUTION:');
  console.log('Vérifier que les champs source ont bien linkedVariableIds configuré');
  console.log('pour pointer vers ces variables.');
}

findFieldsWithVariables()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
