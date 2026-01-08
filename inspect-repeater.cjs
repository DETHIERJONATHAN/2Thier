#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function inspectRepeater() {
  const repeaterId = 'c799facd-8853-4c46-b3af-6358c1d8b837';
  
  console.log(`\n🔍 Inspection du repeater: ${repeaterId}\n`);
  
  const repeater = await prisma.treeBranchLeafNode.findUnique({
    where: { id: repeaterId }
  });
  
  if (!repeater) {
    console.log(`❌ Repeater NOT FOUND`);
    process.exit(1);
  }
  
  console.log(`Label: ${repeater.label}`);
  console.log(`Type: ${repeater.type}`);
  console.log(`ParentId: ${repeater.parentId}`);
  
  // Chercher les children du repeater
  const children = await prisma.treeBranchLeafNode.findMany({
    where: {
      parentId: repeaterId
    },
    select: { id: true, label: true, type: true }
  });
  
  console.log(`\n👶 Children du repeater (${children.length}):`);
  children.forEach(c => {
    console.log(`  - ${c.id}: ${c.label} (${c.type})`);
  });
  
  // Chercher Orientation et Inclinaison
  const orientation = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a' },
    select: { id: true, label: true, parentId: true }
  });
  
  console.log(`\n📍 Orientation:`);
  console.log(`  Parent: ${orientation?.parentId}`);
  console.log(`  Is child of repeater? ${orientation?.parentId === repeaterId}`);
  
  const inclinaison = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '76a40eb1-a3c5-499f-addb-0ce7fdb4b4c9' },
    select: { id: true, label: true, parentId: true }
  });
  
  console.log(`\n📍 Inclinaison:`);
  console.log(`  Parent: ${inclinaison?.parentId}`);
  console.log(`  Is child of repeater? ${inclinaison?.parentId === repeaterId}`);
  
  await prisma.$disconnect();
}

inspectRepeater().catch(console.error);
