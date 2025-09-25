const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reorganizeExactStructure() {
  console.log('🎯 RÉORGANISATION EXACTE SELON VOS INSTRUCTIONS DÉTAILLÉES');
  console.log('========================================================');
  
  try {
    // 🗑️ SUPPRIMER TOUS LES MODULES EXISTANTS d'abord
    console.log('🗑️ Suppression de tous les modules existants...');
    await prisma.module.deleteMany({});
    console.log('✅ Tous les modules supprimés');
    
    // 📋 CRÉER UNIQUEMENT LA STRUCTURE EXACTE selon vos instructions
    const exactModules = [
      // 🔄 AUTRES (11 modules de base selon vos instructions)
      { key: 'dashboard', label: 'Tableau de bord', feature: 'dashboard_access' },
      { key: 'settings', label: 'Paramètres', feature: 'settings_access' },
      { key: 'modules', label: 'Modules', feature: 'modules_access' },
      { key: 'gestion_sav', label: 'Gestion SAV', feature: 'gestion_sav_access' },
      { key: 'Technique', label: 'Technique', feature: 'technique_access' },
      { key: 'Client', label: 'Client', feature: 'client_access' },
      { key: 'formulaire', label: 'Formulaire', feature: 'formulaire_access' }, // ⚠️ GARDER (différent de Formulaires)
      { key: 'devis', label: 'Devis', feature: 'devis_access' },
      { key: 'agenda', label: 'Agenda', feature: 'agenda_crm_access' }, // Agenda du CRM
      { key: 'leads', label: 'Leads', feature: 'leads_access' },
      { key: 'mail', label: 'Mail', feature: 'mail_interne_access' }, // Boite mail interne au CRM
      
      // 🔧 OUTILS TECHNIQUES (1 module)
      { key: 'tableaux', label: 'Gestion des Tableaux', feature: 'tableaux_access' },
      
      // 📋 FORMULAIRES (1 module)
      { key: 'bloc', label: 'Bloc', feature: 'bloc_access' },
      
      // 🏢 GOOGLE WORKSPACE (7 modules activables)
      { key: 'google_gmail', label: 'Google Gmail', feature: 'google_gmail_access' }, // Page activable dans Google Workspace
      { key: 'google_drive', label: 'Google Drive', feature: 'google_drive_access' }, // Page activable dans Google Workspace
      { key: 'google_meet', label: 'Google Meet', feature: 'google_meet_access' }, // Transformé depuis "Meet"
      { key: 'google_docs', label: 'Google Docs', feature: 'google_docs_access' }, // Transformé depuis "Docs"
      { key: 'google_sheets', label: 'Google Sheets', feature: 'google_sheets_access' }, // Transformé depuis "Sheets"
      { key: 'google_voice', label: 'Google Voice', feature: 'google_voice_access' }, // Transformé depuis "Voice"
      { key: 'google_agenda', label: 'Google Agenda', feature: 'google_agenda_access' }, // Page activable dans Google Workspace
      
      // 👑 ADMINISTRATION (7 modules)
      { key: 'admin_modules', label: 'Modules', feature: 'admin_modules_access' }, // Dans administration
      { key: 'admin_roles', label: 'Rôles', feature: 'admin_roles_access' }, // Dans administration
      { key: 'admin_users', label: 'Utilisateurs', feature: 'admin_users_access' }, // Dans administration
      { key: 'admin_permissions', label: 'Permissions', feature: 'admin_permissions_access' }, // Dans administration
      { key: 'admin_rights_summary', label: 'Synthèse des droits', feature: 'admin_rights_summary_access' }, // Dans administration
      { key: 'admin_organizations', label: 'Organisations', feature: 'admin_organizations_access' }, // Dans administration
      { key: 'admin_telnyx', label: 'Telnyx Communications', feature: 'admin_telnyx_access' }, // Dans administration
      
      // ⚡ DEVIS1MINUTE – ADMIN (4 modules)
      { key: 'devis1minute_admin_campaigns', label: 'Campagnes', feature: 'devis1minute_admin_campaigns_access' }, // Dans devis1minute - Admin
      { key: 'devis1minute_admin_analytics', label: 'Analytics', feature: 'devis1minute_admin_analytics_access' }, // Dans devis1minute - Admin
      { key: 'devis1minute_admin_forms', label: 'Formulaires Publics', feature: 'devis1minute_admin_forms_access' }, // Dans devis1minute - Admin
      { key: 'devis1minute_admin_landing', label: 'Landing Pages', feature: 'devis1minute_admin_landing_access' }, // Dans devis1minute - Admin
      
      // 💼 DEVIS1MINUTE (4 modules)
      { key: 'devis1minute_marketplace', label: 'Marketplace', feature: 'devis1minute_marketplace_access' }, // Dans devis1minute
      { key: 'devis1minute_partner', label: 'Portail Partenaire', feature: 'devis1minute_partner_access' }, // Dans devis1minute
      { key: 'devis1minute_leads', label: 'Mes Leads', feature: 'devis1minute_leads_access' }, // Dans devis1minute
      { key: 'devis1minute_billing', label: 'Facturation', feature: 'devis1minute_billing_access' } // Dans devis1minute
    ];
    
    console.log(`\\n📝 Création de ${exactModules.length} modules selon votre structure exacte...\\n`);
    
    let order = 1;
    for (const moduleData of exactModules) {
      await prisma.module.create({
        data: {
          key: moduleData.key,
          label: moduleData.label,
          feature: moduleData.feature,
          active: true,
          order: order++,
          organizationId: null // Global
        }
      });
      console.log(`  ✨ ${moduleData.key} → ${moduleData.label}`);
    }
    
    console.log(`\\n✅ ${exactModules.length} modules créés selon votre structure !`);
    
    // 📊 VÉRIFICATION PAR SECTION selon vos instructions
    console.log('\\n📊 VÉRIFICATION PAR SECTION :');
    
    console.log('\\n🔄 AUTRES (11 modules) :');
    ['dashboard', 'settings', 'modules', 'gestion_sav', 'Technique', 'Client', 'formulaire', 'devis', 'agenda', 'leads', 'mail'].forEach(key => {
      const module = exactModules.find(m => m.key === key);
      console.log(`  • ${key} → ${module ? module.label : 'NON TROUVÉ'}`);
    });
    
    console.log('\\n🔧 OUTILS TECHNIQUES (1 module) :');
    console.log(`  • tableaux → Gestion des Tableaux`);
    
    console.log('\\n📋 FORMULAIRES (1 module) :');
    console.log(`  • bloc → Bloc`);
    
    console.log('\\n🏢 GOOGLE WORKSPACE (7 modules activables) :');
    ['google_gmail', 'google_drive', 'google_meet', 'google_docs', 'google_sheets', 'google_voice', 'google_agenda'].forEach(key => {
      const module = exactModules.find(m => m.key === key);
      console.log(`  • ${key} → ${module ? module.label : 'NON TROUVÉ'}`);
    });
    
    console.log('\\n👑 ADMINISTRATION (7 modules) :');
    ['admin_modules', 'admin_roles', 'admin_users', 'admin_permissions', 'admin_rights_summary', 'admin_organizations', 'admin_telnyx'].forEach(key => {
      const module = exactModules.find(m => m.key === key);
      console.log(`  • ${key} → ${module ? module.label : 'NON TROUVÉ'}`);
    });
    
    console.log('\\n⚡ DEVIS1MINUTE – ADMIN (4 modules) :');
    ['devis1minute_admin_campaigns', 'devis1minute_admin_analytics', 'devis1minute_admin_forms', 'devis1minute_admin_landing'].forEach(key => {
      const module = exactModules.find(m => m.key === key);
      console.log(`  • ${key} → ${module ? module.label : 'NON TROUVÉ'}`);
    });
    
    console.log('\\n💼 DEVIS1MINUTE (4 modules) :');
    ['devis1minute_marketplace', 'devis1minute_partner', 'devis1minute_leads', 'devis1minute_billing'].forEach(key => {
      const module = exactModules.find(m => m.key === key);
      console.log(`  • ${key} → ${module ? module.label : 'NON TROUVÉ'}`);
    });
    
    console.log(`\\n🎯 TOTAL: ${exactModules.length} modules créés selon votre structure exacte !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reorganizeExactStructure();
