/**
 * 🏠 Script de migration - Extraction des composants d'adresse
 * 
 * Ce script parse les adresses existantes dans les leads et extrait :
 * - streetName (nom de rue)
 * - streetNumber (numéro)
 * - postalCode (code postal)
 * - locality (localité/ville)
 * 
 * Format belge typique : "Rue de Floreffe 37, 5150 Floreffe, Belgium"
 * 
 * Usage: npx tsx scripts/migrate-address-components.ts
 */

import { db } from '../src/lib/database';

// Regex pour parser les adresses belges
// Format: "Rue Name NuméroRue, CodePostal Localité, Pays"
// ou: "NuméroRue Rue Name, CodePostal Localité, Pays"
const BELGIAN_ADDRESS_REGEX = /^(.+?)\s*,\s*(\d{4})\s+([^,]+?)(?:\s*,\s*(.+))?$/i;

// Regex pour extraire numéro de rue (peut être au début ou à la fin de la partie rue)
const STREET_NUMBER_REGEX = /^(\d+[a-zA-Z]?)\s+(.+)$|^(.+?)\s+(\d+[a-zA-Z]?)$/;

interface AddressComponents {
  streetName?: string;
  streetNumber?: string;
  postalCode?: string;
  locality?: string;
  country?: string;
}

/**
 * Parse une adresse belge et extrait ses composants
 */
function parseAddress(address: string): AddressComponents | null {
  if (!address || typeof address !== 'string') return null;
  
  const trimmed = address.trim();
  const match = trimmed.match(BELGIAN_ADDRESS_REGEX);
  
  if (!match) {
    console.log(`  ⚠️ Format non reconnu: "${trimmed}"`);
    return null;
  }
  
  const [, streetPart, postalCode, locality, country] = match;
  
  // Extraire le numéro de la partie rue
  let streetName = streetPart.trim();
  let streetNumber: string | undefined;
  
  const streetMatch = streetPart.match(STREET_NUMBER_REGEX);
  if (streetMatch) {
    if (streetMatch[1] && streetMatch[2]) {
      // Numéro au début: "37 Rue de Floreffe"
      streetNumber = streetMatch[1];
      streetName = streetMatch[2].trim();
    } else if (streetMatch[3] && streetMatch[4]) {
      // Numéro à la fin: "Rue de Floreffe 37"
      streetName = streetMatch[3].trim();
      streetNumber = streetMatch[4];
    }
  }
  
  return {
    streetName,
    streetNumber,
    postalCode,
    locality: locality?.trim(),
    country: country?.trim() || 'Belgium'
  };
}

async function migrateAddressComponents() {
  console.log('🏠 Migration des composants d\'adresse des leads\n');
  console.log('=' .repeat(60));
  
  // Récupérer tous les leads avec une adresse dans data
  const leads = await db.lead.findMany({
    where: {
      data: {
        not: null
      }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      data: true
    }
  });
  
  console.log(`\n📊 ${leads.length} leads trouvés avec des données\n`);
  
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const lead of leads) {
    const data = lead.data as Record<string, unknown> | null;
    if (!data) {
      skipped++;
      continue;
    }
    
    const address = data.address as string | undefined;
    if (!address) {
      skipped++;
      continue;
    }
    
    // Vérifier si déjà migré (postalCode existe déjà)
    if (data.postalCode) {
      console.log(`  ⏭️ ${lead.firstName} ${lead.lastName} - Déjà migré (CP: ${data.postalCode})`);
      skipped++;
      continue;
    }
    
    console.log(`\n📍 ${lead.firstName} ${lead.lastName}`);
    console.log(`   Adresse: "${address}"`);
    
    const components = parseAddress(address);
    
    if (!components || !components.postalCode) {
      console.log(`   ❌ Impossible d'extraire les composants`);
      failed++;
      continue;
    }
    
    console.log(`   ✅ Extrait: ${components.streetName} ${components.streetNumber}, ${components.postalCode} ${components.locality}`);
    
    // Mettre à jour le lead
    try {
      await db.lead.update({
        where: { id: lead.id },
        data: {
          data: {
            ...data,
            streetName: components.streetName,
            streetNumber: components.streetNumber,
            postalCode: components.postalCode,
            locality: components.locality,
            country: components.country
          }
        }
      });
      updated++;
      console.log(`   💾 Mis à jour !`);
    } catch (error) {
      console.error(`   ❌ Erreur mise à jour:`, error);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RÉSUMÉ DE LA MIGRATION');
  console.log('=' .repeat(60));
  console.log(`   ✅ Mis à jour: ${updated}`);
  console.log(`   ⏭️ Ignorés:    ${skipped}`);
  console.log(`   ❌ Échoués:    ${failed}`);
  console.log('=' .repeat(60));
}

// Exécuter la migration
migrateAddressComponents()
  .then(() => {
    console.log('\n✨ Migration terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
