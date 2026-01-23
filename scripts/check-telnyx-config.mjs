#!/usr/bin/env node
/**
 * Script pour vérifier la configuration Telnyx d'un utilisateur
 * Usage: node scripts/check-telnyx-config.mjs
 */

import { PrismaClient } from '@prisma/client';
import { decrypt } from '../dist-server/api-server-clean.cjs';

const prisma = new PrismaClient();

async function checkTelnyxConfig() {
  try {
    console.log('🔍 Vérification de la configuration Telnyx...\n');

    // Trouver l'utilisateur Jonathan Dethier
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'dethier.jls@gmail.com' },
          { email: 'jonathan.dethier@2thier.be' }
        ]
      },
      include: {
        Organization: true
      }
    });

    if (!user) {
      console.log('❌ Utilisateur non trouvé');
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Organisation: ${user.Organization?.name}\n`);

    // Vérifier la configuration Telnyx de l'utilisateur
    const telnyxConfig = await prisma.telnyxUserConfig.findUnique({
      where: { userId: user.id }
    });

    if (telnyxConfig) {
      console.log('📞 Configuration Telnyx utilisateur:');
      console.log(`   Activé: ${telnyxConfig.canMakeCalls ? '✅ OUI' : '❌ NON'}`);
      console.log(`   Numéro assigné: ${telnyxConfig.assignedNumber || '❌ Aucun'}`);
      console.log(`   Peut appeler: ${telnyxConfig.canMakeCalls ? '✅' : '❌'}`);
      console.log(`   Peut envoyer SMS: ${telnyxConfig.canSendSms ? '✅' : '❌'}\n`);
    } else {
      console.log('❌ Aucune configuration Telnyx trouvée pour cet utilisateur\n');
    }

    // Vérifier les SIP endpoints de l'organisation
    const sipEndpoints = await prisma.telnyxSipEndpoint.findMany({
      where: { 
        organizationId: user.organizationId,
        userId: user.id 
      },
      orderBy: { priority: 'asc' }
    });

    if (sipEndpoints.length > 0) {
      console.log('🎯 SIP Endpoints configurés:');
      for (const endpoint of sipEndpoints) {
        console.log(`\n   Nom: ${endpoint.name}`);
        console.log(`   Username: ${endpoint.sipUsername}`);
        console.log(`   Domain: ${endpoint.sipDomain}`);
        console.log(`   Password: [CHIFFRÉ - voir dans le CRM]`);
        console.log(`   Priorité: ${endpoint.priority}`);
        console.log(`   Status: ${endpoint.status}`);
      }
    } else {
      console.log('❌ Aucun SIP endpoint trouvé pour ton utilisateur');
      
      // Vérifier les endpoints d'organisation
      const orgEndpoints = await prisma.telnyxSipEndpoint.findMany({
        where: { 
          organizationId: user.organizationId,
          userId: null
        },
        orderBy: { priority: 'asc' }
      });

      if (orgEndpoints.length > 0) {
        console.log('\n📋 Endpoints d\'organisation disponibles:');
        for (const endpoint of orgEndpoints) {
          console.log(`   - ${endpoint.name} (${endpoint.sipUsername}@${endpoint.sipDomain})`);
        }
      }
    }

    // Vérifier les numéros disponibles
    const phoneNumbers = await prisma.telnyxPhoneNumber.findMany({
      where: { organizationId: user.organizationId }
    });

    console.log('\n\n📱 Numéros Telnyx de l\'organisation:');
    if (phoneNumbers.length > 0) {
      for (const number of phoneNumbers) {
        const assigned = number.assignedUserId === user.id ? '👤 TOI' : 
                        number.assignedUserId ? '👤 Autre utilisateur' : '🆓 Libre';
        console.log(`   ${number.phoneNumber} - ${assigned} (${number.status})`);
      }
    } else {
      console.log('   ❌ Aucun numéro acheté pour cette organisation');
      console.log('\n💡 Pour acheter un numéro:');
      console.log('   1. Va dans Admin > Configuration Telnyx');
      console.log('   2. Clique sur "Acheter un numéro"');
      console.log('   3. Choisis Belgique (BE) et type Local');
    }

    console.log('\n\n📝 RÉSUMÉ POUR CONFIGURER TON SOFTPHONE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (sipEndpoints.length > 0) {
      const endpoint = sipEndpoints[0];
      console.log(`Username: ${endpoint.sipUsername}`);
      console.log(`Domain: ${endpoint.sipDomain}`);
      console.log(`Password: [Voir dans le CRM ou créer un nouveau endpoint]`);
      console.log(`Caller ID: ${telnyxConfig?.assignedNumber || phoneNumbers[0]?.phoneNumber || 'Aucun numéro'}`);
    } else {
      console.log('❌ Tu n\'as pas encore de SIP endpoint configuré.');
      console.log('\n💡 Pour créer un SIP endpoint:');
      console.log('   1. Va dans Admin > Configuration Telnyx');
      console.log('   2. Section "SIP Endpoints"');
      console.log('   3. Clique sur "Créer Endpoint SIP"');
      console.log('   4. Remplis:');
      console.log('      - Nom: "Mon Softphone"');
      console.log('      - Username: jonathandethier');
      console.log('      - Password: JIsI2022@ (ou autre)');
      console.log('      - Domain: sip.telnyx.com');
      console.log('      - Priorité: 2 (Softphone)');
      console.log('      - Utilisateur: TOI');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTelnyxConfig();
