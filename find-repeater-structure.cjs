const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeRepeater() {
  try {
    console.log('\n=== ANALYZING REPEATER STRUCTURE ===\n');
    
    const repeaterId = 'c799facd-8853-4c46-b3af-6358c1d8b837';
    
    // Charger le repeater avec TOUS les enfants
    const repeater = await prisma.treeBranchLeafNode.findUnique({
      where: { id: repeaterId }
    });
    
    if (!repeater) {
      console.error('❌ Repeater not found');
      return;
    }
    
    console.log(`📍 REPEATER: ${repeater.label} (${repeaterId})`);
    console.log(`   Type: ${repeater.type}`);
    console.log(`   Parent ID: ${repeater.parentId}\n`);
    
    // Chercher TOUS les enfants du repeater
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeaterId },
      orderBy: { order: 'asc' }
    });
    
    console.log(`👶 ENFANTS DIRECTS DU REPEATER: ${children.length}`);
    children.forEach(child => {
      console.log(`   - ${child.label} (${child.id}) [${child.type}]`);
    });
    
    // Chercher les nodes Orientation et Inclinaison
    console.log(`\n\n=== LOOKING FOR ORIENTATION & INCLINAISON ===\n`);
    
    const orientation = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a' }
    });
    
    const inclinaison = await prisma.treeBranchLeafNode.findUnique({
      where: { id: '76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9' }
    });
    
    console.log(`📍 Orientation (c071a466-5a0f-4b4e-afb0-fd69ac79d51a)`);
    console.log(`   Label: ${orientation?.label}`);
    console.log(`   Type: ${orientation?.type}`);
    console.log(`   Parent ID: ${orientation?.parentId}`);
    console.log(`   Is child of repeater? ${orientation?.parentId === repeaterId ? '✅ YES' : '❌ NO'}`);
    
    console.log(`\n📍 Inclinaison (76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9)`);
    console.log(`   Label: ${inclinaison?.label}`);
    console.log(`   Type: ${inclinaison?.type}`);
    console.log(`   Parent ID: ${inclinaison?.parentId}`);
    console.log(`   Is child of repeater? ${inclinaison?.parentId === repeaterId ? '✅ YES' : '❌ NO'}`);
    
    // Find the parent of these fields
    if (orientation?.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: orientation.parentId }
      });
      console.log(`\n   Common Parent: ${parent?.label} (${parent?.id}) [${parent?.type}]`);
    }
    
    console.log(`\n\n=== SOLUTION ===`);
    if (children.length === 0) {
      console.log(`❌ Repeater HAS NO CHILDREN!`);
      console.log(`\n✅ TO FIX: Update Orientation & Inclinaison parentId to repeater ID:`);
      console.log(`   - Orientation.parentId = ${repeaterId}`);
      console.log(`   - Inclinaison.parentId = ${repeaterId}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeRepeater();
