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

const prisma = db;
const API_BASE = 'http://localhost:4000/api';

async function testDisplayField(nodeId: string, treeId: string) {
  console.log(`\n🔍 Test du champ d'affichage: ${nodeId}`);

  try {
    // 1. Vérifier la base de données directement
    console.log('   📊 1. Vérification base de données...');
    
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
      console.log('   ❌ Nœud non trouvé dans la base');
      return;
    }

    console.log(`      ✅ Nœud trouvé: ${node.label}`);
    console.log(`      💾 calculatedValue: ${node.calculatedValue || '(vide)'}`);
    console.log(`      📅 calculatedAt: ${node.calculatedAt || '(jamais)'}`);
    console.log(`      🔧 calculatedBy: ${node.calculatedBy || '(inconnu)'}`);
    console.log(`      🔗 Variables liées: ${node.linkedVariableIds.length}`);

    // 2. Vérifier les données de soumission
    console.log('   📋 2. Vérification données de soumission...');
    
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
      console.log(`      ✅ Dernière donnée de soumission:`);
      console.log(`         Valeur: ${data.value || '(vide)'}`);
      console.log(`         OperationResult: ${data.operationResult ? 'PRÉSENT' : '(vide)'}`);
      if (data.operationResult) {
        console.log(`         Contenu: ${JSON.stringify(data.operationResult).substring(0, 200)}...`);
      }
      console.log(`         Source: ${data.operationSource || '(vide)'}`);
      console.log(`         Résolu: ${data.lastResolved || '(jamais)'}`);
    } else {
      console.log('      ❌ Aucune donnée de soumission');
    }

    // 3. Tester l'API de récupération
    console.log('   🌐 3. Test API calculated-value...');
    
    try {
      const response = await fetch(`${API_BASE}/tree-nodes/${treeId}/${nodeId}/calculated-value`);
      console.log(`      Status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`      ✅ API répond: ${JSON.stringify(result, null, 2)}`);
      } else {
        const error = await response.text();
        console.log(`      ❌ API erreur: ${error}`);
      }
    } catch (apiError) {
      console.log(`      ❌ Erreur connexion API: ${apiError}`);
    }

    // 4. Tester les variables liées
    if (node.linkedVariableIds.length > 0) {
      console.log('   🔗 4. Vérification variables liées...');
      
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
          console.log(`      📊 Variable: ${variable.displayName} (${variable.exposedKey})`);
          console.log(`         Type: ${variable.sourceType}`);
          console.log(`         Valeur fixe: ${variable.fixedValue || '(vide)'}`);
          console.log(`         Nœud sélectionné: ${variable.selectedNodeId || '(aucun)'}`);
          console.log(`         Référence source: ${variable.sourceRef || '(aucune)'}`);
        }
      }
    }

  } catch (error) {
    console.log(`   ❌ Erreur pendant le test: ${error}`);
  }
}

async function testCopyField(originalNodeId: string, copyNodeId: string, _treeId: string) {
  console.log(`\n📋 Test de copie: ${originalNodeId} → ${copyNodeId}`);

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
      console.log('   ❌ Original ou copie non trouvé(e)');
      return;
    }

    console.log(`   📊 Original: ${original.label} → calculatedValue: ${original.calculatedValue || '(vide)'}`);
    console.log(`   📋 Copie: ${copy.label} → calculatedValue: ${copy.calculatedValue || '(vide)'}`);

    const meta = copy.metadata as unknown;
    console.log(`   🔗 Métadonnées copie: sourceTemplateId=${meta?.sourceTemplateId}, copiedFromNodeId=${meta?.copiedFromNodeId}`);

    // Vérifier si les valeurs sont synchronisées
    if (original.calculatedValue === copy.calculatedValue) {
      console.log('   ✅ Les valeurs sont synchronisées');
    } else {
      console.log('   ❌ Les valeurs ne sont PAS synchronisées');
      console.log('      → La copie devrait hériter de la valeur de l\'original');
    }

    // Vérifier les variables liées
    console.log(`   🔗 Variables liées - Original: ${original.linkedVariableIds.length}, Copie: ${copy.linkedVariableIds.length}`);

  } catch (error) {
    console.log(`   ❌ Erreur pendant le test de copie: ${error}`);
  }
}

async function main() {
  console.log('🧪 === TEST AFFICHAGE EN TEMPS RÉEL ===\n');

  try {
    // 1. Trouver des exemples concrets
    console.log('🔍 1. Recherche d\'exemples concrets...');
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!tree) {
      console.log('❌ Aucun arbre trouvé');
      return;
    }

    console.log(`✅ Arbre sélectionné: ${tree.name} (${tree.id})`);

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

    console.log(`\n📊 ${nodesWithValues.length} nœuds avec valeurs trouvés`);

    // 3. Tester chaque nœud
    for (const node of nodesWithValues) {
      await testDisplayField(node.id, tree.id);
    }

    // 4. Chercher des exemples de copies
    console.log('\n📋 4. Recherche de copies...');
    
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: tree.id },
      select: { id: true, label: true, metadata: true, calculatedValue: true }
    });

    const copies = allNodes.filter(node => {
      const meta = node.metadata as unknown;
      return meta?.sourceTemplateId || meta?.copiedFromNodeId;
    });

    console.log(`📋 ${copies.length} copies trouvées`);

    for (const copy of copies.slice(0, 2)) { // Tester les 2 premières
      const meta = copy.metadata as unknown;
      const originalId = meta.sourceTemplateId || meta.copiedFromNodeId;
      
      if (originalId) {
        await testCopyField(originalId, copy.id, tree.id);
      }
    }

    // 5. Test d'une soumission si elle existe
    console.log('\n📝 5. Test avec soumission existante...');
    
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: { treeId: tree.id },
      orderBy: { createdAt: 'desc' }
    });

    if (submission) {
      console.log(`✅ Soumission trouvée: ${submission.id}`);
      
      const dataCount = await prisma.treeBranchLeafSubmissionData.count({
        where: { submissionId: submission.id }
      });
      
      console.log(`   📊 ${dataCount} enregistrements de données`);

      const withResults = await prisma.treeBranchLeafSubmissionData.count({
        where: { 
          submissionId: submission.id,
          operationResult: { not: null }
        }
      });

      console.log(`   🎯 ${withResults} avec operationResult`);
    } else {
      console.log('   ❌ Aucune soumission trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur pendant les tests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);