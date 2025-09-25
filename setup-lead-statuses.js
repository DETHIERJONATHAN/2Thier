import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🏗️ CRÉATION DES STATUTS DE LEADS PAR DÉFAUT...');
    
    // Récupérer toutes les organisations
    const organizations = await prisma.organization.findMany();
    console.log(`📊 ${organizations.length} organisations trouvées`);
    
    // Statuts par défaut à créer
    const defaultStatuses = [
      { name: 'Nouveau', color: '#1890ff', order: 1, isDefault: true },
      { name: 'Qualifié', color: '#52c41a', order: 2, isDefault: false },
      { name: 'Intéressé', color: '#faad14', order: 3, isDefault: false },
      { name: 'Négociation', color: '#fa8c16', order: 4, isDefault: false },
      { name: 'Client', color: '#52c41a', order: 5, isDefault: false },
      { name: 'Perdu', color: '#f5222d', order: 6, isDefault: false },
      { name: 'Inactif', color: '#d9d9d9', order: 7, isDefault: false }
    ];
    
    for (const org of organizations) {
      console.log(`\n🏢 Traitement de l'organisation: ${org.name} (${org.id})`);
      
      // Vérifier si l'organisation a déjà des statuts
      const existingStatuses = await prisma.leadStatus.findMany({
        where: { organizationId: org.id }
      });
      
      if (existingStatuses.length > 0) {
        console.log(`  ✅ ${existingStatuses.length} statuts déjà existants - Skip`);
        continue;
      }
      
      // Créer les statuts par défaut
      for (const status of defaultStatuses) {
        const created = await prisma.leadStatus.create({
          data: {
            ...status,
            organizationId: org.id
          }
        });
        console.log(`  ✅ Créé: ${status.name} (${created.id})`);
      }
    }
    
    console.log('\n🎉 STATUTS DE LEADS CRÉÉS AVEC SUCCÈS !');
    
    // Vérification finale
    const totalStatuses = await prisma.leadStatus.count();
    console.log(`📊 Total statuts dans la DB: ${totalStatuses}`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();
