// Script pour activer tous les modules et vérifier les icônes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateAllModules() {
  try {
    console.log('🔧 Activation de tous les modules...');

    // 1. Activer tous les modules inactifs
    const updateResult = await prisma.module.updateMany({
      where: { active: false },
      data: { active: true }
    });

    console.log(`✅ ${updateResult.count} modules activés`);

    // 2. Vérifier les modules sans icônes et les corriger
    const modulesWithoutIcons = await prisma.module.findMany({
      where: { 
        OR: [
          { icon: null },
          { icon: '' }
        ]
      },
      select: { id: true, key: true, label: true, icon: true }
    });

    console.log(`\n🔍 Modules sans icônes: ${modulesWithoutIcons.length}`);

    // Mapping des icônes par key de module
    const iconMapping = {
      // Modules de base
      'leads': 'UserAddOutlined',
      'mail': 'MailOutlined', 
      'dashboard': 'DashboardOutlined',
      'technique': 'SettingOutlined',
      'Agenda': 'CalendarOutlined',
      'Client': 'UserOutlined',
      'Facture': 'FileTextOutlined',
      'formulaire': 'FormOutlined',
      'gestion_sav': 'CustomerServiceOutlined',

      // Modules business
      'clients': 'TeamOutlined',
      'projects': 'ProjectOutlined',
      'emails': 'InboxOutlined',
      'calendar': 'CalendarOutlined',
      'analytics': 'BarChartOutlined',
      'settings': 'SettingOutlined',
      'company': 'BankOutlined',
      'notifications': 'BellOutlined',
      'gemini': 'RobotOutlined',

      // Modules admin
      'users': 'UserOutlined',
      'roles': 'SafetyCertificateOutlined',
      'permissions': 'KeyOutlined',
      'admin': 'CrownOutlined',
      'users_management': 'UserOutlined',
      'roles_management': 'SafetyCertificateOutlined',
      'permissions_management': 'KeyOutlined',
      'admin_panel': 'ControlOutlined',

      // Google Services
      'google_agenda': 'CalendarOutlined',
      'google_calendar': 'CalendarOutlined',
      'google_contacts': 'ContactsOutlined',
      'google_drive': 'CloudOutlined',
      'google_forms': 'FormOutlined',
      'google_gmail': 'MailOutlined',
      'google_groups': 'TeamOutlined',
      'google_mail': 'MailOutlined',
      'google_maps': 'EnvironmentOutlined',
      'google_meet': 'VideoCameraOutlined',

      // Communications
      'telnyx_communications': 'PhoneOutlined',
      'technique': 'ToolOutlined'
    };

    // 3. Mettre à jour les icônes manquantes
    for (const module of modulesWithoutIcons) {
      const iconName = iconMapping[module.key];
      if (iconName) {
        await prisma.module.update({
          where: { id: module.id },
          data: { icon: iconName }
        });
        console.log(`✅ Icône "${iconName}" ajoutée pour ${module.label}`);
      } else {
        console.log(`⚠️  Pas d'icône définie pour ${module.label} (${module.key})`);
      }
    }

    // 4. Lister tous les modules avec leur statut final
    const allModules = await prisma.module.findMany({
      select: {
        key: true,
        label: true,
        active: true,
        icon: true,
        route: true
      },
      orderBy: { label: 'asc' }
    });

    console.log(`\n📊 Résumé final - ${allModules.length} modules:`);
    allModules.forEach((module, index) => {
      const status = module.active ? '✅' : '❌';
      const icon = module.icon || '❓';
      console.log(`${index + 1}. ${status} ${module.label} - ${icon} (${module.route || 'Pas de route'})`);
    });

    const activeCount = allModules.filter(m => m.active).length;
    const withIconCount = allModules.filter(m => m.icon).length;

    console.log(`\n🎉 Résultat final:`);
    console.log(`   ✅ Modules actifs: ${activeCount}/${allModules.length}`);
    console.log(`   🎨 Modules avec icône: ${withIconCount}/${allModules.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAllModules();
