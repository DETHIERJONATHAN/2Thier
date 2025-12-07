import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareOriginalVsCopied() {
  console.log('=== COMPARAISON ORIGINAL VS COPIÉ ===');
  
  try {
    const originalNodeId = '1203df47-e87e-42fd-b178-31afd89b9c83';
    const copiedNodeId = originalNodeId + '-1';
    
    // Original
    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: originalNodeId } });
    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: originalNodeId } });
    const originalTables = await prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId: originalNodeId } });
    const originalSelects = await prisma.treeBranchLeafSelectConfig.findMany({ where: { nodeId: originalNodeId } });
    
    // Copié
    const copiedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({ where: { nodeId: copiedNodeId } });
    const copiedConditions = await prisma.treeBranchLeafNodeCondition.findMany({ where: { nodeId: copiedNodeId } });
    const copiedTables = await prisma.treeBranchLeafNodeTable.findMany({ where: { nodeId: copiedNodeId } });
    const copiedSelects = await prisma.treeBranchLeafSelectConfig.findMany({ where: { nodeId: copiedNodeId } });
    
    console.log('📊 RÉSUMÉ:');
    console.log('ORIGINAL:', { formulas: originalFormulas.length, conditions: originalConditions.length, tables: originalTables.length, selects: originalSelects.length });
    console.log('COPIÉ:   ', { formulas: copiedFormulas.length, conditions: copiedConditions.length, tables: copiedTables.length, selects: copiedSelects.length });
    
    console.log('\n🗂️ TABLES:');
    console.log('ORIGINAL TABLES:', originalTables.map(t => ({ ref: t.tableReference, key: t.keyColumn, value: t.valueColumn })));
    console.log('COPIÉ TABLES:   ', copiedTables.map(t => ({ ref: t.tableReference, key: t.keyColumn, value: t.valueColumn })));
    
    console.log('\n🔗 SELECTS:');
    console.log('ORIGINAL SELECTS:', originalSelects.map(s => ({ ref: s.tableReference, key: s.keyColumn })));
    console.log('COPIÉ SELECTS:   ', copiedSelects.map(s => ({ ref: s.tableReference, key: s.keyColumn })));
    
    if (originalTables.length > 0) {
      console.log('\n📋 DÉTAIL TABLE ORIGINALE:');
      console.log('  ID table:', originalTables[0].tableReference);
      console.log('  Clé:', originalTables[0].keyColumn);
      console.log('  Valeur:', originalTables[0].valueColumn);
      console.log('  Display:', originalTables[0].displayColumn);
    }
    
    if (copiedTables.length > 0) {
      console.log('\n📋 DÉTAIL TABLE COPIÉE:');
      console.log('  ID table:', copiedTables[0].tableReference);
      console.log('  Clé:', copiedTables[0].keyColumn);
      console.log('  Valeur:', copiedTables[0].valueColumn);
      console.log('  Display:', copiedTables[0].displayColumn);
    }
    
    console.log('\n🎯 DIAGNOSTIC:');
    if (originalTables.length > 0 && copiedTables.length === 0) {
      console.log('❌ TABLE COPIÉE MANQUANTE - Les capacités de table n\'ont pas été copiées');
    } else if (copiedTables.length > 0 && !copiedTables[0].tableReference) {
      console.log('❌ TABLE COPIÉE INVALIDE - Configuration incomplète (tableReference undefined)');
    } else if (originalTables.length > 0 && copiedTables.length > 0) {
      console.log('✅ Table copiée existe mais il faut vérifier les données');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareOriginalVsCopied().catch(console.error);