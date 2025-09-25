// Script pour déclencher une synchronisation manuelle
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function triggerManualSync() {
  console.log('🔄 Déclenchement d\'une synchronisation manuelle...');
  
  try {
    const response = await fetch('http://localhost:4000/api/mail/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOGViYTM2OS05OWY0LTRjMWEtOWQ3MS04NWU1ODI3ODc1OTAiLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3Mzc0ODY0NzMsImV4cCI6MTczNzU3Mjg3M30.ipj1D0hvDbOd3_DdNh1m_ZAcQVE0HGO3zHAiKZNZK5w'
      }
    });

    const result = await response.json();
    console.log('📧 Résultat de la synchronisation:', result);

    // Vérifier les UID après sync
    const emailsWithUID = await prisma.email.count({
      where: { uid: { not: null } }
    });
    console.log(`✅ Emails avec UID après sync: ${emailsWithUID}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

triggerManualSync();
