#!/usr/bin/env node

/**
 * 🔍 ANALYSER LA COPIE -1 POUR COMPRENDRE COMMENT ELLE A ÉTÉ CRÉÉE
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const nodeId = '440d696a-34cf-418f-8f56-d61015f66d91-1';

    const node = await p.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });

    console.log('═'.repeat(100));
    console.log('🔍 ANALYSE COMPLÈTE DU NŒUD -1');
    console.log('═'.repeat(100));

    console.log('\n📋 TOUTES LES COLONNES:');
    console.log('─'.repeat(100));

    Object.keys(node).forEach(key => {
      const value = node[key];
      let display = value;

      if (value === null) {
        display = 'null';
      } else if (typeof value === 'object') {
        display = JSON.stringify(value).substring(0, 60) + (JSON.stringify(value).length > 60 ? '...' : '');
      } else if (typeof value === 'string' && value.length > 60) {
        display = value.substring(0, 60) + '...';
      }

      console.log(`${key.padEnd(40)} : ${display}`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log('🔍 MÉTADATA (comment a-t-elle été créée?)');
    console.log('═'.repeat(100));

    console.log('\n' + JSON.stringify(node.metadata, null, 2));

    console.log('\n' + '═'.repeat(100));
    console.log('🎯 POINTS D\'INTÉRÊT');
    console.log('═'.repeat(100));

    console.log('\nCOLONNES LINKED***:');
    console.log(`  linkedTableIds: ${JSON.stringify(node.linkedTableIds)}`);
    console.log(`  linkedFormulaIds: ${JSON.stringify(node.linkedFormulaIds)}`);
    console.log(`  linkedConditionIds: ${JSON.stringify(node.linkedConditionIds)}`);
    console.log(`  linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);

    console.log('\nCOLONNES TABLE:');
    console.log(`  table_activeId: ${node.table_activeId}`);
    console.log(`  table_instances: ${node.table_instances ? 'EXISTS' : 'NULL'}`);
    console.log(`  table_name: ${node.table_name}`);
    console.log(`  hasTable: ${node.hasTable}`);

    console.log('\nTYPE & PARENT:');
    console.log(`  type: ${node.type}`);
    console.log(`  parentId: ${node.parentId}`);
    console.log(`  order: ${node.order}`);

    await p.$disconnect();
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
})();
