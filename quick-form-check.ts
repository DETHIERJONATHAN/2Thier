import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickFormCheck() {
  try {
    console.log('🔍 DIAGNOSTIC RAPIDE DES FORMULAIRES...');
    
    // 1. Module formulaire
    const formulaireModule = await prisma.module.findFirst({
      where: { key: 'formulaire' }
    });
    
    console.log('\n📦 MODULE FORMULAIRE:');
    console.log(`   ✅ Trouvé: ${formulaireModule?.label}`);
    console.log(`   🔗 Route: ${formulaireModule?.route}`);
    console.log(`   🎯 Page: ${formulaireModule?.page || 'Non définie'}`);
    console.log(`   📊 Actif: ${formulaireModule?.active ? '✅' : '❌'}`);
    
    // 2. Blocs disponibles
    const blocks = await prisma.block.count();
    console.log(`\n🧱 BLOCS: ${blocks} trouvé(s)`);
    
    // 3. Permissions
    const formPermissions = await prisma.permission.count({
      where: { 
        moduleId: formulaireModule?.id,
        allowed: true 
      }
    });
    console.log(`\n🔐 PERMISSIONS: ${formPermissions} permissions accordées`);
    
    // 4. Statuts par organisation
    const orgStatus = await prisma.organizationModuleStatus.findMany({
      where: { moduleId: formulaireModule?.id }
    });
    console.log(`\n🏢 STATUTS ORGANISATIONS: ${orgStatus.length}`);
    orgStatus.forEach((status, index) => {
      console.log(`   ${index + 1}. Org ${status.organizationId}: ${status.active ? '✅ Actif' : '❌ Inactif'}`);
    });
    
    // 5. PROBLÈMES IDENTIFIÉS
    console.log('\n🚨 DIAGNOSTIC:');
    
    if (!formulaireModule?.page) {
      console.log('   ❌ PROBLÈME MAJEUR: Aucune page définie pour le module formulaire');
      console.log('   💡 SOLUTION: Le module formulaire n\'a pas de composant page défini');
      console.log('   🔧 ACTION: Créer une page FormulairePage.tsx ou définir page dans le module');
    }
    
    if (orgStatus.filter(s => s.active).length === 0) {
      console.log('   ❌ PROBLÈME: Module formulaire inactif pour toutes les organisations');
      console.log('   🔧 ACTION: Activer le module pour au moins une organisation');
    }
    
    if (blocks === 0) {
      console.log('   ❌ PROBLÈME: Aucun bloc/formulaire disponible');
    } else {
      console.log('   ✅ Blocs disponibles');
    }
    
    if (formPermissions === 0) {
      console.log('   ❌ PROBLÈME: Aucune permission accordée');
    } else {
      console.log('   ✅ Permissions configurées');
    }
    
    // 6. SOLUTION RAPIDE
    console.log('\n🔧 SOLUTION IMMÉDIATE:');
    console.log('1. Vérifier que le frontend a une page pour /formulaire');
    console.log('2. Activer le module pour votre organisation');
    console.log('3. Vérifier que l\'utilisateur a les bonnes permissions');
    
  } catch (error) {
    console.error('💥 ERREUR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickFormCheck();
