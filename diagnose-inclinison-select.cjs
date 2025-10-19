// Diagnostic: Pourquoi le Select "Inclinison" est vide ?

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inclinaisonNodeId = '4aad6a8f-6bba-42aa-bd3a-4de1f182075a';
  const orientationNodeId = '131a7b51-97d5-4f40-8a5a-9359f38939e8';
  
  console.log(`\n🔍 DIAGNOSTIC: Pourquoi "Inclinison" n'a pas d'options de Select ?\n`);
  
  // 1. Vérifier la configuration SELECT
  console.log(`━━━ 1. Configuration SELECT ━━━`);
  const inclinaisonSelect = await prisma.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId: inclinaisonNodeId }
  });
  
  const orientationSelect = await prisma.treeBranchLeafSelectConfig.findFirst({
    where: { nodeId: orientationNodeId }
  });
  
  console.log(`\n📋 Inclinison SELECT Config:`, inclinaisonSelect ? 'EXISTE' : '❌ INEXISTANT');
  if (inclinaisonSelect) {
    console.log(JSON.stringify(inclinaisonSelect, null, 2));
  }
  
  console.log(`\n📋 Orientation SELECT Config:`, orientationSelect ? 'EXISTE' : '❌ INEXISTANT');
  if (orientationSelect) {
    console.log(JSON.stringify(orientationSelect, null, 2));
  }
  
  // 2. Vérifier les capacités table
  console.log(`\n━━━ 2. Capacités TABLE ━━━`);
  const inclinaisonNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: inclinaisonNodeId },
    select: {
      id: true,
      label: true,
      capabilities: true
    }
  });
  
  const orientationNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: orientationNodeId },
    select: {
      id: true,
      label: true,
      capabilities: true
    }
  });
  
  console.log(`\n🔧 Inclinison Node:`, inclinaisonNode?.label);
  console.log(`Capabilities:`, inclinaisonNode?.capabilities);
  
  console.log(`\n🔧 Orientation Node:`, orientationNode?.label);
  console.log(`Capabilities:`, orientationNode?.capabilities);
  
  // 3. Vérifier la table référencée
  const tableId = 'ace9ddf9-4819-4f7c-b62e-46b719e66c79';
  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: {
      id: true,
      nodeId: true,
      name: true,
      type: true,
      meta: true
    }
  });
  
  console.log(`\n━━━ 3. Table référencée ━━━`);
  console.log(`📊 Table:`, table?.name);
  console.log(`Type:`, table?.type);
  console.log(`Meta:`, table?.meta);
  
  // 4. Vérifier si lookup config existe dans meta
  console.log(`\n━━━ 4. Configuration LOOKUP dans meta.lookup ━━━`);
  if (table && table.meta && typeof table.meta === 'object') {
    const meta = table.meta;
    console.log(`\n🔍 meta.lookup:`, meta.lookup || '❌ INEXISTANT');
  }
  
  // 5. RECOMMANDATIONS
  console.log(`\n━━━ 5. DIAGNOSTIC & SOLUTION ━━━\n`);
  
  if (!inclinaisonSelect && !inclinaisonNode?.capabilities?.table?.enabled) {
    console.log(`❌ PROBLÈME IDENTIFIÉ:`);
    console.log(`   Le champ "Inclinison" n'a PAS de TreeBranchLeafSelectConfig`);
    console.log(`   ET la capacité "table" n'est pas activée dans ses capabilities.`);
    console.log(``);
    console.log(`💡 SOLUTION:`);
    console.log(`   1. Activer la capacité "table" pour ce champ via TablePanel`);
    console.log(`   2. Configurer le lookup (keyRow ou keyColumn) dans TablePanel`);
    console.log(`   3. Cela créera automatiquement le TreeBranchLeafSelectConfig`);
  } else if (!inclinaisonSelect && inclinaisonNode?.capabilities?.table?.enabled) {
    console.log(`⚠️ PROBLÈME IDENTIFIÉ:`);
    console.log(`   La capacité "table" est ACTIVÉE mais TreeBranchLeafSelectConfig manque.`);
    console.log(``);
    console.log(`💡 SOLUTION:`);
    console.log(`   Créer manuellement le TreeBranchLeafSelectConfig via migration.`);
  } else if (inclinaisonSelect && inclinaisonSelect.options.length === 0) {
    console.log(`⚠️ PROBLÈME IDENTIFIÉ:`);
    console.log(`   TreeBranchLeafSelectConfig existe mais options = Array(0).`);
    console.log(``);
    console.log(`💡 SOLUTION:`);
    console.log(`   Les options sont générées DYNAMIQUEMENT depuis la table.`);
    console.log(`   Vérifier que tableReference pointe vers la bonne table.`);
    console.log(`   tableReference actuel: ${inclinaisonSelect.tableReference || 'NULL'}`);
  } else {
    console.log(`✅ Configuration semble correcte.`);
    console.log(`   Le problème est ailleurs (frontend ou API endpoint).`);
  }
}

main()
  .catch((e) => {
    console.error('💥 Erreur:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
