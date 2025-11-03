/**
 * Debug endpoint pour vérifier ÉTAPE 10
 * GET /api/treebranchleaf/debug/test-step10
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Endpoint de debug: Teste ÉTAPE 10 manuellement
 * GET /api/treebranchleaf/debug/test-step10?copiedTableId=xxx&suffix=1
 */
router.get('/debug/test-step10', async (req, res) => {
  try {
    const { copiedTableId, suffix } = req.query;
    
    if (!copiedTableId || !suffix) {
      return res.status(400).json({ error: 'Missing copiedTableId or suffix' });
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`🧪 DEBUG ENDPOINT: Test ÉTAPE 10 manuellement`);
    console.log(`   copiedTableId: ${copiedTableId}`);
    console.log(`   suffix: ${suffix}`);
    console.log(`${'═'.repeat(80)}`);

    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: copiedTableId as string },
      select: { id: true, name: true, meta: true }
    });

    if (!copiedTable) {
      return res.status(404).json({ error: `Table ${copiedTableId} not found` });
    }

    const lookupConfig = (copiedTable.meta as any)?.lookup;
    
    console.log(`\n📋 Table trouvée: ${copiedTable.id}`);
    console.log(`   Name: ${copiedTable.name}`);
    console.log(`   Has lookup? ${!!lookupConfig}`);
    console.log(`   Has selectors? ${!!lookupConfig?.selectors}`);

    if (!lookupConfig?.selectors) {
      return res.status(200).json({
        status: 'no-selectors',
        message: 'Table has no lookup/selectors',
        table: { id: copiedTable.id, name: copiedTable.name }
      });
    }

    const rowId = lookupConfig.selectors.rowFieldId;
    const colId = lookupConfig.selectors.columnFieldId;

    console.log(`\n🎯 Selectors trouvés:`);
    console.log(`   Row: ${rowId}`);
    console.log(`   Col: ${colId}`);

    // Chercher l'état actuel des selectors
    const selectors = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: [rowId, colId] } },
      select: {
        id: true,
        label: true,
        table_activeId: true,
        table_instances: true,
        hasTable: true
      }
    });

    console.log(`\n📊 État AVANT mise à jour:`);
    for (const sel of selectors) {
      console.log(`   ${sel.label}:`);
      console.log(`      - table_activeId: ${sel.table_activeId || 'NULL'}`);
      console.log(`      - table_instances: ${sel.table_instances ? 'SET' : 'NULL'}`);
      console.log(`      - hasTable: ${sel.hasTable}`);
    }

    // Simuler ÉTAPE 10: mettre à jour les selectors
    console.log(`\n🔧 Exécution de ÉTAPE 10 (mise à jour)...`);
    
    for (const selectorId of [rowId, colId]) {
      const selectorTableInstances = {};
      selectorTableInstances[copiedTableId as string] = {};

      console.log(`   UPDATE ${selectorId}`);
      console.log(`      SET table_activeId = ${copiedTableId}`);
      console.log(`      SET table_instances = {${copiedTableId as string}: {}}`);

      await prisma.treeBranchLeafNode.update({
        where: { id: selectorId },
        data: {
          table_activeId: copiedTableId as string,
          table_instances: selectorTableInstances as any,
          hasTable: true
        }
      });

      console.log(`   ✅ Mis à jour`);
    }

    // Vérifier APRÈS
    console.log(`\n📊 État APRÈS mise à jour:`);
    const selectorsAfter = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: [rowId, colId] } },
      select: {
        id: true,
        label: true,
        table_activeId: true,
        table_instances: true,
        hasTable: true
      }
    });

    for (const sel of selectorsAfter) {
      console.log(`   ${sel.label}:`);
      console.log(`      - table_activeId: ${sel.table_activeId || 'NULL'}`);
      console.log(`      - table_instances: ${sel.table_instances ? 'SET' : 'NULL'}`);
      console.log(`      - hasTable: ${sel.hasTable}`);
    }

    console.log(`\n✅ Test terminé\n${'═'.repeat(80)}\n`);

    return res.status(200).json({
      status: 'success',
      before: selectors,
      after: selectorsAfter,
      action: 'STEP10_SIMULATED'
    });
  } catch (e) {
    console.error('❌ Error:', (e as Error).message);
    return res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
