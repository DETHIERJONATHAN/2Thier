/**
 * 🗺️ ANALYSE DES MAPPAGES - Pourquoi les IDs ne correspondent pas
 * 
 * Teste les Maps utilisées lors de la copie:
 * - formulaIdMap
 * - conditionIdMap  
 * - tableIdMap
 * - nodeIdMap
 * 
 * Identifie les décalages et les références cassées
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(18) + '🗺️  ANALYSE DES MAPPAGES LORS DE LA COPIE' + ' '.repeat(18) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  try {
    // 1️⃣ Récupérer le nœud original
    const originalNode = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Rampant toiture' } }
    });

    if (!originalNode) {
      console.log('❌ Nœud "Rampant toiture" non trouvé\n');
      return;
    }

    console.log(`📍 Nœud ORIGINAL: ${originalNode.label} (${originalNode.id})\n`);

    // 2️⃣ Récupérer les FORMULES ORIGINALES
    console.log('═'.repeat(80));
    console.log('📐 ANALYSE DES FORMULES');
    console.log('═'.repeat(80) + '\n');

    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalFormulas.length} formules originales:\n`);

    const formulaMappings = new Map();

    for (const formula of originalFormulas) {
      console.log(`\n🔍 Formule ORIGINAL: ${formula.name || '(sans nom)'}`);
      console.log(`   ID original: ${formula.id}`);
      console.log(`   Opération: ${formula.operation}`);
      console.log(`   Variables liées: ${formula.linkedVariableIds?.length || 0}`);

      // Chercher la formule copiée correspondante
      const copiedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: {
          metadata: {
            path: ['copiedFromFormulaId'],
            equals: formula.id
          }
        }
      });

      if (copiedFormulas.length === 0) {
        console.log(`   ❌ AUCUNE COPIE TROUVÉE!`);
      } else {
        for (const copiedFormula of copiedFormulas) {
          console.log(`   ✅ Formule COPIÉE trouvée`);
          console.log(`      ID copié: ${copiedFormula.id}`);
          console.log(`      Node: ${copiedFormula.nodeId}`);
          console.log(`      Opération: ${copiedFormula.operation}`);

          formulaMappings.set(formula.id, copiedFormula.id);

          // Vérifier les variables liées
          console.log(`\n      📋 Vérification des variables liées:`);
          console.log(`         Original: ${formula.linkedVariableIds?.length || 0}`);
          console.log(`         Copie: ${copiedFormula.linkedVariableIds?.length || 0}`);

          if (formula.linkedVariableIds && formula.linkedVariableIds.length > 0) {
            console.log(`\n         Variables originales:`);
            for (const varId of formula.linkedVariableIds) {
              const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
                where: { id: varId }
              });
              if (variable) {
                console.log(`           - ${variable.exposedKey} (${varId})`);
              } else {
                console.log(`           ❌ ${varId} (N'EXISTE PAS!)`);
              }
            }
          }

          if (copiedFormula.linkedVariableIds && copiedFormula.linkedVariableIds.length > 0) {
            console.log(`\n         Variables copiées:`);
            for (const varId of copiedFormula.linkedVariableIds) {
              const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
                where: { id: varId }
              });
              if (variable) {
                console.log(`           - ${variable.exposedKey} (${varId})`);
              } else {
                console.log(`           ❌ ${varId} (N'EXISTE PAS!)`);
              }
            }
          }
        }
      }
    }

    // 3️⃣ Récupérer les CONDITIONS ORIGINALES
    console.log('\n\n' + '═'.repeat(80));
    console.log('🔀 ANALYSE DES CONDITIONS');
    console.log('═'.repeat(80) + '\n');

    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalConditions.length} conditions originales:\n`);

    const conditionMappings = new Map();

    for (const condition of originalConditions) {
      console.log(`\n🔍 Condition ORIGINAL: ${condition.name || '(sans nom)'}`);
      console.log(`   ID original: ${condition.id}`);
      console.log(`   Condition: ${condition.condition}`);
      console.log(`   Variables liées: ${condition.linkedVariableIds?.length || 0}`);

      // Chercher la condition copiée
      const copiedConditions = await prisma.treeBranchLeafNodeCondition.findMany({
        where: {
          metadata: {
            path: ['copiedFromConditionId'],
            equals: condition.id
          }
        }
      });

      if (copiedConditions.length === 0) {
        console.log(`   ❌ AUCUNE COPIE TROUVÉE!`);
      } else {
        for (const copiedCondition of copiedConditions) {
          console.log(`   ✅ Condition COPIÉE trouvée`);
          console.log(`      ID copié: ${copiedCondition.id}`);
          console.log(`      Node: ${copiedCondition.nodeId}`);
          console.log(`      Condition: ${copiedCondition.condition}`);

          conditionMappings.set(condition.id, copiedCondition.id);

          // Vérifier les variables liées
          console.log(`\n      📋 Vérification des variables liées:`);
          console.log(`         Original: ${condition.linkedVariableIds?.length || 0}`);
          console.log(`         Copie: ${copiedCondition.linkedVariableIds?.length || 0}`);
        }
      }
    }

    // 4️⃣ ANALYSE DES VARIABLES
    console.log('\n\n' + '═'.repeat(80));
    console.log('📋 ANALYSE DES VARIABLES');
    console.log('═'.repeat(80) + '\n');

    const originalVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalVars.length} variables originales:\n`);

    const variableMappings = new Map();

    for (const variable of originalVars) {
      console.log(`\n🔍 Variable ORIGINAL: ${variable.exposedKey}`);
      console.log(`   ID original: ${variable.id}`);
      console.log(`   sourceRef: ${variable.sourceRef || 'null'}`);

      // Chercher la variable copiée
      const copiedVars = await prisma.treeBranchLeafNodeVariable.findMany({
        where: {
          metadata: {
            path: ['copiedFromVariableId'],
            equals: variable.id
          }
        }
      });

      if (copiedVars.length === 0) {
        console.log(`   ❌ AUCUNE COPIE TROUVÉE!`);
      } else {
        for (const copiedVar of copiedVars) {
          console.log(`   ✅ Variable COPIÉE trouvée`);
          console.log(`      ID copié: ${copiedVar.id}`);
          console.log(`      sourceRef: ${copiedVar.sourceRef || 'null'}`);

          variableMappings.set(variable.id, copiedVar.id);

          // Vérifier le sourceRef
          if (variable.sourceRef && copiedVar.sourceRef) {
            const originalParsed = parseSourceRef(variable.sourceRef);
            const copiedParsed = parseSourceRef(copiedVar.sourceRef);

            if (originalParsed && copiedParsed) {
              console.log(`\n      🔗 Analyse sourceRef:`);
              console.log(`         Original: ${originalParsed.type} / ${originalParsed.id}`);
              console.log(`         Copié: ${copiedParsed.type} / ${copiedParsed.id}`);

              if (originalParsed.type !== copiedParsed.type) {
                console.log(`         ❌ TYPE CHANGÉ!`);
              }

              // Vérifier que l'ID copié existe
              if (copiedParsed.type === 'formula') {
                const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
                  where: { id: copiedParsed.id }
                });
                if (!formula) {
                  console.log(`         ❌ FORMULE ${copiedParsed.id} N'EXISTE PAS!`);
                } else {
                  console.log(`         ✅ Formule trouvée`);
                }
              }
            }
          }
        }
      }
    }

    // 5️⃣ RÉSUMÉ DES MAPPAGES
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 RÉSUMÉ DES MAPPAGES');
    console.log('═'.repeat(80) + '\n');

    console.log(`Formules mappées: ${formulaMappings.size}/${originalFormulas.length}`);
    console.log(`Conditions mappées: ${conditionMappings.size}/${originalConditions.length}`);
    console.log(`Variables mappées: ${variableMappings.size}/${originalVars.length}`);

    // Vérifier les taux de réussite
    const formulaRate = (formulaMappings.size / originalFormulas.length * 100).toFixed(1);
    const conditionRate = (conditionMappings.size / originalConditions.length * 100).toFixed(1);
    const variableRate = (variableMappings.size / originalVars.length * 100).toFixed(1);

    console.log(`\nTaux de réussite:`);
    console.log(`  Formules: ${formulaRate}%`);
    console.log(`  Conditions: ${conditionRate}%`);
    console.log(`  Variables: ${variableRate}%`);

    if (formulaRate === '100' && conditionRate === '100' && variableRate === '100') {
      console.log(`\n✅ TOUS LES MAPPAGES SONT COMPLETS!`);
    } else {
      console.log(`\n❌ CERTAINS MAPPAGES SONT INCOMPLETS!`);
    }

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

function parseSourceRef(sourceRef) {
  if (!sourceRef || typeof sourceRef !== 'string') return null;

  const cleaned = sourceRef.trim();
  if (!cleaned) return null;

  if (cleaned.startsWith('node-formula:')) {
    return {
      type: 'formula',
      id: cleaned.replace('node-formula:', ''),
      prefix: 'node-formula:'
    };
  }

  if (cleaned.startsWith('condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('condition:', ''),
      prefix: 'condition:'
    };
  }

  if (cleaned.startsWith('node-condition:')) {
    return {
      type: 'condition',
      id: cleaned.replace('node-condition:', ''),
      prefix: 'node-condition:'
    };
  }

  if (cleaned.startsWith('@table.')) {
    return {
      type: 'table',
      id: cleaned.replace('@table.', ''),
      prefix: '@table.'
    };
  }

  if (cleaned.startsWith('node-table:')) {
    return {
      type: 'table',
      id: cleaned.replace('node-table:', ''),
      prefix: 'node-table:'
    };
  }

  return {
    type: 'field',
    id: cleaned,
    prefix: ''
  };
}

main().catch(error => {
  console.error('ERREUR CRITIQUE:', error);
  process.exit(1);
});
