#!/usr/bin/env node

/**
 * 🔍 SCRIPT DIAGNOSTIC - Champs d'affichage et copies
 * 
 * Analyse complète du système de champs d'affichage:
 * - Vérifie les données stockées dans TreeBranchLeafSubmissionData
 * - Contrôle les operationResult et calculatedValue
 * - Teste les champs de copie et leurs références
 * 
 * Usage: npx tsx src/scripts/debug-display-fields.ts
 */

import { db } from '../lib/database';

const prisma = db;

interface DisplayFieldDiagnostic {
  nodeId: string;
  label: string;
  type: string;
  hasData: boolean;
  hasFormula: boolean;
  hasCondition: boolean;
  hasTable: boolean;
  calculatedValue?: string | null;
  calculatedAt?: Date | null;
  calculatedBy?: string | null;
  submissionData?: Array<{
    id: string;
    submissionId: string;
    value?: string | null;
    operationResult?: any;
    operationSource?: string | null;
    lastResolved?: Date | null;
    isVariable: boolean;
    variableKey?: string | null;
  }>;
  linkedVariableIds: string[];
  isSharedReference: boolean;
  sharedReferenceId?: string | null;
}

async function main() {
  console.log('🔍 === DIAGNOSTIC CHAMPS D\'AFFICHAGE ===\n');

  try {
    // 1. Identifier tous les arbres
    console.log('📋 1. Recherche des arbres TreeBranchLeaf...');
    const trees = await prisma.treeBranchLeafTree.findMany({
      select: { id: true, name: true, organizationId: true },
      orderBy: { createdAt: 'desc' },
      take: 5 // Limiter aux 5 derniers
    });

    console.log(`   ✅ ${trees.length} arbres trouvés:`);
    trees.forEach(tree => console.log(`      - ${tree.name} (${tree.id})`));

    if (trees.length === 0) {
      console.log('   ❌ Aucun arbre trouvé. Impossible de continuer.');
      return;
    }

    // 2. Analyser le premier arbre en détail
    const targetTree = trees[0];
    console.log(`\n🎯 2. Analyse détaillée de l'arbre: ${targetTree.name}`);

    // 3. Chercher les nœuds avec des capacités de calcul
    console.log('\n🧮 3. Nœuds avec capacités de calcul...');
    const calculationNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: targetTree.id,
        OR: [
          { hasData: true },
          { hasFormula: true },
          { hasCondition: true },
          { hasTable: true },
          { calculatedValue: { not: null } },
          { linkedVariableIds: { isEmpty: false } }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        hasTable: true,
        calculatedValue: true,
        calculatedAt: true,
        calculatedBy: true,
        linkedVariableIds: true,
        isSharedReference: true,
        sharedReferenceId: true
      }
    });

    console.log(`   ✅ ${calculationNodes.length} nœuds avec capacités trouvés`);

    // 4. Pour chaque nœud, vérifier les données de soumission
    console.log('\n📊 4. Vérification des données de soumission...');
    
    const diagnostics: DisplayFieldDiagnostic[] = [];

    for (const node of calculationNodes) {
      console.log(`\n   🔎 Nœud: ${node.label} (${node.id})`);
      console.log(`      Type: ${node.type}`);
      console.log(`      Capacités: ${[
        node.hasData && 'DATA',
        node.hasFormula && 'FORMULA',
        node.hasCondition && 'CONDITION',
        node.hasTable && 'TABLE'
      ].filter(Boolean).join(', ') || 'AUCUNE'}`);

      if (node.calculatedValue) {
        console.log(`      💾 Valeur calculée: ${node.calculatedValue}`);
        console.log(`      📅 Calculée le: ${node.calculatedAt}`);
        console.log(`      🔧 Calculée par: ${node.calculatedBy}`);
      }

      // Chercher les données de soumission
      const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: { nodeId: node.id },
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
        take: 3 // Les 3 plus récentes
      });

      if (submissionData.length > 0) {
        console.log(`      📋 ${submissionData.length} données de soumission:`);
        submissionData.forEach((data, idx) => {
          console.log(`         ${idx + 1}. Valeur: ${data.value || '(vide)'}`);
          console.log(`            OperationResult: ${data.operationResult ? JSON.stringify(data.operationResult).substring(0, 100) + '...' : '(vide)'}`);
          console.log(`            Source: ${data.operationSource || '(vide)'}`);
          console.log(`            Résolu le: ${data.lastResolved || '(jamais)'}`);
          console.log(`            Variable: ${data.isVariable ? 'OUI (' + data.variableKey + ')' : 'NON'}`);
        });
      } else {
        console.log(`      ❌ Aucune donnée de soumission trouvée`);
      }

      // Variables liées
      if (node.linkedVariableIds.length > 0) {
        console.log(`      🔗 Variables liées: ${node.linkedVariableIds.length}`);
        for (const varId of node.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { exposedKey: true, displayName: true, sourceType: true, fixedValue: true }
          });
          if (variable) {
            console.log(`         - ${variable.displayName} (${variable.exposedKey}): ${variable.sourceType} = ${variable.fixedValue || '(vide)'}`);
          }
        }
      }

      diagnostics.push({
        nodeId: node.id,
        label: node.label || '(sans nom)',
        type: node.type,
        hasData: node.hasData,
        hasFormula: node.hasFormula,
        hasCondition: node.hasCondition,
        hasTable: node.hasTable,
        calculatedValue: node.calculatedValue,
        calculatedAt: node.calculatedAt,
        calculatedBy: node.calculatedBy,
        submissionData,
        linkedVariableIds: node.linkedVariableIds,
        isSharedReference: node.isSharedReference,
        sharedReferenceId: node.sharedReferenceId
      });
    }

    // 5. Chercher les champs d'affichage spécifiques (nœuds avec ID commençant par "display-")
    console.log('\n🖥️  5. Recherche des champs d\'affichage spécifiques...');
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId: targetTree.id,
        id: { startsWith: 'display-' }
      },
      select: {
        id: true,
        label: true,
        type: true,
        calculatedValue: true,
        linkedVariableIds: true
      }
    });

    console.log(`   ✅ ${displayNodes.length} nœuds d'affichage trouvés`);
    displayNodes.forEach(node => {
      console.log(`      - ${node.label} (${node.id})`);
      console.log(`        Valeur: ${node.calculatedValue || '(vide)'}`);
      console.log(`        Variables: ${node.linkedVariableIds.length}`);
    });

    // 6. Chercher les copies (nœuds avec metadata.sourceTemplateId)
    console.log('\n📋 6. Recherche des copies de templates...');
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: targetTree.id },
      select: { id: true, label: true, metadata: true, calculatedValue: true }
    });

    const copyNodes = allNodes.filter(node => {
      const meta = node.metadata as any;
      return meta?.sourceTemplateId || meta?.copiedFromNodeId;
    });

    console.log(`   ✅ ${copyNodes.length} nœuds copiés trouvés`);
    copyNodes.forEach(node => {
      const meta = node.metadata as any;
      console.log(`      - ${node.label} (${node.id})`);
      console.log(`        Copié depuis: ${meta.sourceTemplateId || meta.copiedFromNodeId}`);
      console.log(`        Valeur: ${node.calculatedValue || '(vide)'}`);
    });

    // 7. Résumé et recommandations
    console.log('\n📊 === RÉSUMÉ DIAGNOSTIC ===');
    console.log(`🎯 Arbre analysé: ${targetTree.name}`);
    console.log(`🧮 Nœuds avec capacités: ${calculationNodes.length}`);
    console.log(`🖥️  Champs d'affichage: ${displayNodes.length}`);
    console.log(`📋 Nœuds copiés: ${copyNodes.length}`);

    const nodesWithCalculatedValues = diagnostics.filter(d => d.calculatedValue).length;
    const nodesWithSubmissionData = diagnostics.filter(d => d.submissionData && d.submissionData.length > 0).length;
    const nodesWithOperationResults = diagnostics.filter(d => 
      d.submissionData && d.submissionData.some(sd => sd.operationResult)
    ).length;

    console.log(`💾 Nœuds avec valeurs calculées: ${nodesWithCalculatedValues}`);
    console.log(`📊 Nœuds avec données de soumission: ${nodesWithSubmissionData}`);
    console.log(`🎯 Nœuds avec résultats d'opération: ${nodesWithOperationResults}`);

    // 8. Recommendations
    console.log('\n🔧 === RECOMMANDATIONS ===');
    
    if (nodesWithCalculatedValues === 0) {
      console.log('❌ Aucune valeur calculée trouvée dans TreeBranchLeafNode.calculatedValue');
      console.log('   → Vérifier que storeCalculatedValues() est appelé après les calculs');
    }

    if (nodesWithOperationResults === 0) {
      console.log('❌ Aucun operationResult trouvé dans TreeBranchLeafSubmissionData');
      console.log('   → Vérifier que les formules/conditions stockent leurs résultats');
    }

    if (displayNodes.length === 0) {
      console.log('❌ Aucun champ d\'affichage spécifique trouvé');
      console.log('   → Vérifier la création automatique des nœuds display-*');
    }

    console.log('\n✅ Diagnostic terminé !');

  } catch (error) {
    console.error('❌ Erreur pendant le diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);