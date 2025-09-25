import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function activateGoogleCalendarForAllOrgs() {
  try {
    console.log('=== ACTIVATION GOOGLE CALENDAR POUR TOUTES LES ORGANISATIONS ===');
    
    // Trouver le module Google Calendar
    const googleCalendarModule = await prisma.module.findFirst({
      where: { feature: 'google_calendar' }
    });
    
    if (!googleCalendarModule) {
      console.log('Module Google Calendar non trouvé !');
      return;
    }
    
    console.log('Module Google Calendar trouvé:', googleCalendarModule.label);
    
    // Trouver toutes les organisations
    const organizations = await prisma.organization.findMany();
    console.log(`${organizations.length} organisations trouvées`);
    
    // Activer le module pour chaque organisation
    for (const org of organizations) {
      try {
        // Vérifier si l'association existe déjà
        const existingAssoc = await prisma.organizationModuleStatus.findFirst({
          where: {
            organizationId: org.id,
            moduleId: googleCalendarModule.id
          }
        });
        
        if (existingAssoc) {
          // Mettre à jour si elle existe
          await prisma.organizationModuleStatus.update({
            where: { id: existingAssoc.id },
            data: { active: true }
          });
          console.log(`✅ Module mis à jour pour ${org.name}: ACTIVÉ`);
        } else {
          // Créer si elle n'existe pas
          await prisma.organizationModuleStatus.create({
            data: {
              organizationId: org.id,
              moduleId: googleCalendarModule.id,
              active: true
            }
          });
          console.log(`✅ Module créé pour ${org.name}: ACTIVÉ`);
        }
      } catch (error) {
        console.log(`❌ Erreur pour ${org.name}:`, error.message);
      }
    }
    
    // Vérifier le résultat final
    const finalAssocs = await prisma.organizationModuleStatus.findMany({
      where: { moduleId: googleCalendarModule.id },
      include: {
        Organization: { select: { name: true } }
      }
    });
    
    console.log('\n=== ÉTAT FINAL ===');
    finalAssocs.forEach(assoc => {
      console.log(`${assoc.Organization.name}: ${assoc.active ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateGoogleCalendarForAllOrgs();
