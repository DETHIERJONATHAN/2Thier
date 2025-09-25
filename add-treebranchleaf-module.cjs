const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTreeBranchLeafModule() {
  try {
    console.log('🌳 Ajout du module TreeBranchLeaf à la catégorie Formulaires...');
    
    // Trouver la catégorie Formulaires
    const formulaireCategory = await prisma.category.findFirst({
      where: { name: { contains: 'Formulaire' } }
    });
    
    if (!formulaireCategory) {
      console.error('❌ Catégorie Formulaires non trouvée');
      return;
    }
    
    console.log('✅ Catégorie trouvée:', formulaireCategory.name, 'ID:', formulaireCategory.id);
    
    // Vérifier si le module TreeBranchLeaf existe déjà
    const existingModule = await prisma.module.findFirst({
      where: { key: 'treebranchleaf' }
    });
    
    if (existingModule) {
      console.log('🔄 Module TreeBranchLeaf existe déjà, mise à jour...');
      await prisma.module.update({
        where: { id: existingModule.id },
        data: {
          categoryId: formulaireCategory.id,
          label: 'TreeBranchLeaf',
          route: '/formulaire/treebranchleaf',
          description: 'Système de formulaires arborescents drag & drop avec logique métier avancée',
          icon: 'BranchesOutlined',
          active: true,
          order: 2
        }
      });
      console.log('✅ Module TreeBranchLeaf mis à jour');
    } else {
      console.log('➕ Création du nouveau module TreeBranchLeaf...');
      await prisma.module.create({
        data: {
          id: `treebranchleaf-${Date.now()}`,
          key: 'treebranchleaf',
          label: 'TreeBranchLeaf',
          feature: 'treebranchleaf',
          route: '/formulaire/treebranchleaf', 
          description: 'Système de formulaires arborescents drag & drop avec logique métier avancée',
          icon: 'BranchesOutlined',
          active: true,
          order: 2,
          superAdminOnly: false,
          categoryId: formulaireCategory.id
        }
      });
      console.log('✅ Module TreeBranchLeaf créé avec succès');
    }
    
    // Vérifier le résultat
    const updatedCategory = await prisma.category.findUnique({
      where: { id: formulaireCategory.id },
      include: { Module: true }
    });
    
    console.log('\n📋 Modules dans la catégorie Formulaires:');
    updatedCategory.Module.forEach((mod, index) => {
      console.log(`${index + 1}. ${mod.key} | ${mod.label} | ${mod.route}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTreeBranchLeafModule();
