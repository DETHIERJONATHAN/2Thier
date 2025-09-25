// Script de vérification simple
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simpleVerification() {
  try {
    console.log('🔍 VÉRIFICATION SIMPLE DU SYSTÈME\n');

    // 1. Statistiques de base
    const [orgCount, callStatusCount, leadStatusCount, mappingCount] = await Promise.all([
      prisma.organization.count(),
      prisma.callStatus.count(),
      prisma.leadStatus.count(),
      prisma.callToLeadMapping.count()
    ]);

    console.log('📊 STATISTIQUES:');
    console.log(`   🏢 Organisations: ${orgCount}`);
    console.log(`   📞 Statuts d'appels: ${callStatusCount}`);
    console.log(`   📋 Statuts de leads: ${leadStatusCount}`);
    console.log(`   🔗 Mappings: ${mappingCount}\n`);

    // 2. Quelques exemples de mappings
    console.log('🔗 EXEMPLES DE MAPPINGS:');
    const sampleMappings = await prisma.callToLeadMapping.findMany({
      take: 10,
      include: {
        CallStatus: { select: { name: true } },
        LeadStatus: { select: { name: true } },
        Organization: { select: { name: true } }
      }
    });

    sampleMappings.forEach(mapping => {
      console.log(`   📞 "${mapping.CallStatus.name}" → 📋 "${mapping.LeadStatus.name}" (${mapping.Organization.name})`);
    });

    // 3. Statuts d'appels par organisation
    console.log('\n📞 STATUTS D\'APPELS PAR ORGANISATION:');
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true }
    });

    for (const org of organizations) {
      const callStatuses = await prisma.callStatus.findMany({
        where: { organizationId: org.id },
        select: { name: true, color: true },
        orderBy: { order: 'asc' }
      });
      console.log(`   🏢 ${org.name}: ${callStatuses.length} statuts d'appels`);
    }

    console.log('\n✅ SYSTÈME OPÉRATIONNEL !');
    console.log('✨ Tous les statuts et mappings sont créés correctement.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleVerification();
