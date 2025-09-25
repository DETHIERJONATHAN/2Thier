#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function findRealOperationDetails() {
  console.log('🔍 RECHERCHE VRAIS operationDetail');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Récupérer les SubmissionData avec sourceRef spécifiques
    console.log('\n🎯 === DONNÉES SUBMISSION AVEC SOURCES ===');
    const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        OR: [
          { sourceRef: 'condition:ff05cc48-27ec-4d94-8975-30a0f9c1c275' },
          { sourceRef: { startsWith: 'node-formula:' } },
          { operationSource: { in: ['condition', 'formula', 'table'] } }
        ]
      }
    });
    
    console.log(`📊 Données avec sources: ${submissionData.length}`);
    
    submissionData.forEach(data => {
      console.log(`\n🧮 SOURCE: ${data.sourceRef}`);
      console.log(`  Type: ${data.operationSource}`);
      console.log(`  ID: ${data.id}`);
      console.log(`  Valeur: ${data.value}`);
      console.log(`  OperationDetail:`, data.operationDetail);
    });
    
    // 2. Chercher dans les structures avec les IDs exacts
    console.log('\n\n🔧 === RECHERCHE PAR ID EXACT ===');
    
    // Condition
    const conditionId = 'ff05cc48-27ec-4d94-8975-30a0f9c1c275';
    const condition = await prisma.treeBranchLeafNodeCondition.findFirst({
      where: { conditionId: conditionId }
    });
    
    if (condition) {
      console.log(`\n✅ CONDITION TROUVÉE: ${conditionId}`);
      console.log(`  OperationDetail:`, JSON.stringify(condition.operationDetail, null, 2));
    } else {
      console.log(`\n❌ Condition ${conditionId} non trouvée`);
    }
    
    // Formules
    const formulaIds = ['c4f0d074-3814-4e8c-b57e-b7a3cb38acfd', '3a04a2ff-bc48-43b5-814f-bff80b3af5c6'];
    
    for (const formulaId of formulaIds) {
      const formula = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { formulaId: formulaId }
      });
      
      if (formula) {
        console.log(`\n✅ FORMULE TROUVÉE: ${formulaId}`);
        console.log(`  Expression:`, formula.expression);
        console.log(`  OperationDetail:`, JSON.stringify(formula.operationDetail, null, 2));
      } else {
        console.log(`\n❌ Formule ${formulaId} non trouvée`);
      }
    }
    
    // 3. Essayer de récupérer les vraies données d'exemple comme vous les avez données
    console.log('\n\n📋 === EXEMPLE DE STRUCTURE ATTENDUE ===');
    console.log('🔧 Condition (ce que vous voulez) :');
    console.log('  JSON: {"id":"cond_10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e","mode":"first-match","tokens":[],"branches":[{"id":"b_dx8n5sezfj","when":{"id":"bin_5q8l564cysu","op":"isNotEmpty","left":{"ref":"@value.702d1b09-abc9-4096-9aaa-77155ac5294f","kind":"nodeValue"},"type":"binary"},"label":"Alors","actions":[{"id":"a_y9jc8qbx2he","type":"SHOW","nodeIds":["702d1b09-abc9-4096-9aaa-77155ac5294f"]}]}],"fallback":{"id":"fb_8aapt0ibdo","label":"Sinon","actions":[{"id":"a_lv4b2phei3e","type":"SHOW","nodeIds":["node-formula:7097ff9b-974a-4fb3-80d8-49634a634efc"]}]}}');
    console.log('  Traduction: Si Prix Kw/h = n\'est pas vide ; alors Prix Kw/h (0.35); Sinon Calcul du prix Kw/h (4000) (/) Consommation annuelle électricité* (1000) (=) Result (0.25)');
    
    console.log('\n📐 Formule (ce que vous voulez) :');
    console.log('  Array: ["@value.d6212e5e-3fe9-4cce-b380-e6745524d011","/","@value.node_1757366229534_x6jxzmvmu"]');
    console.log('  Traduction: Prix Kw/h (0.35) (/) Consommation annuelle électricité (4000) (=) Result (0.0875)');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRealOperationDetails();