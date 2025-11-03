#!/usr/bin/env node
/**
 * 🔍 Comparer l'original et la copie du champ orientation-inclinaison
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 COMPARAISON ORIGINAL vs COPIE\n');

  try {
    const originalId = '440d696a-34cf-418f-8f56-d61015f66d91';
    const copyId = '440d696a-34cf-418f-8f56-d61015f66d91-1';

    // 1. Récupérer l'original
    console.log('1️⃣ ORIGINAL:');
    const original = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalId },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        subType: true,
        parentId: true,
        metadata: true,
        capabilities: true,
        hasData: true,
        hasFormula: true
      }
    });

    if (original) {
      console.log(JSON.stringify(original, null, 2));
      
      if (original.parentId) {
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: original.parentId },
          select: { id: true, label: true, type: true }
        });
        console.log(`\n   Parent: ${parent?.label} (${parent?.id})`);
      }
    } else {
      console.log('❌ Original introuvable');
    }

    // 2. Récupérer la copie
    console.log('\n\n2️⃣ COPIE:');
    const copy = await prisma.treeBranchLeafNode.findUnique({
      where: { id: copyId },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        subType: true,
        parentId: true,
        metadata: true,
        capabilities: true,
        hasData: true,
        hasFormula: true
      }
    });

    if (copy) {
      console.log(JSON.stringify(copy, null, 2));
      
      if (copy.parentId) {
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: copy.parentId },
          select: { id: true, label: true, type: true, metadata: true }
        });
        console.log(`\n   Parent: ${parent?.label} (${parent?.id})`);
        console.log(`   Parent est une copie? ${parent?.metadata?.sourceTemplateId ? '✅ OUI' : '❌ NON'}`);
      }
    } else {
      console.log('❌ Copie introuvable');
    }

    // 3. Comparaison des différences
    if (original && copy) {
      console.log('\n\n3️⃣ DIFFÉRENCES:');
      
      const differences = [];
      
      if (original.label !== copy.label) {
        differences.push(`   ⚠️  Label: "${original.label}" vs "${copy.label}"`);
      }
      if (original.type !== copy.type) {
        differences.push(`   ⚠️  Type: "${original.type}" vs "${copy.type}"`);
      }
      if (original.fieldType !== copy.fieldType) {
        differences.push(`   ⚠️  FieldType: "${original.fieldType}" vs "${copy.fieldType}"`);
      }
      if (original.subType !== copy.subType) {
        differences.push(`   ⚠️  SubType: "${original.subType}" vs "${copy.subType}"`);
      }
      if (original.parentId !== copy.parentId) {
        differences.push(`   ⚠️  ParentId: "${original.parentId}" vs "${copy.parentId}"`);
      }
      if (original.hasData !== copy.hasData) {
        differences.push(`   ⚠️  hasData: ${original.hasData} vs ${copy.hasData}`);
      }
      if (original.hasFormula !== copy.hasFormula) {
        differences.push(`   ⚠️  hasFormula: ${original.hasFormula} vs ${copy.hasFormula}`);
      }
      
      if (differences.length > 0) {
        console.log(differences.join('\n'));
      } else {
        console.log('   ✅ Aucune différence dans les propriétés de base');
      }
      
      // Comparer les capabilities
      console.log('\n   Capabilities:');
      console.log(`     Original: ${JSON.stringify(original.capabilities)}`);
      console.log(`     Copie:    ${JSON.stringify(copy.capabilities)}`);
    }

    // 4. Vérifier si la copie est bien référencée dans le hook
    console.log('\n\n4️⃣ VÉRIFICATION DU PARENT:');
    if (copy?.parentId) {
      const parentChildren = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: copy.parentId },
        select: { id: true, label: true, type: true },
        orderBy: { id: 'asc' }
      });
      
      console.log(`\n   Tous les enfants du parent (${parentChildren.length}):`);
      for (const child of parentChildren) {
        const isOriginal = child.id === originalId;
        const isCopy = child.id === copyId;
        const marker = isOriginal ? '🔷 ORIGINAL' : isCopy ? '🔶 COPIE' : '';
        console.log(`     ${marker} ${child.label} (${child.id})`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
