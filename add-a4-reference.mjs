/**
 * 🎯 Script pour créer une config de référence A4 par défaut
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();async function main() {
  try {
    // Trouver le premier utilisateur
    const user = await db.user.findFirst({
      include: {
        UserOrganization: {
          include: {
            Organization: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé');
      return;
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.email}`);
    
    for (const userOrg of user.UserOrganization) {
      const org = userOrg.Organization;
      console.log(`\n📋 Organisation: ${org.name} (${org.id})`);
      
      // Vérifier config existante
      const existing = await db.organizationMeasurementReferenceConfig.findFirst({
        where: {
          organizationId: org.id,
          isActive: true
        }
      });
      
      if (existing) {
        console.log(`  ✅ Config existante: ${existing.referenceType}`);
        continue;
      }
      
      // Créer config A4
      const config = await db.organizationMeasurementReferenceConfig.create({
        data: {
          organizationId: org.id,
          referenceType: 'a4',
          customWidth: 21.0,
          customHeight: 29.7,
          isActive: true
        }
      });
      
      console.log(`  ✨ Config A4 créée: ${config.id}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
