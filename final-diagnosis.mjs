#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const STATIC_FIELD_ID = '702d1b09-abc9-4096-9aaa-77155ac5294f'; // Le champ qui contient 0.3
const SUBMISSION_ID = 'tbl-1768919549831-bgjppwmku';

async function checkStaticField() {
  // Le node
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: STATIC_FIELD_ID },
    select: { id: true, label: true, type: true }
  });
  
  console.log('\n📌 Champ qui retourne 0.3:');
  console.log(`   Label: ${node.label}`);
  console.log(`   Type: ${node.type}`);
  
  // Sa valeur
  const data = await prisma.treeBranchLeafSubmissionData.findFirst({
    where: { 
      submissionId: SUBMISSION_ID,
      nodeId: STATIC_FIELD_ID
    }
  });
  
  console.log(`\n📦 Valeur stockée: ${data?.value}`);
  
  console.log('\n💡 CONCLUSION:');
  console.log(`   La condition vérifie: Si "${node.label}" isNotEmpty`);
  console.log(`   Actuellement: "${node.label}" = ${data?.value}`);
  console.log(`   Donc la condition est VRAIE → retourne ${data?.value}`);
  console.log(`   La formule n'est JAMAIS exécutée`);
  
  console.log('\n✅ SOLUTION:');
  console.log(`   1. Vider le champ "${node.label}" (le mettre à null)`);
  console.log(`   2. OU modifier la condition pour utiliser la formule`);
  
  await prisma.$disconnect();
}

checkStaticField().catch(console.error);
