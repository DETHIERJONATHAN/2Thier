import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addLeadsModule() {
  try {
    const existing = await prisma.module.findUnique({
      where: { key: 'leads' }
    });

    if (!existing) {
      const newModule = await prisma.module.create({
        data: {
          key: 'leads',
          label: 'Leads',
          feature: 'LEADS',
          icon: 'FaUsers',
          route: '/leads',
          description: 'Gestion des leads',
          order: 3,
          active: true
        }
      });
      console.log('Module LEADS ajouté avec succès!', newModule);
    } else {
      console.log('Le module LEADS existe déjà:', existing);
      
      // Si besoin, mettre à jour pour s'assurer qu'il est actif
      if (!existing.active) {
        await prisma.module.update({
          where: { id: existing.id },
          data: { active: true }
        });
        console.log('Module LEADS activé.');
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout/vérification du module LEADS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addLeadsModule();
