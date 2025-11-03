/**
 * SCRIPT : Forcer la copie d'UNE capacité manuellement pour déboguer
 */

import { PrismaClient } from '@prisma/client';
import { copyFormulaCapacity } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-capacity-formula.js';
import { copyTableCapacity } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-capacity-table.js';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 TEST MANUEL DE COPIE DE CAPACITÉ\n');

  // 1. Trouver une variable copiée (-1) qui pointe vers une formule manquante
  const brokenVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: {
      id: { contains: '-1' },
      sourceRef: { startsWith: 'node-formula:' }
    },
    select: {
      id: true,
      exposedKey: true,
      sourceRef: true,
      nodeId: true
    }
  });

  if (!brokenVariable) {
    console.log('❌ Aucune variable -1 avec formule trouvée');
    return;
  }

  console.log('✅ Variable copiée trouvée:', brokenVariable);

  // 2. Extraire l'ID de formule
  const formulaIdWithSuffix = brokenVariable.sourceRef?.replace('node-formula:', '') || '';
  const formulaIdOriginal = formulaIdWithSuffix.replace(/-1$/, '');

  console.log(`\n📐 Formule référencée: ${formulaIdWithSuffix}`);
  console.log(`📐 Formule originale (calculée): ${formulaIdOriginal}`);

  // 3. Vérifier si la formule -1 existe déjà
  const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: formulaIdWithSuffix }
  });

  if (existingFormula) {
    console.log(`✅ La formule ${formulaIdWithSuffix} EXISTE DÉJÀ !`);
    return;
  } else {
    console.log(`❌ La formule ${formulaIdWithSuffix} N'EXISTE PAS !`);
  }

  // 4. Vérifier si la formule originale existe
  const originalFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: formulaIdOriginal }
  });

  if (!originalFormula) {
    console.log(`❌ Formule originale ${formulaIdOriginal} introuvable !`);
    return;
  }

  console.log(`✅ Formule originale trouvée: ${originalFormula.name || originalFormula.id}`);

  // 5. LANCER LA COPIE MANUELLE
  console.log(`\n🚀 LANCEMENT DE LA COPIE...`);

  try {
    const result = await copyFormulaCapacity(
      formulaIdOriginal,
      brokenVariable.nodeId,
      1, // suffix
      prisma,
      {
        nodeIdMap: new Map(),
        formulaCopyCache: new Map()
      }
    );

    if (result.success) {
      console.log(`\n✅✅✅ SUCCÈS ! Formule copiée: ${result.newFormulaId}`);

      // 6. Vérifier dans la base
      const verification = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: result.newFormulaId }
      });

      if (verification) {
        console.log(`🎉 VÉRIFICATION: Formule ${result.newFormulaId} trouvée dans la base !`);
      } else {
        console.log(`❌ ERREUR: Formule ${result.newFormulaId} NON trouvée après création !`);
      }

      // 7. Mettre à jour la variable pour pointer vers la nouvelle formule
      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: brokenVariable.id },
        data: {
          sourceRef: `node-formula:${result.newFormulaId}`
        }
      });

      console.log(`✅ Variable mise à jour: ${brokenVariable.id}`);

    } else {
      console.log(`\n❌ ÉCHEC: ${result.error}`);
    }

  } catch (error: any) {
    console.error(`\n❌❌❌ EXCEPTION:`, error.message);
    console.error(`Stack:`, error.stack);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 8. Même chose pour une TABLE
  console.log('\n🧪 TEST MANUEL DE COPIE DE TABLE\n');

  const brokenTableVariable = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: {
      id: { contains: '-1' },
      sourceRef: { startsWith: '@table.' }
    },
    select: {
      id: true,
      exposedKey: true,
      sourceRef: true,
      nodeId: true
    }
  });

  if (!brokenTableVariable) {
    console.log('❌ Aucune variable -1 avec table trouvée');
    return;
  }

  console.log('✅ Variable copiée (table) trouvée:', brokenTableVariable);

  const tableIdWithSuffix = brokenTableVariable.sourceRef?.replace('@table.', '') || '';
  const tableIdOriginal = tableIdWithSuffix.replace(/-1$/, '');

  console.log(`\n📊 Table référencée: ${tableIdWithSuffix}`);
  console.log(`📊 Table originale (calculée): ${tableIdOriginal}`);

  const existingTable = await prisma.tableDedicatedStorage.findUnique({
    where: { id: tableIdWithSuffix }
  });

  if (existingTable) {
    console.log(`✅ La table ${tableIdWithSuffix} EXISTE DÉJÀ !`);
    return;
  } else {
    console.log(`❌ La table ${tableIdWithSuffix} N'EXISTE PAS !`);
  }

  const originalTable = await prisma.tableDedicatedStorage.findUnique({
    where: { id: tableIdOriginal }
  });

  if (!originalTable) {
    console.log(`❌ Table originale ${tableIdOriginal} introuvable !`);
    return;
  }

  console.log(`✅ Table originale trouvée: ${originalTable.name}`);

  try {
    const result = await copyTableCapacity(
      tableIdOriginal,
      brokenTableVariable.nodeId,
      1,
      prisma,
      {
        nodeIdMap: new Map(),
        tableCopyCache: new Map()
      }
    );

    if (result.success) {
      console.log(`\n✅✅✅ SUCCÈS ! Table copiée: ${result.newTableId}`);

      const verification = await prisma.tableDedicatedStorage.findUnique({
        where: { id: result.newTableId }
      });

      if (verification) {
        console.log(`🎉 VÉRIFICATION: Table ${result.newTableId} trouvée dans la base !`);
      } else {
        console.log(`❌ ERREUR: Table ${result.newTableId} NON trouvée après création !`);
      }

      await prisma.treeBranchLeafNodeVariable.update({
        where: { id: brokenTableVariable.id },
        data: {
          sourceRef: `@table.${result.newTableId}`
        }
      });

      console.log(`✅ Variable (table) mise à jour: ${brokenTableVariable.id}`);

    } else {
      console.log(`\n❌ ÉCHEC: ${result.error}`);
    }

  } catch (error: any) {
    console.error(`\n❌❌❌ EXCEPTION:`, error.message);
    console.error(`Stack:`, error.stack);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
