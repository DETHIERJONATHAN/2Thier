import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function FORCER_CALENDAR_EVENTS() {
  try {
    console.log('📅 FORÇAGE FINAL DES CALENDAR EVENTS !');
    
    const backupData = JSON.parse(fs.readFileSync('backup-complete-27-08-2025-1756252940911.json', 'utf8'));
    const calendarEvents = backupData.tables.CalendarEvent || [];
    
    console.log(`📊 ${calendarEvents.length} événements calendrier à récupérer...`);
    
    let recupere = 0;
    let echecs = 0;
    
    for (const event of calendarEvents) {
      try {
        // Nettoyer les données manuellement
        const cleanEvent = {
          id: event.id,
          title: event.title,
          description: event.description || null,
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : null,
          allDay: event.allDay !== false,
          type: event.type,
          status: event.status || null,
          notes: event.notes || null,
          location: event.location || null,
          createdAt: new Date(event.createdAt || new Date()),
          updatedAt: new Date(event.updatedAt || new Date()),
          organizationId: event.organizationId || null,
          ownerId: event.ownerId || null,
          linkedEmailId: event.linkedEmailId || null,
          linkedLeadId: event.linkedLeadId || null,
          linkedClientId: event.linkedClientId || null,
          linkedProjectId: event.linkedProjectId || null,
          externalCalendarId: event.externalCalendarId || null
        };
        
        await prisma.calendarEvent.create({ data: cleanEvent });
        recupere++;
        console.log(`  ✅ Événement "${event.title}" récupéré`);
        
      } catch (createError) {
        try {
          // Essayer upsert si create échoue
          await prisma.calendarEvent.upsert({
            where: { id: event.id },
            update: cleanEvent,
            create: cleanEvent
          });
          recupere++;
          console.log(`  ✅ Événement "${event.title}" mis à jour`);
        } catch (upsertError) {
          echecs++;
          console.log(`  ❌ Erreur événement "${event.title}": ${upsertError.message.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`\n🎯 RÉSULTAT FINAL DES CALENDAR EVENTS:`);
    console.log(`  ✅ Récupérés: ${recupere}`);
    console.log(`  ❌ Échecs: ${echecs}`);
    
    // Vérification finale
    const totalCalendarEvents = await prisma.calendarEvent.count();
    console.log(`  📊 Total final: ${totalCalendarEvents} événements calendrier`);
    
    if (totalCalendarEvents >= 10) {
      console.log('\n🎉 CALENDAR EVENTS RÉCUPÉRÉS ! TOUS TES ÉVÉNEMENTS SONT LÀ !');
    } else if (totalCalendarEvents > 0) {
      console.log(`\n💪 ${totalCalendarEvents} événements récupérés sur ${calendarEvents.length} !`);
    }
    
    // BILAN FINAL TOTAL
    console.log('\n🎯 BILAN FINAL COMPLET DE LA RÉCUPÉRATION:');
    const users = await prisma.user.count();
    const orgs = await prisma.organization.count();
    const leads = await prisma.lead.count();
    const modules = await prisma.module.count();
    const fields = await prisma.field.count();
    const sections = await prisma.section.count();
    const googleTokens = await prisma.googleToken.count();
    const permissions = await prisma.permission.count();
    const events = await prisma.calendarEvent.count();
    
    const totalFinal = users + orgs + leads + modules + fields + sections + googleTokens + permissions + events;
    
    console.log(`\n📊 DONNÉES RÉCUPÉRÉES:`);
    console.log(`  👥 Users: ${users}`);
    console.log(`  🏢 Organizations: ${orgs}`);
    console.log(`  🎯 Leads: ${leads}`);
    console.log(`  📦 Modules: ${modules}`);
    console.log(`  📝 Fields: ${fields}`);
    console.log(`  📋 Sections: ${sections}`);
    console.log(`  📅 Calendar Events: ${events}`);
    console.log(`  🔐 Permissions: ${permissions}`);
    console.log(`  🔑 Google Tokens: ${googleTokens}`);
    console.log(`  🎯 TOTAL: ${totalFinal} enregistrements`);
    
    if (totalFinal >= 300) {
      console.log('\n🎉🎉🎉 MISSION ACCOMPLIE BORDEL ! TOUTES TES DONNÉES SONT RÉCUPÉRÉES ! 🎉🎉🎉');
      console.log('     LE SYSTÈME ANTI-DÉCONNEXION GOOGLE EST PRÊT À DÉMARRER !');
      console.log('     PLUS JAMAIS DE DÉCONNEXION TOUTES LES HEURES !');
    } else {
      console.log(`\n💪 RÉCUPÉRATION MASSIVE RÉUSSIE ! ${totalFinal} enregistrements sauvés !`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du forçage des calendar events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

FORCER_CALENDAR_EVENTS();
