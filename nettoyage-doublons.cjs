const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function nettoyageDoublonsFeatures() {
  console.log('🧹 NETTOYAGE DES DOUBLONS DE FEATURES');
  console.log('====================================\n');
  
  try {
    // Supprimer les modules en doublon en gardant les meilleurs
    const modulesASupprimer = [
      // Garder 'formulaires' et supprimer 'formulaire'
      { keyASupprimer: 'formulaire', keyAGarder: 'formulaires', raison: 'Doublon formulaire - garder au pluriel' },
      
      // Garder 'clients' et supprimer 'Client' (majuscule)
      { keyASupprimer: 'Client', keyAGarder: 'clients', raison: 'Doublon client - garder au pluriel minuscule' },
      
      // Garder 'facturation' et supprimer 'Facture'
      { keyASupprimer: 'Facture', keyAGarder: 'facturation', raison: 'Doublon facture - garder nom complet' }
    ];
    
    console.log('🗑️  Suppression des doublons...');
    
    for (const doublon of modulesASupprimer) {
      try {
        // D'abord, supprimer les activations de l'organisation pour ce module
        const moduleASupprimer = await prisma.module.findFirst({
          where: { key: doublon.keyASupprimer }
        });
        
        if (moduleASupprimer) {
          // Supprimer les activations de l'organisation
          await prisma.organizationModuleStatus.deleteMany({
            where: { moduleId: moduleASupprimer.id }
          });
          
          // Supprimer le module
          await prisma.module.delete({
            where: { id: moduleASupprimer.id }
          });
          
          console.log(`✅ Module supprimé: ${doublon.keyASupprimer} (${doublon.raison})`);
        } else {
          console.log(`⚠️  Module ${doublon.keyASupprimer} non trouvé`);
        }
      } catch (error) {
        console.error(`❌ Erreur suppression ${doublon.keyASupprimer}:`, error.message);
      }
    }
    
    // Corriger la feature du module 'blocs'
    console.log('\n🔧 Correction de la feature du module blocs...');
    try {
      const moduleBlocs = await prisma.module.findFirst({
        where: { key: 'blocs' }
      });
      
      if (moduleBlocs) {
        await prisma.module.update({
          where: { id: moduleBlocs.id },
          data: { feature: 'formulaires:view' }
        });
        console.log('✅ Feature du module blocs corrigée: formulaires:view');
      }
    } catch (error) {
      console.error('❌ Erreur correction blocs:', error.message);
    }
    
    // Résumé final
    console.log('\n📋 RÉSUMÉ FINAL - MODULES NETTOYÉS:');
    console.log('===================================');
    
    const modulesFinal = await prisma.module.findMany({
      orderBy: { label: 'asc' }
    });
    
    console.log(`\n🎯 MODULES ACTIFS (${modulesFinal.filter(m => m.active).length}/${modulesFinal.length}):`);
    modulesFinal.forEach(module => {
      const status = module.active ? '✅' : '❌';
      console.log(`${status} ${module.label} (${module.key}): ${module.route} [${module.feature}]`);
    });
    
    console.log('\n🎉 NETTOYAGE TERMINÉ !');
    console.log('======================');
    console.log('👉 Rafraîchissez votre page CRM pour voir la sidebar optimisée !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

nettoyageDoublonsFeatures();
