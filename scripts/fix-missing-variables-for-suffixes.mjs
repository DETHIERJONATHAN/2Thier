#!/usr/bin/env node
/**
 * Fix pour les Variables manquantes des champs dupliqués
 * Copie les Variables de l'original vers les copies -1, -2, etc.
 */

import { db } from '../src/lib/database.ts';

async function applySuffixToSourceRef(sourceRef, suffix) {
  if (!sourceRef) return null;
  
  // Parse sourceRef
  let prefix = '';
  let id = sourceRef;
  
  if (sourceRef.startsWith('node-formula:')) {
    prefix = 'node-formula:';
    id = sourceRef.replace('node-formula:', '');
  } else if (sourceRef.startsWith('formula:')) {
    prefix = 'formula:';
    id = sourceRef.replace('formula:', '');
  } else if (sourceRef.startsWith('condition:')) {
    prefix = 'condition:';
    id = sourceRef.replace('condition:', '');
  } else if (sourceRef.startsWith('node-condition:')) {
    prefix = 'node-condition:';
    id = sourceRef.replace('node-condition:', '');
  } else if (sourceRef.startsWith('@table.')) {
    prefix = '@table.';
    id = sourceRef.replace('@table.', '');
  } else if (sourceRef.startsWith('@table:')) {
    prefix = '@table:';
    id = sourceRef.replace('@table:', '');
  } else if (sourceRef.startsWith('table:')) {
    prefix = 'table:';
    id = sourceRef.replace('table:', '');
  } else if (sourceRef.startsWith('table.')) {
    prefix = 'table.';
    id = sourceRef.replace('table.', '');
  } else if (sourceRef.startsWith('node-table:')) {
    prefix = 'node-table:';
    id = sourceRef.replace('node-table:', '');
  }
  
  const newId = `${id}-${suffix}`;
  return `${prefix}${newId}`;
}

async function main() {
  console.log('🔍 Recherche des Variables originales sans copies...\n');
  
  // Trouver tous les nodes qui ont un suffix -1, -2, etc.
  const nodesWithSuffix = await db.treeBranchLeafNode.findMany({
    where: {
      id: {
        contains: '-' // Contient un tiret
      }
    },
    select: {
      id: true,
      field_label: true
    }
  });
  
  console.log(`📊 Trouvé ${nodesWithSuffix.length} nodes avec suffixes potentiels\n`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  
  for (const node of nodesWithSuffix) {
    // Extraire le suffix
    const match = node.id.match(/^(.+)-(\d+)$/);
    if (!match) {
      skippedCount++;
      continue; // Pas un suffix numérique
    }
    
    const [, baseId, suffixNum] = match;
    const suffix = suffixNum;
    
    // Vérifier si le node de base existe
    const baseNode = await db.treeBranchLeafNode.findUnique({
      where: { id: baseId }
    });
    
    if (!baseNode) {
      skippedCount++;
      continue; // Pas de base trouvée
    }
    
    // Chercher la Variable originale
    const originalVariable = await db.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId: baseId }
    });
    
    if (!originalVariable) {
      skippedCount++;
      continue; // Pas de Variable pour l'original
    }
    
    // Vérifier si la Variable suffixée existe déjà
    const existingVariable = await db.treeBranchLeafNodeVariable.findUnique({
      where: { nodeId: node.id }
    });
    
    if (existingVariable) {
      console.log(`⏭️  Variable existe déjà pour ${node.id} (${node.field_label})`);
      skippedCount++;
      continue;
    }
    
    // Créer la Variable suffixée
    const newVarId = `${originalVariable.id}-${suffix}`;
    const newExposedKey = `${originalVariable.exposedKey}-${suffix}`;
    const newSourceRef = applySuffixToSourceRef(originalVariable.sourceRef, suffix);
    
    try {
      await db.treeBranchLeafNodeVariable.create({
        data: {
          id: newVarId,
          nodeId: node.id,
          exposedKey: newExposedKey,
          displayName: node.field_label || originalVariable.displayName,
          displayFormat: originalVariable.displayFormat,
          precision: originalVariable.precision,
          unit: originalVariable.unit,
          visibleToUser: originalVariable.visibleToUser,
          isReadonly: originalVariable.isReadonly,
          defaultValue: originalVariable.defaultValue,
          metadata: originalVariable.metadata || {},
          fixedValue: originalVariable.fixedValue,
          selectedNodeId: originalVariable.selectedNodeId,
          sourceRef: newSourceRef,
          sourceType: originalVariable.sourceType,
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Créé Variable pour ${node.id} (${node.field_label})`);
      console.log(`   └─ sourceRef: ${originalVariable.sourceRef} → ${newSourceRef}\n`);
      fixedCount++;
    } catch (error) {
      console.error(`❌ Erreur création Variable pour ${node.id}:`, error.message);
    }
  }
  
  console.log('\n📈 RÉSUMÉ:');
  console.log(`   ✅ Variables créées: ${fixedCount}`);
  console.log(`   ⏭️  Ignorés: ${skippedCount}`);
  
  await db.$disconnect();
}

main().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
