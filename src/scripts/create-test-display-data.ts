#!/usr/bin/env node

/**
 * 🏗️ SCRIPT CRÉATION - Données de test pour champs d'affichage
 * 
 * Crée un environnement de test complet avec:
 * - Un arbre avec des nœuds calculés
 * - Des formules et conditions
 * - Des données de soumission avec operationResult
 * - Des champs d'affichage et des copies
 * 
 * Usage: npx tsx src/scripts/create-test-display-data.ts
 */

import { db } from '../lib/database';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger';

const prisma = db;

async function createTestData() {
  logger.debug('🏗️ === CRÉATION DONNÉES DE TEST ===\n');

  try {
    const timestamp = Date.now();
    
    // 1. Créer une organisation de test
    logger.debug('🏢 1. Création organisation de test...');
    const orgId = `test-org-${timestamp}`;
    
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: `Organisation Test ${timestamp}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    logger.debug(`   ✅ Organisation créée: ${orgId}`);

    // 2. Créer un arbre de test
    logger.debug('🌳 2. Création arbre de test...');
    const treeId = `test-tree-${timestamp}`;
    
    await prisma.treeBranchLeafTree.create({
      data: {
        id: treeId,
        organizationId: orgId,
        name: `Arbre Test Affichage ${timestamp}`,
        description: 'Arbre pour tester les champs d\'affichage',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    logger.debug(`   ✅ Arbre créé: ${treeId}`);

    // 3. Créer des nœuds de base
    logger.debug('📊 3. Création nœuds de base...');
    
    // Nœud racine (onglet)
    const tabId = `tab-${timestamp}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: tabId,
        treeId,
        type: 'section',
        subType: 'tab',
        label: 'Onglet Test',
        order: 1,
        isVisible: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Nœud source avec valeur
    const sourceNodeId = `source-${timestamp}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: sourceNodeId,
        treeId,
        parentId: tabId,
        type: 'leaf_number',
        subType: 'data',
        label: 'Prix kWh',
        order: 2,
        isVisible: true,
        isActive: true,
        hasData: true,
        calculatedValue: '0.35',
        calculatedAt: new Date(),
        calculatedBy: 'test-setup',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Nœud avec formule
    const formulaNodeId = `formula-${timestamp}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: formulaNodeId,
        treeId,
        parentId: tabId,
        type: 'leaf_number',
        subType: 'data',
        label: 'Calcul Total',
        order: 3,
        isVisible: true,
        isActive: true,
        hasFormula: true,
        calculatedValue: '1400',
        calculatedAt: new Date(),
        calculatedBy: `formula-test-${timestamp}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.debug(`   ✅ Nœuds créés: ${sourceNodeId}, ${formulaNodeId}`);

    // 4. Créer une formule de test
    logger.debug('🧮 4. Création formule de test...');
    
    const formulaId = `formula-test-${timestamp}`;
    await prisma.treeBranchLeafNodeFormula.create({
      data: {
        id: formulaId,
        nodeId: formulaNodeId,
        name: 'Formule Test',
        description: 'Calcul simple pour test',
        tokens: [
          `@value.${sourceNodeId}`,
          '(',
          '*',
          ')',
          '4000'
        ],
        isDefault: true,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    logger.debug(`   ✅ Formule créée: ${formulaId}`);

    // 5. Créer une soumission de test
    logger.debug('📝 5. Création soumission de test...');
    
    const submissionId = `test-submission-${timestamp}`;
    await prisma.treeBranchLeafSubmission.create({
      data: {
        id: submissionId,
        treeId,
        status: 'completed',
        totalScore: 100,
        summary: { test: true },
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    logger.debug(`   ✅ Soumission créée: ${submissionId}`);

    // 6. Créer des données de soumission avec operationResult
    logger.debug('💾 6. Création données de soumission...');
    
    // Données pour le nœud source
    await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: randomUUID(),
        submissionId,
        nodeId: sourceNodeId,
        value: '0.35',
        operationResult: {
          type: 'direct_value',
          value: '0.35',
          unit: '€/kWh',
          calculatedAt: new Date().toISOString()
        },
        operationSource: 'neutral',
        lastResolved: new Date(),
        isVariable: false,
        createdAt: new Date()
      }
    });

    // Données pour le nœud formule
    await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: randomUUID(),
        submissionId,
        nodeId: formulaNodeId,
        value: '1400',
        operationResult: {
          type: 'formula_result',
          expression: 'Prix kWh(0.35) (*) 4000',
          result: '1400',
          unit: '€',
          calculatedAt: new Date().toISOString(),
          formulaId
        },
        operationSource: 'formula',
        sourceRef: `formula:${formulaId}`,
        lastResolved: new Date(),
        isVariable: false,
        createdAt: new Date()
      }
    });

    logger.debug(`   ✅ Données de soumission créées`);

    // 7. Créer des champs d'affichage
    logger.debug('🖥️  7. Création champs d\'affichage...');
    
    const displayNodeId = `display-${sourceNodeId}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: displayNodeId,
        treeId,
        parentId: tabId,
        type: 'leaf_display',
        subType: 'display',
        label: 'Affichage Prix kWh',
        order: 4,
        isVisible: true,
        isActive: true,
        linkedVariableIds: [sourceNodeId], // Lié au nœud source
        calculatedValue: '0.35', // Même valeur que la source
        calculatedAt: new Date(),
        calculatedBy: `reference:${sourceNodeId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const displayFormulaNodeId = `display-${formulaNodeId}`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: displayFormulaNodeId,
        treeId,
        parentId: tabId,
        type: 'leaf_display',
        subType: 'display',
        label: 'Affichage Calcul Total',
        order: 5,
        isVisible: true,
        isActive: true,
        linkedVariableIds: [formulaNodeId], // Lié au nœud formule
        calculatedValue: '1400', // Même valeur que la formule
        calculatedAt: new Date(),
        calculatedBy: `reference:${formulaNodeId}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.debug(`   ✅ Champs d'affichage créés: ${displayNodeId}, ${displayFormulaNodeId}`);

    // 8. Créer des copies
    logger.debug('📋 8. Création copies...');
    
    const copySourceId = `${sourceNodeId}-copy-1`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: copySourceId,
        treeId,
        parentId: tabId,
        type: 'leaf_number',
        subType: 'data',
        label: 'Prix kWh (Copie)',
        order: 6,
        isVisible: true,
        isActive: true,
        hasData: true,
        calculatedValue: '0.35', // Même valeur que l'original
        calculatedAt: new Date(),
        calculatedBy: `copy:${sourceNodeId}`,
        metadata: {
          sourceTemplateId: sourceNodeId,
          copiedFromNodeId: sourceNodeId,
          duplicatedAt: new Date().toISOString(),
          copySuffix: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    const copyFormulaId = `${formulaNodeId}-copy-1`;
    await prisma.treeBranchLeafNode.create({
      data: {
        id: copyFormulaId,
        treeId,
        parentId: tabId,
        type: 'leaf_number',
        subType: 'data',
        label: 'Calcul Total (Copie)',
        order: 7,
        isVisible: true,
        isActive: true,
        hasFormula: true,
        calculatedValue: '1400', // Même valeur que l'original
        calculatedAt: new Date(),
        calculatedBy: `copy:${formulaNodeId}`,
        metadata: {
          sourceTemplateId: formulaNodeId,
          copiedFromNodeId: formulaNodeId,
          duplicatedAt: new Date().toISOString(),
          copySuffix: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.debug(`   ✅ Copies créées: ${copySourceId}, ${copyFormulaId}`);

    // 9. Créer des données de soumission pour les copies
    logger.debug('💾 9. Données de soumission pour les copies...');
    
    await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: randomUUID(),
        submissionId,
        nodeId: copySourceId,
        value: '0.35',
        operationResult: {
          type: 'copy_value',
          originalNodeId: sourceNodeId,
          value: '0.35',
          unit: '€/kWh',
          calculatedAt: new Date().toISOString()
        },
        operationSource: 'neutral',
        sourceRef: `copy:${sourceNodeId}`,
        lastResolved: new Date(),
        isVariable: false,
        createdAt: new Date()
      }
    });

    await prisma.treeBranchLeafSubmissionData.create({
      data: {
        id: randomUUID(),
        submissionId,
        nodeId: copyFormulaId,
        value: '1400',
        operationResult: {
          type: 'copy_formula_result',
          originalNodeId: formulaNodeId,
          expression: 'Prix kWh(0.35) (*) 4000',
          result: '1400',
          unit: '€',
          calculatedAt: new Date().toISOString()
        },
        operationSource: 'neutral',
        sourceRef: `copy:${formulaNodeId}`,
        lastResolved: new Date(),
        isVariable: false,
        createdAt: new Date()
      }
    });

    logger.debug(`   ✅ Données de soumission pour copies créées`);

    // 10. Résumé
    logger.debug('\n🎉 === CRÉATION TERMINÉE ===');
    logger.debug(`🏢 Organisation: ${orgId}`);
    logger.debug(`🌳 Arbre: ${treeId}`);
    logger.debug(`📝 Soumission: ${submissionId}`);
    logger.debug(`📊 Nœuds créés: 8 (source, formule, affichages, copies)`);
    logger.debug(`💾 Données de soumission: 4 enregistrements`);
    
    logger.debug('\n🔍 Pour tester, utilisez:');
    logger.debug(`npx tsx src/scripts/debug-display-fields.ts`);
    logger.debug(`npx tsx src/scripts/test-display-real-time.ts`);
    
    logger.debug('\n📋 IDs à retenir:');
    logger.debug(`Tree ID: ${treeId}`);
    logger.debug(`Source Node: ${sourceNodeId}`);
    logger.debug(`Formula Node: ${formulaNodeId}`);
    logger.debug(`Display Source: ${displayNodeId}`);
    logger.debug(`Display Formula: ${displayFormulaNodeId}`);
    logger.debug(`Copy Source: ${copySourceId}`);
    logger.debug(`Copy Formula: ${copyFormulaId}`);

  } catch (error) {
    logger.error('❌ Erreur pendant la création:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData().catch(logger.error);