#!/usr/bin/env node

/**
 * 🔥 TBL PRISMA - CALCULS RÉELS AVEC CAPACITYCALCULATOR
 * 
 * Ce script utilise le VRAI CapacityCalculator pour calculer les VRAIES valeurs
 * et met à jour DIRECTEMENT la base de données que Prisma Studio lit.
 * 
 * TOUT DOIT PASSER PAR TBL PRISMA AVEC DES CALCULS RÉELS !
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Import du VRAI CapacityCalculator
const { CapacityCalculator } = require('./src/components/TreeBranchLeaf/treebranchleaf-new/tbl-prisma/conditions/capacity-calculator.ts');

async function realTBLCalculations() {
  console.log('🔥 [TBL RÉEL] Début des calculs RÉELS avec CapacityCalculator');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Récupérer TOUTES les données qui ont des valeurs null
    console.log('📊 [TBL RÉEL] Récupération des données à calculer...');
    const nullData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        OR: [
          { value: null },
          { value: 'null' },
          { operationResult: null }
        ]
      },
      include: {
        submission: true,
        node: {
          include: {
            conditions: true,
            formulas: true
          }
        }
      }
    });
    
    console.log(`📊 [TBL RÉEL] Trouvé ${nullData.length} données à calculer avec TBL`);
    
    // 2. Initialiser le CapacityCalculator
    const calculator = new CapacityCalculator(prisma);
    
    // 3. Pour chaque donnée null, calculer la VRAIE valeur
    for (const data of nullData) {
      try {
        console.log(`🧮 [TBL RÉEL] Calcul pour: ${data.id} (source: ${data.operationSource}, ref: ${data.sourceRef})`);
        
        let realResult = null;
        let realValue = null;
        let operationResult = null;
        
        if (data.operationSource === 'condition' && data.sourceRef) {
          // VRAI calcul de condition
          console.log(`🔧 [TBL RÉEL] Évaluation condition: ${data.sourceRef}`);
          
          // Récupérer la vraie condition
          const condition = await prisma.treeBranchLeafNodeCondition.findFirst({
            where: { conditionId: data.sourceRef }
          });
          
          if (condition) {
            // Utiliser le VRAI CapacityCalculator
            realResult = await calculator.evaluateCondition(condition, data.submissionId);
            realValue = realResult ? 'TRUE' : 'FALSE';
            
            operationResult = {
              success: true,
              type: 'condition',
              conditionId: data.sourceRef,
              result: realResult,
              method: 'TBL_CAPACITY_CALCULATOR',
              timestamp: new Date().toISOString(),
              displayText: `🔥 TBL Condition RÉELLE: ${data.sourceRef} = ${realValue}`
            };
          }
        }
        else if (data.operationSource === 'formula' && data.sourceRef) {
          // VRAI calcul de formule
          console.log(`📐 [TBL RÉEL] Calcul formule: ${data.sourceRef}`);
          
          // Récupérer la vraie formule
          const formula = await prisma.treeBranchLeafNodeFormula.findFirst({
            where: { formulaId: data.sourceRef }
          });
          
          if (formula) {
            // Utiliser le VRAI CapacityCalculator
            realResult = await calculator.calculateCapacity(formula, data.submissionId);
            realValue = realResult.toString();
            
            operationResult = {
              success: true,
              type: 'formula',
              formulaId: data.sourceRef,
              result: realResult,
              method: 'TBL_CAPACITY_CALCULATOR',
              timestamp: new Date().toISOString(),
              displayText: `🔥 TBL Formule RÉELLE: ${data.sourceRef} = ${realResult}`
            };
          }
        }
        else {
          // Données neutres - garder les valeurs existantes ou utiliser une valeur par défaut
          console.log(`📝 [TBL RÉEL] Donnée neutre: ${data.id}`);
          realValue = data.value || 'TBL_DEFAULT';
          operationResult = {
            success: true,
            type: 'neutral',
            method: 'TBL_PASSTHROUGH',
            timestamp: new Date().toISOString(),
            displayText: `🔥 TBL Neutre: ${realValue}`
          };
        }
        
        // 4. Mettre à jour DIRECTEMENT avec les VRAIES valeurs
        if (realValue !== null && operationResult !== null) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: data.id },
            data: {
              value: realValue,
              operationResult: operationResult,
              lastResolved: new Date()
            }
          });
          
          console.log(`✅ [TBL RÉEL] ${data.id} mis à jour: ${operationResult.displayText}`);
        } else {
          console.log(`⚠️ [TBL RÉEL] ${data.id} ignoré (pas de calcul possible)`);
        }
        
      } catch (error) {
        console.error(`❌ [TBL RÉEL] Erreur calcul ${data.id}:`, error.message);
      }
    }
    
    console.log('🎉 [TBL RÉEL] Calculs TBL RÉELS terminés ! Prisma Studio devrait afficher les VRAIES valeurs calculées !');
    
  } catch (error) {
    console.error('💥 [TBL RÉEL] Erreur globale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter les calculs RÉELS
realTBLCalculations();