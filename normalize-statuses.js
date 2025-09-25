import { PrismaClient } from '@prisma/client';

async function normalizeStatuses() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== NORMALISATION DES STATUTS ===\n');
    
    // Mapping des anciens statuts vers les nouveaux
    const statusMapping = {
      'nouveau': 'new',
      'en_cours': 'contacted',
      'contacte': 'contacted',
      'contacté': 'contacted',
      'rdv': 'meeting',
      'rendez_vous': 'meeting',
      'devis': 'proposal',
      'gagne': 'won',
      'gagné': 'won',
      'perdu': 'lost',
      'termine': 'won',
      'terminé': 'won'
    };
    
    // Récupérer tous les leads
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true
      }
    });
    
    console.log('Leads à traiter:');
    leads.forEach(lead => {
      const currentStatus = lead.status || 'new';
      const newStatus = statusMapping[currentStatus] || currentStatus;
      
      if (currentStatus !== newStatus) {
        console.log(`- ${lead.firstName} ${lead.lastName}: "${currentStatus}" → "${newStatus}"`);
      } else {
        console.log(`- ${lead.firstName} ${lead.lastName}: "${currentStatus}" (OK)`);
      }
    });
    
    console.log('\nApplication des modifications...');
    
    // Mettre à jour chaque lead si nécessaire
    for (const lead of leads) {
      const currentStatus = lead.status || 'new';
      const newStatus = statusMapping[currentStatus] || currentStatus;
      
      if (currentStatus !== newStatus) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: newStatus }
        });
        console.log(`✅ ${lead.firstName} ${lead.lastName} mis à jour: "${currentStatus}" → "${newStatus}"`);
      }
    }
    
    console.log('\n=== VÉRIFICATION FINALE ===');
    const updatedLeads = await prisma.lead.findMany({
      select: {
        firstName: true,
        lastName: true,
        status: true
      }
    });
    
    const statusCounts = updatedLeads.reduce((acc, lead) => {
      const status = lead.status || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Répartition finale des statuts:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- "${status}": ${count} leads`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeStatuses();
