import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ANALYSE: Variable "Longueur Toiture" vs "Orientation"\n');
  
  // Chercher la variable Longueur Toiture
  const longueurVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { displayName: { contains: 'Longueur' } }
  });
  
  console.log('📊 VARIABLE "LONGUEUR TOITURE":');
  console.log(`  ID: ${longueurVar?.id}`);
  console.log(`  DisplayName: ${longueurVar?.displayName}`);
  console.log(`  NodeId (où elle est stockée): ${longueurVar?.nodeId}`);
  console.log(`  ParentNodeId: ${longueurVar?.parentNodeId}`);
  console.log(`  FieldType: ${longueurVar?.fieldType}`);
  console.log(`  SourceType: ${longueurVar?.sourceType}`);
  console.log(`  LinkedVariableIds: ${JSON.stringify(longueurVar?.linkedVariableIds)}`);
  console.log(`  LinkedTableIds: ${JSON.stringify(longueurVar?.linkedTableIds)}`);
  console.log(`  Metadata: ${JSON.stringify(longueurVar?.metadata, null, 2)}`);
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Chercher la variable Orientation
  const orientationVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { displayName: { contains: 'Orientation' }, displayName: { not: { contains: 'Lookup' } } }
  });
  
  console.log('📊 VARIABLE "ORIENTATION":');
  console.log(`  ID: ${orientationVar?.id}`);
  console.log(`  DisplayName: ${orientationVar?.displayName}`);
  console.log(`  NodeId (où elle est stockée): ${orientationVar?.nodeId}`);
  console.log(`  ParentNodeId: ${orientationVar?.parentNodeId}`);
  console.log(`  FieldType: ${orientationVar?.fieldType}`);
  console.log(`  SourceType: ${orientationVar?.sourceType}`);
  console.log(`  LinkedVariableIds: ${JSON.stringify(orientationVar?.linkedVariableIds)}`);
  console.log(`  LinkedTableIds: ${JSON.stringify(orientationVar?.linkedTableIds)}`);
  console.log(`  Metadata: ${JSON.stringify(orientationVar?.metadata, null, 2)}`);
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Chercher la variable Inclinaison
  const inclinaisonVar = await prisma.treeBranchLeafNodeVariable.findFirst({
    where: { displayName: { contains: 'Inclinaison' }, displayName: { not: { contains: 'Lookup' } } }
  });
  
  console.log('📊 VARIABLE "INCLINAISON":');
  console.log(`  ID: ${inclinaisonVar?.id}`);
  console.log(`  DisplayName: ${inclinaisonVar?.displayName}`);
  console.log(`  NodeId (où elle est stockée): ${inclinaisonVar?.nodeId}`);
  console.log(`  ParentNodeId: ${inclinaisonVar?.parentNodeId}`);
  console.log(`  FieldType: ${inclinaisonVar?.fieldType}`);
  console.log(`  SourceType: ${inclinaisonVar?.sourceType}`);
  console.log(`  LinkedVariableIds: ${JSON.stringify(inclinaisonVar?.linkedVariableIds)}`);
  console.log(`  LinkedTableIds: ${JSON.stringify(inclinaisonVar?.linkedTableIds)}`);
  console.log(`  Metadata: ${JSON.stringify(inclinaisonVar?.metadata, null, 2)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
