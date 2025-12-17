const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Effacer le cache pour forcer le recalcul
  await p.treeBranchLeafNode.update({
    where: { id: 'b8f8e0f5-8572-4c47-8fd9-e1932bca6f99-sum-total' },
    data: { calculatedValue: null }
  });
  console.log('✅ Cache calculatedValue effacé pour Puissance WC - Total');
  
  // Vérifier aussi formula_instances
  const node = await p.treeBranchLeafNode.findUnique({
    where: { id: 'b8f8e0f5-8572-4c47-8fd9-e1932bca6f99-sum-total' },
    select: { formula_tokens: true, formula_instances: true, formula_activeId: true }
  });
  
  console.log('formula_tokens:', JSON.stringify(node.formula_tokens));
  console.log('formula_activeId:', node.formula_activeId);
  console.log('formula_instances:', JSON.stringify(node.formula_instances));
  
  await p.$disconnect();
})();
