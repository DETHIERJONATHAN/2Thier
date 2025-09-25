import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function moveLeads() {
  console.log('🔄 Déplacement des leads vers la bonne organisation...');
  
  const correctOrgId = '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de'; // 2Thier CRM
  const wrongOrgId = '4d1d793c-8921-4112-8b5c-9e0dfd58a391'; // United
  
  // Déplacer les leads Marie Dubois et Pierre Martin
  const leadIds = [
    '85bc9a4c-c989-40b3-858a-53c1d1dc10ec', // Marie Dubois
    '8ffdf10e-2167-4ec6-b306-3ffb5a92240f'  // Pierre Martin
  ];
  
  for (const leadId of leadIds) {
    const result = await prisma.lead.update({
      where: { id: leadId },
      data: { organizationId: correctOrgId },
      include: {
        Organization: {
          select: { name: true }
        }
      }
    });
    
    console.log(`✅ Lead "${result.firstName} ${result.lastName}" déplacé vers ${result.Organization.name}`);
  }
  
  // Vérification finale
  const allLeadsInCorrectOrg = await prisma.lead.findMany({
    where: { organizationId: correctOrgId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true
    }
  });
  
  console.log(`\n🎯 Leads maintenant dans 2Thier CRM (${allLeadsInCorrectOrg.length} total):`);
  allLeadsInCorrectOrg.forEach((lead, index) => {
    console.log(`${index + 1}. ${lead.firstName} ${lead.lastName} (${lead.company})`);
  });
  
  await prisma.$disconnect();
}

moveLeads().catch(console.error);
