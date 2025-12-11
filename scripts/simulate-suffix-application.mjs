#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNOSTIC: Analyser les appels à applySuffixToSourceRef
 * 
 * Ce script simule le comportement de applySuffixToSourceRef
 * pour comprendre où les doubles suffixes se forment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simuler la fonction parseSourceRef
function parseSourceRef(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'string') return null;

  const cleaned = sourceRef.trim();
  if (!cleaned) return null;

  if (cleaned.startsWith('node-formula:')) {
    return { type: 'formula', id: cleaned.replace('node-formula:', ''), prefix: 'node-formula:' };
  }
  if (cleaned.startsWith('formula:')) {
    return { type: 'formula', id: cleaned.replace('formula:', ''), prefix: 'formula:' };
  }
  if (cleaned.startsWith('condition:')) {
    return { type: 'condition', id: cleaned.replace('condition:', ''), prefix: 'condition:' };
  }
  if (cleaned.startsWith('node-condition:')) {
    return { type: 'condition', id: cleaned.replace('node-condition:', ''), prefix: 'node-condition:' };
  }
  if (cleaned.startsWith('@table.')) {
    return { type: 'table', id: cleaned.replace('@table.', ''), prefix: '@table.' };
  }
  if (cleaned.startsWith('@table:')) {
    return { type: 'table', id: cleaned.replace('@table:', ''), prefix: '@table:' };
  }
  if (cleaned.startsWith('table:')) {
    return { type: 'table', id: cleaned.replace('table:', ''), prefix: 'table:' };
  }
  if (cleaned.startsWith('node-table:')) {
    return { type: 'table', id: cleaned.replace('node-table:', ''), prefix: 'node-table:' };
  }

  return { type: 'field', id: cleaned, prefix: '' };
}

// Version AVANT correction
function applySuffixToSourceRef_OLD(sourceRef, suffix) {
  if (!sourceRef) return null;
  const parsed = parseSourceRef(sourceRef);
  if (!parsed) return sourceRef;
  const newId = `${parsed.id}-${suffix}`;
  return `${parsed.prefix}${newId}`;
}

// Version APRÈS correction
function applySuffixToSourceRef_NEW(sourceRef, suffix) {
  if (!sourceRef) return null;
  const parsed = parseSourceRef(sourceRef);
  if (!parsed) return sourceRef;
  
  // 🔒 Safety: avoid double suffixing an ID that already ends with the same token
  const suffixStr = `${suffix}`;
  const alreadySuffixed = parsed.id.endsWith(`-${suffixStr}`);
  if (alreadySuffixed) return `${parsed.prefix}${parsed.id}`;

  const newId = `${parsed.id}-${suffixStr}`;
  return `${parsed.prefix}${newId}`;
}

async function main() {
  console.log('\n🔍 SIMULATION DE applySuffixToSourceRef\n');
  console.log('═'.repeat(80));

  // Chercher les variables avec des sourceRef
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      sourceRef: { not: null },
      OR: [
        { exposedKey: { contains: 'rampant', mode: 'insensitive' } },
        { displayName: { contains: 'rampant', mode: 'insensitive' } }
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
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 ${variables.length} variable(s) avec sourceRef trouvée(s)\n`);

  for (const variable of variables) {
    console.log('\n' + '─'.repeat(80));
    console.log(`📌 Variable: ${variable.displayName || variable.exposedKey}`);
    console.log(`   ID: ${variable.id}`);
    console.log(`   SourceRef actuel: ${variable.sourceRef}`);
    
    if (variable.TreeBranchLeafNode) {
      const meta = variable.TreeBranchLeafNode.metadata || {};
      console.log(`   Nœud: ${variable.TreeBranchLeafNode.label}`);
      console.log(`   CopySuffix: ${meta.copySuffix || 'N/A'}`);

      // Simuler l'application de suffixe
      const suffix = meta.copySuffix || 1;
      
      console.log(`\n   🧪 SIMULATION avec suffix=${suffix}:`);
      console.log(`      Input: "${variable.sourceRef}"`);
      
      const resultOld = applySuffixToSourceRef_OLD(variable.sourceRef, suffix);
      const resultNew = applySuffixToSourceRef_NEW(variable.sourceRef, suffix);
      
      console.log(`      OLD (sans garde): "${resultOld}"`);
      console.log(`      NEW (avec garde): "${resultNew}"`);
      
      if (resultOld !== resultNew) {
        console.log(`      ✅ LA GARDE A ÉVITÉ UN DOUBLE SUFFIXE!`);
      } else {
        console.log(`      ✓ Pas de changement nécessaire`);
      }

      // Détecter si le sourceRef a déjà des suffixes multiples
      const parsed = parseSourceRef(variable.sourceRef);
      if (parsed) {
        const suffixMatches = parsed.id.match(/-\d+/g);
        if (suffixMatches && suffixMatches.length > 1) {
          console.log(`      ⚠️  SOURCE DÉJÀ PROBLÉMATIQUE: ${suffixMatches.length} suffixes: ${suffixMatches.join(' → ')}`);
        }
      }
    }
  }

  // Test de cas spécifiques
  console.log('\n\n' + '═'.repeat(80));
  console.log('\n🧪 TESTS DE CAS SPÉCIFIQUES\n');

  const testCases = [
    { sourceRef: 'shared-ref-123', suffix: 1, scenario: 'Première copie shared-ref' },
    { sourceRef: 'shared-ref-123-1', suffix: 1, scenario: 'Re-copie avec même suffixe (BUG!)' },
    { sourceRef: 'shared-ref-123-1', suffix: 2, scenario: 'Deuxième copie' },
    { sourceRef: 'node-formula:abc-def-123', suffix: 1, scenario: 'Formule avec ID UUID' },
    { sourceRef: 'node-formula:abc-def-123-1', suffix: 1, scenario: 'Formule déjà suffixée (BUG!)' },
    { sourceRef: 'condition:xyz-789', suffix: 1, scenario: 'Condition normale' },
    { sourceRef: 'condition:xyz-789-1', suffix: 1, scenario: 'Condition déjà suffixée (BUG!)' },
  ];

  for (const testCase of testCases) {
    console.log(`\n  📋 ${testCase.scenario}`);
    console.log(`     Input: "${testCase.sourceRef}" + suffix=${testCase.suffix}`);
    
    const resultOld = applySuffixToSourceRef_OLD(testCase.sourceRef, testCase.suffix);
    const resultNew = applySuffixToSourceRef_NEW(testCase.sourceRef, testCase.suffix);
    
    console.log(`     OLD: "${resultOld}"`);
    console.log(`     NEW: "${resultNew}"`);
    
    if (resultOld !== resultNew) {
      console.log(`     ✅ CORRECTION APPLIQUÉE!`);
    }
    
    // Vérifier si le résultat OLD contient des doubles suffixes
    if (resultOld && /-\d+-\d+/.test(resultOld)) {
      console.log(`     ⚠️  OLD GÉNÈRE UN DOUBLE SUFFIXE!`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Analyse terminée\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
