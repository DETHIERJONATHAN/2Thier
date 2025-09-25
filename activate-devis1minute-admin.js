import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateDevis1minuteAdmin() {
  try {
    console.log('🔍 Activation de la catégorie "Devis1minute - Admin"...\n');
    
    // Activer la catégorie Devis1minute - Admin
    const result = await prisma.category.update({
      where: {
        id: '73df91bf-78f4-42fb-9c66-82705bce594c' // ID de la catégorie Devis1minute - Admin
      },
      data: {
        active: true
      }
    });
    
    console.log(`✅ Catégorie "${result.name}" activée avec succès !`);
    console.log(`   - Active: ${result.active}`);
    console.log(`   - SuperAdminOnly: ${result.superAdminOnly}`);
    console.log(`   - Order: ${result.order}`);
    
    // Vérifier combien de modules sont dans cette catégorie
    const modulesCount = await prisma.module.count({
      where: {
        categoryId: result.id,
        active: true
      }
    });
    
    console.log(`   - Modules actifs dans cette catégorie: ${modulesCount}`);
    
    if (modulesCount === 0) {
      console.log('\n⚠️  Cette catégorie n\'a pas de modules actifs. Vérifions les modules...');
      
      const allModules = await prisma.module.findMany({
        where: {
          categoryId: result.id
        },
        select: {
          id: true,
          label: true,
          active: true
        }
      });
      
      console.log(`\n📋 Modules trouvés dans cette catégorie: ${allModules.length}`);
      allModules.forEach(module => {
        console.log(`   - ${module.label} (${module.active ? 'Actif' : 'Inactif'})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'activation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateDevis1minuteAdmin();
