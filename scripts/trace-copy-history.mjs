#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNOSTIC: Tracer l'historique de copie d'un nœud
 * 
 * Ce script remonte la chaîne complète des copies pour comprendre
 * comment un nœud avec des suffixes multiples a été créé.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceNodeHistory(nodeId, depth = 0) {
  const indent = '  '.repeat(depth);
  
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    include: {
      TreeBranchLeafNodeVariable: {
        select: {
          id: true,
          exposedKey: true,
          sourceRef: true,
          displayName: true
        }
      }
    }
  });

  if (!node) {
    console.log(`${indent}❌ Nœud ${nodeId} introuvable`);
    return;
  }

  const metadata = node.metadata || {};
  
  console.log(`${indent}${'▼'.repeat(depth + 1)} ${node.label} (${node.id})`);
  console.log(`${indent}   Type: ${node.type}`);
  console.log(`${indent}   CopySuffix: ${metadata.copySuffix || 'N/A'}`);
  
  // Analyser les suffixes dans l'ID
  const idMatch = node.id.match(/^(.+?)(-\d+)+$/);
  if (idMatch) {
    const base = idMatch[1];
    const suffixes = node.id.substring(base.length).match(/-\d+/g) || [];
    console.log(`${indent}   ID Base: ${base}`);
    console.log(`${indent}   ID Suffixes: ${suffixes.join(' → ')}`);
    
    if (suffixes.length > 1) {
      console.log(`${indent}   ⚠️  PROBLÈME: ${suffixes.length} suffixes cumulés!`);
    }
  }

  // Variables
  if (node.TreeBranchLeafNodeVariable && node.TreeBranchLeafNodeVariable.length > 0) {
    console.log(`${indent}   Variables:`);
    for (const v of node.TreeBranchLeafNodeVariable) {
      console.log(`${indent}      - ${v.displayName || v.exposedKey}`);
      console.log(`${indent}        ID: ${v.id}`);
      console.log(`${indent}        SourceRef: ${v.sourceRef || 'N/A'}`);
      
      // Analyser sourceRef
      if (v.sourceRef) {
        const refMatch = v.sourceRef.match(/^(.+?)(-\d+)+$/);
        if (refMatch) {
          const refSuffixes = v.sourceRef.substring(refMatch[1].length).match(/-\d+/g) || [];
          if (refSuffixes.length > 1) {
            console.log(`${indent}        ⚠️  SourceRef avec ${refSuffixes.length} suffixes: ${refSuffixes.join(' → ')}`);
          }
        }
      }
    }
  }

  // Remonter à l'original
  if (metadata.copiedFromNodeId) {
    console.log(`${indent}   ↑ Copié depuis: ${metadata.copiedFromNodeId}`);
    console.log('');
    await traceNodeHistory(metadata.copiedFromNodeId, depth + 1);
  } else {
    console.log(`${indent}   🌟 NŒUD ORIGINAL (pas de copiedFromNodeId)`);
  }
}

async function main() {
  console.log('\n🔍 TRAÇAGE DE L\'HISTORIQUE DE COPIE\n');
  console.log('═'.repeat(80));

  // Chercher les nœuds avec suffixes multiples
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Rampant toiture', mode: 'insensitive' } },
        { id: { contains: '-1-1' } },
        { id: { contains: '-2-2' } },
        { id: { contains: '-1-2' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 ${nodes.length} nœud(s) suspect(s) trouvé(s)\n`);

  for (const node of nodes) {
    const hasSuspectSuffix = /-\d+-\d+/.test(node.id);
    if (hasSuspectSuffix) {
      console.log('\n' + '─'.repeat(80));
      console.log(`\n🚨 NŒUD SUSPECT DÉTECTÉ: ${node.label}`);
      console.log(`   ID complet: ${node.id}`);
      console.log(`\n📜 Historique de copie:\n`);
      
      await traceNodeHistory(node.id);
      
      console.log('\n' + '─'.repeat(80));
    }
  }

  // Chercher aussi les variables avec sourceRef suspects
  console.log('\n\n🔍 RECHERCHE DES VARIABLES AVEC SOURCEREF MULTISUFFIXÉS\n');
  console.log('═'.repeat(80));

  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { sourceRef: { contains: '-1-1' } },
        { sourceRef: { contains: '-2-2' } },
        { sourceRef: { contains: '-1-2' } },
        { exposedKey: { contains: '-1-1' } },
        { exposedKey: { contains: '-2-2' } }
      ]
    },
    include: {
      TreeBranchLeafNode: {
        select: {
          id: true,
          label: true,
          metadata: true
        }
      }
    }
  });

  console.log(`\n📊 ${variables.length} variable(s) suspecte(s) trouvée(s)\n`);

  for (const variable of variables) {
    console.log('\n' + '─'.repeat(40));
    console.log(`🚨 Variable: ${variable.displayName || variable.exposedKey}`);
    console.log(`   ID: ${variable.id}`);
    console.log(`   ExposedKey: ${variable.exposedKey}`);
    console.log(`   SourceRef: ${variable.sourceRef || 'N/A'}`);
    console.log(`   NodeId: ${variable.nodeId}`);
    
    if (variable.TreeBranchLeafNode) {
      console.log(`   Nœud propriétaire: ${variable.TreeBranchLeafNode.label}`);
      const meta = variable.TreeBranchLeafNode.metadata || {};
      console.log(`   CopySuffix du nœud: ${meta.copySuffix || 'N/A'}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Analyse terminée\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
