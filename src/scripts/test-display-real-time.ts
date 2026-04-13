#!/usr/bin/env node

/**
 * 🧪 SCRIPT TEST - Affichage des résultats en temps réel
 * 
 * Tests spécifiques pour comprendre pourquoi les champs d'affichage
 * ne montrent pas les résultats calculés.
 * 
 * Usage: npx tsx src/scripts/test-display-real-time.ts
 */

import { db } from '../lib/database';
import fetch from 'node-fetch';
import { logger } from '../lib/logger';

const prisma = db;
const API_BASE = 'http://localhost:4000/api';

async function testDisplayField(nodeId: string, treeId: string) {
  logger.debug(`\n🔍 Test du champ d'affichage: ${nodeId}`);

  try {
    // 1. Vérifier la base de données directement
    logger.debug('   📊 1. Vérification base de données...');
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        label: true,
        type: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true,
        linkedVariableIds: true
      }
    });

    if (!node) {
      logger.debug('   ❌ Nœud non trouvé dans la base');
      return;
    }

    logger.debug(`      ✅ Nœud trouvé: ${node.label}`);
    logger.debug(`      💾 calculatedValue: ${node.calculatedValue || '(vide)'}`);
    logger.debug(`      📅 calculatedAt: ${node.calculatedAt || '(jamais)'}`);
    logger.debug(`      🔧 calculatedBy: ${node.calculatedBy || '(inconnu)'}`);
    logger.debug(`      🔗 Variables liées: ${node.linkedVariableIds.length}`);

    // 2. Vérifier les données de soumission
    logger.debug('   📋 2. Vérification données de soumission...');
    
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { nodeId },
      select: {
        id: true,
        submissionId: true,
        value: true,
        operationResult: true,
        operationSource: true,
        lastResolved: true,
        isVariable: true,
        variableKey: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (submissionData.length > 0) {
      const data = submissionData[0];
      logger.debug(`      ✅ Dernière donnée de soumission:`);
      logger.debug(`         Valeur: ${data.value || '(vide)'}`);
      logger.debug(`         OperationResult: ${data.operationResult ? 'PRÉSENT' : '(vide)'}`);
      if (data.operationResult) {
        logger.debug(`         Contenu: ${JSON.stringify(data.operationResult).substring(0, 200)}...`);
      }
      logger.debug(`         Source: ${data.operationSource || '(vide)'}`);
      logger.debug(`         Résolu: ${data.lastResolved || '(jamais)'}`);
    } else {
      logger.debug('      ❌ Aucune donnée de soumission');
    }

    // 3. Tester l'API de récupération
    logger.debug('   🌐 3. Test API calculated-value...');
    
    try {
      const response = await fetch(`${API_BASE}/tree-nodes/${treeId}/${nodeId}/calculated-value`);
      logger.debug(`      Status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        logger.debug(`      ✅ API répond: ${JSON.stringify(result, null, 2)}`);
      } else {
        const error = await response.text();
        logger.debug(`      ❌ API erreur: ${error}`);
      }
    } catch (apiError) {
      logger.debug(`      ❌ Erreur connexion API: ${apiError}`);
    }

    // 4. Tester les variables liées
    if (node.linkedVariableIds.length > 0) {
      logger.debug('   🔗 4. Vérification variables liées...');
      
      for (const varId of node.linkedVariableIds) {
        const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
          where: { id: varId },
          select: {
            id: true,
            exposedKey: true,
            displayName: true,
            sourceType: true,
            fixedValue: true,
            selectedNodeId: true,
            sourceRef: true
          }
        });

        if (variable) {
          logger.debug(`      📊 Variable: ${variable.displayName} (${variable.exposedKey})`);
          logger.debug(`         Type: ${variable.sourceType}`);
          logger.debug(`         Valeur fixe: ${variable.fixedValue || '(vide)'}`);
          logger.debug(`         Nœud sélectionné: ${variable.selectedNodeId || '(aucun)'}`);
          logger.debug(`         Référence source: ${variable.sourceRef || '(aucune)'}`);
        }
      }
    }

  } catch (error) {
    logger.debug(`   ❌ Erreur pendant le test: ${error}`);
  }
}

async function testCopyField(originalNodeId: string, copyNodeId: string, _treeId: string) {
  logger.debug(`\n📋 Test de copie: ${originalNodeId} → ${copyNodeId}`);

  try {
    // Comparer l'original et la copie
    const [original, copy] = await Promise.all([
      prisma.treeBranchLeafNode.findUnique({
        where: { id: originalNodeId },
        select: { id: true, label: true, calculatedValue: true, linkedVariableIds: true }
      }),
      prisma.treeBranchLeafNode.findUnique({
        where: { id: copyNodeId },
        select: { id: true, label: true, calculatedValue: true, linkedVariableIds: true, metadata: true }
      })
    ]);

    if (!original || !copy) {
      logger.debug('   ❌ Original ou copie non trouvé(e)');
      return;
    }

    logger.debug(`   📊 Original: ${original.label} → calculatedValue: ${original.calculatedValue || '(vide)'}`);
    logger.debug(`   📋 Copie: ${copy.label} → calculatedValue: ${copy.calculatedValue || '(vide)'}`);

    const meta = copy.metadata as unknown;
    logger.debug(`   🔗 Métadonnées copie: sourceTemplateId=${meta?.sourceTemplateId}, copiedFromNodeId=${meta?.copiedFromNodeId}`);

    // Vérifier si les valeurs sont synchronisées
    if (original.calculatedValue === copy.calculatedValue) {
      logger.debug('   ✅ Les valeurs sont synchronisées');
    } else {
      logger.debug('   ❌ Les valeurs ne sont PAS synchronisées');
      logger.debug('      → La copie devrait hériter de la valeur de l\'original');
    }

    // Vérifier les variables liées
    logger.debug(`   🔗 Variables liées - Original: ${original.linkedVariableIds.length}, Copie: ${copy.linkedVariableIds.length}`);

  } catch (error) {
    logger.debug(`   ❌ Erreur pendant le test de copie: ${error}`);
  }
}

async function main() {
  logger.debug('🧪 === TEST AFFICHAGE EN TEMPS RÉEL ===\n');

  try {
    // 1. Trouver des exemples concrets
    logger.debug('🔍 1. Recherche d\'exemples concrets...');
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!tree) {
      logger.debug('❌ Aucun arbre trouvé');
      return;
    }

    logger.debug(`✅ Arbre sélectionné: ${tree.name} (${tree.id})`);

    // 2. Chercher des nœuds avec des valeurs calculées
    const nodesWithValues = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: tree.id,
        OR: [
          { calculatedValue: { not: null } },
          { linkedVariableIds: { isEmpty: false } }
        ]
      },
      select: { id: true, label: true, calculatedValue: true },
      take: 3
    });

    logger.debug(`\n📊 ${nodesWithValues.length} nœuds avec valeurs trouvés`);

    // 3. Tester chaque nœud
    for (const node of nodesWithValues) {
      await testDisplayField(node.id, tree.id);
    }

    // 4. Chercher des exemples de copies
    logger.debug('\n📋 4. Recherche de copies...');
    
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: tree.id },
      select: { id: true, label: true, metadata: true, calculatedValue: true }
    });

    const copies = allNodes.filter(node => {
      const meta = node.metadata as unknown;
      return meta?.sourceTemplateId || meta?.copiedFromNodeId;
    });

    logger.debug(`📋 ${copies.length} copies trouvées`);

    for (const copy of copies.slice(0, 2)) { // Tester les 2 premières
      const meta = copy.metadata as unknown;
      const originalId = meta.sourceTemplateId || meta.copiedFromNodeId;
      
      if (originalId) {
        await testCopyField(originalId, copy.id, tree.id);
      }
    }

    // 5. Test d'une soumission si elle existe
    logger.debug('\n📝 5. Test avec soumission existante...');
    
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: { treeId: tree.id },
      orderBy: { createdAt: 'desc' }
    });

    if (submission) {
      logger.debug(`✅ Soumission trouvée: ${submission.id}`);
      
      const dataCount = await prisma.treeBranchLeafSubmissionData.count({
        where: { submissionId: submission.id }
      });
      
      logger.debug(`   📊 ${dataCount} enregistrements de données`);

      const withResults = await prisma.treeBranchLeafSubmissionData.count({
        where: { 
          submissionId: submission.id,
          operationResult: { not: null }
        }
      });

      logger.debug(`   🎯 ${withResults} avec operationResult`);
    } else {
      logger.debug('   ❌ Aucune soumission trouvée');
    }

  } catch (error) {
    logger.error('❌ Erreur pendant les tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(logger.error);