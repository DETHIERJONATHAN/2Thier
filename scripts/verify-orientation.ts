/**
 * ✅ VÉRIFICATION FINALE - État du nœud Orientation après fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log(`\n✅ VÉRIFICATION FINALE\n`);

  try {
    // Chercher le nœud "Orientation"
    const orientation = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Orientation' } }
    });

    if (orientation) {
      console.log(`📌 Nœud: "${orientation.label}" (${orientation.id})`);
      console.log(`   linkedTableIds: ${JSON.stringify(orientation.linkedTableIds)}`);
      console.log(`   linkedVariableIds: ${JSON.stringify(orientation.linkedVariableIds)}`);
      console.log(`   hasData: ${orientation.hasData}`);
      console.log(`   data_activeId: ${orientation.data_activeId}`);

      // Chercher sa variable
      const vars = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: orientation.id }
      });

      console.log(`\n   Variables associées:`);
      for (const v of vars) {
        console.log(`   - ${v.id}`);
        console.log(`     displayName: ${v.displayName}`);
        console.log(`     sourceRef: ${(v.metadata as any)?.sourceRef}`);
      }
    }

    // Et Inclinaison si elle existe
    const inclinaison = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Inclinaison' } }
    });

    if (inclinaison) {
      console.log(`\n📌 Nœud: "${inclinaison.label}" (${inclinaison.id})`);
      console.log(`   linkedTableIds: ${JSON.stringify(inclinaison.linkedTableIds)}`);
      console.log(`   linkedVariableIds: ${JSON.stringify(inclinaison.linkedVariableIds)}`);
      console.log(`   hasData: ${inclinaison.hasData}`);
      console.log(`   data_activeId: ${inclinaison.data_activeId}`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
