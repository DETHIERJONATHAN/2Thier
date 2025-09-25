import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getLeadIds() {
  try {
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true
      }
    });

    console.log('🔍 Leads disponibles:');
    leads.forEach(lead => {
      console.log(`📊 ID: ${lead.id}`);
      console.log(`   Nom: ${lead.firstName} ${lead.lastName}`);
      console.log(`   Entreprise: ${lead.company}`);
      console.log(`   Email: ${lead.email}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getLeadIds();
