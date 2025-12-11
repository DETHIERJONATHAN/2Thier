#!/usr/bin/env node
/**
 * 🧪 Script de test pour vérifier les corrections du système de suffixes
 * 
 * Vérifie que :
 * 1. repeater_templateNodeIds ne contient AUCUN ID avec suffixe (-1, -2, etc.)
 * 2. Les variables copiées ont des sourceRef corrects
 * 3. Pas de double suffixes (-1-1, -1-2, etc.)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧪 === TEST DES CORRECTIONS DE SUFFIXES ===\n');

  // 1. Vérifier tous les repeaters
  console.log('📋 1. Vérification des repeater_templateNodeIds...');
  const repeaters = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { repeater_templateNodeIds: { not: null } },
        { metadata: { path: ['repeater', 'templateNodeIds'], not: null } }
      ]
    },
    select: {
      id: true,
      label: true,
      repeater_templateNodeIds: true,
      metadata: true
    }
  });

  let hasProblems = false;

  for (const repeater of repeaters) {
    console.log(`\n  📦 Repeater: "${repeater.label}" (${repeater.id})`);
    
    // Vérifier la colonne
    if (repeater.repeater_templateNodeIds) {
      try {
        const ids = JSON.parse(repeater.repeater_templateNodeIds);
        const suffixedIds = ids.filter(id => id.match(/-\d+$/));
        
        if (suffixedIds.length > 0) {
          console.log(`    ❌ ERREUR: repeater_templateNodeIds contient des IDs suffixés:`);
          suffixedIds.forEach(id => console.log(`       - ${id}`));
          hasProblems = true;
        } else {
          console.log(`    ✅ repeater_templateNodeIds OK (${ids.length} IDs propres)`);
        }
      } catch (e) {
        console.log(`    ⚠️ Erreur de parsing JSON: ${e.message}`);
      }
    }

    // Vérifier les métadonnées
    if (repeater.metadata && typeof repeater.metadata === 'object') {
      const meta = repeater.metadata;
      if (meta.repeater?.templateNodeIds && Array.isArray(meta.repeater.templateNodeIds)) {
        const metaIds = meta.repeater.templateNodeIds;
        const suffixedIds = metaIds.filter(id => typeof id === 'string' && id.match(/-\d+$/));
        
        if (suffixedIds.length > 0) {
          console.log(`    ❌ ERREUR: metadata.repeater.templateNodeIds contient des IDs suffixés:`);
          suffixedIds.forEach(id => console.log(`       - ${id}`));
          hasProblems = true;
        } else {
          console.log(`    ✅ metadata.repeater.templateNodeIds OK (${metaIds.length} IDs propres)`);
        }
      }
    }
  }

  // 2. Vérifier les nœuds avec double suffixes
  console.log('\n📋 2. Vérification des double suffixes dans les nœuds...');
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { contains: '-' }
    },
    select: {
      id: true,
      label: true,
      data_exposedKey: true
    }
  });

  const doubleSuffixed = allNodes.filter(node => {
    // ⚠️ DÉTECTION PRÉCISE: Chercher UNIQUEMENT les doubles suffixes EN FIN d'ID
    // Exemples à détecter: "node-1-1", "uuid-2-3", "field-1-2"
    // Ne PAS détecter: UUIDs (8-4-4-4-12), shared-ref-timestamp, node_timestamp_random
    
    // Pattern: ID se terminant par -chiffre-chiffre (ex: quelquechose-1-1)
    const doubleSuffixPattern = /-\d+-\d+$/;
    return doubleSuffixPattern.test(node.id);
  });

  if (doubleSuffixed.length > 0) {
    console.log(`  ❌ ERREUR: ${doubleSuffixed.length} nœuds avec double suffixes:`);
    doubleSuffixed.forEach(node => {
      console.log(`     - ${node.label || node.data_exposedKey}: ${node.id}`);
    });
    hasProblems = true;
  } else {
    console.log(`  ✅ Aucun nœud avec double suffixe trouvé`);
  }

  // 3. Vérifier les variables avec double suffixes
  console.log('\n📋 3. Vérification des double suffixes dans les variables...');
  const allVars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      id: { contains: '-' }
    },
    select: {
      id: true,
      exposedKey: true,
      sourceRef: true,
      nodeId: true
    }
  });

  const varsWithDoubleSuffix = allVars.filter(v => {
    // ⚠️ DÉTECTION PRÉCISE: Pattern -chiffre-chiffre EN FIN d'ID
    const doubleSuffixPattern = /-\d+-\d+$/;
    return doubleSuffixPattern.test(v.id);
  });

  if (varsWithDoubleSuffix.length > 0) {
    console.log(`  ❌ ERREUR: ${varsWithDoubleSuffix.length} variables avec double suffixes:`);
    varsWithDoubleSuffix.forEach(v => {
      console.log(`     - ${v.exposedKey}: ${v.id}`);
      console.log(`       sourceRef: ${v.sourceRef}`);
      console.log(`       nodeId: ${v.nodeId}`);
    });
    hasProblems = true;
  } else {
    console.log(`  ✅ Aucune variable avec double suffixe trouvée`);
  }

  // 4. Vérifier les sourceRef avec double suffixes
  const varsWithBadSourceRef = allVars.filter(v => {
    if (!v.sourceRef) return false;
    
    // Extraire l'ID depuis le sourceRef (après le préfixe : ou .)
    let id = v.sourceRef;
    if (v.sourceRef.includes(':')) {
      id = v.sourceRef.split(':').pop() || '';
    } else if (v.sourceRef.includes('.')) {
      id = v.sourceRef.split('.').pop() || '';
    }
    
    // ⚠️ DÉTECTION PRÉCISE: Pattern -chiffre-chiffre EN FIN d'ID
    const doubleSuffixPattern = /-\d+-\d+$/;
    return doubleSuffixPattern.test(id);
  });

  if (varsWithBadSourceRef.length > 0) {
    console.log(`\n  ❌ ERREUR: ${varsWithBadSourceRef.length} variables avec sourceRef double-suffixé:`);
    varsWithBadSourceRef.forEach(v => {
      console.log(`     - ${v.exposedKey}: ${v.sourceRef}`);
    });
    hasProblems = true;
  } else {
    console.log(`  ✅ Tous les sourceRef sont corrects`);
  }

  // Résumé
  console.log('\n' + '='.repeat(60));
  if (hasProblems) {
    console.log('❌ DES PROBLÈMES ONT ÉTÉ DÉTECTÉS');
    console.log('   Exécutez le script de nettoyage pour corriger.');
  } else {
    console.log('✅ TOUS LES TESTS SONT PASSÉS');
    console.log('   Le système de suffixes fonctionne correctement.');
  }
  console.log('='.repeat(60) + '\n');
}

main()
  .catch(e => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
