import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function addDevis1minuteAdminModules() {
  try {
    console.log('🔍 Ajout de modules à la catégorie "Devis1minute - Admin"...\n');
    
    // Trouver la catégorie Devis1minute - Admin
    const devisAdminCategory = await prisma.category.findFirst({
      where: {
        name: 'Devis1minute - Admin'
      }
    });
    
    if (!devisAdminCategory) {
      console.log('❌ Catégorie "Devis1minute - Admin" non trouvée');
      return;
    }
    
    console.log(`✅ Catégorie trouvée: ${devisAdminCategory.name}`);
    
    // Modules à créer pour Devis1minute - Admin
    const modulesToCreate = [
      {
        key: 'devis1minute_admin_dashboard',
        label: 'Tableau de bord Admin',
        feature: 'devis1minute_admin_dashboard',
        icon: 'DashboardOutlined',
        route: '/devis1minute/admin/dashboard',
        description: 'Tableau de bord administrateur Devis1minute',
        page: 'Devis1minuteAdminDashboard',
        order: 10
      },
      {
        key: 'devis1minute_admin_users',
        label: 'Gestion Utilisateurs Devis1minute',
        feature: 'devis1minute_admin_users',
        icon: 'UserOutlined',
        route: '/devis1minute/admin/users',
        description: 'Gestion des utilisateurs Devis1minute',
        page: 'Devis1minuteAdminUsers',
        order: 20
      },
      {
        key: 'devis1minute_admin_config',
        label: 'Configuration Devis1minute',
        feature: 'devis1minute_admin_config',
        icon: 'SettingOutlined',
        route: '/devis1minute/admin/config',
        description: 'Configuration système Devis1minute',
        page: 'Devis1minuteAdminConfig',
        order: 30
      },
      {
        key: 'devis1minute_admin_reports',
        label: 'Rapports Admin',
        feature: 'devis1minute_admin_reports',
        icon: 'BarChartOutlined',
        route: '/devis1minute/admin/reports',
        description: 'Rapports administrateur Devis1minute',
        page: 'Devis1minuteAdminReports',
        order: 40
      }
    ];
    
    console.log(`\n🔧 Création de ${modulesToCreate.length} modules...\n`);
    
    for (const moduleData of modulesToCreate) {
      const now = new Date();
      const createdModule = await prisma.module.upsert({
        where: { key: moduleData.key },
        create: {
          id: randomUUID(),
          ...moduleData,
          categoryId: devisAdminCategory.id,
          organizationId: devisAdminCategory.organizationId,
          active: true,
          superAdminOnly: true, // Important : SuperAdmin seulement
          createdAt: now,
          updatedAt: now
        },
        update: {
          ...moduleData,
          categoryId: devisAdminCategory.id,
          organizationId: devisAdminCategory.organizationId,
          active: true,
          superAdminOnly: true, // Important : SuperAdmin seulement
          updatedAt: now
        }
      });
      
      console.log(`✅ Module créé/mis à jour: "${createdModule.label}"`);
    }
    
    console.log(`\n🎉 Tous les modules "Devis1minute - Admin" ont été créés avec succès !`);
    console.log(`   - Catégorie: ${devisAdminCategory.name}`);
    console.log(`   - SuperAdminOnly: ✅`);
    console.log(`   - Active: ✅`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDevis1minuteAdminModules();
