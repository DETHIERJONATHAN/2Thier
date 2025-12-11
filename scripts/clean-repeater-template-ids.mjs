import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🧹 SCRIPT DE NETTOYAGE: Supprime tous les IDs suffixés de repeater_templateNodeIds
 * 
 * Problème: Certains repeaters ont des IDs comme "uuid-1" dans leur liste de templates
 * au lieu d'avoir seulement "uuid". Cela cause des doubles suffixes (-1-1).
 * 
 * Ce script:
 * 1. Trouve tous les repeaters avec templateNodeIds
 * 2. Filtre les IDs pour retirer ceux se terminant par -1, -2, etc.
 * 3. Met à jour la base de données
 */

async function cleanRepeaterTemplateIds() {
  console.log('🧹 Début du nettoyage des repeater_templateNodeIds\n');

  // Récupérer tous les repeaters
  const repeaters = await prisma.treeBranchLeafNode.findMany({
    where: {
      repeater_templateNodeIds: {
        not: null
      }
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  console.log(`📦 Trouvé ${repeaters.length} repeaters avec templateNodeIds\n`);

  let fixedCount = 0;

  for (const repeater of repeaters) {
    let templateIds: string[] = [];
    
    try {
      if (repeater.repeater_templateNodeIds) {
        templateIds = JSON.parse(repeater.repeater_templateNodeIds);
      }
    } catch (e) {
      console.error(`❌ Erreur parse JSON pour repeater ${repeater.id}:`, e);
      continue;
    }

    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      continue;
    }

    // Filtrer les IDs suffixés
    const cleanedIds = templateIds.filter(id => {
      const hasSuffix = /-\d+$/.test(id);
      if (hasSuffix) {
        console.log(`   🔍 ID suffixé détecté: ${id} (sera supprimé)`);
      }
      return !hasSuffix;
    });

    // Si aucun changement, passer au suivant
    if (cleanedIds.length === templateIds.length) {
      console.log(`✅ Repeater "${repeater.label}" (${repeater.id}): Déjà propre (${templateIds.length} IDs)`);
      continue;
    }

    console.log(`🔧 Repeater "${repeater.label}" (${repeater.id}):`);
    console.log(`   Avant: ${templateIds.length} IDs - ${JSON.stringify(templateIds)}`);
    console.log(`   Après: ${cleanedIds.length} IDs - ${JSON.stringify(cleanedIds)}`);

    // Mettre à jour aussi les métadonnées si elles existent
    const metadata = repeater.metadata && typeof repeater.metadata === 'object' && !Array.isArray(repeater.metadata)
      ? { ...(repeater.metadata as Record<string, unknown>) }
      : {};
    
    const repeaterMeta = metadata.repeater && typeof metadata.repeater === 'object'
      ? { ...(metadata.repeater as Record<string, unknown>) }
      : {};
    
    repeaterMeta.templateNodeIds = cleanedIds;
    metadata.repeater = repeaterMeta;

    // Mise à jour
    await prisma.treeBranchLeafNode.update({
      where: { id: repeater.id },
      data: {
        repeater_templateNodeIds: JSON.stringify(cleanedIds),
        metadata: metadata as any
      }
    });

    fixedCount++;
    console.log(`   ✅ Mis à jour\n`);
  }

  console.log(`\n🎉 Nettoyage terminé!`);
  console.log(`   - Total repeaters: ${repeaters.length}`);
  console.log(`   - Repeaters nettoyés: ${fixedCount}`);
  console.log(`   - Repeaters déjà propres: ${repeaters.length - fixedCount}`);
}

cleanRepeaterTemplateIds()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
