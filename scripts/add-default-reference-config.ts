/**
 * 🎯 Script pour ajouter une configuration de référence A4 par défaut
 * à une organisation
 */

import { db } from '../src/lib/database';

async function addDefaultReferenceConfig(organizationId: string) {
  try {
    console.log(`🔍 Vérification config référence pour org: ${organizationId}`);
    
    // Vérifier si une config existe déjà
    const existing = await db.organizationMeasurementReferenceConfig.findFirst({
      where: {
        organizationId,
        isActive: true
      }
    });
    
    if (existing) {
      console.log('✅ Configuration de référence déjà existante:', existing);
      return existing;
    }
    
    // Créer une config A4 par défaut
    console.log('📝 Création d\'une config A4 par défaut...');
    const config = await db.organizationMeasurementReferenceConfig.create({
      data: {
        organizationId,
        referenceType: 'a4',
        customWidth: 21.0,  // A4 = 21 cm de large
        customHeight: 29.7, // A4 = 29.7 cm de haut
        isActive: true,
        createdBy: null // null pour config automatique
      }
    });
    
    console.log('✅ Configuration A4 créée:', config);
    return config;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

// Récupérer l'ID d'organisation depuis les arguments
const orgId = process.argv[2];

if (!orgId) {
  console.error('❌ Usage: ts-node scripts/add-default-reference-config.ts <organizationId>');
  process.exit(1);
}

addDefaultReferenceConfig(orgId)
  .then(() => {
    console.log('✅ Terminé !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
