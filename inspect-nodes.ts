import { prisma } from './src/prisma-client.js';

async function main() {
  console.log('🔍 INSPECTION: Orientation-Inclinaison vs Longueur Toiture\n');
  
  // Chercher Orientation-Inclinaison
  const orientationNode = await prisma.treeBranchLeafNode.findFirst({
    where: { label: { contains: 'Orientation' } },
    include: { variables: true }
  });
  
  console.log('📋 ORIENTATION-INCLINAISON NODE:');
  console.log(`  ID: ${orientationNode?.id}`);
  console.log(`  Label: ${orientationNode?.label}`);
  console.log(`  Type: ${orientationNode?.type}`);
  console.log(`  Metadata: ${JSON.stringify(orientationNode?.metadata, null, 2)}`);
  console.log(`  Variables (${orientationNode?.variables?.length}):`);
  orientationNode?.variables?.forEach(v => {
    console.log(`    - ${v.displayName} (${v.id})`);
  });
  
  console.log('\n---\n');
  
  // Chercher Longueur Toiture
  const longueurNode = await prisma.treeBranchLeafNode.findFirst({
    where: { label: { contains: 'Longueur' } },
    include: { variables: true }
  });
  
  console.log('📋 LONGUEUR TOITURE NODE:');
  console.log(`  ID: ${longueurNode?.id}`);
  console.log(`  Label: ${longueurNode?.label}`);
  console.log(`  Type: ${longueurNode?.type}`);
  console.log(`  Metadata: ${JSON.stringify(longueurNode?.metadata, null, 2)}`);
  console.log(`  Variables (${longueurNode?.variables?.length}):`);
  longueurNode?.variables?.forEach(v => {
    console.log(`    - ${v.displayName} (${v.id})`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
