import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function transferLead() {
  try {
    // ID du lead à transférer
    const leadId = '1758062740843-tbl-test';
    
    // ID de l'organisation 2thier.be
    const targetOrgId = '1757366075153-otief8knu';
    
    console.log(`Transfert du Lead ${leadId} vers l'organisation 2thier.be (${targetOrgId})`);
    
    // Vérifier que le lead existe
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        Organization: true
      }
    });
    
    if (!lead) {
      console.error('❌ Lead non trouvé');
      return;
    }
    
    console.log(`📋 Lead actuel: ${lead.firstName} ${lead.lastName} - Organisation: ${lead.Organization?.name}`);
    
    // Transférer le lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        organizationId: targetOrgId
      },
      include: {
        Organization: true
      }
    });
    
    console.log(`✅ Lead transféré avec succès !`);
    console.log(`📋 Nouveau: ${updatedLead.firstName} ${updatedLead.lastName} - Organisation: ${updatedLead.Organization?.name}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du transfert:', error);
  } finally {
    await prisma.$disconnect();
  }
}

transferLead();