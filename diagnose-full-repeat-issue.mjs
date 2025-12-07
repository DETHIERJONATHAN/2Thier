#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🔍 DIAGNOSTIC COMPLET DU SYSTÈME DE RÉPÉTITION\n');
console.log('='+ '='.repeat(70));

// 1. Vérifier le template
const repeaterId = 'e6474654-9c34-41d8-9cf5-1cce00bcfe6c';
const repeater = await prisma.treeBranchLeafNode.findUnique({
  where: { id: repeaterId }
});

console.log('\n📋 CONFIGURATION DU REPEATER:');
console.log(`   ID: ${repeaterId}`);
console.log(`   Label: ${repeater.label}`);

const templateNodeIds = JSON.parse(repeater.metadata.templateNodeIds || '[]');
console.log(`   Template nodes: ${templateNodeIds.length}`);

// 2. Récupérer tous les nœuds du template
const templateNodes = await prisma.treeBranchLeafNode.findMany({
  where: { id: { in: templateNodeIds } },
  orderBy: { label: 'asc' }
});

console.log('\n📦 NŒUDS DU TEMPLATE:');
for (const node of templateNodes) {
  const isSection = node.type === 'section';
  const isDisplay = ['9c9f42b2-e0df-4726-8a81-997c0dee71bc', '54adf56b-ee04-44bf-be20-9636be4383d6', 'adbf2827-d5d7-4ef1-9b38-67f76e9129a6'].includes(node.id);
  
  console.log(`   ${isSection ? '📂' : isDisplay ? '🔍' : '📄'} ${node.label} (${node.id.slice(0, 8)}...)`);
  console.log(`      Type: ${node.type}${isSection ? ' ⚠️ SECTION PARENTE' : ''}${isDisplay ? ' ⚠️ DISPLAY NODE' : ''}`);
  console.log(`      Parent: ${node.parentId?.slice(0, 8) || 'root'}`);
}

// 3. Chercher les copies existantes
console.log('\n🔎 COPIES EXISTANTES:');
const allNodes = await prisma.treeBranchLeafNode.findMany({
  where: {
    label: {
      in: templateNodes.map(n => n.label).flatMap(label => [
        label + '-1',
        label + '-2',
        label + '-3'
      ])
    }
  },
  orderBy: [{ label: 'asc' }, { createdAt: 'asc' }]
});

if (allNodes.length === 0) {
  console.log('   ✅ Aucune copie trouvée (base propre)');
} else {
  console.log(`   ❌ ${allNodes.length} copies trouvées:`);
  
  // Grouper par nom de base
  const grouped = {};
  for (const node of allNodes) {
    const match = node.label.match(/^(.+?)-(\d+)$/);
    if (match) {
      const [, baseName, suffix] = match;
      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push({ suffix: parseInt(suffix), createdAt: node.createdAt, id: node.id });
    }
  }
  
  for (const [baseName, copies] of Object.entries(grouped)) {
    console.log(`\n   📌 ${baseName}:`);
    for (const copy of copies.sort((a, b) => a.suffix - b.suffix)) {
      console.log(`      -${copy.suffix} créé le ${copy.createdAt.toISOString()}`);
    }
    
    // Analyser les suffixes
    const suffixes = copies.map(c => c.suffix);
    const hasMixed = suffixes.length > 1 && Math.max(...suffixes) > 1;
    if (hasMixed) {
      console.log(`      🚨 PROBLÈME: Suffixes mélangés détectés! ${suffixes.join(', ')}`);
    }
  }
}

// 4. Vérifier la structure parent-enfant
console.log('\n🌳 STRUCTURE PARENT-ENFANT:');
const sectionNode = templateNodes.find(n => n.type === 'section');
if (sectionNode) {
  console.log(`   Section parente: "${sectionNode.label}" (${sectionNode.id.slice(0, 8)}...)`);
  
  const children = templateNodes.filter(n => n.parentId === sectionNode.id);
  console.log(`   Enfants directs: ${children.length}`);
  for (const child of children) {
    console.log(`      - ${child.label}`);
  }
  
  console.log('\n   ⚠️  RÈGLE IMPORTANTE:');
  console.log('      La section parente NE DOIT PAS être dupliquée !');
  console.log('      Seuls ses enfants doivent être copiés et rattachés à une nouvelle section-1');
}

// 5. Analyser le code source
console.log('\n🔍 ANALYSE DU CODE SOURCE:');
console.log('   Fichier: src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-service.ts');

import { readFileSync } from 'fs';
const sourceCode = readFileSync('src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/repeat-service.ts', 'utf-8');

// Chercher la logique de calcul de suffixe
const hasGlobalMax = sourceCode.includes('Math.max(...existingMax.values())');
const hasPerNodeIncrement = sourceCode.includes('(existingMax.get(templateId) || 0) + 1');

console.log(`   ✅ Code corrigé (globalMax): ${hasGlobalMax ? 'OUI' : 'NON'}`);
console.log(`   ❌ Code buggé (per-node): ${hasPerNodeIncrement ? 'OUI' : 'NON'}`);

// Chercher le console.log de diagnostic
const hasConsoleLog = sourceCode.includes('🔄🔄🔄 [REPEAT-SERVICE] CODE CORRIGÉ EN COURS');
console.log(`   🔍 Console.log diagnostic: ${hasConsoleLog ? 'OUI' : 'NON'}`);

// 6. Vérifier le code compilé
console.log('\n📦 CODE COMPILÉ (esbuild):');
try {
  const compiledCode = readFileSync('dist-server/api-server-clean.cjs', 'utf-8');
  
  const compiledHasGlobalMax = compiledCode.includes('Math.max(...existingMax.values())');
  const compiledHasConsoleLog = compiledCode.includes('CODE CORRIGÉ EN COURS');
  
  console.log(`   ✅ globalMax dans le bundle: ${compiledHasGlobalMax ? 'OUI' : 'NON'}`);
  console.log(`   🔍 Console.log dans le bundle: ${compiledHasConsoleLog ? 'OUI' : 'NON'}`);
  
  if (!compiledHasGlobalMax || !compiledHasConsoleLog) {
    console.log('\n   🚨 PROBLÈME CRITIQUE: Le code compilé ne contient PAS les corrections !');
    console.log('   📝 Solution: Recompiler avec npm run build');
  }
} catch (error) {
  console.log('   ⚠️  Fichier compilé non trouvé');
}

// 7. Recommandations
console.log('\n💡 RECOMMANDATIONS:');

if (allNodes.length > 0) {
  console.log('   1. Nettoyer la base: node delete-all-copies.mjs');
}

if (!hasGlobalMax) {
  console.log('   2. ❌ Le code source contient encore l\'ancien algorithme !');
  console.log('      → Corriger repeat-service.ts lignes 115-121');
} else {
  console.log('   2. ✅ Code source corrigé');
}

console.log('   3. Recompiler: npm run build');
console.log('   4. Redémarrer: node dist-server/api-server-clean.cjs');
console.log('   5. Tester: cliquer sur + et vérifier les logs du terminal');

console.log('\n' + '='+ '='.repeat(70));
console.log('✅ Diagnostic terminé\n');

await prisma.$disconnect();
