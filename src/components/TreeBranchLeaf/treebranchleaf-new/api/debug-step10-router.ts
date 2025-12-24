/**
 * Debug endpoint pour vÃƒÂ©rifier Ãƒâ€°TAPE 10
 * GET /api/treebranchleaf/debug/test-step10
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Endpoint de debug: Teste Ãƒâ€°TAPE 10 manuellement
 * GET /api/treebranchleaf/debug/test-step10?copiedTableId=xxx&suffix=1
 */
router.get('/debug/test-step10', async (req, res) => {
  try {
    const { copiedTableId, suffix } = req.query;
    
    if (!copiedTableId || !suffix) {
      return res.status(400).json({ error: 'Missing copiedTableId or suffix' });
    }


    const copiedTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: copiedTableId as string },
      select: { id: true, name: true, meta: true }
    });

    if (!copiedTable) {
      return res.status(404).json({ error: `Table ${copiedTableId} not found` });
    }

    const lookupConfig = (copiedTable.meta as any)?.lookup;
    

    if (!lookupConfig?.selectors) {
      return res.status(200).json({
        status: 'no-selectors',
        message: 'Table has no lookup/selectors',
        table: { id: copiedTable.id, name: copiedTable.name }
      });
    }

    const rowId = lookupConfig.selectors.rowFieldId;
    const colId = lookupConfig.selectors.columnFieldId;


    // Chercher l'ÃƒÂ©tat actuel des selectors
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

    for (const sel of selectors) {
    }

    // Simuler Ãƒâ€°TAPE 10: mettre ÃƒÂ  jour les selectors
    
    for (const selectorId of [rowId, colId]) {
      const selectorTableInstances = {};
      selectorTableInstances[copiedTableId as string] = {};


      await prisma.treeBranchLeafNode.update({
        where: { id: selectorId },
        data: {
          table_activeId: copiedTableId as string,
          table_instances: selectorTableInstances as any,
          hasTable: true
        }
      });

    }

    // VÃƒÂ©rifier APRÃƒË†S
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
    }


    return res.status(200).json({
      status: 'success',
      before: selectors,
      after: selectorsAfter,
      action: 'STEP10_SIMULATED'
    });
  } catch (e) {
    console.error('Ã¢ÂÅ’ Error:', (e as Error).message);
    return res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
