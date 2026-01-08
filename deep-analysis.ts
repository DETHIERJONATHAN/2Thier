import { db } from './src/lib/database';

async function deepAnalysis() {
  try {
    const repeaterNodeId = 'c799facd-8853-4c46-b3af-6358c1d8b837';
    const orientationNodeId = 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a';
    const orientationCopiedNodeId = orientationNodeId + '-1';
    
    console.log(`\n📊 ANALYSE PROFONDE DE LA COPIE\n`);
    console.log(`Repeater: ${repeaterNodeId}`);
    console.log(`Orientation Original: ${orientationNodeId}`);
    console.log(`Orientation Copié: ${orientationCopiedNodeId}\n`);
    
    // 1. Vérifier les SelectConfigs
    console.log(`\n1️⃣ SELECTCONFIGS\n`);
    
    const originalSC = await db.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: orientationNodeId }
    });
    
    const copiedSC = await db.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: orientationCopiedNodeId }
    });
    
    console.log(`Original SelectConfig:`);
    console.log(`  - Trouvé: ${originalSC ? '✅' : '❌'}`);
    if (originalSC) {
      console.log(`  - keyColumn: "${originalSC.keyColumn}"`);
      console.log(`  - tableReference: ${originalSC.tableReference}`);
      console.log(`  - displayColumn: "${originalSC.displayColumn}"`);
    }
    
    console.log(`\nCopié SelectConfig:`);
    console.log(`  - Trouvé: ${copiedSC ? '✅' : '❌'}`);
    if (copiedSC) {
      console.log(`  - keyColumn: "${copiedSC.keyColumn}"`);
      console.log(`  - tableReference: ${copiedSC.tableReference}`);
      console.log(`  - displayColumn: "${copiedSC.displayColumn}"`);
    }
    
    if (originalSC && copiedSC) {
      console.log(`\n✅ COMPARAISON:`);
      console.log(`  keyColumn: "${originalSC.keyColumn}" vs "${copiedSC.keyColumn}" ${originalSC.keyColumn === copiedSC.keyColumn ? '❌ IDENTIQUE' : '✓ DIFFÉRENT'}`);
      console.log(`  tableRef: ${originalSC.tableReference} vs ${copiedSC.tableReference} ${originalSC.tableReference === copiedSC.tableReference ? '❌ IDENTIQUE' : '✓ DIFFÉRENT'}`);
    }
    
    // 2. Vérifier les tables
    console.log(`\n\n2️⃣ TABLES RÉFÉRENCÉES\n`);
    
    if (originalSC?.tableReference) {
      const origTable = await db.treeBranchLeafNodeTable.findUnique({
        where: { id: originalSC.tableReference }
      });
      if (origTable) {
        console.log(`Original table: ${origTable.name}`);
        console.log(`  - ID: ${origTable.id}`);
        console.log(`  - nodeId: ${origTable.nodeId}`);
      }
    }
    
    if (copiedSC?.tableReference) {
      const copiedTable = await db.treeBranchLeafNodeTable.findUnique({
        where: { id: copiedSC.tableReference }
      });
      if (copiedTable) {
        console.log(`\nCopied table: ${copiedTable.name}`);
        console.log(`  - ID: ${copiedTable.id}`);
        console.log(`  - nodeId: ${copiedTable.nodeId}`);
      }
    }
    
    // 3. Vérifier les formules de chaque nœud
    console.log(`\n\n3️⃣ FORMULES DU NŒUD\n`);
    
    const origFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: orientationNodeId }
    });
    
    const copiedFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: orientationCopiedNodeId }
    });
    
    console.log(`Original: ${origFormulas.length} formules`);
    origFormulas.forEach(f => {
      console.log(`  - ${f.id}`);
    });
    
    console.log(`\nCopié: ${copiedFormulas.length} formules`);
    copiedFormulas.forEach(f => {
      console.log(`  - ${f.id}`);
    });
    
    // 4. Chercher les autres formules dans le repeater qui pourraient référencer Orientation
    console.log(`\n\n4️⃣ RECHERCHE DE DÉPENDANCES\n`);
    
    // Chercher les autres nœuds enfants du repeater qui pourraient avoir des formules
    const repeaterChildren = await db.treeBranchLeafNode.findMany({
      where: {
        parentId: repeaterNodeId
      },
      select: { id: true, label: true }
    });
    
    console.log(`Enfants du repeater: ${repeaterChildren.length}`);
    repeaterChildren.forEach(n => {
      console.log(`  - ${n.label} (${n.id})`);
    });
    
    // 5. Vérifier les données dans les tables
    console.log(`\n\n5️⃣ DONNÉES DANS LES TABLES\n`);
    
    if (originalSC?.tableReference) {
      const cells = await db.treeBranchLeafTableCell.findMany({
        where: { tableId: originalSC.tableReference },
        take: 20
      });
      
      console.log(`Original table (${originalSC.tableReference}) - ${cells.length} cellules:`);
      const columnSet = new Set(cells.map(c => c.columnName));
      console.log(`  Colonnes: ${Array.from(columnSet).join(', ')}`);
      
      const northCells = cells.filter(c => c.value === 'Nord' || c.value === 'North');
      console.log(`  Cellules "Nord": ${northCells.length}`);
    }
    
    if (copiedSC?.tableReference) {
      const cells = await db.treeBranchLeafTableCell.findMany({
        where: { tableId: copiedSC.tableReference },
        take: 20
      });
      
      console.log(`\nCopied table (${copiedSC.tableReference}) - ${cells.length} cellules:`);
      const columnSet = new Set(cells.map(c => c.columnName));
      console.log(`  Colonnes: ${Array.from(columnSet).join(', ')}`);
      
      const northCells = cells.filter(c => c.value === 'Nord' || c.value === 'North');
      console.log(`  Cellules "Nord": ${northCells.length}`);
    }
    
    // 6. Vérifier les nœuds eux-mêmes
    console.log(`\n\n6️⃣ DONNÉES DES NŒUDS\n`);
    
    const origNode = await db.treeBranchLeafNode.findUnique({
      where: { id: orientationNodeId }
    });
    
    const copiedNode = await db.treeBranchLeafNode.findUnique({
      where: { id: orientationCopiedNodeId }
    });
    
    console.log(`Original node:`);
    console.log(`  - hasTable: ${origNode?.hasTable}`);
    console.log(`  - linkedTableIds: ${JSON.stringify(origNode?.linkedTableIds)}`);
    
    console.log(`\nCopied node:`);
    console.log(`  - hasTable: ${copiedNode?.hasTable}`);
    console.log(`  - linkedTableIds: ${JSON.stringify(copiedNode?.linkedTableIds)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

deepAnalysis();
