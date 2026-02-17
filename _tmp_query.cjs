const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  try {
    const tvac = await db.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: '8d8729fc-5916-4778-9cc0-95128f536c58' }
    });
    console.log('TVAC_CAPS=' + JSON.stringify(tvac));
    
    const marge = await db.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: '6fea6339-f6b7-41d4-92e0-1b67e0523a52' }
    });
    console.log('MARGE_CAPS=' + JSON.stringify(marge));
    
    const achat = await db.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: '9e14e237-639d-4263-addd-004f5dc21f72' }
    });
    console.log('ACHAT_CAPS=' + JSON.stringify(achat));
    
    // Trouver le treeId
    const tvacNode = await db.treeBranchLeafNode.findUnique({ 
      where: { id: '8d8729fc-5916-4778-9cc0-95128f536c58' }, 
      select: { treeId: true } 
    });
    
    // Trouver la formule de TVAC
    const formulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: '8d8729fc-5916-4778-9cc0-95128f536c58' }
    });
    console.log('TVAC_FORMULAS=' + JSON.stringify(formulas));
    
    // Formule de marge
    const margeFormulas = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: '6fea6339-f6b7-41d4-92e0-1b67e0523a52' }
    });
    console.log('MARGE_FORMULAS=' + JSON.stringify(margeFormulas));
    
    // Tous les champs avec TVA dans le label du même tree  
    const tvaNodes = await db.treeBranchLeafNode.findMany({
      where: { label: { contains: 'TVA', mode: 'insensitive' }, treeId: tvacNode.treeId },
      select: { id: true, label: true, fieldType: true, hasFormula: true }
    });
    console.log('TVA_NODES=' + JSON.stringify(tvaNodes));
    
  } catch(e) { console.error('ERR:', e.message, e.stack); }
  await db.$disconnect();
})();
