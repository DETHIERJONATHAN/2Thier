const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  try {
    // Formule TVA référencée par TVAC
    const tvaFormula = await db.treeBranchLeafNodeFormula.findUnique({
      where: { id: '83d7d601-e477-45d9-ba7b-d93c9d33a2b4' }
    });
    console.log('TVA_FORMULA=' + JSON.stringify(tvaFormula));
    
    // Formule marge diviseur
    const margeDiv = await db.treeBranchLeafNodeFormula.findUnique({
      where: { id: 'cb411ff4-c6c9-41d2-800a-628cad88e742' }
    });
    console.log('MARGE_DIVISOR_FORMULA=' + JSON.stringify(margeDiv));
    
    // Formule achat
    const achatFormula = await db.treeBranchLeafNodeFormula.findUnique({
      where: { id: 'd419dfc5-484f-4e4e-a820-664220c7ee87' }
    });
    console.log('ACHAT_FORMULA=' + JSON.stringify(achatFormula));
    
    // Vérifier aussi le trigger index pour Main d'oeuvre marge et TVAC
    // Regarder les données de soumission les plus récentes pour ces champs
    const latest = await db.treeBranchLeafSubmissionData.findMany({
      where: { nodeId: { in: [
        '8d8729fc-5916-4778-9cc0-95128f536c58',  // TVAC
        '6fea6339-f6b7-41d4-92e0-1b67e0523a52',  // marge
        '9e14e237-639d-4263-addd-004f5dc21f72',   // achat
        '891334fe-8dd9-4e7e-88d6-746474bbfd26',   // Prix main d'oeuvre
        '5e258abf-bd65-4143-979a-27ce5ebf7ad0',   // TVA
      ]}},
      orderBy: { updatedAt: 'desc' },
      take: 20
    });
    console.log('LATEST_DATA=' + JSON.stringify(latest));
    
    // Le node TVA (5e258abf) - ses capacités
    const tvaCaps = await db.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: '5e258abf-bd65-4143-979a-27ce5ebf7ad0' }
    });
    console.log('TVA_NODE_CAPS=' + JSON.stringify(tvaCaps));
    
    const tvaFormulas2 = await db.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: '5e258abf-bd65-4143-979a-27ce5ebf7ad0' }
    });
    console.log('TVA_NODE_FORMULAS=' + JSON.stringify(tvaFormulas2));
    
  } catch(e) { console.error('ERR:', e.message); }
  await db.$disconnect();
})();
