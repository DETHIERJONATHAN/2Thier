const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function correctionFinaleModules() {
  console.log('🔧 CORRECTION FINALE DES MODULES');
  console.log('================================\n');
  
  try {
    // 1. Corriger les features incorrectes identifiées dans l'audit
    const correctionsFeatures = [
      { key: 'blocs', featureCorrecte: 'formulaires:view' },
      { key: 'clients', featureCorrecte: 'CRM' },
      { key: 'Facture', featureCorrecte: 'facturation:view' },
      { key: 'formulaire', featureCorrecte: 'formulaires:view' }
    ];
    
    console.log('🔧 ÉTAPE 1: Correction des features...');
    for (const correction of correctionsFeatures) {
      try {
        // Trouver le module spécifique et le mettre à jour individuellement
        const module = await prisma.module.findFirst({
          where: { key: correction.key }
        });
        
        if (module) {
          // Vérifier si une autre module utilise déjà cette feature
          const existingWithFeature = await prisma.module.findFirst({
            where: { 
              feature: correction.featureCorrecte,
              id: { not: module.id }
            }
          });
          
          if (!existingWithFeature) {
            await prisma.module.update({
              where: { id: module.id },
              data: { feature: correction.featureCorrecte }
            });
            console.log(`✅ Feature corrigée pour ${correction.key}: → "${correction.featureCorrecte}"`);
          } else {
            console.log(`⚠️  Feature "${correction.featureCorrecte}" déjà utilisée par: ${existingWithFeature.key}`);
          }
        } else {
          console.log(`⚠️  Module ${correction.key} non trouvé`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour ${correction.key}:`, error.message);
      }
    }
    
    console.log('\n🔧 ÉTAPE 2: Activation de TOUS les modules...');
    
    // 2. Activer TOUS les modules
    const resultActivation = await prisma.module.updateMany({
      where: {},  // Tous les modules
      data: { active: true }
    });
    
    console.log(`✅ ${resultActivation.count} modules activés !`);
    
    // 3. Vérifier l'activation pour l'organisation 2Thier CRM
    console.log('\n🔧 ÉTAPE 3: Vérification des activations pour 2Thier CRM...');
    
    // Récupérer l'organisation 2Thier CRM
    const telnyx2thier = await prisma.organization.findFirst({
      where: { name: '2Thier CRM' }
    });
    
    if (telnyx2thier) {
      console.log(`📋 Organisation trouvée: ${telnyx2thier.name} (ID: ${telnyx2thier.id})`);
      
      // Récupérer tous les modules
      const modules = await prisma.module.findMany();
      console.log(`📋 ${modules.length} modules à vérifier...`);
      
      let activationsCreees = 0;
      
      for (const module of modules) {
        // Vérifier si l'activation existe déjà
        const activationExistante = await prisma.organizationModuleStatus.findFirst({
          where: {
            organizationId: telnyx2thier.id,
            moduleId: module.id
          }
        });
        
        if (!activationExistante) {
          // Créer l'activation
          try {
            await prisma.organizationModuleStatus.create({
              data: {
                organizationId: telnyx2thier.id,
                moduleId: module.id,
                active: true
              }
            });
            activationsCreees++;
            console.log(`✅ Activation créée pour: ${module.label} (${module.key})`);
          } catch (error) {
            console.error(`❌ Erreur activation ${module.key}:`, error.message);
          }
        } else if (!activationExistante.active) {
          // Activer si désactivé
          try {
            await prisma.organizationModuleStatus.update({
              where: { id: activationExistante.id },
              data: { active: true }
            });
            console.log(`✅ Activation mise à jour pour: ${module.label} (${module.key})`);
          } catch (error) {
            console.error(`❌ Erreur mise à jour ${module.key}:`, error.message);
          }
        } else {
          console.log(`ℹ️  Déjà activé: ${module.label} (${module.key})`);
        }
      }
      
      console.log(`\n🎉 ${activationsCreees} nouvelles activations créées !`);
      
    } else {
      console.log('❌ Organisation "2Thier CRM" non trouvée !');
    }
    
    // 4. Résumé final avec tous les modules
    console.log('\n📋 RÉSUMÉ FINAL - TOUS LES MODULES:');
    console.log('===================================');
    
    const modulesFinal = await prisma.module.findMany({
      orderBy: { label: 'asc' }
    });
    
    console.log(`\n🎯 MODULES ACTIFS (${modulesFinal.filter(m => m.active).length}/${modulesFinal.length}):`);
    modulesFinal.forEach(module => {
      const status = module.active ? '✅' : '❌';
      console.log(`${status} ${module.label} (${module.key}): ${module.route} [${module.feature}]`);
    });
    
    console.log('\n🎉 CORRECTION TERMINÉE !');
    console.log('========================');
    console.log('👉 Rafraîchissez votre page CRM pour voir tous les modules dans la sidebar !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

correctionFinaleModules();
