#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function findCalculNodes() {
  console.log('🔍 RECHERCHE NODES CALCUL');
  
  const prisma = new PrismaClient();
  
  try {
    // Chercher dans SubmissionData avec le label exact
    const calculNodes = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        fieldLabel: { contains: 'Calcul', mode: 'insensitive' }
      }
    });
    
    console.log('📊 Nodes avec Calcul:', calculNodes.length);
    calculNodes.forEach(node => {
      console.log(`💰 ${node.fieldLabel}: ${node.value} (nodeId: ${node.nodeId})`);
    });
    
    // Chercher aussi dans Node avec label
    const tblNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { contains: 'Calcul', mode: 'insensitive' }
      }
    });
    
    console.log('📊 TBL Nodes avec Calcul:', tblNodes.length);
    tblNodes.forEach(node => {
      console.log(`🔧 ${node.label}: ${node.id}`);
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

findCalculNodes();