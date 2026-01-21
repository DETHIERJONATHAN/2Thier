/**
 * 🎯 Script de génération automatique des slugs commerciaux
 * 
 * Ce script génère automatiquement un slug commercial (ex: "jean-dupont")
 * pour tous les utilisateurs qui n'en ont pas encore.
 * 
 * Exécution:
 * npx tsx scripts/generate-commercial-slugs.ts
 */

import { db } from '../src/lib/database';

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateUniqueSlug = async (
  firstName: string,
  lastName: string,
  organizationId: string,
  excludeUserId?: string
): Promise<string> => {
  const baseSlug = `${normalizeString(firstName)}-${normalizeString(lastName)}`;
  let slug = baseSlug;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.user.findFirst({
      where: {
        organizationId,
        commercialSlug: slug,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {})
      }
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

async function main() {
  console.log('🎯 Génération automatique des slugs commerciaux...\n');

  // Récupérer tous les utilisateurs sans slug commercial avec leur organisation
  const usersWithoutSlug = await db.user.findMany({
    where: {
      OR: [
        { commercialSlug: null },
        { commercialSlug: '' }
      ],
      firstName: { not: null },
      lastName: { not: null }
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
      UserOrganization: {
        select: {
          organizationId: true
        },
        take: 1
      }
    }
  });

  console.log(`📊 ${usersWithoutSlug.length} utilisateurs sans slug trouvés\n`);

  let updated = 0;
  let skipped = 0;

  for (const user of usersWithoutSlug) {
    if (!user.firstName || !user.lastName) {
      console.log(`⏭️  Ignoré: ${user.email} (prénom/nom manquant)`);
      skipped++;
      continue;
    }

    // Récupérer l'organizationId (priorité: champ direct, sinon UserOrganization)
    const orgId = user.organizationId || user.UserOrganization[0]?.organizationId;
    
    if (!orgId) {
      console.log(`⏭️  Ignoré: ${user.email} (aucune organisation)`);
      skipped++;
      continue;
    }

    try {
      const slug = await generateUniqueSlug(
        user.firstName,
        user.lastName,
        orgId,
        user.id
      );

      await db.user.update({
        where: { id: user.id },
        data: { 
          commercialSlug: slug,
          organizationId: orgId  // Mettre à jour aussi l'organizationId
        }
      });

      console.log(`✅ ${user.firstName} ${user.lastName} → ${slug}`);
      updated++;
    } catch (error) {
      console.error(`❌ Erreur pour ${user.email}:`, error);
      skipped++;
    }
  }

  console.log(`\n📈 Résumé:`);
  console.log(`   ✅ ${updated} slugs générés`);
  console.log(`   ⏭️  ${skipped} ignorés`);
  console.log(`\n🎉 Terminé!`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
