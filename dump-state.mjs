import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dumpState(label: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 STATE DUMP: ${label}`);
  console.log(`${'='.repeat(80)}`);

  // Récupérer le repeater
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: { name: 'Toit' }
  });

  if (!repeater) {
    console.log('❌ Repeater not found');
    return;
  }

  // Templates
  if (repeater.repeater_templateNodeIds && repeater.repeater_templateNodeIds.length > 0) {
    console.log(`\n🎯 TEMPLATES (${repeater.repeater_templateNodeIds.length}):`);
    
    const templates = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: repeater.repeater_templateNodeIds } },
      select: { 
        id: true, 
        name: true, 
        linkedVariableIds: true 
      }
    });

    for (const template of templates) {
      console.log(`   Template: ${template.name} (${template.id})`);
      console.log(`   └─ linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);

      // Vérifier que les variables existent
      if (template.linkedVariableIds && template.linkedVariableIds.length > 0) {
        for (const varId of template.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { id: true, name: true, nodeId: true }
          });
          if (variable) {
            console.log(`      ✅ Variable exists: ${variable.name}`);
          } else {
            console.log(`      ❌ MISSING variable: ${varId}`);
          }
        }
      }
    }
  }

  // Copies (instances du repeater)
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      parentId: repeater.id,
      NOT: {
        id: { in: repeater.repeater_templateNodeIds || [] }
      }
    },
    select: {
      id: true,
      name: true,
      children: {
        select: { id: true, name: true, linkedVariableIds: true }
      }
    }
  });

  console.log(`\n📦 COPIES (${copies.length}):`);
  for (const copy of copies) {
    console.log(`   Copy: ${copy.name}`);
    console.log(`   └─ Children: ${copy.children.length}`);
    for (const child of copy.children) {
      console.log(`      Child: ${child.name}`);
      console.log(`      └─ linkedVariableIds: ${JSON.stringify(child.linkedVariableIds)}`);

      // Vérifier les display nodes (ceux avec linkedVariableIds)
      if (child.linkedVariableIds && child.linkedVariableIds.length > 0) {
        console.log(`      └─ 🔗 Display node! (${child.linkedVariableIds.length} variables)`);
      }
    }
  }

  // Toutes les variables du repeater et ses enfants
  console.log(`\n🔍 ALL VARIABLES:`);
  const allNodeIds = [repeater.id, ...repeater.repeater_templateNodeIds || [], ...copies.map(c => c.id), ...copies.flatMap(c => c.children.map(ch => ch.id))];
  
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { nodeId: { in: allNodeIds } },
        { sourceNodeId: { in: allNodeIds } }
      ]
    },
    select: { id: true, name: true, nodeId: true }
  });

  const originalVars = variables.filter(v => !/-\d+$/.test(v.id));
  const suffixedVars = variables.filter(v => /-\d+$/.test(v.id));

  console.log(`   Originals (no suffix): ${originalVars.length}`);
  for (const v of originalVars) {
    console.log(`      ✅ ${v.name} (${v.id})`);
  }

  console.log(`   Suffixed (copies): ${suffixedVars.length}`);
  for (const v of suffixedVars) {
    console.log(`      🔄 ${v.name} (${v.id})`);
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

async function main() {
  try {
    await dumpState('INITIAL STATE');
    
    // Attendre que l'utilisateur fasse ses opérations
    console.log('\n⏳ Dump initial terminé. Allez créer/supprimer des repeaters.');
    console.log('    Puis relancez ce script avec: node dump-state.mjs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
