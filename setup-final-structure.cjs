const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupFinalModules() {
  console.log('🎯 CRÉATION DE LA STRUCTURE FINALE EXACTE');
  console.log('=========================================');
  
  try {
    // 🗑️ ÉTAPE 1: Supprimer TOUS les modules existants pour repartir à zéro
    await prisma.module.deleteMany({});
    console.log('🗑️ Tous les modules supprimés');
    
    // 📋 ÉTAPE 2: Créer EXACTEMENT les modules demandés
    const modulesToCreate = [
      // 🔄 MODULES DE BASE (hors sections)
      { key: 'dashboard', label: 'Tableau de bord', feature: 'dashboard', order: 1 },
      { key: 'settings', label: 'Paramètres', feature: 'settings', order: 2 },
      { key: 'modules', label: 'Modules', feature: 'modules_access', order: 3 },
      { key: 'gestion_sav', label: 'Gestion SAV', feature: 'gestion_sav', order: 4 },
      { key: 'Technique', label: 'Technique', feature: 'Technique', order: 5 },
      { key: 'Client', label: 'Client', feature: 'Client', order: 6 },
      { key: 'devis', label: 'Devis', feature: 'devis', order: 7 },
      { key: 'Agenda', label: 'Agenda', feature: 'Agenda', order: 8 },
      { key: 'leads', label: 'Leads', feature: 'leads_access', order: 9 },
      { key: 'mail', label: 'Mail', feature: 'MAIL', order: 10 },
      
      // 🔧 OUTILS TECHNIQUES
      { key: 'tableaux', label: 'Gestion des Tableaux', feature: 'tableaux', order: 20 },
      
      // 📋 FORMULAIRES & BLOCS
      { key: 'formulaire', label: 'Formulaire', feature: 'formulaires_access', order: 30 },
      { key: 'bloc', label: 'Bloc', feature: 'blocs_access', order: 31 },
      
      // 🏢 GOOGLE WORKSPACE
      { key: 'google_gmail', label: 'Google Gmail', feature: 'google_gmail_access', order: 40 },
      { key: 'google_drive', label: 'Google Drive', feature: 'google_drive_access', order: 41 },
      { key: 'google_meet', label: 'Google Meet', feature: 'google_meet_access', order: 42 },
      { key: 'google_docs', label: 'Google Docs', feature: 'google_docs_access', order: 43 },
      { key: 'google_sheets', label: 'Google Sheets', feature: 'google_sheets_access', order: 44 },
      { key: 'google_voice', label: 'Google Voice', feature: 'google_voice_access', order: 45 },
      { key: 'google_agenda', label: 'Google Agenda', feature: 'google_agenda_access', order: 46 },
      
      // 👑 ADMINISTRATION
      { key: 'admin-modules', label: 'Modules', feature: 'admin_modules', order: 50 },
      { key: 'admin-roles', label: 'Rôles', feature: 'admin_roles', order: 51 },
      { key: 'admin-users', label: 'Utilisateurs', feature: 'admin_users', order: 52 },
      { key: 'admin-permissions', label: 'Permissions', feature: 'admin_permissions', order: 53 },
      { key: 'admin-rights-summary', label: 'Synthèse des droits', feature: 'admin_rights_summary', order: 54 },
      { key: 'admin-organizations', label: 'Organisations', feature: 'admin_organizations', order: 55 },
      { key: 'admin-telnyx', label: 'Telnyx Communications', feature: 'admin_telnyx', order: 56 },
      
      // ⚡ DEVIS1MINUTE - ADMIN
      { key: 'devis1minute-admin-campaigns', label: 'Campagnes', feature: 'devis1minute_admin_campaigns', order: 60 },
      { key: 'devis1minute-admin-analytics', label: 'Analytics', feature: 'devis1minute_admin_analytics', order: 61 },
      { key: 'devis1minute-admin-forms', label: 'Formulaires Publics', feature: 'devis1minute_admin_forms', order: 62 },
      { key: 'devis1minute-admin-landing', label: 'Landing Pages', feature: 'devis1minute_admin_landing', order: 63 },
      
      // 💼 DEVIS1MINUTE
      { key: 'devis1minute-marketplace', label: 'Marketplace', feature: 'devis1minute_marketplace', order: 70 },
      { key: 'devis1minute-partner', label: 'Portail Partenaire', feature: 'devis1minute_partner', order: 71 },
      { key: 'devis1minute-leads', label: 'Mes Leads', feature: 'devis1minute_leads', order: 72 },
      { key: 'devis1minute-billing', label: 'Facturation', feature: 'devis1minute_billing', order: 73 }
    ];
    
    console.log('📝 Création des modules...');
    for (const moduleData of modulesToCreate) {
      await prisma.module.create({
        data: {
          ...moduleData,
          active: true,
          organizationId: null // Global
        }
      });
      console.log(`  ✅ ${moduleData.key} → ${moduleData.label}`);
    }
    
    // 📊 ÉTAPE 3: Vérification finale
    const final = await prisma.module.findMany({
      orderBy: { order: 'asc' },
      select: { key: true, label: true }
    });
    
    console.log(`\n📊 MODULES FINAUX (${final.length} total):`);
    final.forEach((m, i) => {
      console.log(`  ${i+1}. ${m.key} → ${m.label}`);
    });
    
    await prisma.$disconnect();
    console.log('\n✅ STRUCTURE FINALE CRÉÉE AVEC SUCCÈS !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    await prisma.$disconnect();
  }
}

setupFinalModules();
