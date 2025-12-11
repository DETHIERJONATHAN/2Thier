#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNOSTIC: Comprendre le flux de création des copies
 * 
 * Ce script simule le comportement de deepCopyNodeInternal
 * pour comprendre comment les IDs sont générés.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRepeaterCopies() {
  console.log('\n🔍 ANALYSE DES COPIES DE REPEATER\n');
  console.log('═'.repeat(80));

  // Chercher un repeater
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: {
      type: 'repeater'
    }
  });

  if (!repeater) {
    console.log('❌ Aucun repeater trouvé');
    return;
  }

  console.log(`📌 Repeater trouvé: ${repeater.label} (${repeater.id})`);
  const metadata = repeater.metadata || {};
  console.log(`   duplicatedFromRepeater: ${metadata.duplicatedFromRepeater || 'N/A'}`);

  // Chercher tous les nœuds liés à ce repeater
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      metadata: {
        path: ['duplicatedFromRepeater'],
        equals: repeater.id
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n📊 ${copies.length} copie(s) trouvée(s)\n`);

  const copiesByTemplate = new Map();

  for (const copy of copies) {
    const meta = copy.metadata || {};
    const templateId = meta.sourceTemplateId || meta.copiedFromNodeId || 'unknown';
    const suffix = meta.copySuffix;

    if (!copiesByTemplate.has(templateId)) {
      copiesByTemplate.set(templateId, []);
    }
    copiesByTemplate.get(templateId).push({
      id: copy.id,
      label: copy.label,
      suffix,
      createdAt: copy.createdAt
    });
  }

  console.log('📋 Analyse par template:\n');

  for (const [templateId, copies] of copiesByTemplate.entries()) {
    // Chercher le template
    const template = await prisma.treeBranchLeafNode.findUnique({
      where: { id: templateId },
      select: { label: true }
    });

    console.log(`\n📦 Template: ${template?.label || 'Unknown'} (${templateId})`);
    console.log(`   Copies créées:`);

    for (const copy of copies) {
      const idParts = copy.id.match(/^(.+?)(-\d+)+$/);
      let suffixInfo = 'Aucun';
      let warning = '';
      
      if (idParts) {
        const base = idParts[1];
        const suffixes = copy.id.substring(base.length).match(/-\d+/g) || [];
        suffixInfo = suffixes.join(' → ');
        
        if (suffixes.length > 1) {
          warning = ' ⚠️  DOUBLE SUFFIXE!';
        }
      }

      console.log(`      ${copy.label}`);
      console.log(`         ID: ${copy.id}`);
      console.log(`         Suffixes: ${suffixInfo}${warning}`);
      console.log(`         copySuffix (metadata): ${copy.suffix || 'N/A'}`);
      console.log(`         Créé: ${copy.createdAt.toISOString()}`);
    }
  }

  // Analyser la séquence de création
  console.log('\n\n' + '═'.repeat(80));
  console.log('\n🕐 CHRONOLOGIE DE CRÉATION\n');

  const allCopiesSorted = copies.sort((a, b) => 
    a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (let i = 0; i < allCopiesSorted.length; i++) {
    const copy = allCopiesSorted[i];
    const meta = copy.metadata || {};
    
    console.log(`\n${i + 1}. ${copy.label} (${copy.createdAt.toISOString()})`);
    console.log(`   ID: ${copy.id}`);
    console.log(`   copySuffix: ${meta.copySuffix || 'N/A'}`);
    
    // Analyser les suffixes
    const idParts = copy.id.match(/^(.+?)(-\d+)+$/);
    if (idParts) {
      const base = idParts[1];
      const suffixes = copy.id.substring(base.length).match(/-\d+/g) || [];
      
      if (suffixes.length > 1) {
        console.log(`   ⚠️  PROBLÈME: ${suffixes.length} suffixes cumulés!`);
        console.log(`   Base: ${base}`);
        console.log(`   Suffixes: ${suffixes.join(' → ')}`);
        
        // Est-ce que c'était censé être une copie de quoi?
        const expectedSuffix = meta.copySuffix || 1;
        console.log(`   Suffixe attendu: -${expectedSuffix}`);
        console.log(`   Suffixe obtenu: ${copy.id.substring(base.length)}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Analyse terminée\n');
}

async function main() {
  await analyzeRepeaterCopies();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
