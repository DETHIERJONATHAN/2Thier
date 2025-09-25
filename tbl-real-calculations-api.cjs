#!/usr/bin/env node

/**
 * 🔥 TBL PRISMA - CALCULS RÉELS VIA L'API TBL EXISTANTE
 * 
 * Ce script utilise les endpoints TBL existants pour calculer les VRAIES valeurs
 * et met à jour DIRECTEMENT la base de données que Prisma Studio lit.
 * 
 * TOUT DOIT PASSER PAR TBL PRISMA AVEC DES CALCULS RÉELS !
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

async function realTBLCalculationsViaAPI() {
  console.log('🔥 [TBL RÉEL API] Début des calculs RÉELS via les endpoints TBL existants');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Récupérer TOUTES les données qui ont des sources conditions/formules
    console.log('📊 [TBL RÉEL API] Récupération des données à calculer...');
    const dataToCalculate = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        OR: [
          { operationSource: 'condition' },
          { operationSource: 'formula' },
          { 
            AND: [
              { operationSource: { not: null } },
              { sourceRef: { not: null } }
            ]
          }
        ]
      }
    });
    
    console.log(`📊 [TBL RÉEL API] Trouvé ${dataToCalculate.length} données à calculer avec TBL`);
    
    // 2. Pour chaque donnée à calculer, utiliser les endpoints TBL pour calculer
    for (const data of dataToCalculate) {
      try {
        console.log(`🧮 [TBL RÉEL API] Calcul pour: ${data.id} (source: ${data.operationSource}, ref: ${data.sourceRef})`);
        
        let realResult = null;
        let realValue = null;
        let operationResult = null;
        
        if (data.operationSource === 'condition' && data.sourceRef) {
          // VRAI calcul de condition via l'API TBL
          console.log(`🔧 [TBL RÉEL API] Évaluation condition via API: ${data.sourceRef}`);
          
          try {
            const apiResponse = await fetch('http://localhost:4000/api/tbl/condition', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                elementId: data.sourceRef,
                submissionId: data.submissionId
              })
            });
            
            if (apiResponse.ok) {
              const apiResult = await apiResponse.json();
              realResult = apiResult.result;
              realValue = realResult ? 'TRUE' : 'FALSE';
              
              operationResult = {
                success: true,
                type: 'condition',
                conditionId: data.sourceRef,
                result: realResult,
                method: 'TBL_API_REAL',
                timestamp: new Date().toISOString(),
                displayText: `🔥 TBL API Condition RÉELLE: ${data.sourceRef} = ${realValue}`,
                apiResponse: apiResult
              };
            }
          } catch (apiError) {
            console.error(`❌ [TBL RÉEL API] Erreur API condition ${data.sourceRef}:`, apiError.message);
          }
        }
        else if (data.operationSource === 'formula' && data.sourceRef) {
          // VRAI calcul de formule via l'API TBL
          console.log(`📐 [TBL RÉEL API] Calcul formule via API: ${data.sourceRef}`);
          
          try {
            const apiResponse = await fetch(`http://localhost:4000/api/tbl/evaluate/condition/${data.sourceRef}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                submissionId: data.submissionId
              })
            });
            
            if (apiResponse.ok) {
              const apiResult = await apiResponse.json();
              realResult = apiResult.result;
              realValue = realResult.toString();
              
              operationResult = {
                success: true,
                type: 'formula',
                formulaId: data.sourceRef,
                result: realResult,
                method: 'TBL_API_REAL',
                timestamp: new Date().toISOString(),
                displayText: `🔥 TBL API Formule RÉELLE: ${data.sourceRef} = ${realResult}`,
                apiResponse: apiResult
              };
            }
          } catch (apiError) {
            console.error(`❌ [TBL RÉEL API] Erreur API formule ${data.sourceRef}:`, apiError.message);
          }
        }
        else {
          // Données neutres - garder les valeurs existantes ou utiliser une valeur par défaut
          console.log(`📝 [TBL RÉEL API] Donnée neutre: ${data.id}`);
          realValue = data.value || 'TBL_NEUTRE';
          operationResult = {
            success: true,
            type: 'neutral',
            method: 'TBL_PASSTHROUGH',
            timestamp: new Date().toISOString(),
            displayText: `🔥 TBL Neutre: ${realValue}`
          };
        }
        
        // 3. Mettre à jour DIRECTEMENT avec les VRAIES valeurs
        if (realValue !== null && operationResult !== null) {
          await prisma.treeBranchLeafSubmissionData.update({
            where: { id: data.id },
            data: {
              value: realValue,
              operationResult: operationResult,
              lastResolved: new Date()
            }
          });
          
          console.log(`✅ [TBL RÉEL API] ${data.id} mis à jour: ${operationResult.displayText}`);
        } else {
          console.log(`⚠️ [TBL RÉEL API] ${data.id} ignoré (pas de calcul possible)`);
        }
        
      } catch (error) {
        console.error(`❌ [TBL RÉEL API] Erreur calcul ${data.id}:`, error.message);
      }
    }
    
    console.log('🎉 [TBL RÉEL API] Calculs TBL RÉELS via API terminés ! Prisma Studio devrait afficher les VRAIES valeurs calculées !');
    
  } catch (error) {
    console.error('💥 [TBL RÉEL API] Erreur globale:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter les calculs RÉELS via API
realTBLCalculationsViaAPI();