const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('=== Nettoyage des copies de test ===\n');
  
  // Supprimer les champs avec suffixe -1 dans le treeId concerné
  const deleted = await p.treeBranchLeafNode.deleteMany({
    where: {
      treeId: 'cmf1mwoz10005gooked1j6orn',
      id: { endsWith: '-1' }
    }
  });
  
  console.log(`✅ ${deleted.count} nœuds supprimés (suffixe -1)`);

  // Supprimer les variables avec suffixe -1
  const deletedVars = await p.treeBranchLeafNodeVariable.deleteMany({
    where: {
      id: { endsWith: '-1' }
    }
  });
  
  console.log(`✅ ${deletedVars.count} variables supprimées (suffixe -1)`);

  // Supprimer les formules avec suffixe -1
  const deletedFormulas = await p.treeBranchLeafNodeFormula.deleteMany({
    where: {
      id: { endsWith: '-1' }
    }
  });
  
  console.log(`✅ ${deletedFormulas.count} formules supprimées (suffixe -1)`);

  // Supprimer les conditions avec suffixe -1
  const deletedConditions = await p.treeBranchLeafNodeCondition.deleteMany({
    where: {
      id: { endsWith: '-1' }
    }
  });
  
  console.log(`✅ ${deletedConditions.count} conditions supprimées (suffixe -1)`);

  console.log('\n✅ Nettoyage terminé ! Redémarrez le serveur API et testez.');
  
  await p.$disconnect();
})();
