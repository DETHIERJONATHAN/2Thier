const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🔍 Trouver les entités originales (sans suffixe)
 */

async function main() {
  try {
    console.log('🔍 RECHERCHE DES ENTITÉS ORIGINALES\n');
    console.log('═'.repeat(80));
    
    // ═══════════════════════════════════════════════════════════════════════
    // 1️⃣ Chercher toutes les conditions qui correspondent
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n1️⃣ RECHERCHE DES CONDITIONS:\n');
    
    // Pattern pour identifier l'ID sans suffixe
    const conditionBaseId = 'cond_6817ee20-5782-4b03-a7b1-0687cc5b4d58';
    
    const allConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: {
        OR: [
          { id: conditionBaseId },
          { id: { startsWith: conditionBaseId } }
        ]
      }
    });
    
    console.log(`Trouvé ${allConditions.length} condition(s):\n`);
    
    for (const cond of allConditions) {
      console.log(`📋 ${cond.id}`);
      console.log(`   name: ${cond.name}`);
      console.log(`   nodeId: ${cond.nodeId}`);
      console.log(`   conditionSet: ${JSON.stringify(cond.conditionSet).substring(0, 100)}...`);
      console.log('');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2️⃣ Chercher la condition de fallback
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═'.repeat(80));
    console.log('\n2️⃣ RECHERCHE CONDITION FALLBACK:\n');
    
    const fallbackBaseId = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e';
    
    const fallbackConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: {
        OR: [
          { id: fallbackBaseId },
          { id: { startsWith: fallbackBaseId } }
        ]
      }
    });
    
    console.log(`Trouvé ${fallbackConditions.length} condition(s) fallback:\n`);
    
    for (const cond of fallbackConditions) {
      console.log(`📋 ${cond.id}`);
      console.log(`   name: ${cond.name}`);
      console.log(`   nodeId: ${cond.nodeId}`);
      console.log('');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 3️⃣ Chercher les variables
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═'.repeat(80));
    console.log('\n3️⃣ RECHERCHE DES VARIABLES:\n');
    
    const varBaseId = 'bda51415-1530-4f97-8b5b-2c22a51a2e43';
    
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { id: varBaseId },
          { id: { startsWith: varBaseId } }
        ]
      }
    });
    
    console.log(`Trouvé ${allVariables.length} variable(s):\n`);
    
    for (const variable of allVariables) {
      console.log(`📦 ${variable.id}`);
      console.log(`   displayName: ${variable.displayName}`);
      console.log(`   nodeId: ${variable.nodeId}`);
      console.log(`   sourceRef: ${variable.sourceRef}`);
      console.log(`   exposedKey: ${variable.exposedKey}`);
      console.log('');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 4️⃣ Analyser la structure JSON fournie
    // ═══════════════════════════════════════════════════════════════════════
    console.log('═'.repeat(80));
    console.log('\n4️⃣ ANALYSE DE LA STRUCTURE JSON FOURNIE:\n');
    
    const providedJson = {
      "id": "cond_6817ee20-5782-4b03-a7b1-0687cc5b4d58-1",
      "mode": "first-match",
      "tokens": [],
      "branches": [
        {
          "id": "b_noj9a60c0zc-1",
          "when": {
            "id": "bin_p56q9ifbor",
            "op": "isNotEmpty",
            "left": {
              "ref": "@value.shared-ref-1761920196832-4f6a2-1",
              "kind": "nodeValue"
            },
            "type": "binary"
          },
          "label": "Alors",
          "actions": [
            {
              "id": "a_9jk82vcla3f-1",
              "type": "SHOW",
              "nodeIds": ["shared-ref-1761920196832-4f6a2-1"]
            }
          ]
        }
      ],
      "fallback": {
        "id": "fb_x8gbd7giad-1",
        "label": "Sinon",
        "actions": [
          {
            "id": "a_xilrhn5k2mi-1",
            "type": "SHOW",
            "nodeIds": ["condition:b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1"]
          }
        ]
      }
    };
    
    console.log('📋 Structure fournie:');
    console.log(JSON.stringify(providedJson, null, 2));
    
    console.log('\n🔍 ANALYSE DES RÉFÉRENCES:');
    console.log('');
    
    // Extraire les IDs référencés
    const sharedRefId = 'shared-ref-1761920196832-4f6a2-1';
    const fallbackCondRef = 'condition:b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1';
    
    console.log(`1. shared-ref: ${sharedRefId}`);
    const sharedRefNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: sharedRefId }
    });
    console.log(`   → ${sharedRefNode ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
    
    console.log(`\n2. fallback condition: ${fallbackCondRef}`);
    const fallbackCondId = fallbackCondRef.replace('condition:', '');
    const fallbackCond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: fallbackCondId }
    });
    console.log(`   → ${fallbackCond ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
    
    if (!fallbackCond) {
      // Essayer sans suffixe
      const fallbackCondIdNoSuffix = 'b0e9def0-ab4d-4e28-9cba-1c0632bf646e';
      const fallbackCondNoSuffix = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: fallbackCondIdNoSuffix }
      });
      console.log(`   → Sans suffixe: ${fallbackCondNoSuffix ? '✅ EXISTE' : '❌ N\'EXISTE PAS'}`);
      
      if (fallbackCondNoSuffix) {
        console.log(`\n   ⚠️ PROBLÈME IDENTIFIÉ:`);
        console.log(`      La condition ${fallbackCondIdNoSuffix} existe`);
        console.log(`      Mais elle est référencée avec le suffixe -1: ${fallbackCondId}`);
        console.log(`      → La copie n'a pas créé la condition avec le suffixe!`);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 5️⃣ SOLUTION PROPOSÉE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 SOLUTION:\n');
    
    console.log('Le problème est clair:');
    console.log('');
    console.log('❌ La condition copiée référence: b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1');
    console.log('❌ Mais cette condition n\'a PAS été copiée avec le suffixe -1');
    console.log('✅ Seule la condition SANS suffixe existe');
    console.log('');
    console.log('📋 Actions nécessaires:');
    console.log('');
    console.log('1. Soit CRÉER la condition b0e9def0-ab4d-4e28-9cba-1c0632bf646e-1');
    console.log('   en copiant b0e9def0-ab4d-4e28-9cba-1c0632bf646e');
    console.log('');
    console.log('2. Soit CORRIGER le conditionSet pour référencer');
    console.log('   condition:b0e9def0-ab4d-4e28-9cba-1c0632bf646e (sans -1)');
    console.log('');
    console.log('3. Vérifier le code de copy-capacity-condition.ts');
    console.log('   pour s\'assurer que les conditions imbriquées sont aussi copiées');
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Analyse terminée!');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
