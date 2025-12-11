#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNOSTIC: Tracer la création de "Rampant toiture-1-1"
 * 
 * Ce script cherche:
 * 1. Tous les nœuds avec "Rampant toiture" dans le label
 * 2. Leurs variables associées et leur sourceRef
 * 3. Les métadonnées de copie (copiedFromNodeId, copySuffix)
 * 4. L'historique des suffixes appliqués
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 RECHERCHE DES NŒUDS "Rampant toiture"\n');
  console.log('═'.repeat(80));

  // Chercher tous les nœuds avec "rampant" et "toiture" dans le label
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Rampant toiture', mode: 'insensitive' } },
        { label: { contains: 'rampant', mode: 'insensitive' } }
      ]
    },
    include: {
      TreeBranchLeafNodeVariable: true
    },
    orderBy: { label: 'asc' }
  });

  console.log(`\n📊 TOTAL: ${nodes.length} nœud(s) trouvé(s)\n`);

  for (const node of nodes) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📌 NŒUD: ${node.label}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Type: ${node.type} / ${node.subType || 'N/A'}`);
    console.log(`   ParentId: ${node.parentId || 'ROOT'}`);

    // Analyser les métadonnées
    const metadata = node.metadata || {};
    console.log('\n   📋 MÉTADONNÉES:');
    console.log(`      copiedFromNodeId: ${metadata.copiedFromNodeId || 'N/A'}`);
    console.log(`      copySuffix: ${metadata.copySuffix || 'N/A'}`);
    console.log(`      sourceTemplateId: ${metadata.sourceTemplateId || 'N/A'}`);
    console.log(`      duplicatedFromRepeater: ${metadata.duplicatedFromRepeater || 'N/A'}`);
    console.log(`      isRepeaterInstance: ${metadata.isRepeaterInstance || 'N/A'}`);

    // Analyser l'ID pour détecter les suffixes
    const idParts = node.id.match(/^(.+?)(-\d+)+$/);
    if (idParts) {
      console.log('\n   🔢 ANALYSE DE L\'ID:');
      console.log(`      Base: ${idParts[1]}`);
      const suffixes = node.id.substring(idParts[1].length).match(/-\d+/g);
      console.log(`      Suffixes détectés: ${suffixes?.join(' → ') || 'Aucun'}`);
      
      if (suffixes && suffixes.length > 1) {
        console.log(`      ⚠️  ALERTE: SUFFIXES MULTIPLES DÉTECTÉS!`);
      }
    }

    // Analyser les variables associées
    if (node.TreeBranchLeafNodeVariable && node.TreeBranchLeafNodeVariable.length > 0) {
      console.log('\n   💾 VARIABLES ASSOCIÉES:');
      for (const variable of node.TreeBranchLeafNodeVariable) {
        console.log(`\n      - ${variable.displayName || variable.exposedKey}`);
        console.log(`        ID: ${variable.id}`);
        console.log(`        ExposedKey: ${variable.exposedKey}`);
        console.log(`        SourceType: ${variable.sourceType}`);
        console.log(`        SourceRef: ${variable.sourceRef || 'N/A'}`);
        
        // Analyser le sourceRef
        if (variable.sourceRef) {
          const refParts = variable.sourceRef.match(/^(.+?)(-\d+)+$/);
          if (refParts) {
            console.log(`        SourceRef base: ${refParts[1]}`);
            const refSuffixes = variable.sourceRef.substring(refParts[1].length).match(/-\d+/g);
            console.log(`        SourceRef suffixes: ${refSuffixes?.join(' → ') || 'Aucun'}`);
            
            if (refSuffixes && refSuffixes.length > 1) {
              console.log(`        ⚠️  ALERTE: SUFFIXES MULTIPLES DANS SOURCEREF!`);
            }
          }
        }

        // Métadonnées de la variable
        const varMeta = variable.metadata || {};
        if (Object.keys(varMeta).length > 0) {
          console.log(`        Metadata:`, JSON.stringify(varMeta, null, 10));
        }
      }
    }

    // Chercher l'original si c'est une copie
    if (metadata.copiedFromNodeId) {
      const original = await prisma.treeBranchLeafNode.findUnique({
        where: { id: metadata.copiedFromNodeId },
        select: { 
          id: true, 
          label: true, 
          metadata: true,
          TreeBranchLeafNodeVariable: {
            select: {
              id: true,
              exposedKey: true,
              sourceRef: true
            }
          }
        }
      });

      if (original) {
        console.log('\n   🔗 NŒUD ORIGINAL:');
        console.log(`      Label: ${original.label}`);
        console.log(`      ID: ${original.id}`);
        
        if (original.TreeBranchLeafNodeVariable && original.TreeBranchLeafNodeVariable.length > 0) {
          console.log(`      Variables originales:`);
          for (const ov of original.TreeBranchLeafNodeVariable) {
            console.log(`        - ${ov.exposedKey}: sourceRef=${ov.sourceRef || 'N/A'}`);
          }
        }
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n🔍 ANALYSE DES PATTERNS DE SUFFIXES\n');

  // Compter les patterns de suffixes
  const suffixPatterns = new Map();
  for (const node of nodes) {
    const match = node.id.match(/(-\d+)+$/);
    if (match) {
      const pattern = match[0];
      suffixPatterns.set(pattern, (suffixPatterns.get(pattern) || 0) + 1);
    }
  }

  console.log('📊 Patterns de suffixes trouvés:');
  for (const [pattern, count] of suffixPatterns.entries()) {
    const suffixCount = (pattern.match(/-\d+/g) || []).length;
    const marker = suffixCount > 1 ? '⚠️  ' : '✅ ';
    console.log(`   ${marker}${pattern}: ${count} occurrence(s) (${suffixCount} suffixe(s))`);
  }

  console.log('\n✅ Analyse terminée\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
