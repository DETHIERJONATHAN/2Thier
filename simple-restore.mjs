import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleRestore() {
  try {
    console.log('🔄 RESTAURATION SIMPLE DES DONNÉES ESSENTIELLES\n');
    
    // Vérification actuelle
    const currentOrgs = await prisma.organization.count();
    const currentUsers = await prisma.user.count();
    const currentLeads = await prisma.lead.count();
    
    console.log('📊 ÉTAT ACTUEL:');
    console.log(`- Organisations: ${currentOrgs}`);
    console.log(`- Utilisateurs: ${currentUsers}`);
    console.log(`- Leads: ${currentLeads}\n`);
    
    if (currentLeads === 0) {
      console.log('📋 Création des leads...\n');
      
      // Récupérer une organisation existante
      const org = await prisma.organization.findFirst();
      const user = await prisma.user.findFirst();
      
      console.log(`🏢 Organisation trouvée: ${org.name}`);
      console.log(`👤 Utilisateur trouvé: ${user.email}\n`);
      
      // Créer 2 leads simples
      const now = new Date();
      
      const lead1 = await prisma.lead.create({
        data: {
          id: "7ddd1356-26f6-4673-b5ae-ce6628e2ab00",
          firstName: "Haleigh",
          lastName: "Harvey",
          email: "haleigh.harvey@example.com",
          phone: "(247) 577-0730",
          company: "Lemke LLC",
          source: "Site Web",
          status: "nouveau",
          organizationId: org.id,
          assignedToId: user.id,
          notes: "Lead restauré depuis la sauvegarde",
          createdAt: now,
          updatedAt: now,
          data: {
            industry: "Technology",
            budget: "10k-25k"
          }
        }
      });
      
      const lead2 = await prisma.lead.create({
        data: {
          id: "4828d943-c72c-4176-a611-b88d49d9bee4",
          firstName: "Darrin",
          lastName: "Russel",
          email: "darrin.russel@example.com",
          phone: "351.494.4285",
          company: "Rath LLC",
          source: "Partenaire",
          status: "nouveau",
          organizationId: org.id,
          assignedToId: user.id,
          notes: "Lead restauré depuis la sauvegarde",
          createdAt: now,
          updatedAt: now,
          data: {
            industry: "Services",
            budget: "25k-50k"
          }
        }
      });
      
      console.log(`✅ Lead créé: ${lead1.firstName} ${lead1.lastName} (${lead1.company})`);
      console.log(`✅ Lead créé: ${lead2.firstName} ${lead2.lastName} (${lead2.company})\n`);
    }
    
    // Vérification finale
    const finalOrgs = await prisma.organization.count();
    const finalUsers = await prisma.user.count();
    const finalLeads = await prisma.lead.count();
    
    console.log('🎯 ÉTAT FINAL:');
    console.log(`- Organisations: ${finalOrgs}`);
    console.log(`- Utilisateurs: ${finalUsers}`);
    console.log(`- Leads: ${finalLeads}`);
    
    console.log('\n🎉 BASE DE DONNÉES RESTAURÉE ET OPÉRATIONNELLE !');
    console.log('✅ Prêt pour l\'implémentation du système anti-déconnexion Google !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleRestore();
