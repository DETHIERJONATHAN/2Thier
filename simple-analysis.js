import { PrismaClient } from '@prisma/client';

async function simpleAnalysis() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ANALYSE SIMPLIFIÉE DU SYSTÈME\n');
    
    // 1. Organisations
    console.log('1️⃣ ORGANISATIONS:');
    const organizations = await prisma.organization.findMany({
      include: {
        googleWorkspaceConfig: true,
        UserOrganization: {
          include: {
            User: { select: { email: true, firstName: true, lastName: true } },
            Role: { select: { name: true } }
          }
        }
      }
    });
    
    console.log(`Total: ${organizations.length} organisations\n`);
    organizations.forEach(org => {
      console.log(`📁 ${org.name}`);
      console.log(`   Status: ${org.status}`);
      console.log(`   Utilisateurs: ${org.UserOrganization.length}`);
      org.UserOrganization.forEach(uo => {
        console.log(`      - ${uo.User.firstName} ${uo.User.lastName} (${uo.User.email}) - ${uo.Role.name} - Status: ${uo.status}`);
      });
      console.log(`   Google Workspace: ${org.googleWorkspaceConfig ? 'Configuré' : 'Non configuré'}`);
      if (org.googleWorkspaceConfig) {
        console.log(`      Domain: ${org.googleWorkspaceConfig.domain}`);
        console.log(`      Enabled: ${org.googleWorkspaceConfig.enabled}`);
        console.log(`      Gmail: ${org.googleWorkspaceConfig.gmailEnabled}`);
        console.log(`      Calendar: ${org.googleWorkspaceConfig.calendarEnabled}`);
        console.log(`      Drive: ${org.googleWorkspaceConfig.driveEnabled}`);
      }
      console.log('');
    });
    
    // 2. Modules
    console.log('2️⃣ MODULES:');
    const modules = await prisma.module.findMany();
    console.log(`Total: ${modules.length} modules\n`);
    modules.forEach(module => {
      console.log(`📦 ${module.label} (${module.key})`);
      console.log(`   Feature: ${module.feature}`);
      console.log(`   Active: ${module.active}`);
      console.log(`   Organization: ${module.organizationId || 'Global'}`);
      console.log('');
    });
    
    // 3. Status des modules par organisation
    console.log('3️⃣ STATUS MODULES PAR ORGANISATION:');
    const moduleStatuses = await prisma.organizationModuleStatus.findMany({
      include: {
        Organization: { select: { name: true } },
        Module: { select: { label: true, key: true } }
      }
    });
    
    console.log(`Total: ${moduleStatuses.length} status\n`);
    moduleStatuses.forEach(status => {
      console.log(`🔧 ${status.Organization.name} - ${status.Module.label}`);
      console.log(`   Active: ${status.active}`);
      console.log(`   Created: ${status.createdAt}`);
      console.log('');
    });
    
    // 4. Google Workspace Configs - simplifié
    console.log('4️⃣ GOOGLE WORKSPACE:');
    const googleConfigs = await prisma.googleWorkspaceConfig.findMany();
    
    googleConfigs.forEach(config => {
      console.log(`🔧 Organisation ID: ${config.organizationId}`);
      console.log(`   Domain: ${config.domain}`);
      console.log(`   Admin: ${config.adminEmail}`);
      console.log(`   Enabled: ${config.enabled}`);
      console.log(`   Gmail: ${config.gmailEnabled}`);
      console.log(`   Calendar: ${config.calendarEnabled}`);
      console.log(`   Drive: ${config.driveEnabled}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleAnalysis();
