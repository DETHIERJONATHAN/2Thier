const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateRepeatButton() {
  console.log('🔍 SIMULATION DU BOUTON REPEAT');
  console.log('='.repeat(60));
  
  const repeaterId = 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b';
  
  // 1. État initial
  console.log('\n1️⃣ ÉTAT INITIAL:');
  const initialChildren = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: repeaterId },
    select: { id: true, label: true, type: true, metadata: true }
  });
  
  console.log(`   Enfants directs du repeater: ${initialChildren.length}`);
  initialChildren.forEach(child => {
    console.log(`     ${child.id} → ${child.label} (${child.type})`);
  });
  
  // 2. Identifier les templates (comme le fait l'API)
  const templateNodes = initialChildren.filter(child => child.type !== 'section');
  console.log(`\n   Templates identifiés: ${templateNodes.length}`);
  
  // 3. Pour chaque template, simuler la logique exacte de duplicate-templates
  console.log('\n2️⃣ SIMULATION DE LA LOGIQUE API:');
  
  for (const template of templateNodes) {
    console.log(`\n   📋 Template: ${template.label} (${template.id})`);
    
    // Récupérer tous les enfants existants (comme fait l'API)
    const existingChildren = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: repeaterId },
      select: { id: true, label: true, type: true, metadata: true }
    });
    
    // Compter les copies existantes avec sourceTemplateId
    const existingCopiesCount = existingChildren.filter(child => {
      const meta = child.metadata || {};
      return meta.sourceTemplateId === template.id;
    }).length;
    
    console.log(`     Copies existantes trouvées: ${existingCopiesCount}`);
    
    // Calculer copyNumber (logique actuelle dans le code)
    const copyNumber = existingCopiesCount + 1; // + 0 (createdSoFar) + 1
    console.log(`     copyNumber calculé: ${copyNumber}`);
    
    // Vérifier si une copie avec ce suffixe existe déjà
    const expectedCopyId = `${template.id}-${copyNumber}`;
    const copyExists = await prisma.treeBranchLeafNode.findUnique({
      where: { id: expectedCopyId }
    });
    
    if (copyExists) {
      console.log(`     ⚠️  COPIE EXISTE DÉJÀ: ${expectedCopyId}`);
    } else {
      console.log(`     ✅ Copie à créer: ${expectedCopyId}`);
    }
    
    // Simuler deepCopyNodeInternal avec suffixNum
    console.log(`     📞 deepCopyNodeInternal(${template.id}, { suffixNum: ${copyNumber} })`);
    
    // Dans deepCopyNodeInternal, regarder ce qui va se passer
    const baseSourceId = template.id.replace(/-\d+(?:-\d+)*$/, '');
    const existingIdsWithSuffix = await prisma.treeBranchLeafNode.findMany({
      where: { 
        treeId: template.treeId,
        id: { startsWith: `${baseSourceId}-` }
      },
      select: { id: true }
    });
    
    let maxSuffix = 0;
    for (const rec of existingIdsWithSuffix) {
      const rest = rec.id.slice(baseSourceId.length + 1);
      if (/^\d+$/.test(rest)) {
        const num = Number(rest);
        if (Number.isFinite(num) && num > maxSuffix) maxSuffix = num;
      }
    }
    
    console.log(`     📊 Dans deepCopyNodeInternal:`);
    console.log(`       baseSourceId: ${baseSourceId}`);
    console.log(`       existingIdsWithSuffix: ${existingIdsWithSuffix.length}`);
    console.log(`       maxSuffix trouvé: ${maxSuffix}`);
    console.log(`       suffixNum passé: ${copyNumber}`);
    
    // AVANT le fix: resolved = maxSuffix + 1
    // APRÈS le fix: resolved = copyNumber (suffixNum)
    const resolvedSuffix = copyNumber; // Nouveau comportement
    console.log(`       ✅ Suffixe final utilisé: ${resolvedSuffix}`);
    
    const finalCopyId = `${baseSourceId}-${resolvedSuffix}`;
    console.log(`       🎯 ID final qui sera créé: ${finalCopyId}`);
  }
  
  console.log('\n3️⃣ RÉSUMÉ:');
  console.log('   - Le fix devrait utiliser suffixNum au lieu de maxSuffix + 1');
  console.log('   - Pour la première duplication, copyNumber = 1, donc -1');
  console.log('   - Pour la deuxième duplication, copyNumber = 2, donc -2');
  console.log('   - Etc...');
}

(async () => {
  try {
    await simulateRepeatButton();
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await prisma.$disconnect();
  }
})();